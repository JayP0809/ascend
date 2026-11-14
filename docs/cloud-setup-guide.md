# Ascend 2.0 — Cloud Setup Guide

**Purpose:** Connect Neon (PostgreSQL), Clerk (auth), and Vercel (hosting).
All three plans are permanently free with no auto-billing.
No services have been provisioned yet. Complete these steps in order.

---

## Step 1 — Neon Free PostgreSQL

**Plan:** Neon Free (no credit card required)
**Free limits:** 0.5 GB storage, 100 compute-unit-hours/month, 1 project, auto-sleep after 5 min idle
**Overage behavior:** Compute pauses (requests fail gracefully); storage writes blocked — no charges

### Setup

1. Go to **neon.tech** → Sign Up (GitHub login works)
2. Create project: name `ascend`, region `US East (Ohio)` or closest to your users
3. Select the **Free** plan — verify no payment method is requested
4. Navigate to **Connection Details** → copy the connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   ```

### Run migrations

```bash
npm run db:migrate
```

This applies `drizzle/migrations/0000_initial.sql` then `0001_usage_buckets.sql`.
Check Neon's **Tables** tab to confirm all 7 tables exist.

### Verify free tier

In Neon dashboard → **Billing**: confirm plan shows "Free" with no payment method.
Check "Usage" tab — compute-unit hours and storage are shown with free-tier limits.

---

## Step 2 — Clerk Hobby (authentication)

**Plan:** Clerk Hobby (no credit card required)
**Free limits:** 10,000 monthly active users, all OAuth providers, unlimited sign-ins
**Overage behavior:** Requests beyond MAU limit are blocked — no charges

### Setup

1. Go to **clerk.com** → Sign Up
2. Create application: name `Ascend`, enable **Google** as sign-in provider
3. Skip all paid add-ons
4. Navigate to **API Keys** tab → copy both keys:
   - `CLERK_SECRET_KEY` — starts with `sk_live_...`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — starts with `pk_live_...`
5. Add to `.env.local`:
   ```
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   ```
6. Restart `npm run dev` — the middleware switches automatically from pass-through to Clerk

### Verify Clerk activation

After restarting dev server:
- GET `/` — still accessible (public route)
- GET `/api/analyze?id=demo-sample-001` — still accessible (demo)
- POST `/api/analyze` with a real analysisId without signing in → should return 401

### Verify free tier

In Clerk dashboard → **Billing** → confirm plan shows "Hobby" with no payment method attached.

---

## Step 3 — Vercel Hobby (hosting)

**Plan:** Vercel Hobby (no credit card required)
**Free limits:** Unlimited deployments, 100 GB bandwidth/month, 6,000 serverless function-hours/month
**Overage behavior:** Deployments blocked if limits hit — no charges
**Restriction:** Hobby plan is for non-commercial use only. Upgrade to Pro if monetized.

### Setup

1. Go to **vercel.com** → Sign Up with GitHub
2. Import repository: select the `ascend` repo → Framework: **Next.js** (auto-detected)
3. Add all environment variables in **Settings → Environment Variables**:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon → Connection Details |
| `CLERK_SECRET_KEY` | Clerk → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `ANALYSIS_QUOTA_PER_MONTH` | Set to `5` (or your preferred limit) |

4. Deploy → Vercel runs `npm run build` automatically

### Post-deploy verification

After first deployment:
- Visit your `.vercel.app` URL — landing page loads (static)
- Visit `/dashboard` with `?id=demo-sample-001` — demo mode works
- Try GET `/api/analyze?id=<a-real-uuid>` without signing in → 401 (Clerk active)
- Try GET `/api/analyze?id=demo-sample-001` → 200 with `isDemoMode: true`

### Verify free tier

In Vercel dashboard → **Settings → Billing** → confirm plan shows "Hobby" with no payment method required.

---

## Step 4 — Run database migrations on Neon

After connecting Neon and setting `DATABASE_URL` locally:

```bash
npm run db:migrate
```

If you need to verify the schema matches the Drizzle definition:

```bash
npm run db:studio
```

This opens Drizzle Studio in your browser — a read-only view of the live schema.

---

## Environment variables reference

```
# Required for all features
GROQ_API_KEY=                         # Groq API key (free at console.groq.com)
DATABASE_URL=                         # Neon connection string
CLERK_SECRET_KEY=                     # Clerk server secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=    # Clerk publishable key

# Optional
ANALYSIS_QUOTA_PER_MONTH=5            # Monthly analysis limit per user (default: 5)
NEXT_PUBLIC_POSTHOG_KEY=              # PostHog project API key (analytics)
NEXT_PUBLIC_POSTHOG_HOST=             # PostHog host (https://us.i.posthog.com)
UPSTASH_REDIS_REST_URL=               # Upstash Redis URL (rate limiting)
UPSTASH_REDIS_REST_TOKEN=             # Upstash Redis token
SENTRY_DSN=                           # Sentry DSN (error monitoring)
```

**Security rules:**
- Never commit `.env.local` (it is in `.gitignore`)
- Never put secrets in `.env.example` or documentation
- Rotate keys immediately if accidentally committed

---

## Tests that cannot run until cloud services are connected

| Test | Requires |
|---|---|
| `[integration]` DB round-trip save/retrieve | `DATABASE_URL` |
| `[integration]` Quota: concurrent requests race | `DATABASE_URL` |
| `[integration]` Quota: exhaustion + deny | `DATABASE_URL` |
| `[integration]` Quota: demo bypass after exhaustion | `DATABASE_URL` |
| `[live-auth]` Cross-user read returns 404 | `CLERK_SECRET_KEY` + `DATABASE_URL` |
| `[live-auth]` Ownerless record returns 404 | `CLERK_SECRET_KEY` + `DATABASE_URL` |
| `[live-auth]` Unauthenticated POST returns 401 | `CLERK_SECRET_KEY` |
| `[live-auth]` Client userId in body is ignored | `CLERK_SECRET_KEY` + `DATABASE_URL` |

Run integration tests locally after connecting Neon:
```bash
DATABASE_URL=postgresql://... npm test
```
