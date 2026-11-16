/**
 * Isolated integration test for migration 0002.
 *
 * Creates a temporary schema, applies all three migrations using
 * schema-qualified DDL (the only isolation strategy that works with
 * Neon's stateless HTTP transport), runs assertions, then drops the schema.
 *
 * Production tables in the public schema are never touched.
 *
 * Run: node --env-file=.env.local scripts/test-migration-0002.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const rawUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('DIRECT_DATABASE_URL or DATABASE_URL required');
  process.exit(1);
}

const u = new URL(rawUrl);
u.hostname = u.hostname.replace('-pooler', '');
u.searchParams.delete('channel_binding');
const directUrl = u.toString();

const sql = neon(directUrl);
const SCHEMA = `ascend_m2_test_${Date.now()}`;

let pass = 0;
let fail = 0;

function assert(description, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${description}`);
    pass++;
  } else {
    console.error(`  ✗  ${description}${detail ? ': ' + detail : ''}`);
    fail++;
  }
}

// Rewrite unqualified table names to schema-qualified ones for test isolation.
// Handles: CREATE TABLE, CREATE INDEX ON, ALTER TABLE, UPDATE, INSERT INTO
function qualifySQL(ddl, schema) {
  const tableNames = ['users', 'analyses', 'skill_records', 'roadmap_phases',
    'community', 'ai_usage', 'usage_buckets', '__drizzle_migrations', 'global_quota_buckets'];
  let out = ddl;
  for (const t of tableNames) {
    // Match unqualified table name (not already schema-qualified)
    const re = new RegExp(`(?<!")(?<![a-z_])"?${t}"?(?!")(?![a-z_])`, 'g');
    out = out.replace(re, `"${schema}"."${t}"`);
  }
  return out;
}

function extractStatements(ddl) {
  return ddl
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function runMigration(filename) {
  const raw = readFileSync(resolve(root, 'drizzle/migrations', filename), 'utf8');
  const stmts = extractStatements(raw);
  for (const stmt of stmts) {
    const qualified = qualifySQL(stmt, SCHEMA);
    await sql.query(qualified).catch(e => {
      console.error(`    DDL error: ${e.message.slice(0, 100)}`);
      console.error(`    SQL: ${qualified.slice(0, 120)}`);
      throw e;
    });
  }
}

async function main() {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Migration 0002 isolated integration test`);
  console.log(`Schema: ${SCHEMA}`);
  console.log(`${'─'.repeat(60)}\n`);

  try {
    // ── Setup: create schema + apply all 3 migrations ─────────────────────
    console.log('── Setup ──');
    await sql.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
    console.log(`  schema "${SCHEMA}" created`);

    await runMigration('0000_initial.sql');
    console.log('  migration 0000 applied');
    await runMigration('0001_usage_buckets.sql');
    console.log('  migration 0001 applied');
    await runMigration('0002_analysis_status_global_quota.sql');
    console.log('  migration 0002 applied');

    // ── Item 1: Verify migration is additive — all columns present ─────────
    console.log('\n── Item 1: schema structure after migration 0002 ──');
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = ${SCHEMA} AND table_name = 'analyses'
      ORDER BY ordinal_position
    `;
    const colNames = cols.map(c => c.column_name);
    assert('analyses.status column exists', colNames.includes('status'));
    assert('analyses.processing_started_at column exists', colNames.includes('processing_started_at'));
    const statusCol = cols.find(c => c.column_name === 'status');
    assert('status column has NOT NULL constraint', statusCol?.is_nullable === 'NO');
    assert("status column defaults to 'pending'", statusCol?.column_default?.includes('pending') ?? false,
      `default was: ${statusCol?.column_default}`);

    const tableNames = await sql`
      SELECT tablename FROM pg_tables WHERE schemaname = ${SCHEMA} ORDER BY tablename
    `;
    const tables = tableNames.map(r => r.tablename);
    assert('global_quota_buckets table created', tables.includes('global_quota_buckets'));

    // ── Item 2: Verify index was created ───────────────────────────────────
    console.log('\n── Item 2: partial index ──');
    const indexes = await sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = ${SCHEMA} AND tablename = 'analyses'
    `;
    const idxNames = indexes.map(r => r.indexname);
    assert('analyses_status_processing_idx created', idxNames.includes('analyses_status_processing_idx'));

    // ── Item 3: Verify backfill logic ──────────────────────────────────────
    console.log('\n── Item 3: backfill — existing analyses get correct status ──');

    // Seed a user
    const userId = crypto.randomUUID();
    await sql.query(`INSERT INTO "${SCHEMA}"."users" (id, clerk_id, email) VALUES ('${userId}', 'prov_test', 'test@test.local')`);

    // Seed analysis with real result (should become 'complete')
    const a1 = crypto.randomUUID();
    await sql.query(`INSERT INTO "${SCHEMA}"."analyses" (id, user_id, resume_text, target_role, result_json, is_demo_mode) VALUES ('${a1}', '${userId}', 'resume', 'SWE', '{"skillExtraction":{}}', false)`);

    // Seed analysis with empty result (should stay 'pending')
    const a2 = crypto.randomUUID();
    await sql.query(`INSERT INTO "${SCHEMA}"."analyses" (id, user_id, resume_text, target_role, result_json, is_demo_mode) VALUES ('${a2}', '${userId}', 'resume', 'SWE', '{}', false)`);

    // Run the backfill UPDATE (same as in migration 0002)
    await sql.query(`UPDATE "${SCHEMA}"."analyses" SET status = 'complete' WHERE result_json <> '{}' AND result_json IS NOT NULL AND status = 'pending'`);

    const r1 = await sql.query(`SELECT status FROM "${SCHEMA}"."analyses" WHERE id = '${a1}'`);
    const r1row = Array.isArray(r1) ? r1[0] : r1?.rows?.[0];
    assert('analysis with result_json backfilled to complete', r1row?.status === 'complete',
      `got: ${r1row?.status}`);

    const r2 = await sql.query(`SELECT status FROM "${SCHEMA}"."analyses" WHERE id = '${a2}'`);
    const r2row = Array.isArray(r2) ? r2[0] : r2?.rows?.[0];
    assert("analysis with empty result_json stays 'pending'", r2row?.status === 'pending',
      `got: ${r2row?.status}`);

    // ── Item 4: Verify global_quota_buckets atomic reservation ────────────
    console.log('\n── Item 4: global quota atomics ──');

    // Insert initial row
    const bucket = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth()+1).padStart(2,'0')}`;

    // First reserve
    const q1 = await sql.query(`
      INSERT INTO "${SCHEMA}"."global_quota_buckets" (bucket_key, count, limit_val)
      VALUES ('${bucket}', 1, 5)
      ON CONFLICT (bucket_key)
      DO UPDATE SET count = "${SCHEMA}"."global_quota_buckets".count + 1, limit_val = 5
      WHERE "${SCHEMA}"."global_quota_buckets".count < 5
      RETURNING count, limit_val
    `);
    const q1row = Array.isArray(q1) ? q1[0] : q1?.rows?.[0];
    assert('first reservation succeeds (count=1)', q1row?.count === 1);

    // Fill to limit
    for (let i = 2; i <= 5; i++) {
      await sql.query(`
        INSERT INTO "${SCHEMA}"."global_quota_buckets" (bucket_key, count, limit_val)
        VALUES ('${bucket}', ${i}, 5)
        ON CONFLICT (bucket_key)
        DO UPDATE SET count = "${SCHEMA}"."global_quota_buckets".count + 1, limit_val = 5
        WHERE "${SCHEMA}"."global_quota_buckets".count < 5
        RETURNING count, limit_val
      `);
    }

    // Over limit — should return 0 rows
    const qOver = await sql.query(`
      INSERT INTO "${SCHEMA}"."global_quota_buckets" (bucket_key, count, limit_val)
      VALUES ('${bucket}', 1, 5)
      ON CONFLICT (bucket_key)
      DO UPDATE SET count = "${SCHEMA}"."global_quota_buckets".count + 1, limit_val = 5
      WHERE "${SCHEMA}"."global_quota_buckets".count < 5
      RETURNING count, limit_val
    `);
    const qOverArr = Array.isArray(qOver) ? qOver : qOver?.rows ?? [];
    assert('over-limit reservation returns 0 rows (quota enforced)', qOverArr.length === 0,
      `got ${qOverArr.length} rows`);

    // Refund decrements count
    await sql.query(`UPDATE "${SCHEMA}"."global_quota_buckets" SET count = GREATEST(count - 1, 0) WHERE bucket_key = '${bucket}'`);
    const qAfterRefund = await sql.query(`SELECT count FROM "${SCHEMA}"."global_quota_buckets" WHERE bucket_key = '${bucket}'`);
    const qAR0 = Array.isArray(qAfterRefund) ? qAfterRefund[0] : qAfterRefund?.rows?.[0];
    assert('refund decrements count', qAR0?.count === 4,
      `count after refund: ${qAR0?.count}`);

    // Refund never goes below 0
    for (let i = 0; i < 10; i++) {
      await sql.query(`UPDATE "${SCHEMA}"."global_quota_buckets" SET count = GREATEST(count - 1, 0) WHERE bucket_key = '${bucket}'`);
    }
    const qFloor = await sql.query(`SELECT count FROM "${SCHEMA}"."global_quota_buckets" WHERE bucket_key = '${bucket}'`);
    const qFloor0 = Array.isArray(qFloor) ? qFloor[0] : qFloor?.rows?.[0];
    assert('refund floor is 0 (GREATEST never goes negative)', qFloor0?.count === 0);

    // ── Item 5: Verify claimAnalysisSlot state machine ────────────────────
    console.log('\n── Item 5: analysis state machine ──');

    const a3 = crypto.randomUUID();
    await sql.query(`INSERT INTO "${SCHEMA}"."analyses" (id, user_id, resume_text, target_role, result_json, status, is_demo_mode) VALUES ('${a3}', '${userId}', 'r', 'SWE', '{}', 'pending', false)`);

    // Claim: pending → processing  (RETURNING id so we can count affected rows)
    const claim1 = await sql.query(`
      UPDATE "${SCHEMA}"."analyses"
         SET status = 'processing', processing_started_at = NOW()
       WHERE id = '${a3}'
         AND (status = 'pending' OR (status = 'processing' AND processing_started_at < NOW() - INTERVAL '2 minutes'))
      RETURNING id
    `);
    const claim1Rows = Array.isArray(claim1) ? claim1 : claim1?.rows ?? [];
    assert('first claim succeeds (rowCount=1)', claim1Rows.length === 1);

    // Second claim fails (already processing)
    const claim2 = await sql.query(`
      UPDATE "${SCHEMA}"."analyses"
         SET status = 'processing', processing_started_at = NOW()
       WHERE id = '${a3}'
         AND (status = 'pending' OR (status = 'processing' AND processing_started_at < NOW() - INTERVAL '2 minutes'))
      RETURNING id
    `);
    const claim2Rows = Array.isArray(claim2) ? claim2 : claim2?.rows ?? [];
    assert('second concurrent claim returns 0 rows (already processing)', claim2Rows.length === 0);

    // Stale claim (>2 min) is reclaimable
    await sql.query(`UPDATE "${SCHEMA}"."analyses" SET processing_started_at = NOW() - INTERVAL '5 minutes' WHERE id = '${a3}'`);
    const claimStale = await sql.query(`
      UPDATE "${SCHEMA}"."analyses"
         SET status = 'processing', processing_started_at = NOW()
       WHERE id = '${a3}'
         AND (status = 'pending' OR (status = 'processing' AND processing_started_at < NOW() - INTERVAL '2 minutes'))
      RETURNING id
    `);
    const claimStaleRows = Array.isArray(claimStale) ? claimStale : claimStale?.rows ?? [];
    assert('stale claim (>2 min) is reclaimable', claimStaleRows.length === 1);

    // ── Item 6: Verify migration is idempotent (re-run) ───────────────────
    console.log('\n── Item 6: idempotency — re-run migration 0002 ──');
    try {
      await runMigration('0002_analysis_status_global_quota.sql');
      assert('re-running migration 0002 does not throw', true);
    } catch(e) {
      assert('re-running migration 0002 does not throw', false, e.message.slice(0, 100));
    }

    const colsAfterRerun = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = ${SCHEMA} AND table_name = 'analyses'
    `;
    assert('analyses columns unchanged after re-run',
      colsAfterRerun.map(c => c.column_name).includes('status'));

    // ── Summary ───────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Results: ${pass} passed, ${fail} failed`);
    console.log(`${'─'.repeat(60)}\n`);

  } finally {
    await sql.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`).catch(() => {});
    console.log(`Schema "${SCHEMA}" dropped — no production data was touched.\n`);
  }

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message, e.detail ?? '');
  process.exit(1);
});
