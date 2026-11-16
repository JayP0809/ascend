-- Migration 0002: analysis request-state tracking + global quota table
-- Apply after 0001_usage_buckets.sql
-- Safe / reversible: only adds columns and a new table; no rows are deleted.
--
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
  bucket_key TEXT        PRIMARY KEY,
  count      INTEGER     NOT NULL DEFAULT 0,
  limit_val  INTEGER     NOT NULL DEFAULT 50
);
