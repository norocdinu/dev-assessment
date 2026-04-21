import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  try {
    // Check if already migrated
    const existing = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admin_users'
      ) AS exists
    `;

    if (existing[0].exists) {
      console.log('Schema already exists — running seed data only');
      const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
      // Run only the INSERT (seed) portion
      const insertOnly = schema.split('\n').filter(l => l.match(/^INSERT|^ON CONFLICT/)).join('\n');
      if (insertOnly) {
        const seedSql = schema.substring(schema.indexOf('-- Seed initial data'));
        await db.unsafe(seedSql);
        console.log('Seed data applied');
      }
    } else {
      console.log('Running full migration...');
      const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
      await db.unsafe(schema);
      console.log('Migration complete');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrate();
