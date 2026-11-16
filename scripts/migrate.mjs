/**
 * Neon HTTP migration runner.
 *
 * Uses @neondatabase/serverless HTTP transport instead of TCP so it works
 * regardless of whether the Neon compute is sleeping. Each statement is an
 * independent HTTP call and is auto-committed — no open transaction required.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/migrate.mjs
 *   -- or --
 *   npm run db:migrate    (loads .env.local automatically via --env-file)
 *
 * Migration tracking: public.__drizzle_migrations (hash TEXT, created_at BIGINT)
 * This table is created on first run and re-read on every subsequent run so
 * migrations are idempotent and safe to run multiple times.
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('ERROR: DATABASE_URL is not set. Add it to .env.local or export it.');
  process.exit(1);
}

// Use direct endpoint (no -pooler) for DDL — pooler may reject certain DDL patterns.
const u = new URL(rawUrl);
u.hostname = u.hostname.replace('-pooler', '');
u.searchParams.delete('channel_binding');
const url = u.toString();

const sql = neon(url);

function extractStatements(ddl) {
  return ddl
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function main() {
  // Ensure tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id      SERIAL PRIMARY KEY,
      hash    TEXT NOT NULL,
      created_at BIGINT
    )
  `;

  const applied = await sql`SELECT hash FROM "__drizzle_migrations"`;
  const done = new Set(applied.map(r => r.hash));
  console.log('Already applied:', done.size > 0 ? [...done].join(', ') : 'none');

  // Discover migration files in order
  const migrationsDir = resolve(root, 'drizzle/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    const hash = file.replace('.sql', '');
    if (done.has(hash)) {
      console.log(`  skip  ${hash} (already applied)`);
      continue;
    }
    const ddl = readFileSync(resolve(migrationsDir, file), 'utf8');
    const stmts = extractStatements(ddl);
    console.log(`  apply ${hash} (${stmts.length} statements)`);
    for (const stmt of stmts) {
      // sql([stmt]) was removed in @neondatabase/serverless v1.2.1 —
      // sql.query(stmt) is the correct raw-string execution API.
      await sql.query(stmt);
    }
    await sql`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${hash}, ${Date.now()})`;
    console.log(`  done  ${hash}`);
    count++;
  }

  if (count === 0) {
    console.log('No new migrations to apply.');
  } else {
    console.log(`\nApplied ${count} migration(s).`);
  }

  // Print final table list
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log('\nTables:', tables.map(r => r.tablename).join(', '));
}

main().catch(e => {
  console.error('\nMigration failed:', e.message, e.detail ?? '');
  process.exit(1);
});
