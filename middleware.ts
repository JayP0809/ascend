/**
 * Next.js middleware — authentication layer.
 *
 * When both NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set,
 * Clerk's clerkMiddleware runs and protects non-public routes. All public routes
 * (listed in isPublicRoute) are accessible without authentication.
 *
 * When Clerk env vars are absent (local dev), all requests pass through.
 * Authorization is still enforced inside each route handler via getCurrentUser(),
 * which returns null when Clerk is absent — the app treats every request as
 * unauthenticated (single-user dev mode). There is no security gap here because
 * getCurrentUser() returns null (not a fake user) when Clerk is absent.
 *
 * Public routes (always accessible without authentication):
 *   /                   Landing page
 *   /dashboard          Dashboard (demo mode works without auth)
 *   /api/community      Aggregate community data
 *   /api/roles          Target role list
 *   /api/upload         Resume upload (binds to user inside handler if authed)
 *   /api/analyze        GET for demo IDs; POST checks auth inside handler
 *   /sign-in /sign-up   Clerk-hosted auth pages
 *
 * Protected routes (require a signed-in Clerk session when configured):
 *   Everything else not in the public list.
 */
import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const CLERK_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

// Public routes — accessible without a Clerk session.
// When Clerk is not configured this list is never consulted, but it is kept
// here so it is ready to review when enabling authentication.
const isPublicRoute = createRouteMatcher([
  '/',
  '/dashboard',
  '/api/community(.*)',
  '/api/roles(.*)',
  '/api/upload',
  '/api/analyze(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Clerk middleware: runs when Clerk is configured and protects non-public routes.
// auth.protect() is the Clerk v7 middleware API (called on the auth object passed
// to the handler — NOT as auth().protect() which is the route handler pattern).
const clerkHandler = CLERK_CONFIGURED
  ? clerkMiddleware((auth, req) => {
      if (!isPublicRoute(req)) {
        auth.protect();
      }
    })
  : null;

function devPassThrough(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

// Export the appropriate handler. When CLERK_CONFIGURED=false, clerkHandler is
// null and clerkMiddleware() was never called, so the Clerk SDK is not invoked.
export const middleware = CLERK_CONFIGURED ? clerkHandler! : devPassThrough;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
