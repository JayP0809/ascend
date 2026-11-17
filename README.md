<div align="center">

# Ascend

### AI-powered career navigation: from your resume to your target role

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Groq AI](https://img.shields.io/badge/AI-Groq-f55036?style=flat-square)](https://groq.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00e5b4?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

**[Try the live app](https://ascend-lilac-iota.vercel.app) &nbsp;·&nbsp; no sign-in required**

</div>

---

Ascend analyzes your resume against a target role, identifies exactly where you fall short, and generates a personalized week-by-week learning roadmap with curated resources and hands-on projects.

**No install needed.** The [live app](https://ascend-lilac-iota.vercel.app) runs in demo mode instantly. Upload your own resume and select a role to run a live AI analysis.

---

## 🔍 How it works

```
Resume (PDF/DOCX)
       │
       ▼
  Text Extraction
  (pdf-parse / mammoth)
       │
       ▼
┌──────────────────────────────────────────────┐
│              Groq AI Pipeline                │
│                                              │
│  Stage 1  ─  Extract skills & experience    │
│  Stage 2  ─  Fetch target role requirements │
│  Stage 3  ─  Identify gaps & readiness      │
│  Stage 4  ─  Generate 8-phase roadmap       │
└──────────────────────────────────────────────┘
       │
       ▼
  Interactive Dashboard
  (persisted to Neon PostgreSQL for signed-in users)
```

Each stage uses a dedicated Groq prompt validated by a Zod schema. Failed stages retry up to twice with a 30-second timeout. Analysis results are stored server-side so users can return to their dashboard without re-running the pipeline.

---

## Features

**Analysis**
- Upload a PDF or DOCX resume, or use the built-in public sample
- 80+ roles across 10 industries: software engineering, data science, product management, DevOps, finance, and more; internship and co-op roles supported
- Readiness score with breakdown by skill category
- Critical gaps, nice-to-have gaps, and directly transferable skills identified separately

**Dashboard (5 tabs)**
- **Overview:** readiness gauge, matched skills, strengths
- **Skill Gap:** filterable, searchable grid of every skill with importance and demand trend
- **Roadmap:** collapsible 8-phase timeline; each phase has topics, curated resources, a hands-on project, and a milestone; phases can be marked complete (persisted in localStorage)
- **Insights:** projected readiness trajectory, market demand chart, skill distribution, candidate profile comparison
- **Export:** one-click PDF report generated client-side

**Application**
- Google OAuth sign-in via Auth.js v5; unsigned users get full demo access
- Saved analyses linked to user accounts in PostgreSQL
- Per-user monthly quota (5 live analyses) and global quota to stay within Groq's free tier
- Community feed showing anonymized aggregate career trends
- Dark / light mode with zero flash on load

---

## 🛠 Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router + TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS custom properties (design tokens) |
| AI | Groq API (`openai/gpt-oss-20b`), 4-stage sequential pipeline |
| Database | Neon serverless PostgreSQL + Drizzle ORM |
| Auth | Auth.js v5 (next-auth@beta): Google OAuth, JWT sessions |
| Charts | Recharts (radial gauge, area, bar, pie) |
| Resume parsing | `pdf-parse` (PDF), `mammoth` (DOCX) |
| PDF export | `jsPDF` + `jspdf-autotable` (client-side, no server) |
| Validation | Zod 4 (all API request bodies and AI response shapes) |
| Testing | Vitest 5 + `@vitest/coverage-v8` |
| CI | GitHub Actions (typecheck, lint, test, build on every push) |

---

## Engineering decisions worth noting

**Demo mode without credentials.** The app is fully functional without any API key or database. `isLiveMode()` checks for a `GROQ_API_KEY` at runtime; if absent, `getDemoData()` returns a realistic pre-generated analysis. Any analysis ID prefixed with `demo-` also triggers demo mode. This means the app can be evaluated without setup.

**AI response validation.** Each Groq stage produces JSON that is parsed against a strict Zod schema before moving to the next stage. If a stage fails validation twice, the pipeline returns a structured error rather than propagating malformed data downstream.

**Atomic quota reservation.** The per-user and global monthly quotas use a PostgreSQL `UPDATE ... WHERE quota_used < quota_limit RETURNING *` pattern to prevent race conditions under concurrent requests. If the atomic update returns no rows, the reservation was lost to a concurrent request and the user gets a 429.

**Upload security.** File uploads are validated in four layers: file extension allowlist, MIME type check, magic byte verification (reads the first few bytes to confirm the file header matches the declared type), and a 5 MB size cap.

**DB-backed idempotency.** Each analysis request writes a row with a UUID before calling Groq. If the pipeline fails mid-flight, the row is marked `failed` and the quota reservation is refunded. Re-submitting the same analysis ID is a no-op.

---

## 📁 Project structure

```
ascend/
├── app/
│   ├── page.tsx                   Landing page
│   ├── dashboard/page.tsx         Dashboard (5 tabs)
│   ├── privacy/ & terms/          Legal pages
│   └── api/
│       ├── upload/                Parse PDF/DOCX, validate, extract text
│       ├── analyze/               Groq pipeline + demo fallback + quota
│       ├── auth/[...nextauth]/    Auth.js route handler
│       ├── user/                  Account management (data deletion)
│       ├── roles/                 Role search autocomplete
│       ├── export/                Analysis data for PDF export
│       └── community/             Anonymized aggregate feed
├── components/
│   ├── ui/                        Button, Card, Badge, Dialog, Tabs...
│   ├── charts/                    ReadinessGauge, SkillGapChart, MarketDemandBar...
│   ├── landing/                   Hero, RoleSampleCards, SampleResumePreview
│   ├── upload/                    ResumeDropzone, RoleSearch, AnalysisLoader
│   ├── dashboard/                 DashboardTabs, OverviewTab, RoadmapTab...
│   └── shared/                    Navbar, ThemeToggle, NavAuthButtons
├── lib/
│   ├── ai.ts                      Groq pipeline, retry logic, demo fallback
│   ├── ai-schemas.ts              Zod schemas for all 4 AI response types
│   ├── auth-config.ts             Auth.js v5 configuration
│   ├── db.ts                      Database query layer
│   ├── db-client.ts               Neon + Drizzle connection factory
│   ├── schema.ts                  Drizzle schema (PostgreSQL)
│   ├── quota.ts                   Atomic per-user and global quota enforcement
│   ├── security.ts                Analysis ownership and access control
│   ├── parser.ts                  PDF and DOCX text extraction
│   ├── roles.ts                   80+ roles with salary and demand metadata
│   ├── scorer.ts                  Readiness score + dashboard data builder
│   └── types.ts                   Shared TypeScript interfaces
├── evals/                         AI evaluation fixtures and runner
├── drizzle/migrations/            SQL migration files (Drizzle)
├── scripts/migrate.mjs            Migration runner
└── styles/globals.css             CSS design tokens (light + dark themes)
```

---

## Local setup

> Requires Node.js 24. The app runs in full demo mode with no configuration.

**Clone and run**

```bash
git clone https://github.com/JayP0809/ascend.git
cd ascend
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo mode is active immediately.

**Enable live AI analysis**

Get a free API key at [console.groq.com](https://console.groq.com), then:

```bash
cp .env.example .env.local
# Add: GROQ_API_KEY=gsk_your_key_here
npm run dev
```

**Enable auth and persistent storage** (optional)

Create a free [Neon](https://neon.tech) project and a [Google OAuth client](https://console.cloud.google.com), then:

```bash
# .env.local additions:
# DATABASE_URL=<neon-connection-string>
# AUTH_SECRET=<npx auth secret>
# AUTH_GOOGLE_ID=<client-id>
# AUTH_GOOGLE_SECRET=<client-secret>
# NEXT_PUBLIC_AUTH_ENABLED=true
# AUTH_URL=http://localhost:3000

node scripts/migrate.mjs
```

See `.env.example` for all available options and their defaults.

---

## Testing

```bash
npm test
```

167 unit tests covering the scorer, quota enforcement, auth utilities, security layer, and employment level classification. Database integration tests are skipped by default and require an isolated test database:

```bash
TEST_DATABASE_URL=<isolated-neon-url> npm test
```

**Do not point `TEST_DATABASE_URL` at your production database.** Integration tests write data and do not clean up between runs.

**AI evaluations** (requires `GROQ_API_KEY`):

```bash
RUN_EVALS=true npm test
```

Runs 17 deterministic checks against live AI responses using synthetic resume fixtures.

---

## ⚙️ Deployment

Ascend is designed to run entirely on free tiers: Vercel (hobby) + Neon (free) + Groq (free).

Required environment variables in Vercel:

```
DATABASE_URL             Neon connection string
AUTH_SECRET              Generate: npx auth secret
AUTH_GOOGLE_ID           Google OAuth client ID
AUTH_GOOGLE_SECRET       Google OAuth client secret
AUTH_URL                 Your canonical domain (e.g. https://ascend-lilac-iota.vercel.app)
NEXT_PUBLIC_AUTH_ENABLED=true
GROQ_API_KEY             Groq API key
```

Update the Google OAuth redirect URI to `https://your-domain.vercel.app/api/auth/callback/google`.

---

## Privacy

Resume content is sent to [Groq's API](https://groq.com/privacy-policy/) for processing. After analysis, stored resume text is replaced with only the extracted skill list to minimize data retention. See the [Privacy Policy](https://ascend-lilac-iota.vercel.app/privacy) and [Terms of Service](https://ascend-lilac-iota.vercel.app/terms) for details.

---

MIT license. Free to use, fork, and deploy.
