'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

/**
 * Auth.js-aware auth buttons for the navigation bar.
 *
 * Not configured (AUTH_GOOGLE_ID absent)  → renders nothing (local dev)
 * Loading                                 → skeleton placeholder
 * Signed out                              → "Sign in with Google" button
 * Signed in                               → user email + "Sign out" link
 *
 * NEXT_PUBLIC_AUTH_ENABLED must be set to 'true' to enable the auth UI.
 * This avoids rendering sign-in buttons when Google credentials are not
 * configured (which would lead to a broken OAuth flow).
 */
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

export function NavAuthButtons() {
  if (!AUTH_ENABLED) return null;
  return <AuthButtons />;
}

function AuthButtons() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === 'loading') {
    return <div className="h-9 w-24 rounded-lg bg-background border border-border animate-pulse" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-secondary hidden sm:block truncate max-w-[180px]">
          {session.user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-border text-secondary hover:text-primary hover:border-accent transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  // After sign-in: return to the current page when it's a safe destination,
  // otherwise go home. Never redirect back to /dashboard without an analysis ID.
  const isSafePath =
    pathname !== null &&
    !pathname.startsWith('/sign-in') &&
    !pathname.startsWith('/sign-up') &&
    !pathname.startsWith('/api/') &&
    pathname !== '/dashboard'; // /dashboard without an ID is not useful post-login

  const signInCallback = isSafePath ? pathname : '/';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => signIn('google', { callbackUrl: signInCallback })}
        className="text-sm font-medium text-secondary hover:text-primary transition-colors px-3 py-2 rounded-lg"
      >
        Sign in
      </button>
      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="text-sm font-medium px-4 py-2 rounded-lg border border-border text-primary hover:border-accent hover:text-accent transition-colors"
      >
        Get started
      </button>
    </div>
  );
}
