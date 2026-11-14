/**
 * Per-user AI analysis quota enforcement with atomic PostgreSQL reservation.
 *
 * Race-condition prevention:
 *   A single CTE atomically increments the usage_buckets counter OR inserts
 *   a new row for the month, but only when count < limit. If the limit is
 *   already reached, the statement returns no rows — quota denied.
 *   Two concurrent requests cannot both succeed past the limit because the
 *   UPDATE's WHERE condition is evaluated under row-level locking.
 *
 * Quota policy:
 *   MONTHLY_ANALYSIS_QUOTA live analyses per authenticated user per calendar
 *   month. Configurable via ANALYSIS_QUOTA_PER_MONTH env var.
 *   Demo flows always bypass quota — they never call Groq.
 */

import { sql } from 'drizzle-orm';
import { getDbClient } from './db-client';

/** Default monthly quota. Override with ANALYSIS_QUOTA_PER_MONTH env var. */
export const MONTHLY_ANALYSIS_QUOTA = parseInt(
  process.env.ANALYSIS_QUOTA_PER_MONTH ?? '5',
  10
);

export interface QuotaStatus {
  allowed:   boolean;
  used:      number;
  limit:     number;
  resetAt:   Date;
  message?:  string;
}

/**
 * Atomically checks and reserves one quota slot for the current calendar month.
 * Returns allowed=true only if the slot was successfully reserved.
 *
 * Always returns allowed=true for demo flows (isDemoFlow=true) or when
 * userId is null (unauthenticated — before Clerk is configured).
 *
 * When DATABASE_URL is absent, falls back to in-memory check (always allowed
 * since there is no persistent user to track). This is safe: in-memory
 * quota only matters when a live database is present.
 */
export async function reserveQuotaSlot(
  userId: string | null,
  isDemoFlow = false
): Promise<QuotaStatus> {
  if (isDemoFlow || !userId) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth() };
  }

  const db = getDbClient();
  if (!db) {
    // No database — local dev without Neon. Allow and log.
    console.warn('[quota] No database available — quota not enforced in local dev mode.');
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth() };
  }

  const bucket = currentMonthBucket();
  const limit  = MONTHLY_ANALYSIS_QUOTA;

  // Single atomic statement using INSERT ... ON CONFLICT DO UPDATE:
  //   - If no row exists yet: INSERT with count=1
  //   - If row exists AND count < limit: increment count
  //   - If row exists AND count >= limit: DO UPDATE WHERE clause is false →
  //     the update is skipped → RETURNING returns no rows → quota denied
  //
  // This is safe against concurrent first-requests: two simultaneous inserts
  // race on the PRIMARY KEY (user_id, bucket_key). One wins the INSERT, the
  // other hits the conflict and goes through the DO UPDATE path — both get a
  // valid count returned. The old split UPDATE/INSERT CTE had a bug where the
  // second concurrent first-request could get 0 rows (insert conflict + no
  // update match) and be incorrectly denied even when quota remained.
  const result = await db.execute(sql`
    INSERT INTO usage_buckets (user_id, bucket_key, count, limit_val)
    VALUES (${userId}::uuid, ${bucket}, 1, ${limit})
    ON CONFLICT (user_id, bucket_key)
    DO UPDATE SET count = usage_buckets.count + 1
    WHERE usage_buckets.count < ${limit}
    RETURNING count
  `);

  const rows = result.rows as Array<{ count: number }>;

  if (rows.length === 0) {
    // Quota exhausted — could not increment
    const used = await getCurrentUsage(userId, bucket);
    return {
      allowed: false,
      used,
      limit,
      resetAt: endOfMonth(),
      message: `You have used all ${limit} of your free analyses this month. Your quota resets on ${formatDate(endOfMonth())}.`,
    };
  }

  const used = rows[0].count;
  return { allowed: true, used, limit, resetAt: endOfMonth() };
}

/**
 * Read-only check of current usage (no reservation).
 * Used for displaying quota status to the user.
 */
export async function getQuotaStatus(
  userId: string | null,
  isDemoFlow = false
): Promise<QuotaStatus> {
  if (isDemoFlow || !userId) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth() };
  }

  const db = getDbClient();
  if (!db) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth() };
  }

  const bucket = currentMonthBucket();
  const used = await getCurrentUsage(userId, bucket);
  const allowed = used < MONTHLY_ANALYSIS_QUOTA;

  return {
    allowed,
    used,
    limit:   MONTHLY_ANALYSIS_QUOTA,
    resetAt: endOfMonth(),
    message: allowed ? undefined
      : `You have used all ${MONTHLY_ANALYSIS_QUOTA} of your free analyses this month. Your quota resets on ${formatDate(endOfMonth())}.`,
  };
}

async function getCurrentUsage(userId: string, bucket: string): Promise<number> {
  const db = getDbClient();
  if (!db) return 0;

  const rows = await db.execute(sql`
    SELECT count FROM usage_buckets
    WHERE user_id = ${userId}::uuid AND bucket_key = ${bucket}
    LIMIT 1
  `);
  const r = rows.rows as Array<{ count: number }>;
  return r[0]?.count ?? 0;
}

/** Returns 'YYYY-MM' for the current month in UTC. */
function currentMonthBucket(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Returns the first moment of the next UTC month (quota reset point). */
function endOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
