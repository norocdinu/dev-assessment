# Architecture

## System Overview

This is a **technical assessment platform** with two user roles: **admins** who create and manage tests, and **candidates** who take timed assessments via one-time tokenised links.

The system is a **monorepo** containing two deployed applications and one shared package:

```
monorepo root
├── apps/api        → Fastify REST API (Node.js)
├── apps/web        → Next.js frontend (React)
└── packages/shared → TypeScript type definitions shared across both apps
```

The two apps are **deployed as separate services** on Railway, each with its own Dockerfile.

---

## Layers

### 1. Database Layer (PostgreSQL)
All persistent state lives in PostgreSQL. The schema is versioned by hand using phase-tagged comments in `schema.sql`. Migrations are applied by a custom script (`db/migrate.ts`) that detects which tables already exist and applies only the missing phases.

Key tables:
| Table | Purpose |
|---|---|
| `admin_users` | Admins with role (`owner` or `reviewer`) and bcrypt password |
| `technologies` | Configurable technology categories (Power BI, SFMC, Data Engineering) |
| `questions` | Immutable versioned question bank; each edit creates a new row with incremented `version` |
| `test_configs` | Named test templates binding a technology, difficulty, question count, and pass threshold |
| `test_links` | One-time tokens issued to candidates; tracks lifecycle state |
| `candidate_answers` | Raw answers submitted by a candidate for a given link |
| `submission_results` | Graded result with score, pass/fail, skill area breakdown, and time taken |
| `audit_log` | Append-only log of admin CRUD actions |

### 2. API Layer (`apps/api` — Fastify)
Stateless REST API. All routes are registered with prefix mounting. Authentication is enforced via Fastify `preHandler` hooks.

Route groups:
| Prefix | Filename | Access |
|---|---|---|
| `/auth` | `routes/auth.ts` | Public (login); authenticated (me, logout) |
| `/questions` | `routes/questions.ts` | Authenticated; write ops require `owner` role |
| `/test-configs` | `routes/test-configs.ts` | Authenticated; write ops require `owner` role |
| `/technologies` | `routes/technologies.ts` | Public (no auth guard) |
| `/admin/test-links` | `routes/test-links.ts` | Authenticated; generation and revocation require `owner` role |
| `/admin/submissions` | `routes/submissions.ts` | Authenticated |
| `/admin/stats` | `routes/stats.ts` | Authenticated |
| `/candidate` | `routes/candidate.ts` | Public (token-gated, no JWT) |

The candidate routes are mounted inside a sub-plugin that manually applies CORS headers — this is because candidates access the API directly from the browser without admin JWT tokens.

### 3. Frontend Layer (`apps/web` — Next.js App Router)
Next.js 16 with the App Router. The `src/app/` directory uses route groups to partition the two user experiences:

- `(admin)/` — admin dashboard, protected by client-side auth check in the layout
- `(candidate)/` — candidate test flow, public (no auth; token in URL)

All pages are client components (`'use client'`). There is no server-side data fetching via React Server Components; all data is fetched from the browser using `axios` (admin) or `fetch` (candidate pages).

### 4. Shared Types (`packages/shared`)
A TypeScript-only package (`packages/shared/src/types/index.ts`) exporting all shared domain types: `Question`, `TestConfig`, `TestLink`, `AdminUser`, `CandidateQuestion`, `CandidateSession`, `LocalSession`, `SubmissionResult`, `SubmissionListRow`, `TestConfigStats`, etc.

It has no build step — the `exports` field points directly to the `.ts` source file, relying on consuming apps to compile it.

---

## Data Flow

### Admin Authentication Flow
1. Admin POSTs credentials to `POST /auth/login`.
2. API verifies email/password via bcrypt.
3. API signs a JWT (`id`, `email`, `role`) and returns it in the response body.
4. Browser stores the JWT in `localStorage` as `auth_token`.
5. All subsequent admin API requests include `Authorization: Bearer <token>` via an axios request interceptor in `src/lib/api.ts`.
6. On 401 response, the axios interceptor clears localStorage and redirects to `/login`.
7. On page load, the admin layout calls `GET /auth/me` to validate the stored token and populate the user state.

### Candidate Test Flow
```
Admin generates link
  → API creates test_link row (state: 'created', random 64-hex token, SHA-256 derived seed)
  → API returns URL: {WEB_URL}/test/{token}

Admin shares URL with candidate

Candidate opens URL
  → GET /candidate/session/{token}
  → API validates link state (not expired/submitted), fetches question pool
  → Pool is deterministically sampled via seeded Fisher-Yates shuffle (same seed → same questions every time)
  → First access: link transitions to 'active', started_at is set
  → Returns questions (no correct answers) + started_at + server_now

Candidate answers questions
  → Answers stored in localStorage (key: da_session_{token}) for crash recovery
  → Timer counts down from 30 minutes using server clock offset to correct for client drift

Candidate submits (manual or auto-submit on timeout)
  → POST /candidate/submit/{token} with answers map
  → API re-derives the canonical question set from the same seed to validate submitted question IDs
  → Server enforces hard deadline: NOW() > started_at + 30 minutes → 410
  → Transactional: inserts candidate_answers, transitions link to 'submitted', grades, inserts submission_results
  → Returns score_pct and pass/fail

Candidate views results
  → GET /candidate/results/{token}
  → Returns full answer sheet with correct options, skill area breakdown
```

### Admin Submissions View
- Admin lists all submissions with optional filters (test config, date range, difficulty).
- Admin can view a single submission detail with full answer sheet.
- Admin can compare two or more submissions side by side (skill area breakdown matrix).
- Admin can export filtered submissions as CSV.
- Admin can view aggregate statistics (pass rate, average score, score distribution by bucket) per test config.

---

## Key Patterns

### Question Versioning (Immutable Audit Trail)
Questions are never updated in place. Every edit creates a new row with the same `family_id` and an incremented `version`. The `is_latest` flag marks the current canonical version. Historical versions are preserved and viewable. Soft-delete sets `is_active = FALSE` on the latest version.

### Deterministic Seeded Question Selection
Each test link has a seed derived from `SHA-256(test_config_id + ":" + token)`. At session load and again at submission, the API runs the same Fisher-Yates shuffle with this seed over the question pool (ordered by `id` for stability). This guarantees:
- The same candidate always sees the same questions on refresh.
- The server can verify which question IDs are valid for a given submission without storing the question set in the database.

### RBAC (Role-Based Access Control)
Two roles: `owner` and `reviewer`.
- `owner` — full CRUD: create/edit/delete questions, create/delete test configs, generate/revoke test links.
- `reviewer` — read-only: can view questions, test configs, submissions, and stats but cannot mutate.
- Enforced server-side by a `requireRole(...roles)` middleware factory that reads the JWT claim.

### Audit Logging
All write operations on questions (`question.create`, `question.edit`, `question.archive`) are logged to `audit_log` with the admin ID, entity type/ID, and a JSON detail blob.

### Client-Side Auth Guard
The admin layout (`(admin)/layout.tsx`) is a `'use client'` component that fires `GET /auth/me` on mount. If it fails, it redirects to `/login`. There is no middleware-based or server-side route protection — auth is purely client-enforced.

### Candidate Session Persistence
The candidate test page saves the current session (answers, current question index, server start time) to `localStorage` after every answer and navigation event. On reload, the session is restored if the `started_at` timestamp matches the server's value, preventing session hijacking across different test links.

### CSV Import
Admins can bulk-import questions by uploading a CSV file. The API parses it manually (custom `parseCsvLine` with quoted-field handling), validates each row with Zod, resolves technology slugs to UUIDs, and inserts valid rows one by one. Per-row errors are collected and returned alongside a count of successfully imported questions.

---

## API Contract Summary

All request and response bodies are JSON. The API does not use a schema registry or OpenAPI spec — Zod schemas in route handlers serve as the de-facto contract.

### Response conventions
- Successful creates: `201 Created`
- Successful reads/updates: `200 OK`
- Soft-deletes: `200 OK` with `{ ok: true }`
- Validation errors: `400 Bad Request`
- Auth failures: `401 Unauthorized`
- RBAC failures: `403 Forbidden`
- Not found: `404 Not Found`
- Already submitted: `409 Conflict`
- Expired/deadline: `410 Gone`

---

## State Management

No global state library (no Redux, Zustand, Jotai, etc.). State is managed with React `useState` and `useEffect` hooks at the page component level. Data is fetched on mount and refetched imperatively after mutations. The admin layout holds the current user object in component state.
