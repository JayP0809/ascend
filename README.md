<div align="center">

# Ascend

### AI-powered career navigation: from your resume to your target role

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![Groq AI](https://img.shields.io/badge/AI-Groq-f55036?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00e5b4?style=flat-square&logo=postgresql&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)

Upload your resume. Pick a target role. Get a personalized, week-by-week AI roadmap with curated resources, hands-on projects, and skill gap analysis. Try it instantly in demo mode — no sign-in required.

</div>

---

## Features

- **Resume upload:** drag-and-drop PDF or DOCX, or use the built-in public sample resume
- **80+ roles:** autocomplete search across 10 industries (software engineering, data science, product, and more) with salary and demand data; internship and co-op roles supported
- **Live AI analysis:** 4-stage Groq pipeline — skill extraction, role requirements, gap analysis, and 8-phase week-by-week roadmap generation
- **5-tab dashboard:**
  - **Overview:** readiness gauge, matched skills, key strengths
  - **Skill Gap:** filterable grid of critical / nice-to-have / transferable skills
  - **Roadmap:** collapsible 8-phase timeline with curated resources and hands-on projects
  - **Insights:** 4 charts — projections, market demand (illustrative), skill radar, role breakdown
  - **Export:** one-click PDF report
- **Community feed:** anonymized aggregate career trends and trending skills
- **Dark / light mode:** instant toggle, zero flicker
- **Demo mode:** fully functional with realistic pre-generated data when no API key is configured — the entire app works without credentials

---

## Quick start

> Works on Mac, Windows, and Linux. Requires Node.js 20+.

**1. Clone and install**
```bash
git clone https://github.com/JayP0809/ascend.git
cd ascend
npm install --legacy-peer-deps
```

**2. Run the app**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs immediately in demo mode — no API key or database needed.

---

## Enable live AI analysis

By default Ascend runs in **demo mode** with pre-generated data. To analyze a real resume:

1. Get a free API key at [console.groq.com](https://console.groq.com) → API Keys → Create new key
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Add your key:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
4. Restart the dev server. Live mode activates automatically.

Live analyses are limited to **5 per user per month** to stay within Groq's free tier.

---

## Full setup (auth + persistent database)

For user accounts, saved analyses, and persistent community data you need:

| Service | Free tier | Purpose |
|---|---|---|
| [Neon](https://neon.tech) | 0.5 GB, 190 compute hours/month | PostgreSQL database |
| [Google Cloud Console](https://console.cloud.google.com) | Free | OAuth credentials |

**1.** Create a Neon project and copy the connection string to `DATABASE_URL` in `.env.local`.

**2.** Run database migrations:
```bash
node scripts/migrate.mjs
```

**3.** Create a Google OAuth 2.0 client ID at [console.cloud.google.com](https://console.cloud.google.com):
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**4.** Generate an Auth.js secret:
```bash
npx auth secret
```

**5.** Add to `.env.local`:
```
AUTH_SECRET=<generated value>
AUTH_GOOGLE_ID=<your client id>
AUTH_GOOGLE_SECRET=<your client secret>
NEXT_PUBLIC_AUTH_ENABLED=true
```

See `.env.example` for all available configuration options.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) + TypeScript |
| **Styling** | Tailwind CSS + CSS custom properties |
| **AI** | Groq API (`openai/gpt-oss-20b`) with 4-stage prompt pipeline |
| **Database** | Neon PostgreSQL (serverless) + Drizzle ORM |
| **Auth** | Auth.js v5 (next-auth@beta) — Google OAuth, JWT sessions |
| **Charts** | Recharts — 5 chart types |
| **Resume parsing** | `pdf-parse` + `mammoth` |
| **PDF export** | `jsPDF` + `jspdf-autotable` |
| **Icons** | `lucide-react` |
| **Theming** | `next-themes` |

---

## Project structure

```
ascend/
├── app/
│   ├── page.tsx               ← Landing page
│   ├── dashboard/page.tsx     ← Dashboard (5 tabs)
│   ├── privacy/page.tsx       ← Privacy Policy
│   ├── terms/page.tsx         ← Terms of Service
│   └── api/
│       ├── upload/            ← Parse PDF/DOCX, extract text
│       ├── analyze/           ← Groq AI pipeline or demo fallback
│       ├── auth/              ← Auth.js route handler
│       ├── user/              ← Account management (deletion)
│       ├── roles/             ← Role search autocomplete
│       ├── export/            ← Analysis data for PDF export
│       └── community/         ← Anonymized community feed
├── components/
│   ├── ui/                    ← Button, Card, Badge, Dialog, Tabs...
│   ├── charts/                ← ReadinessGauge, SkillGapChart...
│   ├── landing/               ← Hero, RoleSampleCards
│   ├── upload/                ← ResumeDropzone, RoleSearch, AnalysisLoader
│   ├── dashboard/             ← DashboardTabs, OverviewTab, RoadmapTab...
│   └── shared/                ← Navbar, ThemeToggle, AuthButton
├── lib/
│   ├── ai.ts                  ← Groq pipeline + retry logic + demo fallback
│   ├── ai-schemas.ts          ← Zod schemas for all AI response types
│   ├── auth-config.ts         ← Auth.js v5 configuration
│   ├── db.ts                  ← Database query layer
│   ├── db-client.ts           ← Neon + Drizzle connection factory
│   ├── schema.ts              ← Drizzle schema (PostgreSQL)
│   ├── quota.ts               ← Per-user and global monthly quota
│   ├── security.ts            ← Analysis access control
│   ├── parser.ts              ← PDF and DOCX text extraction
│   ├── roles.ts               ← 80+ roles with metadata
│   ├── scorer.ts              ← Readiness score + dashboard data builder
│   └── types.ts               ← Shared TypeScript interfaces
├── evals/                     ← AI evaluation fixtures + runner
├── scripts/
│   ├── migrate.mjs            ← Drizzle migration runner
│   └── reset-quota.mjs        ← Admin: reset monthly quota counts
├── drizzle/migrations/        ← SQL migration files
├── styles/globals.css         ← CSS variables (light + dark), animations
├── .env.example               ← Template (safe to commit)
└── .env.local                 ← Your local credentials (never commit)
```

---

## How it works

```
Your Resume (PDF/DOCX)
        ↓
   Text Extraction (pdf-parse / mammoth)
        ↓
┌──────────────────────────────────────────────┐
│              Groq AI Pipeline                │
│  Stage 1 — Extract skills & experience       │
│  Stage 2 — Fetch target role requirements    │
│  Stage 3 — Identify skill gaps               │
│  Stage 4 — Generate 8-phase roadmap          │
└──────────────────────────────────────────────┘
        ↓
   Interactive Dashboard
  (saved to Neon PostgreSQL — authenticated users only)
```

Each AI stage uses Zod schema validation and automatic retry with a 30-second timeout.
Analysis results are stored server-side so you can revisit your dashboard without re-running.

---

## What this demonstrates

Built as a portfolio piece showcasing production-grade full-stack engineering:

| Skill | Implementation |
|---|---|
| **Next.js 15 App Router** | Server components, API routes, dynamic routing |
| **TypeScript** | Strict mode, zero `any`, full type coverage |
| **AI integration** | Groq API with 4-stage sequential prompt pipeline, Zod validation, retry logic |
| **Auth** | Auth.js v5 Google OAuth, JWT sessions, server-side access control |
| **PostgreSQL + ORM** | Neon serverless PostgreSQL, Drizzle ORM, schema migrations |
| **Quota enforcement** | Per-user and global monthly limits, atomic DB-backed reservation |
| **Data visualization** | Recharts — radial gauge, area, bar, pie charts |
| **Theming** | CSS custom properties + `next-themes` + Tailwind dark mode |
| **Resume parsing** | PDF via `pdf-parse`, DOCX via `mammoth` |
| **PDF export** | Client-side `jsPDF`, no server required |
| **Testing** | Vitest unit tests (scorer, auth, quota); Zod schema validation; AI eval fixtures |
| **Demo mode** | Full realistic dataset, works without any credentials |

---

## Running tests

```bash
npm test
```

Integration tests (database layer) are skipped by default. To run them against an isolated test database:

```bash
TEST_DATABASE_URL=<isolated-neon-url> npm test
```

**Never set `TEST_DATABASE_URL` to your production `DATABASE_URL`.** Integration tests write data and do not clean up between runs.

---

## Deployment (Vercel + Neon)

This app is designed to deploy to Vercel's free tier with a Neon free-tier database.

Required environment variables in Vercel:

```
DATABASE_URL          ← Neon connection string
AUTH_SECRET           ← Generate: npx auth secret
AUTH_GOOGLE_ID        ← Google OAuth client ID
AUTH_GOOGLE_SECRET    ← Google OAuth client secret
AUTH_URL              ← Your canonical domain (e.g. https://ascend.vercel.app)
NEXT_PUBLIC_AUTH_ENABLED=true
GROQ_API_KEY          ← Groq API key
```

Update your Google OAuth redirect URI to `https://your-domain.vercel.app/api/auth/callback/google`.

---

## Privacy

Resume content is sent to [Groq's API](https://groq.com/privacy-policy/) for processing. After analysis, stored resume text is replaced with only the extracted skill list to minimize data retention. See [Privacy Policy](/privacy) and [Terms of Service](/terms) for full details.

---

## License

MIT — free to use, fork, and deploy.
