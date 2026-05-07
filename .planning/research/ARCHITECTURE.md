# Architecture Research — v1.1

## New API Endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/admin/dashboard` | any auth | KPI aggregates across all test configs (total candidates, overall pass rate, avg score) |
| GET | `/admin/dashboard/recent` | any auth | Last N submissions with candidate name, score, pass/fail, date |
| GET | `/admin/stats/:testConfigId` | any auth | Already exists — score distribution histogram per test config |
| GET | `/admin/stats/:testConfigId/competency` | any auth | Avg score per skill_area tag for a test config (new endpoint) |
| GET | `/admin/accounts` | owner | List all admin_users |
| POST | `/admin/accounts` | owner | Create new admin account (owner or member role) |
| PUT | `/admin/accounts/:id` | owner | Update role or email of an account |
| DELETE | `/admin/accounts/:id` | owner | Deactivate/delete an account |
| PUT | `/auth/me` | any auth | Change own password (self-service) |
| DELETE | `/admin/submissions/:id` | owner | Delete a submission — cascades to candidate_answers, submission_results, clears any cache |

**Notes on existing vs. new:**
- `GET /admin/stats/:testConfigId` already exists in `apps/api/src/routes/stats.ts` and returns total_submissions, avg_score_pct, pass_rate_pct, and all histogram buckets. The dashboard KPI panel on the submissions page already consumes this. No new endpoint is strictly required for KPIs per test-config — only a cross-config aggregate endpoint is truly new.
- The submissions list (`GET /admin/submissions`) already exists with pagination and filtering. "Recent submissions" for the dashboard can be a lightweight variant (`?page=1&pageSize=10` with no filters) or a dedicated `/admin/dashboard/recent` endpoint.
- All new endpoints follow the existing pattern: `authMiddleware` preHandler for authentication; `requireRole('owner')` preHandler added for owner-only routes. Route files registered in `apps/api/src/index.ts`.

---

## DB Changes

### 1. Add `'member'` to `admin_users.role` CHECK constraint

```sql
-- Current:
role TEXT NOT NULL CHECK (role IN ('owner', 'reviewer'))

-- Required:
role TEXT NOT NULL CHECK (role IN ('owner', 'reviewer', 'member'))
```

PostgreSQL does not allow `ALTER TABLE ... MODIFY CONSTRAINT` directly. The migration must:
```sql
ALTER TABLE admin_users DROP CONSTRAINT admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('owner', 'reviewer', 'member'));
```

### 2. Add `candidate_name` to `test_links` (optional — needed for dashboard "recent candidates" display)

```sql
ALTER TABLE test_links ADD COLUMN candidate_name TEXT;
```

This is needed if the dashboard shows a "Candidate Name" column. The name would be collected at test-start time (either from the link generation form or from the candidate at session start). The v1.1 scope mentions a "Candidate Name" label — if it means the admin labels the link at creation time, this field goes on `test_links`. If collected from the candidate at test start, it goes on `test_links` updated at `POST /candidate/session/:token` activation time.

**Recommendation:** Add it to `test_links` at link-creation time (admin enters candidate name when generating the link). This is the simplest path and avoids any candidate-facing changes.

### 3. No other schema changes required

The cascade for submission deletion is handled in application code (not FK CASCADE), since `submission_results` and `candidate_answers` both reference `test_links.id` and the submission identity flows through `test_links`. The delete order is:
1. DELETE FROM `candidate_answers` WHERE `link_id = :id`
2. DELETE FROM `submission_results` WHERE `link_id = :id`
3. UPDATE `test_links` SET `state = 'expired'` (or hard-delete if desired)

**Redis note:** Redis is in the planned stack (per research SUMMARY.md and STATE.md) but is not yet used in the codebase — no Redis client exists in `apps/api/src`. There is no results cache to invalidate on submission delete. If Redis is introduced in v1.1 for caching stats, the delete endpoint must also clear the relevant cache key.

---

## Frontend New Pages/Components

### New Routes (Next.js App Router, under `apps/web/src/app/(admin)/`)

| Route | File | Purpose |
|-------|------|---------|
| `/dashboard` | `(admin)/dashboard/page.tsx` | New dashboard home — KPI cards, recent submissions table, score chart |
| `/accounts` | `(admin)/accounts/page.tsx` | Account management list — shows all admin_users with role badges |
| `/accounts/new` | `(admin)/accounts/new/page.tsx` | Create new account form |
| `/accounts/:id` | `(admin)/accounts/[id]/page.tsx` | Edit account (role change) |
| `/settings` | `(admin)/settings/page.tsx` | Account settings — change password form for current user |

### Sidebar Changes (`apps/web/src/app/(admin)/layout.tsx`)

Add new nav items to the `navItems` array:
```ts
{ href: '/dashboard', label: 'Dashboard' },  // new — prepend as first item
{ href: '/accounts', label: 'Accounts' },     // new — owner-only (hide for non-owners)
{ href: '/settings', label: 'Settings' },     // new — at bottom, above sign-out
```

The sidebar currently shows the logged-in user's role. Owner-only items (Accounts) should be conditionally rendered based on `user.role === 'owner'`.

### New Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `KPICard` | `components/ui/KPICard.tsx` | Reusable stat card (number + label) for dashboard |
| `ScoreBar` | `components/ui/ScoreBar.tsx` | CSS-only horizontal bar (already inline in submissions page — extract to component) |

### Shared Type Changes (`packages/shared/src/types/index.ts`)

Add to existing types:
```ts
// v1.1 additions

export type AdminRole = 'owner' | 'reviewer' | 'member';

// Update AdminUser to use the union type
export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;  // was: 'owner' | 'reviewer'
}

export interface DashboardStats {
  total_candidates: number;
  pass_rate_pct: number;
  avg_score_pct: number;
  recent_submissions: RecentSubmission[];
}

export interface RecentSubmission {
  link_id: string;
  candidate_name: string | null;
  test_name: string;
  score_pct: number;
  pass: boolean;
  submitted_at: string;
}

export interface CompetencyBreakdown {
  skill_area: string;
  avg_pct: number;
  total_answers: number;
}
```

---

## CSV Import Fix

### Root Cause

The **export** (`GET /questions/export`) writes columns in this order:
```
Technology, Difficulty, Skill Area, Question Text, Option A, Option B, Option C, Option D, Correct Option
```
where "Technology" is the **display name** (e.g. `"Power BI"`).

The **import** (`POST /questions/import`) expects columns in this order:
```
technology_slug, difficulty, skill_area, text, option_a, option_b, option_c, option_d, correct_option, explanation
```
where column 0 is the **slug** (e.g. `power-bi`), and it looks up the UUID via `techMap.get(techSlug)`.

**The mismatch is column 0:** export writes the human-readable name; import reads it as a slug. Any export-then-import round-trip fails with `Unknown technology slug: 'Power BI'` for every row.

### Fix Approach (two options — pick one)

**Option A (preferred): Fix the export to write slug instead of name**
- In `apps/api/src/routes/questions.ts`, change the export query to also `SELECT t.slug AS technology_slug` alongside `t.name AS technology_name`.
- In the export rows map, write `esc(q.technology_slug)` instead of `esc(q.technology_name)` for column 0.
- Headers stay the same or can be renamed to `"Technology Slug"` for clarity.
- No import parser changes needed.

**Option B: Fix the import to accept the name and resolve to slug**
- Extend the `techMap` to also index by name: `new Map([...t.slug, t.id], [...t.name.toLowerCase(), t.id])`.
- More tolerant but less explicit.

**Option A is cleaner** — the canonical identifier is the slug, the export is the thing generating the import feed, so fixing the source is correct.

**Secondary issue:** The import parser does `.trim()` on tokens but the export wraps every cell in quotes (including the slug). The `parseCsvLine` function strips quotes correctly (`inQuotes` toggle), so quoted slugs should parse fine — this is not a bug. But the `explanation` column (column 9) is optional in export but the import parser reads it from index 9 if present. Export currently does not include an explanation column at all (only 9 columns, index 0–8). The fix should also add `explanation` as column 9 in the export so a round-trip preserves explanations.

---

## Integration Points

### What existing code is touched by each new feature

**Dashboard analytics:**
- `apps/api/src/routes/stats.ts` — existing endpoint covers per-test KPIs; add new routes or extend with aggregate endpoint.
- `apps/web/src/app/(admin)/submissions/page.tsx` — the existing stats panel is already the score distribution chart. The standalone `/dashboard` page will be new but can share the same `api.get('/admin/stats/:id')` call pattern.
- `packages/shared/src/types/index.ts` — add `DashboardStats`, `RecentSubmission`, `CompetencyBreakdown` types.

**Account management:**
- `apps/api/src/db/schema.sql` — migration to widen the role CHECK constraint.
- `apps/api/src/index.ts` — register new `accountRoutes` under `/admin/accounts`.
- `apps/api/src/routes/auth.ts` — add `PUT /auth/me` handler (password change, bcrypt hash update).
- `apps/api/src/middleware/rbac.ts` — no changes; `requireRole('owner')` already accepts any string, so passing `'member'` or checking `requireRole('owner', 'reviewer')` works by adding to the spread.
- `packages/shared/src/types/index.ts` — update `AdminUser.role` union.
- `apps/web/src/app/(admin)/layout.tsx` — add Accounts nav item gated on `user.role === 'owner'`; add Settings nav item.

**Submission deletion:**
- `apps/api/src/routes/submissions.ts` — add `DELETE /:linkId` handler (owner-only, application-level cascade: delete `candidate_answers`, then `submission_results`, then mark `test_links` expired or hard-delete).
- `apps/web/src/app/(admin)/submissions/page.tsx` — add a Delete button (owner-only) on each submission row; optimistic removal from list state after success.
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — add Delete button on the detail view.

**CSV import fix:**
- `apps/api/src/routes/questions.ts` — modify the `/export` endpoint's SQL query and row-mapping to emit `technology_slug` instead of `technology_name`, and add `explanation` as the 10th column.
- No frontend changes required; the import UI in `apps/web/src/app/(admin)/questions/page.tsx` is already correct.

---

## Build Order (suggested)

### Wave 1 — Foundation (no frontend dependencies, unblocks everything)

**Phase A: DB migration + shared types**
- Widen `admin_users.role` CHECK constraint to include `'member'`
- Add `candidate_name` to `test_links`
- Update `AdminUser.role` type in `packages/shared`
- Add new v1.1 shared types (`DashboardStats`, `RecentSubmission`, `CompetencyBreakdown`)

Rationale: All other backend and frontend work depends on the correct DB shape and shared types. Do this first, atomically.

### Wave 2 — Backend endpoints (can be built in parallel after Wave 1)

**Phase B: CSV import fix**
- Modify `GET /questions/export` to emit slug + explanation columns
- Fully self-contained single-file change; zero risk; immediate user value
- Verify with a real round-trip: export → import → check imported rows

**Phase C: Submission deletion**
- Add `DELETE /admin/submissions/:linkId` to `apps/api/src/routes/submissions.ts`
- Handle application-level cascade order, add audit log entry
- Owner-only via `requireRole('owner')`

**Phase D: Account management API**
- New file `apps/api/src/routes/accounts.ts`
- CRUD for admin_users; password hashing via bcrypt (same as existing login); register under `/admin/accounts` in index.ts
- Add `PUT /auth/me` to `apps/api/src/routes/auth.ts` for self-service password change

**Phase E: Dashboard analytics API**
- Add competency breakdown endpoint (aggregates `skill_area_scores` JSONB across submissions)
- Add cross-config aggregate endpoint if a true global KPI panel is needed
- The per-test stats endpoint already exists

### Wave 3 — Frontend (after Wave 2 endpoints are stable)

**Phase F: CSV fix verification in UI**
- No frontend changes required; existing import UI works once the export is fixed

**Phase G: Submission delete UI**
- Add delete button + confirmation to submissions list and detail view
- Owner role guard (same `isOwner` pattern already used throughout)

**Phase H: Account management UI**
- New `/accounts` page + `/accounts/new` form + `/accounts/:id` edit page
- Add Accounts nav item to layout (owner-only)

**Phase I: Dashboard page + Settings page**
- New `/dashboard` page consuming existing stats endpoints + new competency endpoint
- New `/settings` page with change-password form calling `PUT /auth/me`
- Add both to sidebar nav

**Why this order:**
1. DB + types first avoids mismatched contract errors during development.
2. CSV fix is isolated and delivers immediate value with no dependencies.
3. Backend endpoints before frontend prevents blocked frontend PRs waiting for API.
4. Dashboard last because it depends on the most endpoints (stats, recent, competency) all being ready.
