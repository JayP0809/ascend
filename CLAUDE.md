# Ascend 2.0 — Claude Code Project Context

This file is the persistent guiding context for all Claude Code sessions working on Ascend.
Read it at the start of every session. Update it when meaningful decisions are made.

---

## About the Developer

Jay Parmar — junior at Rutgers University–New Brunswick, CS + Data Science.
Recruiting for full-time entry-level positions in 2027 (after Summer 2027 internship at Zebra Technologies — Supply Chain Analytics).
Career targets span **software engineering, data engineering/analytics, data science/ML, and product roles**.
Do not optimize Ascend exclusively for SWE. Build a broadly competitive technical profile.

---

## Portfolio Strategy (Three Projects)

| Project | Category | Key Technologies |
|---------|----------|-----------------|
| **Ascend 2.0** (this repo) | Full-stack AI product + product intelligence | Next.js, TypeScript, React, SQLite→PostgreSQL, AI/eval, auth, analytics |
| **Rewind** (future) | Backend engineering + operational systems | Java, Spring Boot, PostgreSQL, Redis, event sourcing, AWS |
| **Pulse** (future) | Data engineering + applied ML | Python, SQL, Kafka, Spark, Airflow, scikit-learn, real-time anomaly detection |

**Do not force Kafka, Spark, Java microservices, or custom DL models into Ascend.** Those belong in Rewind/Pulse.
Every architectural addition to Ascend must have a defensible product or engineering reason.

---

## What Ascend Is

AI-powered career navigation application. Core workflow:
1. User uploads PDF/DOCX resume
2. User selects a target role
3. App extracts skills via AI (Groq SDK, model: `openai/gpt-oss-20b` via `GROQ_MODEL` env var)
4. AI evaluates skill gaps and calculates a readiness score
5. AI generates a personalized week-by-week development roadmap
6. User explores dashboards, charts, and recommendations
7. User can export results as a PDF
8. Community section shows aggregate career trends

**Always use the actual repository as source of truth.** This description may lag behind code.

---

## Zero-Cost Requirement (Non-Negotiable)

**Ascend must operate at $0/month using genuine ongoing free plans only.**

- No free trials, promotional credits, or expiring starter credits
- No automatic billing, pay-as-you-go overages, or required credit card where avoidable
- If a free tier is exhausted, the app must degrade gracefully — not charge money
- Every infrastructure service must have a documented, permanent free tier
- This requirement applies to all future infrastructure decisions

Groq's current model (`openai/gpt-oss-20b`) is free; if that changes, switch models or fall back to demo mode — do not auto-enable paid billing.

---

## Current Stack & Constraints

- **Node:** v24.15.0 required (Next.js 14 crashes with createContext error on this version)
- **Framework:** Next.js 15 App Router + React 19 + TypeScript
- **Database:** better-sqlite3 v12.x (v9 has no prebuilt binaries for Node 24) — synchronous, local only, blocks Vercel/serverless
- **AI:** Groq SDK — `isLiveMode()` in `lib/ai.ts` checks `GROQ_API_KEY`
- **Demo mode:** `getDemoData()` runs when no API key or ID starts with `"demo-"`. Full app works without a key.
- **Charts:** Recharts (RadialBarChart, BarChart, PieChart, AreaChart)
- **Theme:** `next-themes`, `defaultTheme="dark"`, Tailwind `darkMode: 'class'`
- **Testing:** Vitest 5.x + `@vitest/coverage-v8` (requires `vite` as peer; use `--legacy-peer-deps`)
- **Validation:** Zod 4.x for API request validation
- **CI:** `.github/workflows/ci.yml` — runs typecheck, lint, test, build on push/PR

**Install note:** All `npm install` commands need `--legacy-peer-deps` due to `@types/node` version conflict between puppeteer and vitest.

---

## Development Branch

Active development branch: `phase-1a` (Milestones 1 + 2 complete — not yet committed/pushed, awaiting approval).
**Do not commit or push without explicit approval.**

---

## Completed Milestones

### Milestone 1 — Engineering Foundation (complete, pending commit)
- Vitest + 28 unit tests for `lib/scorer.ts` (all pass)
- GitHub Actions CI workflow (`.github/workflows/ci.yml`)
- Removed unused `@anthropic-ai/sdk` dependency
- Fixed `Math.random()` in `buildMarketDemandData` → deterministic hash
- Stabilized community timestamps (fixed base date, no `Date.now()` drift)
- Added "Illustrative" label to market demand chart
- Zod validation on `POST /api/analyze` and `POST /api/upload`
- Upload: 5 MB size limit, extension allowlist, MIME type check, magic byte verification
- PDF export colors fixed: indigo `[99,102,241]` → warm accent `[224,122,95]`
- ESLint flat config (`eslint.config.mjs`) — 0 errors, 0 warnings
- All quality gates: `typecheck` ✓ `lint` ✓ `test` (28/28) ✓ `build` ✓

### Milestone 2 — AI Reliability (complete, pending commit)
- Zod schemas for all 4 AI response types in `lib/ai-schemas.ts`
- `PROMPT_VERSION = '1.0.0'` for prompt version tracking
- Full rewrite of `lib/ai.ts`: 30s timeout, 2 retries with Zod validation per attempt
- `GroqUsage` + `PipelineUsage` types — per-call token/latency/cost reporting
- Synthetic eval fixtures in `evals/fixtures/resumes.ts` (no PII)
- Evaluation runner in `evals/runner.ts`: 17 deterministic evals + live API evals gated by `RUN_EVALS=true`
- All quality gates still pass after Milestone 2 changes

### Milestone 3 — Production Architecture Proposal (complete, pending approval)
- Written as `docs/production-architecture-proposal.md`
- Covers: DB (Neon+Drizzle), auth (Clerk), hosting (Vercel), rate limiting (Upstash), monitoring (Sentry)
- **Updated in current session** — zero-cost compliance matrix being researched and will replace the previous draft

---

## Approved Next Milestones

### Milestone 4 — Zero-Cost Production Architecture (approved, in research)
- Verify all infrastructure providers have genuine ongoing free tiers (no trials, no auto-billing)
- Produce zero-cost compliance matrix with limits, overage behavior, card requirements
- Design final production architecture diagram + tradeoffs
- Dependency-ordered implementation roadmap with acceptance criteria per milestone
- Do NOT provision services, migrate DB, configure auth, or deploy without subsequent explicit approval

---

## Approval Required Before

- Committing or pushing code
- Database migrations (including SQLite → PostgreSQL)
- Adding or configuring external authentication providers
- Public deployment
- Any service that could generate charges (even if free tier exists)
- Creating external accounts, infrastructure resources, or API keys
- Destructive operations
- Enabling any analytics, monitoring, or logging service

---

## Quality Gates (run after every milestone)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint . --max-warnings=0
npm test            # vitest run
npm run build       # next build
```

---

## Design Principles

**Palette:** Warm dark brown/charcoal backgrounds, terracotta accent (`#E07A5F` dark / `#C2622B` light).
**Avoid:** Gradients, rainbow colors, neon, liquid glass, radial orbs, dot grids, sparkle icons, fake testimonials, em dashes in marketing copy, decorative terminal windows.
**Keep:** Lucide icons (functional use only), simple cards, skeleton loaders, warm neutrals.
**Typography:** Inter for body/UI. Consider adding a serif display face for the landing headline only.

Do not redesign the entire product without a compelling reason.
Favor restrained, polished improvements over aesthetic experimentation.

---

## AI Labeling Requirements

- Readiness scores are **AI-generated heuristic estimates**, not statistically validated probabilities
- Market demand charts are **illustrative** (label must be visible in UI)
- Demo community data is **synthetic sample data**, not real user activity
- Do not represent generated recommendations as guaranteed outcomes

---

## Privacy & Security Principles

- Resume text is processed by Groq's API — **this must be disclosed to users**; do not claim it stays on our servers
- Never log resume content, full analysis text, or API keys
- File uploads: validate extension + MIME + magic bytes + 5 MB limit
- SQL: parameterized queries only — no string interpolation in queries
- Rate limiting: must be database-backed or Redis-backed in production (in-memory fails in serverless)
- Per-user AI quota: 5–10 live analyses/month (exact number TBD after researching Groq limits)
- ToS and Privacy Policy pages: not yet created — required before public launch; flag for legal review
- User data deletion: every user must be able to delete all their records
- Analytics must be privacy-conscious: no PII in event properties, no cross-site tracking

---

## Interview Documentation Goal

Maintain enough documentation that Jay can explain:
- System architecture and data flow
- Key engineering tradeoffs (SQLite vs. PostgreSQL, demo mode design, AI retry logic)
- Testing strategy and what the tests actually verify
- AI evaluation methodology and its limitations
- Security decisions
- Product hypotheses and what would constitute evidence for them

Keep measurable results separate from estimates.
Do not fabricate benchmark improvements, user counts, or business outcomes.
