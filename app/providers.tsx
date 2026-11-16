'use client';
import { SessionProvider } from 'next-auth/react';

/**
 * Client-side session context wrapper.
 * Required for useSession() in client components (NavAuthButtons, etc.).
 * Does not pre-fetch the session — initial render shows loading state,
 * then the client fetches /api/auth/session automatically.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
