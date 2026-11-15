'use client';
import Link from 'next/link';
import { useAuth, UserButton } from '@clerk/nextjs';

const CLERK_CONFIGURED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Clerk-aware auth buttons for the navigation bar.
 *
 * Signed out → "Sign in" link + "Get started" outline button
 * Signed in  → Clerk UserButton (avatar + dropdown with Sign out)
 * No Clerk   → renders nothing (local dev without keys)
 *
 * Uses useAuth() because SignedIn/SignedOut are Server Components in
 * Clerk v7 and cannot be used inside 'use client' components.
 */
export function NavAuthButtons() {
  if (!CLERK_CONFIGURED) return null;
  return <ClerkAuthButtons />;
}

function ClerkAuthButtons() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show nothing while Clerk initialises to avoid a flash of wrong state.
  if (!isLoaded) {
    return <div className="h-9 w-16 rounded-lg bg-background border border-border" />;
  }

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'h-9 w-9 rounded-lg',
            userButtonPopoverCard:
              'bg-card border border-border shadow-lg rounded-xl',
            userButtonPopoverActionButton:
              'text-sm text-primary hover:bg-card-hover rounded-lg',
            userButtonPopoverActionButtonText: 'text-primary',
            userButtonPopoverFooter: 'hidden',
          },
          variables: {
            colorPrimary: '#E07A5F',
            borderRadius: '0.5rem',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/sign-in"
        className="text-sm font-medium text-secondary hover:text-primary transition-colors px-3 py-2 rounded-lg"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="text-sm font-medium px-4 py-2 rounded-lg border border-accent text-accent hover:bg-accent hover:text-white transition-colors"
      >
        Get started
      </Link>
    </div>
  );
}
