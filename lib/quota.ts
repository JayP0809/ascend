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
import { isAdminUser } from './auth';
import { countTotalRecentAnalyses } from './db';

/** Default monthly quota per user. Override with ANALYSIS_QUOTA_PER_MONTH env var. */
export const MONTHLY_ANALYSIS_QUOTA = parseInt(
  process.env.ANALYSIS_QUOTA_PER_MONTH ?? '5',
  10
);

/**
 * Global monthly cap across ALL users combined.
 * Prevents the app from exhausting Groq's free tier (30 RPM, ~500K tokens/day)
 * or Vercel Hobby bandwidth limits due to unexpected traffic spikes.
 *
 * Conservative default: 50 analyses/month total (~250 Groq calls, ~375K tokens).
 * Override with GLOBAL_MONTHLY_ANALYSIS_QUOTA env var.
 * Admins count toward the global cap but not their own per-user cap.
 */
export const GLOBAL_MONTHLY_ANALYSIS_QUOTA = parseInt(
  process.env.GLOBAL_MONTHLY_ANALYSIS_QUOTA ?? '50',
  10
);

/**
 * Checks whether the global monthly analysis cap has been reached.
 * Returns { allowed: true } or { allowed: false, message }.
 *
 * Always allows when DATABASE_URL is absent (local dev without DB).
 * Always allows demo flows — this is only called for live analyses.
 */
export async function checkGlobalQuota(): Promise<{ allowed: boolean; message?: string }> {
  const db = getDbClient();
  if (!db) return { allowed: true }; // local dev without DB

  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const total = await countTotalRecentAnalyses(since);

  if (total >= GLOBAL_MONTHLY_ANALYSIS_QUOTA) {
    return {
      allowed: false,
      message:
        `The service has reached its monthly capacity (${GLOBAL_MONTHLY_ANALYSIS_QUOTA} analyses). ` +
        'Demo mode is still available. Live analysis will resume next month.',
    };
  }

  return { allowed: true };
}

export interface QuotaStatus {
  allowed:      boolean;
  used:         number;
  limit:        number;
  resetAt:      Date;
  message?:     string;
  /** True when the slot was reserved without enforcing the monthly limit. */
  adminExempt?: boolean;
}

/**
 * Atomically checks and reserves one quota slot for the current calendar month.
 * Returns allowed=true only if the slot was successfully reserved.
 *
 * Always returns allowed=true for demo flows (isDemoFlow=true) or when
 * userId is null (unauthenticated — before Auth.js is configured).
 *
 * When email matches ADMIN_EMAIL, the slot is tracked but the monthly limit
 * is not enforced. adminExempt=true is set on the result.
 *
 * When DATABASE_URL is absent, falls back to in-memory check (always allowed
 * since there is no persistent user to track). This is safe: in-memory
 * quota only matters when a live database is present.
 *
 * email MUST come from getCurrentUser() (a server-verified JWT session),
 * never from the request body or any client-controlled source.
 */
export async function reserveQuotaSlot(
  userId: string | null,
  isDemoFlow = false,
  email?: string | null,
): Promise<QuotaStatus> {
  if (isDemoFlow || !userId) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth() };
  }

  const admin = isAdminUser(email);

  const db = getDbClient();
  if (!db) {
    console.warn('[quota] No database available — quota not enforced in local dev mode.');
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth(), adminExempt: admin || undefined };
  }

  const bucket = currentMonthBucket();
  const limit  = MONTHLY_ANALYSIS_QUOTA;

  if (admin) {
    // Admin path: always increment, never block. No WHERE clause on DO UPDATE.
    // Usage is tracked so token/cost reporting remains accurate.
    const result = await db.execute(sql`
      INSERT INTO usage_buckets (user_id, bucket_key, count, limit_val)
      VALUES (${userId}::uuid, ${bucket}, 1, ${limit})
      ON CONFLICT (user_id, bucket_key)
      DO UPDATE SET count = usage_buckets.count + 1
      RETURNING count
    `);
    const rows = result.rows as Array<{ count: number }>;
    const used = rows[0]?.count ?? 1;
    return { allowed: true, used, limit, resetAt: endOfMonth(), adminExempt: true };
  }

  // Regular user path: atomic INSERT ... ON CONFLICT DO UPDATE with limit guard.
  //
  // Single atomic statement:
  //   - If no row exists: INSERT with count=1
  //   - If row exists AND count < limit: increment count
  //   - If row exists AND count >= limit: DO UPDATE WHERE clause is false →
  //     the update is skipped → RETURNING returns no rows → quota denied
  //
  // Concurrent first-requests race on the PRIMARY KEY. One wins the INSERT;
  // the other hits the conflict and executes the DO UPDATE path — both get a
  // valid count. The old split UPDATE/INSERT CTE incorrectly denied the second
  // concurrent first-request (DO NOTHING + no UPDATE match = 0 rows).
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
 * Atomically refunds (decrements) one quota slot for the current calendar month.
 *
 * Call this when an analysis fails AFTER a slot was reserved but BEFORE a
 * completed result is saved — the user got no value, so they may retry
 * without penalty. Uses GREATEST(..., 0) to prevent negative counts.
 *
 * Safe to call concurrently: the UPDATE is atomic at the row level.
 * Silent no-op when db is absent or userId is null.
 */
export async function refundQuotaSlot(
  userId: string | null,
  _email?: string | null,
): Promise<void> {
  if (!userId) return;

  const db = getDbClient();
  if (!db) return;

  const bucket = currentMonthBucket();
  await db.execute(sql`
    UPDATE usage_buckets
    SET count = GREATEST(count - 1, 0)
    WHERE user_id = ${userId}::uuid AND bucket_key = ${bucket}
  `);
}

/**
 * Read-only check of current usage (no reservation).
 * Used for displaying quota status to the user.
 */
export async function getQuotaStatus(
  userId: string | null,
  isDemoFlow = false,
  email?: string | null,
): Promise<QuotaStatus> {
  if (isDemoFlow || !userId) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth() };
  }

  const admin = isAdminUser(email);

  const db = getDbClient();
  if (!db) {
    return { allowed: true, used: 0, limit: MONTHLY_ANALYSIS_QUOTA, resetAt: endOfMonth(), adminExempt: admin || undefined };
  }

  const bucket = currentMonthBucket();
  const used = await getCurrentUsage(userId, bucket);
  // Admins are always allowed regardless of usage count.
  const allowed = admin || used < MONTHLY_ANALYSIS_QUOTA;

  return {
    allowed,
    used,
    limit:      MONTHLY_ANALYSIS_QUOTA,
    resetAt:    endOfMonth(),
    adminExempt: admin || undefined,
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
