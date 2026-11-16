import {
  pgTable,
  primaryKey,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// users
// Populated by Clerk webhook on first sign-in. clerk_id is the Clerk user ID.
// Not required yet — user_id columns are nullable until auth is live.
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  clerkId:   text('clerk_id').notNull().unique(),
  email:     text('email').notNull(),
  name:      text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_clerk_id_idx').on(t.clerkId),
]);

// ---------------------------------------------------------------------------
// analyses
// One row per career-analysis run. user_id is nullable so the table works
// before auth is introduced (upload → analyze flow uses a UUID we generate).
// resume_text stores the truncated extracted text — raw file is never kept.
// ---------------------------------------------------------------------------
export const analyses = pgTable('analyses', {
  id:                   uuid('id').primaryKey(),
  userId:               uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  resumeText:           text('resume_text').notNull().default(''),
  targetRole:           text('target_role').notNull(),
  jobDescription:       text('job_description'),
  readinessScore:       real('readiness_score').notNull().default(0),
  resultJson:           text('result_json').notNull().default('{}'),
  isDemoMode:           boolean('is_demo_mode').notNull().default(false),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Request-state tracking (added in migration 0002).
  // pending    → uploaded, waiting for /api/analyze call
  // processing → an instance has claimed this for Groq processing
  // complete   → result_json is populated and final
  // failed     → non-retryable error; user must re-upload
  status:               text('status').notNull().default('pending'),
  processingStartedAt:  timestamp('processing_started_at', { withTimezone: true }),
}, (t) => [
  index('analyses_user_id_idx').on(t.userId),
  index('analyses_created_at_idx').on(t.createdAt),
  index('analyses_status_processing_idx').on(t.status, t.processingStartedAt),
]);

// ---------------------------------------------------------------------------
// skill_records
// Flattened skill rows for each analysis — enables fast filtering/aggregation
// without JSON parsing.
// ---------------------------------------------------------------------------
export const skillRecords = pgTable('skill_records', {
  id:         uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  skillName:  text('skill_name').notNull(),
  category:   text('category').notNull(),       // technical | soft | tools | certifications
  hasSkill:   boolean('has_skill').notNull().default(false),
  importance: text('importance').notNull(),      // critical | nice-to-have | transferable | has
}, (t) => [
  index('skill_records_analysis_id_idx').on(t.analysisId),
]);

// ---------------------------------------------------------------------------
// roadmap_phases
// Week-by-week roadmap entries stored as JSON blobs.
// ---------------------------------------------------------------------------
export const roadmapPhases = pgTable('roadmap_phases', {
  id:            uuid('id').primaryKey().defaultRandom(),
  analysisId:    uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  weekStart:     integer('week_start').notNull(),
  weekEnd:       integer('week_end').notNull(),
  focusArea:     text('focus_area').notNull(),
  topicsJson:    text('topics_json').notNull().default('[]'),
  resourcesJson: text('resources_json').notNull().default('[]'),
  projectJson:   text('project_json').notNull().default('{}'),
  milestone:     text('milestone').notNull().default(''),
}, (t) => [
  index('roadmap_phases_analysis_id_idx').on(t.analysisId),
]);

// ---------------------------------------------------------------------------
// community
// Anonymized aggregate entries that power the community section.
// analysis_id is nullable — demo/synthetic entries have no linked analysis.
// ---------------------------------------------------------------------------
export const community = pgTable('community', {
  id:             uuid('id').primaryKey().defaultRandom(),
  analysisId:     uuid('analysis_id').references(() => analyses.id, { onDelete: 'set null' }),
  targetRole:     text('target_role').notNull(),
  readinessScore: real('readiness_score').notNull(),
  topGap:         text('top_gap').notNull(),
  isPublic:       boolean('is_public').notNull().default(true),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('community_created_at_idx').on(t.createdAt),
  index('community_target_role_idx').on(t.targetRole),
]);

// ---------------------------------------------------------------------------
// ai_usage
// Per-step Groq API usage tracking. One row per callAndValidate() invocation.
// Aggregated by runAnalysis() into PipelineUsage (see lib/ai.ts).
// ---------------------------------------------------------------------------
export const aiUsage = pgTable('ai_usage', {
  id:                uuid('id').primaryKey().defaultRandom(),
  analysisId:        uuid('analysis_id').references(() => analyses.id, { onDelete: 'cascade' }),
  userId:            uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  step:              text('step').notNull(),         // skillExtraction | roleRequirements | ...
  model:             text('model').notNull(),
  promptVersion:     text('prompt_version').notNull().default(''),
  promptTokens:      integer('prompt_tokens').notNull().default(0),
  completionTokens:  integer('completion_tokens').notNull().default(0),
  totalTokens:       integer('total_tokens').notNull().default(0),
  latencyMs:         integer('latency_ms').notNull().default(0),
  estimatedCostUsd:  real('estimated_cost_usd').notNull().default(0),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ai_usage_user_id_idx').on(t.userId),
  index('ai_usage_analysis_id_idx').on(t.analysisId),
  index('ai_usage_created_at_idx').on(t.createdAt),
]);

// ---------------------------------------------------------------------------
// usage_buckets
// Atomic quota reservation. One row per (user_id, bucket_key) where
// bucket_key is the month string "YYYY-MM". A single atomic SQL statement
// increments the count or refuses if count >= limit — prevents concurrent
// requests from bypassing the quota.
// ---------------------------------------------------------------------------
export const usageBuckets = pgTable('usage_buckets', {
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bucketKey: text('bucket_key').notNull(),   // 'YYYY-MM' e.g. '2026-11'
  count:     integer('count').notNull().default(0),
  limitVal:  integer('limit_val').notNull().default(5),
}, (t) => [
  primaryKey({ columns: [t.userId, t.bucketKey], name: 'usage_buckets_pk' }),
  index('usage_buckets_user_id_idx').on(t.userId),
]);

// ---------------------------------------------------------------------------
// global_quota_buckets
// One row per calendar month ('YYYY-MM'). Tracks the total number of Groq
// requests attempted across ALL users — intentionally counts attempts, not
// completions, so failed requests that consumed provider tokens are charged.
// Atomic INSERT ... ON CONFLICT DO UPDATE prevents concurrent requests from
// both passing the cap check before either increments the counter.
// ---------------------------------------------------------------------------
export const globalQuotaBuckets = pgTable('global_quota_buckets', {
  bucketKey: text('bucket_key').primaryKey(),   // 'YYYY-MM'
  count:     integer('count').notNull().default(0),
  limitVal:  integer('limit_val').notNull().default(50),
});

// ---------------------------------------------------------------------------
// Relations (for Drizzle query builder joins)
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  analyses:     many(analyses),
  aiUsage:      many(aiUsage),
  usageBuckets: many(usageBuckets),
}));

export const usageBucketsRelations = relations(usageBuckets, ({ one }) => ({
  user: one(users, { fields: [usageBuckets.userId], references: [users.id] }),
}));

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  user:         one(users, { fields: [analyses.userId], references: [users.id] }),
  skillRecords: many(skillRecords),
  roadmapPhases: many(roadmapPhases),
  aiUsage:      many(aiUsage),
}));

export const skillRecordsRelations = relations(skillRecords, ({ one }) => ({
  analysis: one(analyses, { fields: [skillRecords.analysisId], references: [analyses.id] }),
}));

export const roadmapPhasesRelations = relations(roadmapPhases, ({ one }) => ({
  analysis: one(analyses, { fields: [roadmapPhases.analysisId], references: [analyses.id] }),
}));

export const communityRelations = relations(community, ({ one }) => ({
  analysis: one(analyses, { fields: [community.analysisId], references: [analyses.id] }),
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  analysis: one(analyses, { fields: [aiUsage.analysisId], references: [analyses.id] }),
  user:     one(users,    { fields: [aiUsage.userId],     references: [users.id] }),
}));
