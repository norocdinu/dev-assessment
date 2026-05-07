# Research Summary — v1.1 First Iteration

**Synthesized:** 2026-05-07
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Stack Additions

**Charting:** Recharts already installed (`^2.12.7`) — upgrade to `v3.8.1`. Add shadcn/ui chart components (copy-paste, no npm install). Both require `"use client"` + `dynamic(..., { ssr: false })` in Next.js 14 App Router.

**Account management / password form:** No new libraries — existing Fastify + postgres + zod stack covers it.

**CSV fix:** Bug fix only, no new libraries.

---

## Feature Decisions

### Dashboard
- **Chart set:** Score histogram (BarChart, 10% bands + pass threshold reference line) + Competency horizontal BarChart (avg % per skill-area tag) + Tailwind KPI cards (no chart library needed)
- **Recent candidates:** Last 10 submissions — candidate name, test config, score, pass/fail, date
- **Anti-features:** No radar charts, no time-series trends, no drilldown complexity

### Member Role
- **Can:** Generate/revoke test links, view all submissions, export CSV, view question bank (read-only)
- **Cannot:** Add/edit/delete questions, manage test configs, manage accounts, delete submissions
- `requireRole` already accepts varargs — relax link generation from `'owner'` to `'owner', 'member'`

### Account Settings (self-service)
- Display name (editable), email (read-only), change password (requires current password)
- Defer: avatar, timezone, 2FA

### Account Management (Owner only)
- Create: name, email, role (owner/member/reviewer), temporary password
- Edit: name and role
- Delete: blocked if last owner (server-side guard)

### Submission Deletion
- Hard delete in transaction: candidate_answers → submission_results → submission
- Audit log before executing; owner-only; confirmation modal; returns 204
- Dashboard stats update automatically (computed live)

---

## Architecture Impact

### DB Changes Required
1. Widen `admin_users.role` CHECK constraint to include `'member'` (DROP + re-ADD)
2. Add `candidate_name TEXT` column to `test_links`
3. New migration file required

### CSV Fix — Root Cause Confirmed
Export emits technology **display name** (`"Power BI"`); importer expects **slug** (`power-bi`). Fix: change export query to select `t.slug`. Also add `explanation` column to make round-trip lossless.

### New API Endpoints
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | /dashboard/stats | any auth | Cross-config KPIs + recent candidates |
| GET | /dashboard/competency | any auth | Avg score per skill area |
| GET | /admin/accounts | owner | List all admin accounts |
| POST | /admin/accounts | owner | Create new admin account |
| PUT | /admin/accounts/:id | owner | Update name/role |
| DELETE | /admin/accounts/:id | owner | Delete account (last-owner guard) |
| PUT | /auth/me | any auth | Change own password |
| DELETE | /submissions/:id | owner | Hard-delete submission |

### New Frontend Pages
- `/admin/dashboard` — analytics overview
- `/admin/accounts` — account list (owner only, sidebar link gated)
- `/admin/accounts/new` — create account
- `/admin/settings` — my account / change password

---

## Key Pitfalls

1. **DB constraint:** `CHECK (role IN ('owner', 'reviewer'))` hard-rejects Member inserts — migration mandatory before any account creation
2. **Shared type:** `AdminUser.role` in `packages/shared/types/index.ts` needs `'member'` added or TypeScript guards silently miss it
3. **RBAC audit:** 6 existing endpoints use only `authMiddleware` — confirm each endpoint's intended access level before adding Member role
4. **Chart SSR:** Wrap chart components in `dynamic(() => import(...), { ssr: false })` — Recharts causes hydration mismatches without it
5. **CSV multiline:** Fix `split('\n')` before `parseCsvLine` — it breaks quoted fields with embedded newlines
6. **Deletion → broken compare URLs:** Gracefully handle 404 on `/admin/compare` when a referenced submission is deleted
7. **JWT no revocation:** Role changes take effect only after token expiry (8h) — acceptable for v1.1

---

## Suggested Build Order

1. **DB migration + shared types** — prerequisite for everything
2. **CSV import fix** — isolated, zero-risk, high user value
3. **Backend endpoints** — dashboard stats, account CRUD, submission delete, PUT /auth/me
4. **Frontend pages** — dashboard, accounts, settings (depends on backend)
