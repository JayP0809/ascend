# Ascend 2.0 — Cloud Connection Guide

**Status:** Local implementation complete. This guide covers the steps to connect
Neon, Clerk, and Vercel. No external resources have been provisioned yet.
All steps below require your explicit approval before execution.

---

## What is ready locally

| Component | Status | File(s) |
|---|---|---|
| Drizzle schema | Done | `lib/schema.ts` |
| Initial migration SQL | Done | `drizzle/migrations/0000_initial.sql` |
| DB client (graceful fallback) | Done | `lib/db-client.ts` |
| All DB operations (async) | Done | `lib/db.ts` |
| Auth stub (Clerk-ready) | Done | `lib/auth.ts` |
| Clerk middleware (conditional) | Done | `middleware.ts` |
| Quota enforcement (5/month, atomic) | Done | `lib/quota.ts` |
| IDOR ownership checks | Done | `app/api/analyze/route.ts`, `app/api/export/route.ts` |
| Upload user binding | Done | `app/api/upload/route.ts` |
| npm scripts: db:generate/migrate/push/studio | Done | `package.json` |

The app builds and all 55 tests pass without a database or Clerk connection.
Demo mode is fully functional without any external services.

---

## Required environment variables

Add these to Vercel's environment variable dashboard. Never commit them.

```
# PostgreSQL (Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Authentication (Clerk) — added after Clerk is configured
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# AI
GROQ_API_KEY=gsk_...

# Rate limiting (Upstash) — added after Upstash is configured
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Error monitoring (Sentry — optional)
SENTRY_DSN=https://...@sentry.io/...
```

---

## Step 1: Provision Neon (requires approval)

1. Create a free account at https://neon.tech (no credit card)
2. Create a new project named `ascend`
3. Copy the connection string from the Neon dashboard
4. Set `DATABASE_URL` in your local `.env.local`
5. Run the migration:
   ```bash
   npm run db:migrate
   ```
   This applies `drizzle/migrations/0000_initial.sql` to the Neon database.
6. Verify the tables were created using Drizzle Studio:
   ```bash
   npm run db:studio
   ```
7. Test locally:
   ```bash
   npm run dev
   ```
   Upload a resume and run an analysis — the result should persist and be retrievable.

**Neon branching for safe migrations:**
Before applying future migrations, create a Neon branch:
- Neon dashboard → Branches → "Create branch from main"
- Run `DATABASE_URL=<branch-url> npm run db:migrate` to test on the branch
- After verification, apply to main

---

## Step 2: Configure Clerk (requires approval)

**Verify card-free signup** at https://clerk.com/pricing before creating an account.

1. Create a Clerk application named `ascend`
2. Enable Google OAuth in Clerk dashboard → Social connections
3. Copy `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Install the Clerk package:
   ```bash
   npm install @clerk/nextjs --legacy-peer-deps
   ```
5. Create `middleware.ts`:
   ```typescript
   import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

   const isPublicRoute = createRouteMatcher([
     '/',
     '/api/upload',
     '/api/community',
     '/api/roles',
     '/dashboard',  // demo mode is public; auth check is per-analysis-id
   ]);

   export default clerkMiddleware((auth, req) => {
     if (!isPublicRoute(req)) auth().protect();
   });

   export const config = {
     matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
   };
   ```
6. Update `app/layout.tsx` to wrap in `<ClerkProvider>`
7. Update `lib/auth.ts` — replace the stub with Clerk's `auth()`:
   ```typescript
   import { auth } from '@clerk/nextjs/server';
   import { getUserByClerkId, upsertUser } from './db';

   export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
     const { userId: clerkId } = await auth();
     if (!clerkId) return null;
     // Sync user to our DB on first sign-in
     const session = await auth();
     const email = session.sessionClaims?.email as string ?? '';
     const name  = session.sessionClaims?.name as string ?? undefined;
     const userId = await upsertUser(clerkId, email, name);
     return { userId, clerkId, email };
   }
   ```
8. Update `lib/auth.ts` `requiresAuth()`:
   ```typescript
   export function requiresAuth(analysisId: string | undefined): boolean {
     if (!analysisId || analysisId.startsWith('demo-')) return false;
     return true; // All live analysis IDs require auth
   }
   ```
9. Add sign-in/sign-out buttons to the landing page and dashboard header

**Testing checklist:**
- [ ] Sign in with Google works
- [ ] Demo mode (`/dashboard?id=demo-*`) works without sign-in
- [ ] Authenticated user can save and retrieve their own analyses
- [ ] Unauthenticated request to `POST /api/analyze` with a real analysis ID returns 401
- [ ] User A cannot retrieve User B's analysis

---

## Step 3: Deploy to Vercel (requires approval)

**Confirm the repo is public** (required for free GitHub Actions minutes).

1. Go to https://vercel.com and import the GitHub repository
2. Set all environment variables in Vercel dashboard (see list above)
3. Enable the Neon integration in Vercel: Vercel dashboard → Integrations → Neon
   (this auto-injects `DATABASE_URL` for each deployment environment)
4. Push to `main` to trigger the first deployment:
   ```bash
   git push origin phase-1a:main
   ```
5. Add the GitHub Actions deploy step to `.github/workflows/ci.yml`:
   ```yaml
   deploy:
     needs: [build]
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - run: npm install -g vercel --legacy-peer-deps
       - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
   ```
6. Set `VERCEL_TOKEN` as a GitHub Actions secret

---

## Step 4: Configure Upstash rate limiting (requires approval)

**Verify card-free signup** at https://upstash.com/pricing before creating an account.

1. Create a Redis database named `ascend-ratelimit`
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Install:
   ```bash
   npm install @upstash/ratelimit @upstash/redis --legacy-peer-deps
   ```
4. Create `lib/ratelimit.ts`:
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   const redis = new Redis({
     url:   process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });

   // 5 live analyses per user per hour (burst protection; quota enforces monthly)
   export const analysisLimiter = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(5, '1 h'),
     prefix:  'ascend:analyze',
   });

   // 10 uploads per user per hour
   export const uploadLimiter = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(10, '1 h'),
     prefix:  'ascend:upload',
   });

   // 20 requests per IP per minute for public routes
   export const publicLimiter = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(20, '1 m'),
     prefix:  'ascend:public',
   });
   ```
5. Add rate-limit checks to `/api/analyze` and `/api/upload` routes

---

## Step 5: Add PostHog analytics (requires approval)

No card required. Create a free account at https://posthog.com.

1. Copy `NEXT_PUBLIC_POSTHOG_KEY` from PostHog dashboard
2. Install:
   ```bash
   npm install posthog-js posthog-node --legacy-peer-deps
   ```
3. Create `lib/analytics.ts` for server-side events
4. Add PostHog provider to `app/layout.tsx` for client-side events
5. Instrument: `analysis_started`, `analysis_completed`, `analysis_failed`, `export_pdf_clicked`

---

## Expected free-tier constraints at launch

| Constraint | Impact | Mitigation |
|---|---|---|
| Groq ~6K TPM | 1–4 concurrent analyses/min | Graceful 429 handling (already in lib/ai.ts) |
| Neon 5-min auto-sleep | +500ms first request after idle | Acceptable for portfolio; disclose in UI |
| Neon 1 GB storage | ~500K analyses before limit | Display storage warning at 80% |
| Vercel Hobby non-commercial | Must stay free/non-monetized | Document; migrate to Pro if monetized |
| Groq 14K RPD | 3,500 full analyses/day | Per-user quota prevents runaway usage |
| PostHog 1M events/month | ~33K events/day | Instrument only meaningful events |

---

## Remaining security concerns

1. **Clerk webhook not yet implemented** — user records are created lazily on first API call. Consider adding a Clerk webhook endpoint to create user records on sign-up.
2. **Analysis ID authorization** — currently any authenticated user can call `GET /api/analyze?id=X` with any UUID. Must add `WHERE user_id = currentUserId` check once auth is live.
3. **Resume text in DB** — `analyses.resume_text` stores up to 8,000 chars of extracted resume text. Ensure Neon database access is restricted to the application's connection string only. Consider encrypting this column in a future milestone.
4. **Rate limiting not yet live** — Upstash integration is documented but not yet implemented. Until it is, the per-user monthly quota (5/month) is the only protection against API abuse.
5. **No ToS or Privacy Policy** — required before public launch. Must accurately disclose Groq processing of resume text.

---

## Git state

Current branch: `phase-1a`

Commits on this branch (not yet pushed or merged to main):
1. `45a76d8` — Milestone 1+2+3: Engineering foundation and AI reliability
2. `a66ec8a` — Milestone 4A: PostgreSQL/Drizzle migration (local preparation)

**Waiting for your approval to push to GitHub.**
