/**
 * Database access layer.
 *
 * Wraps Drizzle ORM (PostgreSQL). When DATABASE_URL is not configured,
 * all write operations are silent no-ops and reads return empty results —
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

  await db.insert(analyses).values({
    id,
    userId: options.userId ?? null,
    resumeText,
    targetRole,
    jobDescription,
    readinessScore,
    resultJson,
    isDemoMode: options.isDemoMode ?? false,
  }).onConflictDoUpdate({
    target: analyses.id,
    set: {
      resumeText,
      targetRole,
      jobDescription,
      readinessScore,
      resultJson,
      isDemoMode: options.isDemoMode ?? false,
    },
  });
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

  return db
    .select({
      id:             analyses.id,
      target_role:    analyses.targetRole,
      readiness_score: analyses.readinessScore,
      created_at:     analyses.createdAt,
    })
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
}

export async function deleteUserAnalyses(userId: string): Promise<void> {
  const db = getDbClient();
  if (!db) return;

  await db.delete(analyses).where(eq(analyses.userId, userId));
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

// ---------------------------------------------------------------------------
// Legacy synchronous shim — kept for internal transition period.
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
