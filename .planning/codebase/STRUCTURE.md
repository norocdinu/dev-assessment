# Structure

## Top-Level Layout

```
dev-assessment/                         ← monorepo root
├── package.json                        ← workspace definition; root scripts (dev, test, db:migrate)
├── package-lock.json
├── tsconfig.base.json                  ← shared TypeScript compiler base (ES2022, NodeNext, strict)
├── railway.toml                        ← Railway deployment config for the web app (Dockerfile builder)
├── .env.example                        ← documented env vars for both apps
├── node_modules/                       ← hoisted workspace dependencies
├── apps/
│   ├── api/                            ← Fastify REST API service
│   └── web/                            ← Next.js frontend
└── packages/
    └── shared/                         ← shared TypeScript types (no runtime code)
```

---

## `apps/api/` — Fastify API

```
apps/api/
├── package.json                        ← API-specific deps; scripts: dev, build, start, migrate, seed, test
├── tsconfig.json                       ← extends tsconfig.base.json; outDir=dist, rootDir=src
├── vitest.config.ts                    ← test runner config (environment: node)
├── Dockerfile                          ← two-stage build: compile → minimal runner image
├── docker-entrypoint.sh                ← startup script: migrate → seed → start
├── railway.toml                        ← Railway config for API service (Dockerfile builder)
└── src/
    ├── index.ts                        ← entry point: registers plugins, mounts routes, starts server
    ├── db/
    │   ├── client.ts                   ← postgres client singleton (reads DATABASE_URL; pool max=10)
    │   ├── schema.sql                  ← full DDL for all tables and indexes; phase-tagged comments
    │   ├── migrate.ts                  ← incremental migration runner: detects existing tables, applies missing phases
    │   └── seed-admin.ts               ← idempotent admin user seeder (admin@example.com / Admin1234!)
    ├── middleware/
    │   ├── auth.ts                     ← authMiddleware: calls jwtVerify(); getAuthUser() helper
    │   └── rbac.ts                     ← requireRole(...roles): factory for role-checking preHandlers
    ├── routes/
    │   ├── auth.ts                     ← POST /auth/login, POST /auth/logout, GET /auth/me
    │   ├── questions.ts                ← CRUD + version history + CSV import for questions
    │   ├── test-configs.ts             ← CRUD for test configuration templates
    │   ├── technologies.ts             ← GET /technologies (public, no auth)
    │   ├── test-links.ts               ← POST/GET/DELETE /admin/test-links (generate, list, revoke)
    │   ├── candidate.ts                ← GET /candidate/session/:token, POST /candidate/submit/:token, GET /candidate/results/:token
    │   ├── submissions.ts              ← GET /admin/submissions (list, detail, compare, CSV export)
    │   └── stats.ts                    ← GET /admin/stats/:testConfigId (aggregate metrics)
    └── lib/
        ├── audit.ts                    ← logAudit(): inserts a row to audit_log table
        ├── rng.ts                      ← deriveSeed() (SHA-256), seededSample() (Fisher-Yates with seedrandom)
        └── rng.test.ts                 ← Vitest unit tests for deriveSeed and seededSample
```

### Key Files — API

| File | Role |
|---|---|
| `src/index.ts` | Wires all Fastify plugins and route prefixes; configures CORS allowlist from env + hard-coded production URL |
| `src/db/schema.sql` | Single source of truth for the database schema; phases 1–3 separated by comments |
| `src/db/migrate.ts` | Custom migration runner using `information_schema` table existence checks — no migration library |
| `src/routes/candidate.ts` | Core candidate flow: session creation, seeded question sampling, transactional grading on submit |
| `src/lib/rng.ts` | Deterministic question selection algorithm — critical for reproducibility and submission validation |

---

## `apps/web/` — Next.js Frontend

```
apps/web/
├── package.json                        ← web-specific deps; scripts: dev, build, start, lint
├── tsconfig.json                       ← Next.js-specific compiler options; path alias @/* → src/*
├── next.config.ts                      ← standalone output; outputFileTracingRoot set to monorepo root
├── tailwind.config.ts                  ← Tailwind content glob: src/**/*.{ts,tsx}
├── postcss.config.js                   ← PostCSS with Tailwind and autoprefixer
├── Dockerfile                          ← two-stage build; inlines NEXT_PUBLIC_API_URL at build time
└── src/
    ├── lib/
    │   └── api.ts                      ← axios instance; baseURL from NEXT_PUBLIC_API_URL; Bearer token interceptor; 401 redirect interceptor
    ├── app/
    │   ├── layout.tsx                  ← root HTML shell; sets page title/description; imports globals.css
    │   ├── page.tsx                    ← root redirect to /questions
    │   ├── login/
    │   │   └── page.tsx                ← email/password login form; stores JWT in localStorage on success
    │   ├── (admin)/                    ← route group: admin dashboard pages (URL has no group prefix)
    │   │   ├── layout.tsx              ← client component: calls /auth/me on mount; sidebar nav; redirects to /login on failure
    │   │   ├── questions/
    │   │   │   ├── page.tsx            ← question bank list with filters, search, archive, version history, CSV import
    │   │   │   ├── new/page.tsx        ← create new question form
    │   │   │   └── [familyId]/edit/page.tsx  ← edit question (creates new version)
    │   │   ├── test-configs/
    │   │   │   ├── page.tsx            ← list test configurations
    │   │   │   ├── new/page.tsx        ← create test config form
    │   │   │   └── [id]/links/page.tsx ← generate/revoke/list test links for a config
    │   │   ├── submissions/
    │   │   │   ├── page.tsx            ← submissions list with filters, stats panel, CSV export, comparison selection
    │   │   │   └── [linkId]/page.tsx   ← single submission detail with answer sheet
    │   │   └── compare/
    │   │       └── page.tsx            ← side-by-side candidate comparison table (skill area breakdown)
    │   └── (candidate)/                ← route group: candidate-facing pages
    │       ├── layout.tsx              ← pass-through layout (no auth, no nav)
    │       └── test/[token]/
    │           ├── page.tsx            ← main test page: timer, question card, nav, localStorage persistence, auto-submit
    │           ├── results/page.tsx    ← results page: score, pass/fail, skill breakdown, answer sheet
    │           └── expired/page.tsx    ← expired/not-found error page
    └── components/
        ├── ui/
        │   ├── DataTable.tsx           ← generic TanStack Table wrapper component
        │   └── QuestionForm.tsx        ← reusable form for creating/editing questions
        └── candidate/
            ├── Timer.tsx               ← countdown display; color changes at 5min and 1min
            ├── QuestionCard.tsx        ← renders a single question with radio-button options
            ├── QuestionNav.tsx         ← numbered question navigation dots (answered/unanswered/current)
            └── SubmitModal.tsx         ← confirmation modal when submitting with unanswered questions
```

### Key Files — Web

| File | Role |
|---|---|
| `src/lib/api.ts` | Central axios instance; all admin API calls go through this; handles auth token injection and 401 redirect |
| `src/app/(admin)/layout.tsx` | Auth gate for all admin pages; calls `GET /auth/me` to verify token |
| `src/app/(candidate)/test/[token]/page.tsx` | Core candidate experience: session loading, clock sync, answer persistence, auto-submit timer |
| `src/app/(admin)/submissions/page.tsx` | Most complex admin page: filterable table, stats panel, comparison selection, CSV export |

---

## `packages/shared/` — Shared Types

```
packages/shared/
├── package.json                        ← name: @dev-assessment/shared; exports: ./src/types/index.ts directly
└── src/
    └── types/
        └── index.ts                    ← all shared TypeScript interfaces and types
```

### Types Exported

| Type | Description |
|---|---|
| `Difficulty` | `'junior' \| 'mid' \| 'senior'` |
| `Technology` | Technology category entity |
| `Question` | Full question with versioning fields |
| `TestConfig` | Test template configuration |
| `AdminUser` | Admin user identity (id, email, role) |
| `TestLink` | One-time candidate link with lifecycle state |
| `CandidateQuestion` | Question shape sent to candidates (no correct_option) |
| `CandidateSession` | Session response from API (questions + timing) |
| `LocalSession` | Shape persisted in candidate's localStorage |
| `SkillAreaScore` | Per-skill correct/total/pct |
| `AnswerSheetRow` | Single row in a candidate's answer review |
| `AdminAnswerSheetRow` | Extended answer sheet row (adds family_id, version) |
| `SubmissionResult` | Full graded submission result |
| `AdminSubmissionResult` | Admin variant of submission result |
| `SubmissionListRow` | Compact row for the submissions list view |
| `TestConfigStats` | Aggregate stats: total, avg score, pass rate, score buckets |

---

## Module Organization Notes

- The shared package is referenced by both apps as `@dev-assessment/shared` — resolved via npm workspaces.
- The web app uses `@/*` path alias for `src/*` (configured in `tsconfig.json`).
- The API uses Node's native module resolution (`.js` extensions on imports even for `.ts` source files — required by NodeNext module resolution).
- There is no barrel index file pattern in the API — each route file exports one async function and is imported by name in `src/index.ts`.
- CSS is a single `globals.css` file in `src/app/` — Tailwind provides all component styling via utility classes inline in JSX.
