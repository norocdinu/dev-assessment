# Dev Assessment Platform

A web-based multi-technology candidate assessment platform for technical hiring. Interviewers send pre-configured links to candidates, who complete a timed 30-minute randomised multiple-choice test. The system auto-grades results instantly and surfaces a per-candidate breakdown and a cross-candidate analytics dashboard.

**Core value:** A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Features](#features)
- [Changelog](#changelog)
- [Architecture Decisions](#architecture-decisions)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Charts** | Recharts 3.8 |
| **Tables** | TanStack Table v8 |
| **Notifications** | Sonner (toast) |
| **Dark mode** | next-themes |
| **Backend** | Fastify 5, TypeScript |
| **Database** | PostgreSQL (postgres.js tagged template driver) |
| **Auth** | JWT (httpOnly cookie), bcrypt |
| **Validation** | Zod |
| **Monorepo** | npm workspaces |

---

## Project Structure

```
dev-assessment/
├── apps/
│   ├── api/          # Fastify REST API (port 3001)
│   └── web/          # Next.js admin + candidate app (port 3000)
└── packages/
    └── shared/       # Shared TypeScript types
```

**Route groups in `apps/web`:**
- `(admin)` — Protected admin pages (dashboard, questions, submissions, accounts, settings)
- `(test)` — Candidate-facing test experience (zero auth required, link-based)

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis (used by session/cache layer)

### Setup

```bash
# Install dependencies
npm install

# Configure environment (copy and fill in values)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Run database migrations
npm run db:migrate

# Start both apps in development
npm run dev
```

The admin app runs at `http://localhost:3000` and the API at `http://localhost:3001`.

---

## Features

### Candidate experience

- Opens a shared link — no login, no signup
- Timed 30-minute MCQ test with live countdown (green → yellow → red)
- Page-refresh recovery — resumes mid-test with correct remaining time
- Auto-submit on timer expiry (server enforced)
- Results page: overall score, pass/fail verdict, skill-area breakdown, full answer sheet
- Mobile-ready, dark-mode-aware design (respects OS preference)

### Admin app

- **Dashboard** — KPI cards (total candidates, pass rate, average score, weakest skill area), score distribution chart, competency breakdown chart, recent submissions table; filterable by test config and date range
- **Question bank** — Full CRUD with immutable versioning, skill-area tagging, bulk import/export CSV, bulk archive/delete with reference protection, server-side paginated
- **Test configurations** — Create tests specifying technology, seniority, question count, and pass threshold; generate shareable links with optional candidate name capture
- **Submissions** — Paginated list, drill-down to full answer sheet, side-by-side candidate comparison, CSV export, owner-only deletion with audit logging; PDF print export
- **Accounts** — Owner-managed team accounts (Owner / Reviewer / Member roles)
- **Settings** — Display name and password change

### Security & integrity

- JWT httpOnly cookie sessions
- Role-based access: Owner (full), Reviewer (read-only), Member (link generation)
- All question edits create a new version; past submissions stay linked to the version used
- All write actions audit-logged with admin identity and timestamp
- Seeded RNG — same link always shows the same question set; different candidates get equivalent sets

---

## Changelog

### v1.2 — Front End Improvements ✓ (2026-05-08)

4 phases · 3 requirements groups · 13 requirements delivered

#### Phase 9 — Candidate Experience Redesign

Modern, mobile-first redesign of the candidate test page.

- Fresh visual design with brand colour token system (`--brand`, `--background`, `--foreground`, etc. as RGB triplets for Tailwind opacity modifier compatibility)
- Dark mode via `prefers-color-scheme` — `CandidateThemeProvider` client component syncing OS preference, no server cookie needed
- `NEXT_PUBLIC_BRAND_COLOR`, `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_LOGO_URL` env vars for white-labelling
- Progress indicator (Question N of M) visible throughout the test
- Submission confirmation step before final submission

#### Phase 10 — Admin Visual Foundation

Consistent design system and dark/light theme toggle for the admin app.

- Dark/light mode toggle in admin sidebar persisted to `localStorage`
- Unified CSS variable token system across all admin pages
- Admin layout responsive at ≥768px — persistent sidebar on desktop, collapsible on tablet
- Brand accent colour applied consistently via `--brand` CSS variable

#### Phase 11 — UX Pattern Library

Consistent UX patterns across all admin pages.

- `<Skeleton>` loading placeholders on all tables and cards (no spinners)
- `<EmptyState>` component on every data page — message + optional CTA when no records exist
- All success/error feedback via sonner toasts — `window.alert` and `window.confirm` fully removed
- Delete confirmations use a shadcn `ConfirmDialog` (AlertDialog-based) instead of browser dialogs

#### Phase 12 — Reporting & Dashboard Filters

PDF export and filterable analytics dashboard.

- **Download PDF** button on submission detail page — `window.print()` with `@media print` CSS that hides sidebar/nav and forces white background + black text in print output
- **Dashboard filter bar** — test-config dropdown (populated from `/test-configs`) and date-range preset selector (All time / Last 7 days / Last 30 days / Last 90 days / Custom range) above KPI cards
- Custom date range reveals From/To date inputs; fetch is guarded until both are filled
- API: `GET /dashboard/stats` and `GET /dashboard/competency` now accept `testConfigId`, `from`, and `to` query params using postgres.js conditional tagged-template fragments — `JOIN test_links` emitted only when a filter is active

---

### v1.1 — Team, Analytics & Operations ✓ (2026-05-07)

3 phases · 7 plans · 12 requirements delivered

#### Phase 6 — Foundation and Fixes

Schema extensions and CSV data-integrity fixes.

- Extended `admin_users.role` DB CHECK constraint to include `'member'` role
- Added `candidate_name TEXT` column to `test_links` (captured at link generation)
- Fixed CSV export: now emits technology slug (not display name) + adds Explanation column
- Replaced line-by-line CSV parser with a full-text multiline-safe parser (correct handling of quoted fields containing commas and newlines)
- Updated shared TypeScript types for both changes

#### Phase 7 — Team Management and UX Polish

Owner-managed team accounts and admin UX improvements.

- Full account CRUD: create / list / edit / delete admin accounts (owner-only)
- Roles: Owner (full), Reviewer (read-only), Member (can generate links, view results; cannot edit questions)
- Settings page — display name update and password change (current password validation required)
- Candidate name field on test link generation (optional; stored, shown in submissions list)
- Member role can now generate test links
- Pass threshold default raised from 70% to 80%
- Sidebar: Accounts nav item (owner-only), Settings link wrapping user block

#### Phase 8 — Analytics Dashboard and Submission Deletion

Cross-candidate analytics and data lifecycle management.

- `GET /dashboard/stats` — aggregate KPIs: total candidates, pass rate, avg score, weakest skill area, 6-bucket score distribution, 10 most recent submissions
- `GET /dashboard/competency` — skill area averages with optional `testConfigId` filter
- Dashboard page (all authenticated roles): 4 KPI cards, vertical score distribution bar chart, horizontal competency bar chart, recent candidates table
- Charts built with Recharts 3.8.1, dynamically imported (`ssr: false`)
- `DELETE /admin/submissions/:linkId` — owner-only, runs in transaction (deletes answers + results, preserves link row, writes audit log)
- Submission detail: "Delete Submission" button (owner-only) with confirmation dialog, redirects on success
- `/admin` root redirects to `/dashboard`

---

### v1.0 — Core Platform ✓ (2026-05-07)

5 phases · 22 plans · 103 commits · 24 requirements delivered

#### Phase 1 — Foundation (2026-04-21)

- Monorepo scaffolded: `apps/web` (Next.js), `apps/api` (Fastify), `packages/shared` (TypeScript types)
- DB schema: `admin_users`, `technologies`, `questions` (versioned), `test_configs`, `audit_log`
- Admin auth: email/password login, bcrypt, JWT httpOnly cookie, Owner + Reviewer RBAC
- Question bank CMS: create, edit, archive MCQ questions with technology tag, difficulty, skill-area tag, immutable versioning (family_id + version + is_latest)
- Question search and filter UI
- Test configuration create/list/delete UI
- Seeded RNG with 6 unit tests (same seed + pool → same result always)

#### Phase 2 — Test Experience (2026-04-27)

- Shareable link generator: seed encoded in link (SHA-256 of test_id + token)
- Candidate portal: zero-friction entry (no login), question display, MCQ answer input
- 30-minute countdown timer: client UI (green → yellow → red) + server-side hard cutoff
- Auto-submit on expiry; server rejects late submissions
- Page-refresh recovery via `localStorage` (resumes with correct remaining time)
- Seeded question selection: same link → same questions; different links → different sets
- Link expiry enforcement; clear expired-link message

#### Phase 3 — Grading & Results (2026-04-28)

- MCQ auto-grading on submission (synchronous, no queue)
- Results stored: pre-computed `score_pct`, `pass`, per-skill-area breakdown
- Candidate results page: score, pass/fail verdict, time taken, skill-area breakdown, full answer sheet
- Admin submission detail view with question version info

#### Phase 4 — Admin Dashboard & Export (2026-04-28)

- Submissions list with TanStack sort/filter by test config, date, seniority, score
- Side-by-side candidate comparison at `/compare`
- Aggregate stats: CSS-only score distribution chart, avg score, pass rate per test config
- Server-side CSV export (blob download, auth-cookie-safe)
- Bulk question import via CSV (`POST /questions/import`) with per-row error reporting

#### Phase 5 — Improvements (2026-05-07)

- Server-side pagination on question bank and submissions (`PaginatedResult<T>` shared type)
- Questions export CSV (`GET /questions/export`, owner-only, supports filter params)
- Bulk archive (`PATCH /questions/bulk-archive`, max 200, audit-logged)
- Bulk delete (`POST /questions/bulk-delete`, blocks referenced families, returns blocked list)
- Hard delete (`DELETE /questions/:familyId/hard`, 409 if question is in use)
- Admin sidebar: active nav item highlighted via `usePathname`
- DataTable: optional pagination prop with Prev/Next controls and record count display
- Floating bulk action bar on questions page

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| MCQ-only | Fast to build, easy to auto-grade, sufficient for technical screening |
| Link-based candidate access (no auth) | Zero friction — one URL, instant start, no account friction |
| Seeded RNG per link | Same link = same questions always; fairness across candidates at the same level |
| Hybrid timer | Client UI for experience; server hard cutoff prevents tampering |
| Immutable question versioning | Past submissions permanently linked to the question version used at test time |
| postgres.js tagged templates | Parameterised SQL without an ORM — readable, safe, no N+1 risk |
| Owner / Reviewer / Member RBAC | Team hiring workflow: interviewers view results; only owners edit questions and manage accounts |
| `window.print()` for PDF | No dependency on `react-pdf` or `html2canvas` — browser print is reliable, zero bundle cost |
| Conditional SQL JOIN for filters | `JOIN test_links` only emitted when a filter is active; no performance hit on unfiltered queries |
