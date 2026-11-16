-- Migration 0002: analysis request-state tracking + global quota table
-- Safe / reversible — only adds columns and a new table; no rows are deleted.
--
-- PREFERRED: Run via `npm run db:migrate` (uses drizzle/migrations/0002_*.sql).
-- MANUAL:    psql $DIRECT_DATABASE_URL -f db/migrations/0002_analysis_status_global_quota.sql
--            (Use DIRECT_DATABASE_URL, not DATABASE_URL — pooled connections cannot run DDL.)
--
-- Pre-deployment requirement: this migration MUST be applied to the Neon
-- database before deploying the Milestone 4 code that uses these columns.
-- Rollback: ALTER TABLE analyses DROP COLUMN status, processing_started_at;
--           DROP TABLE global_quota_buckets;

-- ── analyses: request-state tracking ─────────────────────────────────────────

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS status               TEXT        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Mark rows that already have a completed result as 'complete' so the new
-- duplicate-request guard does not block retries on pre-migration records.
UPDATE analyses
  SET status = 'complete'
  WHERE result_json <> '{}'
    AND result_json IS NOT NULL
    AND status = 'pending';

-- Index for the stale-processing-override query in claimAnalysisSlot().
CREATE INDEX IF NOT EXISTS analyses_status_processing_idx
  ON analyses (status, processing_started_at)
  WHERE status = 'processing';

-- ── global_quota_buckets: per-month Groq request counter ──────────────────────

CREATE TABLE IF NOT EXISTS global_quota_buckets (
  bucket_key TEXT        PRIMARY KEY,            -- 'YYYY-MM'
  count      INTEGER     NOT NULL DEFAULT 0,
  limit_val  INTEGER     NOT NULL DEFAULT 50
);
