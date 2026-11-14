-- Ascend 2.0 — Initial schema migration
-- Generated for PostgreSQL / Neon
-- Apply with: drizzle-kit migrate (production) or drizzle-kit push (Neon branch dev)
-- Never run this automatically on startup — always an explicit step.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id"   TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "name"       TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" ("clerk_id");

-- ---------------------------------------------------------------------------
-- analyses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "analyses" (
  "id"              UUID PRIMARY KEY,
  "user_id"         UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "resume_text"     TEXT NOT NULL DEFAULT '',
  "target_role"     TEXT NOT NULL,
  "job_description" TEXT,
  "readiness_score" REAL NOT NULL DEFAULT 0,
  "result_json"     TEXT NOT NULL DEFAULT '{}',
  "is_demo_mode"    BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "analyses_user_id_idx"    ON "analyses" ("user_id");
CREATE INDEX IF NOT EXISTS "analyses_created_at_idx" ON "analyses" ("created_at");

-- ---------------------------------------------------------------------------
-- skill_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "skill_records" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "analysis_id" UUID NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "skill_name"  TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "has_skill"   BOOLEAN NOT NULL DEFAULT FALSE,
  "importance"  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "skill_records_analysis_id_idx" ON "skill_records" ("analysis_id");

-- ---------------------------------------------------------------------------
-- roadmap_phases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "roadmap_phases" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "analysis_id"    UUID NOT NULL REFERENCES "analyses"("id") ON DELETE CASCADE,
  "week_start"     INTEGER NOT NULL,
  "week_end"       INTEGER NOT NULL,
  "focus_area"     TEXT NOT NULL,
  "topics_json"    TEXT NOT NULL DEFAULT '[]',
  "resources_json" TEXT NOT NULL DEFAULT '[]',
  "project_json"   TEXT NOT NULL DEFAULT '{}',
  "milestone"      TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS "roadmap_phases_analysis_id_idx" ON "roadmap_phases" ("analysis_id");

-- ---------------------------------------------------------------------------
-- community
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "community" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "analysis_id"     UUID REFERENCES "analyses"("id") ON DELETE SET NULL,
  "target_role"     TEXT NOT NULL,
  "readiness_score" REAL NOT NULL,
  "top_gap"         TEXT NOT NULL,
  "is_public"       BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "community_created_at_idx"   ON "community" ("created_at");
CREATE INDEX IF NOT EXISTS "community_target_role_idx"  ON "community" ("target_role");

-- ---------------------------------------------------------------------------
-- ai_usage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "analysis_id"         UUID REFERENCES "analyses"("id") ON DELETE CASCADE,
  "user_id"             UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "step"                TEXT NOT NULL,
  "model"               TEXT NOT NULL,
  "prompt_version"      TEXT NOT NULL DEFAULT '',
  "prompt_tokens"       INTEGER NOT NULL DEFAULT 0,
  "completion_tokens"   INTEGER NOT NULL DEFAULT 0,
  "total_tokens"        INTEGER NOT NULL DEFAULT 0,
  "latency_ms"          INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_usd"  REAL NOT NULL DEFAULT 0,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_usage_user_id_idx"      ON "ai_usage" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_analysis_id_idx"  ON "ai_usage" ("analysis_id");
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx"   ON "ai_usage" ("created_at");
