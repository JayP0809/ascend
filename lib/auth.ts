/**
 * Authentication and authorization layer.
 *
 * Identity: When CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are set,
 * getCurrentUser() reads and verifies the Clerk session JWT and returns the
 * internal DB user. When absent, it returns null.
 *
 * Access control: checkAnalysisAccess() is the single authoritative function
 * for all analysis read/export operations. It enforces fail-closed behavior:
 *
 *   Dev mode (Clerk absent + NODE_ENV !== 'production'):
 *     All operations allowed — single-user local development.
 *
 *   Production without Clerk (misconfigured):
 *     All private operations denied with 503. Demo remains public.
 *     This prevents an accidental config omission from opening all data.
 *
 *   Clerk configured:
 *     Authenticated user + owned analysis → allowed.
 *     Everything else (wrong user, ownerless record, unauthenticated) → denied.
 *     Ownerless records are PRIVATE by default — there is no "public" record
 *     concept other than demo IDs (handled before this function is called).
 *
 * NEVER trust a user ID from the request body or query string.
 * Always derive identity from getCurrentUser() which reads the Clerk JWT.
 */
import { NextRequest } from 'next/server';
import { getUserByClerkId, upsertUser } from './db';

export interface AuthUser {
  userId:  string;
  clerkId: string;
  email:   string;
  name?:   string;
}

export const CLERK_CONFIGURED = !!(
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

/**
 * Returns true if the given Clerk user ID matches the server-side admin
 * account configured via ADMIN_CLERK_USER_ID.
 *
 * ADMIN_CLERK_USER_ID is a server-only env var — never in the client bundle.
 * The clerkId argument must come from getCurrentUser() (a Clerk-verified JWT),
 * never from request body, query string, or any client-controlled source.
 *
 * Returns false when ADMIN_CLERK_USER_ID is not set (no admin configured).
 */
export function isAdminUser(clerkId: string | null | undefined): boolean {
  const adminId = process.env.ADMIN_CLERK_USER_ID?.trim();
  if (!adminId || !clerkId) return false;
  return clerkId === adminId;
}

/** True only when running in a local development environment without Clerk. */
export const DEV_BYPASS_ACTIVE =
  !CLERK_CONFIGURED && process.env.NODE_ENV !== 'production';

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
  // Clerk is absent and we are NOT in production: open access for single-user
  // local development. This path must never be reachable in production.
  if (DEV_BYPASS_ACTIVE) {
    return { granted: true };
  }

  // ── Misconfigured production ───────────────────────────────────────────────
  // Clerk env vars are absent but NODE_ENV is 'production'. Fail closed.
  // Returning 503 (not 401) signals an infrastructure/configuration problem
  // rather than a missing credential from the user.
  if (!CLERK_CONFIGURED) {
    return {
      granted: false,
      status: 503,
      message: 'Authentication service is not configured. Contact the site administrator.',
    };
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  // Clerk is configured but no verified session. The middleware redirects
  // browser requests to sign-in, but API callers get a 401 here.
  if (!user) {
    return { granted: false, status: 401, message: 'Authentication required.' };
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  // Ownerless records (null user_id) are PRIVATE — no one can claim them after
  // the fact. Only the user whose ID matches user_id may access the record.
  if (!record.user_id || record.user_id !== user.userId) {
    return { granted: false, status: 404, message: 'Analysis not found.' };
  }

  return { granted: true };
}

// ---------------------------------------------------------------------------
// Identity resolution via Clerk
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user for the current request, or null.
 * Never throws — auth failure is treated as unauthenticated.
 */
export async function getCurrentUser(
  _request: NextRequest
): Promise<AuthUser | null> {
  if (!CLERK_CONFIGURED) return null;

  try {
    const { auth, currentUser } = await import('@clerk/nextjs/server');
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const existing = await getUserByClerkId(clerkId);
    if (existing) {
      return { userId: existing.id, clerkId, email: existing.email, name: existing.name ?? undefined };
    }

    // First sign-in: fetch full Clerk profile and upsert into DB
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const name  = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;

    const userId = await upsertUser(clerkId, email, name);
    return { userId, clerkId, email, name };
  } catch (err) {
    console.error('[auth] getCurrentUser failed:', err);
    return null;
  }
}

/**
 * Returns whether a live (non-demo) analysis ID requires authentication.
 * Always false for demo IDs. True for real UUIDs when Clerk is configured.
 */
export function requiresAuth(analysisId: string | undefined): boolean {
  if (!analysisId || analysisId.startsWith('demo-')) return false;
  return CLERK_CONFIGURED;
}
