/**
 * Database access layer.
 *
 * Wraps Drizzle ORM (PostgreSQL). When DATABASE_URL is not configured,
 * all write operations are silent no-ops and reads return empty results :
 * demo mode runs entirely without a database connection.
 *
 * The same external interface is preserved so API routes do not change.
 */
import { eq, desc, sql, and, gte, count } from 'drizzle-orm';
import { getDbClient } from './db-client';
import {
  analyses,
  skillRecords,
  community,
  aiUsage,
  users,
} from './schema';
import type { PipelineUsage } from './ai';

// Re-export for callers that check availability
export { isDbAvailable } from './db-client';

// ---------------------------------------------------------------------------
// Analyses
// ---------------------------------------------------------------------------

export async function saveAnalysis(
  id: string,
  resumeText: string,
  targetRole: string,
  jobDescription: string | null,
  readinessScore: number,
  resultJson: string,
  options: { userId?: string; isDemoMode?: boolean } = {}
): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  // Upload path: creates the initial row with status='pending'.
  // Does not use onConflictDoUpdate for status so an in-progress analysis
  // cannot have its status reset to 'pending' by a stale upload retry.
  await db.insert(analyses).values({
    id,
    userId: options.userId ?? null,
    resumeText,
    targetRole,
    jobDescription,
    readinessScore,
    resultJson,
    isDemoMode: options.isDemoMode ?? false,
    status: 'pending',
  }).onConflictDoUpdate({
    target: analyses.id,
    set: {
      resumeText,
      targetRole,
      jobDescription,
      readinessScore,
      resultJson,
      isDemoMode: options.isDemoMode ?? false,
      // Intentionally not resetting status: an in-progress analysis should
      // not be interrupted by a concurrent upload retry on the same ID.
    },
  });
}

// ---------------------------------------------------------------------------
// DB-backed idempotency for POST /api/analyze
// ---------------------------------------------------------------------------

/** Possible outcomes of an atomic claim attempt. */
export type ClaimResult =
  | 'claimed'       // successfully transitioned pending → processing; this instance owns it
  | 'processing'    // another instance is currently processing this analysis
  | 'complete'      // result already exists; caller should return cached result
  | 'failed'        // non-retryable failure; user must re-upload
  | 'unavailable';  // status column not yet migrated; caller should use in-memory fallback

/**
 * Atomically claims an analysis for processing via a single UPDATE statement.
 *
 * Transitions pending → processing, or reclaims a stale processing reservation
 * (where another instance started > abandonedAfterMs ago and presumably crashed).
 *
 * Returns 'unavailable' if the status column does not exist yet (pre-migration
 * environment) so the caller can degrade gracefully to the in-memory guard.
 */
export async function claimAnalysisSlot(
  id: string,
  abandonedAfterMs = 120_000,
): Promise<ClaimResult> {
  const db = getDbClient();
  if (!db) return 'claimed'; // local dev without DB

  const abandonedBefore = new Date(Date.now() - abandonedAfterMs);

  try {
    const result = await db.execute(sql`
      UPDATE analyses
         SET status                = 'processing',
             processing_started_at = NOW()
       WHERE id = ${id}::uuid
         AND (
               status = 'pending'
               OR (status = 'processing' AND processing_started_at < ${abandonedBefore})
             )
    `);

    if ((result.rowCount ?? 0) > 0) return 'claimed';

    // Claim failed: read current status to tell the caller why.
    const rows = await db.execute(sql`
      SELECT status FROM analyses WHERE id = ${id}::uuid LIMIT 1
    `);
    const row = (rows.rows as Array<{ status: string }>)[0];
    if (!row) return 'claimed'; // row was deleted mid-request; let caller 404
    if (row.status === 'complete') return 'complete';
    if (row.status === 'failed')   return 'failed';
    return 'processing';
  } catch {
    // Column does not exist yet (pre-migration). Fall back gracefully.
    return 'unavailable';
  }
}

/**
 * Releases a processing claim: sets status back to 'pending' for retryable
 * failures or to 'failed' for non-retryable ones.
 * Silent no-op when db is absent or the status column does not exist yet.
 */
export async function releaseAnalysisClaim(
  id: string,
  toStatus: 'pending' | 'failed' = 'pending',
): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  try {
    await db.execute(sql`
      UPDATE analyses
         SET status                = ${toStatus},
             processing_started_at = NULL
       WHERE id = ${id}::uuid AND status = 'processing'
    `);
  } catch { /* status column not yet migrated: silent */ }
}

/**
 * Updates the analysis result and marks it complete.
 * Called instead of saveAnalysis() after a successful Groq pipeline run.
 */
export async function updateAnalysisResult(
  id: string,
  resumeText: string,
  targetRole: string,
  jobDescription: string | null,
  readinessScore: number,
  resultJson: string,
  userId?: string,
): Promise<void> {
  const db = getDbClient();
  if (!db) return;
  if (!userId) return;

  // Try the new path (with status column) first; fall back if not migrated.
  try {
    await db.execute(sql`
      UPDATE analyses
         SET resume_text        = ${resumeText},
             target_role        = ${targetRole},
             job_description    = ${jobDescription ?? null},
             readiness_score    = ${readinessScore},
             result_json        = ${resultJson},
             is_demo_mode       = false,
             status             = 'complete',
             processing_started_at = NULL
       WHERE id = ${id}::uuid
         AND user_id = ${userId}::uuid
    `);
  } catch {
    // Pre-migration fallback: update without the status columns.
    await db.update(analyses).set({
      resumeText,
      targetRole,
      jobDescription,
      readinessScore,
      resultJson,
      isDemoMode: false,
    }).where(and(eq(analyses.id, id), eq(analyses.userId, userId)));
  }
}

export async function getAnalysis(
  id: string
): Promise<{ id: string; result_json: string; target_role: string; resume_text: string; user_id: string | null } | null> {
  const db = getDbClient();
  if (!db) return null;

  const rows = await db
    .select({
      id:          analyses.id,
      result_json: analyses.resultJson,
      target_role: analyses.targetRole,
      resume_text: analyses.resumeText,
      user_id:     analyses.userId,
    })
    .from(analyses)
    .where(eq(analyses.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function getUserAnalyses(
  userId: string,
  limit = 10
): Promise<Array<{ id: string; target_role: string; readiness_score: number; created_at: Date }>> {
  const db = getDbClient();
  if (!db) return [];

  // Only return completed analyses. Pending/processing/failed rows have
  // result_json = '{}' and would show "Analysis not found" in the dashboard.
  //
  // Try the status-column path first (migration 0002 and later). Fall back to
  // filtering on result_json for pre-migration environments where the column
  // may not yet exist.
  try {
    return await db
      .select({
        id:              analyses.id,
        target_role:     analyses.targetRole,
        readiness_score: analyses.readinessScore,
        created_at:      analyses.createdAt,
      })
      .from(analyses)
      .where(and(eq(analyses.userId, userId), eq(analyses.status, 'complete')))
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  } catch {
    // Pre-migration fallback: status column not yet present — filter by
    // result_json instead so callers still get only completed analyses.
    return db
      .select({
        id:              analyses.id,
        target_role:     analyses.targetRole,
        readiness_score: analyses.readinessScore,
        created_at:      analyses.createdAt,
      })
      .from(analyses)
      .where(and(eq(analyses.userId, userId), sql`result_json != '{}'`))
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  }
}

export async function deleteUserAnalyses(userId: string): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  await db.delete(analyses).where(eq(analyses.userId, userId));
}

/**
 * Deletes a single analysis owned by the specified user.
 *
 * The WHERE clause enforces both identity and ownership atomically, so a
 * caller cannot delete another user's analysis even if they know its ID.
 *
 * Returns true when a row was deleted, false when no row matched (not found
 * or wrong user). Throws when the database operation itself fails so callers
 * can distinguish a genuine failure from a simple "not found".
 *
 * Child tables (skill_records, roadmap_phases, ai_usage) cascade-delete via
 * their FK constraints. The community table uses SET NULL so anonymized
 * aggregate entries are retained as designed.
 */
export async function deleteAnalysis(id: string, userId: string): Promise<boolean> {
  const db = getDbClient();
  if (!db) return false;

  const result = await db
    .delete(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, userId)))
    .returning({ id: analyses.id });

  return result.length > 0;
}

// ---------------------------------------------------------------------------
// Skill records
// ---------------------------------------------------------------------------

export async function saveSkillRecords(records: Array<{
  id: string;
  analysisId: string;
  skillName: string;
  category: string;
  hasSkill: boolean;
  importance: string;
}>): Promise<void> {
  const db = getDbClient();
  if (!db || records.length === 0) return;

  await db.insert(skillRecords).values(
    records.map((r) => ({
      id:         r.id,
      analysisId: r.analysisId,
      skillName:  r.skillName,
      category:   r.category,
      hasSkill:   r.hasSkill,
      importance: r.importance,
    }))
  );
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export async function saveCommunityEntry(
  id: string,
  targetRole: string,
  readinessScore: number,
  topGap: string,
  analysisId?: string
): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  await db.insert(community).values({
    id,
    analysisId: analysisId ?? null,
    targetRole,
    readinessScore,
    topGap,
    isPublic: true,
  }).onConflictDoNothing();
}

export async function getCommunityEntries(
  limit = 20
): Promise<Array<{ id: string; target_role: string; readiness_score: number; top_gap: string; created_at: Date }>> {
  const db = getDbClient();
  if (!db) return [];

  return db
    .select({
      id:              community.id,
      target_role:     community.targetRole,
      readiness_score: community.readinessScore,
      top_gap:         community.topGap,
      created_at:      community.createdAt,
    })
    .from(community)
    .where(eq(community.isPublic, true))
    .orderBy(desc(community.createdAt))
    .limit(limit);
}

export async function getTrendingSkills(): Promise<Array<{ skill: string; count: number }>> {
  const db = getDbClient();
  if (!db) return [];

  const rows = await db
    .select({
      skill: community.topGap,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(community)
    .where(eq(community.isPublic, true))
    .groupBy(community.topGap)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  return rows;
}

export async function getPopularRoles(): Promise<Array<{ role: string; count: number }>> {
  const db = getDbClient();
  if (!db) return [];

  const rows = await db
    .select({
      role:  community.targetRole,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(community)
    .where(eq(community.isPublic, true))
    .groupBy(community.targetRole)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return rows;
}

// ---------------------------------------------------------------------------
// AI usage tracking
// ---------------------------------------------------------------------------

export async function saveAiUsage(
  analysisId: string | null,
  userId: string | null,
  pipelineUsage: PipelineUsage
): Promise<void> {
  const db = getDbClient();
  if (!db || !pipelineUsage.steps.length) return;

  await db.insert(aiUsage).values(
    pipelineUsage.steps.map((s) => ({
      analysisId:       analysisId ?? null,
      userId:           userId ?? null,
      step:             s.name,
      model:            s.usage.model,
      promptVersion:    pipelineUsage.promptVersion,
      promptTokens:     s.usage.promptTokens,
      completionTokens: s.usage.completionTokens,
      totalTokens:      s.usage.totalTokens,
      latencyMs:        s.usage.latencyMs,
      estimatedCostUsd: s.usage.estimatedCostUsd,
    }))
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function upsertUser(clerkId: string, email: string, name?: string): Promise<string> {
  const db = getDbClient();
  if (!db) throw new Error('Database not available');

  // Atomic INSERT ... ON CONFLICT DO UPDATE prevents duplicate rows when two
  // concurrent first-sign-ins arrive for the same provider account.
  // The SELECT-then-INSERT pattern would let both see "no existing row" and
  // then race to INSERT, causing one to fail with a unique-constraint violation
  // that propagates as an unhandled error in the JWT callback.
  const result = await db
    .insert(users)
    .values({ clerkId, email, name })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, updatedAt: new Date() },
    })
    .returning({ id: users.id });

  return result[0].id;
}

export async function getUserByClerkId(
  clerkId: string
): Promise<{ id: string; email: string; name: string | null } | null> {
  const db = getDbClient();
  if (!db) return null;

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return rows[0] ?? null;
}

export async function deleteUser(userId: string): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  // Cascades delete analyses, skill_records, roadmap_phases, ai_usage
  await db.delete(users).where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Quota: count analyses for a user in the current 30-day window
// ---------------------------------------------------------------------------

export async function countRecentAnalyses(userId: string, since: Date): Promise<number> {
  const db = getDbClient();
  if (!db) return 0;

  const rows = await db
    .select({ value: count() })
    .from(analyses)
    .where(
      and(
        eq(analyses.userId, userId),
        gte(analyses.createdAt, since),
        eq(analyses.isDemoMode, false)
      )
    );

  return rows[0]?.value ?? 0;
}

/**
 * Counts all non-demo analyses across every user since `since`.
 * @deprecated Use reserveGlobalQuotaSlot/refundGlobalQuotaSlot for atomic enforcement.
 * Retained for backward-compat references only.
 */
export async function countTotalRecentAnalyses(since: Date): Promise<number> {
  const db = getDbClient();
  if (!db) return 0;

  const rows = await db
    .select({ value: count() })
    .from(analyses)
    .where(
      and(
        gte(analyses.createdAt, since),
        eq(analyses.isDemoMode, false)
      )
    );

  return rows[0]?.value ?? 0;
}

// ---------------------------------------------------------------------------
// Global Groq request quota: atomic reservation in global_quota_buckets
// Counts Groq *attempts*, not completions, so failed requests that consumed
// provider tokens are charged against the monthly budget.
// ---------------------------------------------------------------------------

export interface GlobalQuotaReservation {
  allowed:  boolean;
  used?:    number;
  limit?:   number;
  message?: string;
}

/**
 * Atomically reserves one global Groq request slot for the current month.
 *
 * Uses INSERT ... ON CONFLICT DO UPDATE with a WHERE guard so two concurrent
 * requests cannot both pass the cap. The global_quota_buckets table must
 * exist (migration 0002); returns allowed=true when it does not (pre-migration
 * environments) so callers degrade gracefully rather than hard-failing.
 */
export async function reserveGlobalQuotaSlot(limitVal: number): Promise<GlobalQuotaReservation> {
  const db = getDbClient();
  if (!db) return { allowed: true }; // local dev without DB

  const bucket = currentMonthBucket();

  try {
    const result = await db.execute(sql`
      INSERT INTO global_quota_buckets (bucket_key, count, limit_val)
      VALUES (${bucket}, 1, ${limitVal})
      ON CONFLICT (bucket_key)
      DO UPDATE
         SET count     = global_quota_buckets.count + 1,
             limit_val = ${limitVal}
       WHERE global_quota_buckets.count < ${limitVal}
      RETURNING count, limit_val
    `);

    const rows = result.rows as Array<{ count: number; limit_val: number }>;
    if (rows.length === 0) {
      // cap reached: read current count for the error message
      const cur = await db.execute(sql`
        SELECT count, limit_val FROM global_quota_buckets WHERE bucket_key = ${bucket} LIMIT 1
      `);
      const r = (cur.rows as Array<{ count: number; limit_val: number }>)[0];
      return {
        allowed: false,
        used:    r?.count ?? limitVal,
        limit:   r?.limit_val ?? limitVal,
        message:
          `The service has reached its monthly capacity (${r?.limit_val ?? limitVal} analyses). ` +
          'Demo mode is still available. Live analysis will resume next month.',
      };
    }

    return { allowed: true, used: rows[0].count, limit: rows[0].limit_val };
  } catch {
    // Table does not exist yet (pre-migration). Allow through: the per-user
    // quota remains authoritative for per-user limits.
    return { allowed: true };
  }
}

/**
 * Refunds one global slot: called when Groq never completed (timeout, network
 * error, validation failure). Silent no-op when table is absent.
 */
export async function refundGlobalQuotaSlot(): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  const bucket = currentMonthBucket();
  try {
    await db.execute(sql`
      UPDATE global_quota_buckets
         SET count = GREATEST(count - 1, 0)
       WHERE bucket_key = ${bucket}
    `);
  } catch { /* pre-migration: silent */ }
}

function currentMonthBucket(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ---------------------------------------------------------------------------
// Legacy synchronous shim: kept for internal transition period.
// The old `db` export is replaced by named async functions above.
// This shim re-exports the same shape for any code that hasn't been updated yet.
// ---------------------------------------------------------------------------
export const db = {
  saveAnalysis: (
    id: string,
    resumeText: string,
    targetRole: string,
    jobDescription: string | null,
    readinessScore: number,
    resultJson: string
  ) => saveAnalysis(id, resumeText, targetRole, jobDescription, readinessScore, resultJson),

  getAnalysis: (id: string) => getAnalysis(id),

  saveSkillRecords: (records: Parameters<typeof saveSkillRecords>[0]) => saveSkillRecords(records),

  saveCommunityEntry: (id: string, targetRole: string, readinessScore: number, topGap: string) =>
    saveCommunityEntry(id, targetRole, readinessScore, topGap),

  getCommunityEntries: (limit?: number) => getCommunityEntries(limit),
  getTrendingSkills: () => getTrendingSkills(),
  getPopularRoles: () => getPopularRoles(),
};
