import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Generic forward-only migration runner. Applies any *.sql files in
 * ./migrations that have not yet been recorded in schema_migrations, each in
 * its own transaction.
 *
 * Baseline: a database created before this runner existed already has every
 * table but an empty (or absent) schema_migrations. In that case we record the
 * existing migrations as applied WITHOUT running them, so the live deployment
 * is adopted safely rather than re-initialised.
 */
async function migrate() {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const appliedRows = await db`SELECT filename FROM schema_migrations`;
    const applied = new Set(appliedRows.map((r) => r.filename as string));

    if (applied.size === 0) {
      const [{ exists }] = await db`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'admin_users'
        ) AS exists
      `;
      if (exists) {
        console.log('Existing database detected — baselining migrations as applied.');
        for (const file of files) {
          await db`INSERT INTO schema_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
          applied.add(file);
        }
      }
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Applying ${file}…`);
      await db.begin(async (tx) => {
        await tx.unsafe(sql);
        await tx`INSERT INTO schema_migrations (filename) VALUES (${file})`;
      });
    }

    console.log(`Applied ${pending.length} migration(s).`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrate();
