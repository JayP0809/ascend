/**
 * Next.js middleware — authentication layer.
 *
 * When Clerk env vars are set, clerkMiddleware() attaches a Clerk session context
 * to every request so that route handlers can call auth() and getCurrentUser().
 * No path-based protection is done here — every route handler enforces its own
 * authorization via getCurrentUser() and checkAnalysisAccess(). This avoids the
 * deprecated createRouteMatcher pattern and prevents path-matching divergence.
 *
 * When Clerk env vars are absent (local dev without auth), all requests pass
 * through a no-op handler. getCurrentUser() returns null in this case, so the
 * app runs as a single unauthenticated user — demo mode is fully functional.
 */
import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

const CLERK_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

function devPassThrough(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

// clerkMiddleware with an empty callback: attaches Clerk session context to every
// request so that route handlers can call auth() / getCurrentUser().
// No path-based protection here — each route handler enforces its own auth
// via getCurrentUser() and checkAnalysisAccess(). Using the callback form (not
// clerkMiddleware() with no args) avoids a "self is not defined" edge-runtime
// initialization error in the Next.js dev server.
const clerkHandler = CLERK_CONFIGURED
  ? clerkMiddleware(() => { /* session context only */ })
  : null;

export const middleware = CLERK_CONFIGURED ? clerkHandler! : devPassThrough;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
