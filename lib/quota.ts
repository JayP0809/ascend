/**
 * Per-user AI analysis quota enforcement.
 *
 * Quota is checked and reserved atomically before Groq is called — never
 * rely on client-supplied counts. Demo analyses never count against quota.
 *
 * Current policy: MONTHLY_ANALYSIS_QUOTA live analyses per user per 30-day
 * rolling window. Adjust this constant as Groq free-tier limits evolve.
 */
import { countRecentAnalyses } from './db';

/** Max live analyses per user in a rolling 30-day window. */
export const MONTHLY_ANALYSIS_QUOTA = 5;

export interface QuotaStatus {
  allowed:        boolean;
  used:           number;
  limit:          number;
  resetAt:        Date;
  /** Human-readable message shown to the user when quota is exhausted. */
  message?:       string;
}

/**
 * Returns whether the user is allowed to run a live analysis.
 * Always returns allowed=true for demo flows (userId null or isDemoFlow=true).
 */
export async function checkQuota(
  userId: string | null,
  isDemoFlow = false
): Promise<QuotaStatus> {
  // Demo flows are always free — never count against quota.
  if (isDemoFlow || !userId) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: thirtyDaysFromNow() };
  }

  const since = thirtyDaysAgo();
  const used  = await countRecentAnalyses(userId, since);

  if (used >= MONTHLY_ANALYSIS_QUOTA) {
    const resetAt = thirtyDaysFromNow();
    return {
      allowed: false,
      used,
      limit:   MONTHLY_ANALYSIS_QUOTA,
      resetAt,
      message: `You have used all ${MONTHLY_ANALYSIS_QUOTA} of your free analyses this month. Your quota resets on ${formatDate(resetAt)}.`,
    };
  }

  return {
    allowed: true,
    used,
    limit:   MONTHLY_ANALYSIS_QUOTA,
    resetAt: thirtyDaysFromNow(),
  };
}

function thirtyDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

function thirtyDaysFromNow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
