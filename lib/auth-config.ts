/**
 * Auth.js v5 (next-auth@beta) configuration.
 *
 * Uses JWT sessions (stateless: no sessions table in Neon).
 * On first sign-in, the jwt() callback upserts the user into our `users` table
 * and stores their DB UUID in the token so subsequent route-handler calls
 * to getCurrentUser() do not need a DB lookup.
 *
 * The `users.clerk_id` column stores the OAuth provider account ID (Google sub)
 * going forward: the column name is a historical artifact from the Clerk era.
 *
 * AUTH_SECRET:    required in production; a placeholder is used in local dev
 *                 so NextAuth initializes without throwing when no credentials
 *                 are configured. DEV_BYPASS_ACTIVE = true in that case anyway.
 * AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET: required for Google OAuth to be active.
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { upsertUser } from './db';

// In local dev without AUTH_SECRET, use a placeholder so NextAuth initializes
// without throwing. No real sessions are created when Google credentials are
// absent, and DEV_BYPASS_ACTIVE = true so auth is not enforced.
const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV !== 'production'
    ? 'local-dev-insecure-placeholder-not-for-production-use'
    : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: process.env.AUTH_GOOGLE_ID
    ? [
        Google({
          clientId:     process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : [],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async jwt({ token, account }) {
      // `account` is only present on first sign-in; subsequent calls receive
      // an already-populated token with userId and providerId set.
      // `account` is populated only on the initial sign-in; not on token
      // refresh. upsertUser is atomic (INSERT ... ON CONFLICT DO UPDATE) so
      // concurrent first-sign-ins for the same provider account are safe.
      if (account?.providerAccountId) {
        try {
          const userId = await upsertUser(
            account.providerAccountId,
            (token.email as string) ?? '',
            (token.name as string | undefined) ?? undefined,
          );
          token.userId     = userId;
          token.providerId = account.providerAccountId;
        } catch (err) {
          console.error('[auth] jwt callback: upsertUser failed:', err);
          // token.userId is left unset: getCurrentUser() returns null,
          // which is handled as "unauthenticated" by route handlers.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.userId     = token.userId as string;
        session.user.providerId = token.providerId as string;
      }
      return session;
    },
  },
});
