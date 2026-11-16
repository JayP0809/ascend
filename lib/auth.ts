/**
 * Authentication and authorization layer.
 *
 * Identity: When AUTH_SECRET + AUTH_GOOGLE_ID are set, getCurrentUser() reads
 * the Auth.js JWT session cookie and returns the internal DB user. When absent,
 * it returns null.
 *
 * Access control: checkAnalysisAccess() is the single authoritative function
 * for all analysis read/export operations. It enforces fail-closed behavior:
 *
 *   Dev mode (Auth.js absent + NODE_ENV !== 'production'):
 *     All operations allowed — single-user local development.
 *
 *   Production without Auth.js (misconfigured):
 *     All private operations denied with 503. Demo remains public.
 *     This prevents an accidental config omission from opening all data.
 *
 *   Auth.js configured:
 *     Authenticated user + owned analysis → allowed.
 *     Everything else (wrong user, ownerless record, unauthenticated) → denied.
 *     Ownerless records are PRIVATE by default — there is no "public" record
 *     concept other than demo IDs (handled before this function is called).
 *
 * NEVER trust a user ID from the request body or query string.
 * Always derive identity from getCurrentUser() which reads the Auth.js JWT.
 */
import { NextRequest } from 'next/server';

export interface AuthUser {
  userId:     string;   // internal Neon DB UUID (users.id)
  providerId: string;   // OAuth provider account ID (Google sub, stored in users.clerk_id)
  email:      string;
  name?:      string;
}

export const AUTH_CONFIGURED = !!(
  process.env.AUTH_SECRET &&
  process.env.AUTH_GOOGLE_ID
);

/**
 * Returns true if the authenticated user's email matches the server-side admin
 * email configured via ADMIN_EMAIL.
 *
 * ADMIN_EMAIL is a server-only env var — never in the client bundle.
 * The email argument must come from getCurrentUser() (a verified JWT session),
 * never from request body, query string, or any client-controlled source.
 *
 * Returns false when ADMIN_EMAIL is not set (no admin configured).
 */
export function isAdminUser(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

/** True only when running in a local development environment without Auth.js. */
export const DEV_BYPASS_ACTIVE =
  !AUTH_CONFIGURED && process.env.NODE_ENV !== 'production';

// ---------------------------------------------------------------------------
// Access control result
// ---------------------------------------------------------------------------

export type AccessResult =
  | { granted: true }
  | { granted: false; status: 401 | 404 | 503; message: string };

/**
 * Checks whether a request may access the analysis identified by `record`.
 *
 * Call this for every read, export, update, or deletion of a stored analysis.
 * Demo IDs must be handled BEFORE this call — they bypass the DB entirely.
 *
 * Returns `{ granted: true }` or `{ granted: false, status, message }`.
 * On false the caller must return a NextResponse with the given status.
 */
export function checkAnalysisAccess(
  record: { user_id: string | null },
  user: AuthUser | null,
): AccessResult {
  // ── Dev mode ──────────────────────────────────────────────────────────────
  if (DEV_BYPASS_ACTIVE) {
    return { granted: true };
  }

  // ── Misconfigured production ───────────────────────────────────────────────
  if (!AUTH_CONFIGURED) {
    return {
      granted: false,
      status: 503,
      message: 'Authentication service is not configured. Contact the site administrator.',
    };
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    return { granted: false, status: 401, message: 'Authentication required.' };
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  if (!record.user_id || record.user_id !== user.userId) {
    return { granted: false, status: 404, message: 'Analysis not found.' };
  }

  return { granted: true };
}

// ---------------------------------------------------------------------------
// Identity resolution via Auth.js JWT session
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user for the current request, or null.
 * Never throws — auth failure is treated as unauthenticated.
 *
 * Reads the Auth.js JWT session cookie and returns userId + providerId that
 * were stored in the token during sign-in (no DB lookup required here).
 */
export async function getCurrentUser(
  _request: NextRequest,
): Promise<AuthUser | null> {
  if (!AUTH_CONFIGURED) return null;

  try {
    const { auth } = await import('./auth-config');
    const session = await auth();
    if (!session?.user?.userId) return null;

    return {
      userId:     session.user.userId,
      providerId: session.user.providerId ?? '',
      email:      session.user.email ?? '',
      name:       session.user.name ?? undefined,
    };
  } catch (err) {
    console.error('[auth] getCurrentUser failed:', err);
    return null;
  }
}

/**
 * Returns whether a live (non-demo) analysis ID requires authentication.
 * Always false for demo IDs. True for real UUIDs when Auth.js is configured.
 */
export function requiresAuth(analysisId: string | undefined): boolean {
  if (!analysisId || analysisId.startsWith('demo-')) return false;
  return AUTH_CONFIGURED;
}
