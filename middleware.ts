/**
 * Next.js middleware.
 *
 * With Auth.js v5 and JWT sessions, route handlers call auth() directly from
 * lib/auth-config to read the session cookie: no middleware pre-attachment is
 * needed. This file is a no-op passthrough kept as a placeholder for future
 * security concerns (rate limiting, CSRF headers, etc.).
 *
 * Path-based access control is intentionally NOT done here: each route handler
 * enforces its own authorization via getCurrentUser() and checkAnalysisAccess().
 */
import { NextRequest, NextResponse } from 'next/server';

export function middleware(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
