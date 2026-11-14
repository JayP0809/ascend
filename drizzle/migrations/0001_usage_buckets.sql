-- Migration 0001: atomic quota reservation table
-- Apply after 0000_initial.sql

CREATE TABLE IF NOT EXISTS "usage_buckets" (
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bucket_key" TEXT NOT NULL,   -- 'YYYY-MM', e.g. '2026-11'
  "count"      INTEGER NOT NULL DEFAULT 0,
  "limit_val"  INTEGER NOT NULL DEFAULT 5,
  PRIMARY KEY ("user_id", "bucket_key")
);

CREATE INDEX IF NOT EXISTS "usage_buckets_user_id_idx" ON "usage_buckets" ("user_id");
