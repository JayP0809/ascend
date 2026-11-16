# Ascend 2.0: Zero-Cost Production Architecture

**Status:** Proposal. No services provisioned. No migrations performed. All decisions below require explicit approval before implementation.

**Non-negotiable constraint:** Every service must have a genuine ongoing free tier. No promotional credits, no auto-billing overages, no trials.

**Research date:** November 2026

---

## Table of Contents

1. [Zero-Cost Compliance Matrix](#1-zero-cost-compliance-matrix)
2. [Architecture Overview](#2-architecture-overview)
3. [Per-Component Design](#3-per-component-design)
4. [Graceful Degradation Plan](#4-graceful-degradation-plan)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Decisions Requiring Approval](#6-decisions-requiring-approval)
7. [Current State vs. Target State](#7-current-state-vs-target-state)

---

## 1. Zero-Cost Compliance Matrix

| Provider | Plan | Ongoing? | Key Free Limits | Card Required | Overage Behavior | Commercial Use | Charge Risk | Status |
|---|---|---|---|---|---|---|---|---|
| **Vercel Hobby** | Hobby | ✅ Yes | 100 GB BW/mo, 1M fn invocations/mo | No | Pauses (no charge) | ⚠️ Non-commercial only | Low | ✅ Approved for portfolio |
| **Neon** | Free | ✅ Yes | 1 GB storage, 100 CU-hr/mo | No | Hard stop (no charge) | None | None | ✅ Safe |
| **Clerk** | Hobby | ✅ Yes | 50,000 MRU/mo, Google OAuth | No | Upgrade prompt | None | None | ✅ Safe |
| **Groq** | Default | ✅ Yes | 30 RPM, ~6K TPM, ~14K RPD | No | 429 error (no charge) | None | None | ✅ Safe |
| **PostHog** | Free Cloud | ✅ Yes | 1M events/mo, 1yr retention | No | Events dropped | None | Low | ✅ Safe |
| **Sentry** | Developer | ✅ Yes | 5K errors/mo, 1 user | ⚠️ Unclear | Errors dropped | None | Low | ⚠️ Verify before signup |
| **Upstash Redis** | Free | ✅ Yes | 500K cmds/mo, 256 MB | ⚠️ Unclear | Hard stop (without card) | None | Low | ⚠️ Verify before signup |
| **GitHub Actions** | Free | ✅ Yes | Unlimited (public repo) | No | N/A | None | None | ✅ Safe |

### Detailed notes

**Vercel Hobby: commercial use restriction**
Vercel Hobby is restricted to personal, non-commercial projects. Charging users, running ads, or being paid to build/host the site require the Pro plan ($20/month). A free-to-use student portfolio app with no monetization qualifies as non-commercial. This is acceptable for Ascend now. If Ascend ever adds paid features, migrate to Vercel Pro. Document this restriction so it is never overlooked.

**Neon: 5-minute auto-sleep**
Free-tier compute auto-sleeps after 5 minutes of inactivity. Cold-start adds ~500ms on the first request after idle. For a portfolio demo this is acceptable. The database never loses data on sleep; it only pauses compute.

**Groq: TPM is the real bottleneck**
Ascend makes 4 Groq API calls per analysis (skill extraction, role requirements, gap analysis, roadmap). Each call likely consumes 500–1,500 tokens. At ~6,000 TPM free, that means only 1–4 concurrent analyses per minute before rate-limiting. Under sustained load, users will receive 429 errors. The app must handle these gracefully (see §4). For a portfolio demo with low traffic, this is adequate.

**Sentry and Upstash card requirement**
Third-party sources could not confirm whether these services require a credit card to create a free account. Verify at their respective pricing pages before creating accounts. If a card is required and the risk of accidental charges is unacceptable:
- Sentry alternative: PostHog captures some frontend errors; structured logging to Vercel's built-in log viewer covers server errors adequately for a portfolio scale
- Upstash alternative: a Neon PostgreSQL rate-limit table (adds ~20ms DB latency per check)

---

## 2. Architecture Overview

```
                     ┌─────────────────────────────────────────────────┐
                     │                   BROWSER                        │
                     │   Next.js App  (React 19, TypeScript)            │
                     │   PostHog JS SDK  →  product analytics           │
                     └────────────────────────┬────────────────────────┘
                                              │ HTTPS
                     ┌────────────────────────▼────────────────────────┐
                     │              VERCEL HOBBY                        │
                     │   Static assets  +  Edge Network CDN             │
                     │   Next.js App Router  (SSR + RSC)                │
                     │   API Routes  (Serverless Functions)             │
                     │   Vercel middleware  (auth guard, rate-limit)    │
                     └───┬────────────────────┬────────────────────────┘
                         │                    │
         ┌───────────────▼──────┐   ┌────────▼────────────────────────┐
         │   Clerk Hobby        │   │   Upstash Redis Free            │
         │   Auth + Google SSO  │   │   Sliding-window rate limiter   │
         │   User identity      │   │   Per-user AI quota tracking    │
         └──────────────────────┘   └─────────────────────────────────┘
                         │
         ┌───────────────▼──────────────────────────────────────────────┐
         │                 Neon PostgreSQL Free                          │
         │   Drizzle ORM  (type-safe queries, SQL migration files)      │
         │   users  |  analyses  |  skill_records  |  roadmap_phases    │
         │   roadmap_milestones  |  user_events  |  ai_usage            │
         └──────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────▼──────────────────────────────────────────────┐
         │                 Groq Free API                                 │
         │   openai/gpt-oss-20b (or current equivalent)                 │
         │   4 calls per analysis  |  Zod-validated responses           │
         │   30s timeout  |  2 retries  |  usage tracked in DB          │
         └──────────────────────────────────────────────────────────────┘

OBSERVABILITY
         ┌────────────────────────┐   ┌─────────────────────────────────┐
         │   PostHog Free Cloud   │   │   Sentry Developer (or Vercel  │
         │   Product analytics    │   │   built-in logs as fallback)    │
         │   1M events/month      │   │   5K errors/month               │
         └────────────────────────┘   └─────────────────────────────────┘

CI/CD
         ┌────────────────────────────────────────────────────────────────┐
         │   GitHub Actions (public repo → unlimited minutes)             │
         │   typecheck → lint → test → eval (det.) → build → deploy      │
         └────────────────────────────────────────────────────────────────┘
```

---

## 3. Per-Component Design

### 3.1 Hosting: Vercel Hobby

- Next.js 15 App Router with React Server Components
- Serverless function timeout: Vercel Hobby supports up to ~300s execution (verify on current Vercel docs: third-party sources only). Groq analysis currently takes 10–30s over 4 sequential calls. This should be safe.
- If Vercel enforces a stricter timeout: parallelize the two independent calls (`extractSkills` + `getRoleRequirements` already run concurrently in the current code), which halves wall-clock time.
- Environment variables: `GROQ_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`
- Preview deployments per PR: useful for solo developer

### 3.2 Database: Neon PostgreSQL + Drizzle ORM

**Why Neon over Supabase, PlanetScale, or Railway:**
- Genuinely free, no card, 1 GB storage with hard stop (not auto-charge)
- Native serverless HTTP driver (`@neondatabase/serverless`): no persistent connection pool, works correctly in Vercel serverless functions
- Database branching: create an isolated branch per PR for safe migration testing
- 100 CU-hours/month is generous for sporadic portfolio traffic

**Why Drizzle over Prisma:**
- Schema defined in TypeScript, migrations are plain SQL files (readable, debuggable, reviewable)
- No binary Prisma engine to compile: faster cold starts, smaller function bundles
- Type-safe query builder without code generation step
- Easier to explain in a SQL-focused data engineering interview

**Schema (target):**

```sql
users           (id, clerk_id, email, name, created_at)
analyses        (id, user_id, target_role, readiness_score, created_at, raw_json)
skill_records   (id, analysis_id, skill, category, is_gap, priority)
roadmap_phases  (id, analysis_id, phase_number, title, duration_weeks, raw_json)
roadmap_milestones (id, phase_id, week, title, description, completed)
ai_usage        (id, analysis_id, step, model, prompt_tokens, completion_tokens,
                 latency_ms, estimated_cost_usd, created_at)
user_events     (id, user_id, event, properties_json, created_at)
```

Note: `raw_json` stores the full structured AI response. All PII: only `email` and `name` from Clerk. Resume text is NOT stored in the database (we store only extracted skill data, as today).

**Migration strategy:**
1. Write Drizzle schema matching the table definitions above
2. `drizzle-kit generate` → produces SQL migration files in `drizzle/migrations/`
3. Test migration on a Neon branch (`drizzle-kit push --config=drizzle.config.ts`)
4. Apply to main Neon database only after full review
5. Never auto-migrate on startup: always a deliberate `drizzle-kit migrate` step

### 3.3 Authentication: Clerk Hobby

**Why Clerk over Auth.js / NextAuth v5:**
- Pre-built UI for sign-in, sign-up, user profile: zero custom auth UI to maintain
- Google Sign-In with one config entry
- Native Next.js App Router middleware (`clerkMiddleware()`)
- 50,000 MRU free: functionally unlimited for a portfolio app
- User management dashboard built in
- Security critical: custom auth means custom JWT handling, custom session management, custom CSRF protection: not appropriate for a solo portfolio project

**Flow:**
- Landing page and demo mode: public, no auth required
- `/dashboard?id=demo-*`: public demo, works without login
- Real analysis (upload + analyze): requires Clerk session
- All `/api/analyze`, `/api/upload`, `/api/results/*` endpoints check `auth()` from Clerk middleware and reject unauthenticated requests

**User data isolation:** Every `analyses` record stores `user_id` (Clerk ID). API routes query `WHERE user_id = auth().userId`: a valid session cannot access another user's data.

### 3.4 File and Resume Storage

**No raw file storage needed.**
Current implementation already extracts text from PDF/DOCX at upload time and discards the binary. Only the extracted text (truncated to 8,000 characters) is used. We do not persist the original file.

Privacy benefit: if a user deletes their account, there is no file to track down and delete.

If resume versioning is added later: Vercel Blob (500 MB free, integrated with Vercel Hobby) is the natural next step. Not needed for initial launch.

### 3.5 AI Integration: Groq Free API

**Rate limit handling (required for production):**
- On HTTP 429 from Groq: return a clear user-facing error ("AI analysis is temporarily at capacity: try again in a moment, or use the demo to explore the app")
- Implement exponential backoff on the existing `callAndValidate()` retry loop (currently fixed retry, should respect `Retry-After` header)
- Do not retry indefinitely on 429: fail fast and show the graceful fallback

**Per-user quota:**
- Proposed: 10 live analyses per user per 30-day window
- Tracked in the `ai_usage` table: `SELECT COUNT(*) FROM ai_usage WHERE user_id = ? AND created_at > NOW() - INTERVAL '30 days'`
- If quota exceeded: return quota-exhaustion error with count reset date
- Quota check runs before Groq is called (server-side only, no client-side trust)
- 10 analyses × 4 calls × ~1,500 tokens avg = ~60,000 tokens/user/month → Groq's free TPM limit is a per-minute rate, not a monthly cap; at 60K tokens/month per user, 10 users = 600K tokens/month, entirely within normal usage

### 3.6 Rate Limiting: Upstash Redis

**Primary: Upstash Redis + `@upstash/ratelimit`**

Configuration:
```typescript
// Sliding window: 5 analyses/minute per user (burst protection)
// 10 uploads/hour per user
// 20 requests/minute per IP for unauthenticated routes
```

500K commands/month free. Each rate-limit check costs ~2 Redis commands. 250K checks/month → supports ~830 daily active users at 10 checks/day: far exceeds portfolio needs.

**Fallback if Upstash requires a card:** Neon PostgreSQL rate-limit table using upsert-and-read pattern (adds ~20ms per check). Adequate for portfolio scale.

**Do not use in-memory rate limiting in production.** Vercel serverless functions are stateless: in-memory state does not persist between invocations and provides no real protection.

### 3.7 Product Analytics: PostHog Free

1M events/month, 1-year retention, no card required.

**Events to track:**
- `analysis_started`: target_role, demo vs. live
- `analysis_completed`: readiness_score (bucket, not exact), time_ms, model
- `analysis_failed`: error_type (quota_exceeded, groq_error, timeout)
- `export_pdf_clicked`
- `roadmap_milestone_checked`
- `demo_mode_viewed`
- `user_signed_up`

**Privacy rules:**
- No resume text in event properties
- No email or name in event properties
- Readiness scores bucketed (0-25, 26-50, 51-75, 76-100)
- PostHog IP masking enabled
- Target role and skill names are acceptable (not PII)

### 3.8 Error Monitoring: Sentry Developer (or Vercel logs fallback)

**Primary:** Sentry Developer: 5K errors/month, 1 user, free.
**Fallback if card required:** Vercel's built-in function logs capture all server errors. Combined with PostHog's `analysis_failed` events, this gives adequate error visibility for a portfolio app without Sentry.

**Decision:** Attempt Sentry signup card-free. If a card is required, use Vercel logs + PostHog error events.

### 3.9 CI/CD: GitHub Actions

Existing `.github/workflows/ci.yml` already covers typecheck → lint → test → build.

**Additions for production:**
1. Add `eval` step (deterministic only: no live API in CI)
2. Add deploy step: `vercel --prod` via `VERCEL_TOKEN` secret (auto-deploys on merge to `main`)
3. Keep the repo public: unlimited free Actions minutes

### 3.10 Backup and Recovery

Neon Free includes point-in-time restore (PITR) up to 7 days on the free tier. This is adequate for a portfolio app. No manual backup scripts needed.

For the database schema and migration files: these are version-controlled in `drizzle/migrations/`: full schema reconstruction is always possible from the migration history.

---

## 4. Graceful Degradation Plan

| Service limit hit | Behavior |
|---|---|
| Groq 429 (rate limit) | Clear error message: "AI is temporarily at capacity: try demo mode or retry in a moment." Demo mode remains fully functional. |
| Groq quota per user exhausted (10/month) | Message with reset date: "You've used your 10 free analyses this month. Your quota resets on [date]." |
| Neon storage limit (1 GB) | New writes fail with a clear server error. Existing data remains readable. Admin alert via PostHog event. |
| Neon compute hours exhausted | Database becomes temporarily unavailable. Demo mode (no DB needed) continues to work. |
| Vercel function timeout | Frontend shows timeout error. Demo mode remains available. |
| Upstash rate limit hit (500K cmds/mo) | Rate limiting stops enforcing (fail open). Log a PostHog event. No charges occur. |
| PostHog events exhausted (1M/mo) | Events are dropped silently. App continues to function. |
| Sentry errors exhausted (5K/mo) | Errors are dropped. App continues to function. |
| Clerk MAU limit approached (50K) | Clerk shows upgrade prompt to admin. At portfolio scale, this will never be reached. |
| Groq model unavailable | Fall back to demo mode with a banner: "Live AI analysis is temporarily unavailable." |

**Core principle:** Demo mode must always work. It requires no database, no AI, no authentication. It is the guaranteed fallback for all infrastructure failures.

---

## 5. Implementation Roadmap

### Milestone 4A: Database Migration (requires approval)

**Deliverables:** Replace `better-sqlite3` with Neon PostgreSQL + Drizzle ORM. All existing functionality continues to work.

**Stack changes:**
- Add: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- Remove: `better-sqlite3`, `@types/better-sqlite3`
- Env var: `DATABASE_URL` (Neon connection string)

**Codebase changes:**
- `drizzle/schema.ts`: TypeScript schema definition
- `drizzle/migrations/`: SQL migration files
- `lib/db.ts`: replace `better-sqlite3` instance with Drizzle+Neon adapter
- All API routes that use `db`: update query syntax (Drizzle vs. better-sqlite3 `prepare`)
- `next.config.js`: remove `serverExternalPackages: ['better-sqlite3']`

**Security:** `DATABASE_URL` in environment variables only, never committed.

**Testing requirements:**
- All existing Vitest unit tests continue to pass (no DB dependency in scorer tests)
- New integration tests for `lib/db.ts` CRUD operations against a test Neon branch
- Manual: create an analysis in demo mode, verify it saves and loads correctly

**Rollback:** If migration fails, revert to `better-sqlite3` branch. No production user data to migrate (current data is local/dev only).

**Acceptance criteria:**
- `npm run build` passes with Neon adapter
- `/api/analyze` saves a result to Neon and retrieves it
- Existing demo mode is unaffected

---

### Milestone 4B: Authentication (requires approval)

**Deliverables:** Clerk authentication with Google Sign-In. Real analyses require login. Demo mode remains public.

**Stack changes:**
- Add: `@clerk/nextjs`
- Env vars: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Codebase changes:**
- `app/layout.tsx`: wrap in `<ClerkProvider>`
- `middleware.ts`: add `clerkMiddleware()`, protect `/dashboard` for real (non-demo) sessions
- `app/api/analyze/route.ts`: add `auth()` check, attach `userId` to saved analysis
- `app/api/upload/route.ts`: add `auth()` check
- All `lib/db.ts` queries: filter by `user_id` from Clerk session
- UI: add sign-in/sign-up buttons to landing page and dashboard header

**Security:**
- Server-side `auth()` check on every protected route: not client-side only
- `user_id` column added to `analyses` table (Milestone 4A prerequisite)
- Never expose another user's analysis ID in a URL that bypasses auth check

**Testing:**
- Unauthenticated request to `/api/analyze` returns 401
- Demo mode (`?id=demo-...`) works without authentication
- Authenticated user can only retrieve their own analyses

**Acceptance criteria:**
- Sign in with Google works end-to-end
- Demo mode is fully public
- Authenticated user can save and retrieve analyses
- Unauthenticated user cannot access real analysis endpoints

---

### Milestone 4C: Rate Limiting and Quotas (requires approval)

**Deliverables:** Per-user AI quota (10/month), per-route rate limits via Upstash Redis.

**Stack changes:**
- Add: `@upstash/redis`, `@upstash/ratelimit`
- Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Codebase changes:**
- `lib/ratelimit.ts`: Upstash sliding-window rate limiter instances
- `middleware.ts`: apply IP-based rate limit to unauthenticated routes
- `app/api/analyze/route.ts`: per-user quota check before Groq is called; quota stored in `ai_usage` table
- `app/api/upload/route.ts`: per-user upload rate limit

**Quota check logic:**
```typescript
const usageThisMonth = await db.query.aiUsage.count({
  where: and(
    eq(aiUsage.userId, userId),
    gte(aiUsage.createdAt, startOfMonth)
  )
});
if (usageThisMonth >= MONTHLY_ANALYSIS_QUOTA) {
  return quotaExhaustedResponse(resetDate);
}
```

**Testing:**
- Rate limiter blocks after configured threshold
- Quota check correctly rejects after 10 analyses
- Quota check resets at the start of a new 30-day window

---

### Milestone 4D: Public Deployment (requires approval)

**Deliverables:** App live at `https://<project>.vercel.app` with all systems functional.

**Steps:**
1. Configure Vercel project linked to GitHub repository
2. Set all environment variables in Vercel dashboard
3. Enable Vercel + Neon integration (automatic `DATABASE_URL` injection)
4. Run production Drizzle migration against live Neon database
5. Deploy and verify full flow: sign in → upload resume → run analysis → view dashboard → export PDF
6. Verify demo mode works without login
7. Set up GitHub Actions deploy step (merge to `main` → automatic deploy)

---

### Milestone 4E: Observability (requires approval)

**Deliverables:** PostHog analytics + Sentry (or Vercel logs fallback) in production.

**Stack changes:**
- Add: `posthog-js`, `posthog-node`
- Add: `@sentry/nextjs` (if Sentry free requires no card; otherwise skip)
- Env vars: `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN` (if applicable)

**Events to instrument:** see §3.7

---

### Milestone 4F: Privacy, ToS, and Launch Readiness

**Deliverables:** Privacy Policy and Terms of Service pages. User data deletion endpoint. "Delete my data" UI.

**Codebase changes:**
- `app/privacy/page.tsx`: Privacy Policy
- `app/terms/page.tsx`: Terms of Service
- `app/api/user/data/route.ts`: `DELETE` endpoint: removes all analyses, skill records, roadmap data for authenticated user
- Dashboard settings: "Delete my data" button

**Legal flag:** Both documents require review before publication. The Privacy Policy must accurately disclose that resume text is sent to Groq for processing. Do not publish without review.

---

## 6. Decisions Requiring Approval

Before any milestone begins, explicit approval is required for each of the following:

- [ ] **4A**: Begin Neon PostgreSQL + Drizzle migration
- [ ] **4B**: Set up Clerk Hobby account and configure Google Sign-In
- [ ] **4C**: Set up Upstash Redis account; confirm whether card is required
- [ ] **4D**: Deploy to Vercel; confirm repo will be public (required for free Actions)
- [ ] **4E**: Set up PostHog account; set up Sentry account (confirm card-free) or confirm Vercel logs fallback
- [ ] **4F**: Privacy Policy and ToS reviewed and approved for publication
- [ ] **Quota policy**: confirm 10 analyses/user/month as the launch quota
- [ ] **Vercel commercial use**: confirm Ascend's portfolio use qualifies as non-commercial under Vercel Hobby ToS

---

## 7. Current State vs. Target State

| Concern | Current | Target |
|---|---|---|
| Hosting | `next dev` local only | Vercel Hobby (`*.vercel.app`) |
| Database | `better-sqlite3` local file | Neon PostgreSQL (serverless) |
| ORM | Raw `better-sqlite3` `prepare()` | Drizzle ORM (type-safe, SQL migrations) |
| Authentication | None | Clerk Hobby (Google Sign-In) |
| Multi-user isolation | None | `user_id` on all records, auth on all routes |
| Rate limiting | None | Upstash Redis sliding-window + DB quota |
| Analytics | None | PostHog Free (1M events/month) |
| Error monitoring | Console logs | Sentry Developer or Vercel logs |
| AI reliability | 30s timeout, 2 retries, Zod validation | Same + 429 handling, per-user quota |
| Privacy disclosure | None | Privacy Policy page (requires legal review) |
| Demo mode | Fully functional | Unchanged: always public, no auth, no DB |
| CI/CD | typecheck+lint+test+build on PR | Same + deploy on merge to `main` |
| Monthly cost | $0 (local only) | **$0** (all genuine free tiers) |
