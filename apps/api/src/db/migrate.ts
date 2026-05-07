import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  try {
    const [{ exists: phase1Exists }] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admin_users'
      ) AS exists
    `;

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

    if (!phase1Exists) {
      console.log('Running full migration (fresh DB)...');
      await db.unsafe(schema);
      console.log('Migration complete');
      return;
    }

    console.log('Phase 1 schema present — checking Phase 2 tables...');

    const [{ exists: phase2Exists }] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'test_links'
      ) AS exists
    `;

    if (!phase2Exists) {
      console.log('Running Phase 2 migration...');
      const phase2Start = schema.indexOf('-- Phase 2: Test Links');
      if (phase2Start !== -1) {
        const seedStart = schema.indexOf('-- Seed initial data');
        const phase2Sql = schema.substring(
          phase2Start,
          seedStart !== -1 ? seedStart : undefined
        );
        await db.unsafe(phase2Sql);
        console.log('Phase 2 migration complete');
      }
    } else {
      console.log('Phase 2 schema already present — skipping DDL');
    }

    const [{ exists: phase3Exists }] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'submission_results'
      ) AS exists
    `;

    if (!phase3Exists) {
      console.log('Running Phase 3 migration...');
      const phase3Start = schema.indexOf('-- Phase 3: Submission Results');
      if (phase3Start !== -1) {
        const seedStart = schema.indexOf('-- Seed initial data');
        const phase3Sql = schema.substring(
          phase3Start,
          seedStart !== -1 ? seedStart : undefined
        );
        await db.unsafe(phase3Sql);
        console.log('Phase 3 migration complete');
      }
    } else {
      console.log('Phase 3 schema already present — skipping DDL');
    }

    // Phase 6: Member role CHECK constraint + candidate_name column on test_links
    const [{ constraintAllowsMember }] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name = 'admin_users_role_check'
          AND check_clause LIKE '%member%'
      ) AS "constraintAllowsMember"
    `;

    if (!constraintAllowsMember) {
      console.log('Running Phase 6 migration: extending role CHECK constraint...');
      await db`ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check`;
      await db`ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'reviewer', 'member'))`;
      console.log('Phase 6a: role constraint updated');
    } else {
      console.log('Phase 6a: role constraint already includes member — skipping');
    }

    const [{ candidateNameExists }] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'test_links'
          AND column_name = 'candidate_name'
      ) AS "candidateNameExists"
    `;

    if (!candidateNameExists) {
      console.log('Running Phase 6 migration: adding candidate_name to test_links...');
      await db`ALTER TABLE test_links ADD COLUMN candidate_name TEXT`;
      console.log('Phase 6b: candidate_name column added');
    } else {
      console.log('Phase 6b: candidate_name column already present — skipping');
    }

    // Always apply seed data
    const seedStart = schema.indexOf('-- Seed initial data');
    if (seedStart !== -1) {
      await db.unsafe(schema.substring(seedStart));
      console.log('Seed data applied');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrate();
