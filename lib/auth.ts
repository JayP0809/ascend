/**
 * Authentication abstraction layer.
 *
 * Returns the current user identity from the request context.
 * Today this is a stub — user identity comes from an optional X-User-Id
 * header (dev/testing only). When Clerk is configured, replace the body
 * of getCurrentUser() with Clerk's auth() call and upsertUser() DB sync.
 *
 * NEVER trust a user-provided userId from the request body. Always derive
 * it server-side from a verified session token.
 */
import { NextRequest } from 'next/server';

export interface AuthUser {
  /** Internal DB UUID for this user (from the users table). */
  userId: string;
  /** Clerk user ID — will be the same as userId once Clerk is live. */
  clerkId: string;
  email:   string;
}

/**
 * Extracts the current user from the request.
 * Returns null when the user is unauthenticated (demo/public flows).
 *
 * Clerk integration plan:
 *   import { auth } from '@clerk/nextjs/server';
 *   const { userId: clerkId } = await auth();
 *   if (!clerkId) return null;
 *   const user = await getUserByClerkId(clerkId);   // from lib/db
 *   return user ? { userId: user.id, clerkId, email: user.email } : null;
 */
export async function getCurrentUser(_request: NextRequest): Promise<AuthUser | null> {
  // Stub: no auth yet. All flows are unauthenticated until Clerk is configured.
  // When Clerk is live, remove this stub and uncomment the block above.
  return null;
}

/**
 * Returns whether the given route requires authentication.
 * Demo flows (id starts with "demo-") are always public.
 * Live analysis flows require auth once Clerk is configured.
 *
 * Keep this in sync with middleware.ts when Clerk is added.
 */
export function requiresAuth(analysisId: string | undefined): boolean {
  if (!analysisId) return false;
  if (analysisId.startsWith('demo-')) return false;
  // Once Clerk is live, return true for all non-demo IDs.
  // For now, auth is not enforced — single-user dev mode.
  return false;
}
