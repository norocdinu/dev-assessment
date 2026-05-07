# Roadmap — Dev Assessment Platform v1.1

**3 phases** | **12 requirements mapped** | All v1.1 requirements covered ✓

---

## Phase 6 — Foundation & Fixes (v1.1 start) ✓ Complete 2026-05-07

**Goal**: Prerequisite DB changes and the CSV round-trip bug land safely before any feature work begins.

**Requirements**: FIX-01 + DB prerequisites for TESTS-06, ACCESS-08

**Plans**:
- [x] 06-01: DB migration (add 'member' to role CHECK constraint, add candidate_name to test_links) + update shared AdminUser type
- [x] 06-02: CSV import fix (export slug not display name, add explanation column, fix multiline split)

**Deliverables**:
- Migration file: ALTER `admin_users.role` CHECK to include `'member'`; ADD `candidate_name TEXT` to `test_links`
- `packages/shared/src/types/index.ts`: `AdminUser.role` extended to `'owner' | 'reviewer' | 'member'`
- `GET /questions/export`: emits `tech_slug` column instead of tech display name
- `POST /questions/import`: accepts `explanation` as optional 10th column; `parseCsvLine` fixed for multiline-safe splitting

**Success criteria**:
1. A CSV exported from the question bank imports back cleanly with 0 row errors
2. `INSERT INTO admin_users (..., role) VALUES (..., 'member')` succeeds without constraint violation
3. `candidate_name` column exists in `test_links` and accepts a text value
4. `AdminUser.role` type in shared package includes `'member'` without TypeScript errors

---

## Phase 7 — Team Management & UX Polish ✓ Complete 2026-05-07

**Goal**: Owners can manage the team with the new Member role; admins can update their own password; test config UX is clear and consistent.

**Requirements**: ACCESS-05, ACCESS-06, ACCESS-07, ACCESS-08, TESTS-06, TESTS-07

**Plans**:
- [x] 07-01: Backend — account CRUD routes, PUT /auth/me, Member RBAC (link generation relaxed to owner+member), submission delete endpoint
- [x] 07-02: Frontend — accounts list + create page, account settings page, sidebar clickable admin info, test config "Candidate Name" label + 80% pass default

**Deliverables**:
- `GET /admin/accounts` — owner-only; returns list of all admin users
- `POST /admin/accounts` — owner-only; creates account with name, email, role, hashed temp password
- `PUT /admin/accounts/:id` — owner-only; updates name and/or role
- `DELETE /admin/accounts/:id` — owner-only; blocks if last owner (409 with clear message)
- `PUT /auth/me` — any authenticated admin; validates current password, updates hash
- Member RBAC: `POST /admin/test-links` relaxed to `requireRole('owner', 'member')`
- `/admin/accounts` page: TanStack table with name, email, role badge, edit/delete actions
- `/admin/accounts/new` page: create account form
- `/admin/settings` page: name display, email display, change password form
- Sidebar: bottom-left admin info is a clickable link to `/admin/settings`; Accounts nav item (owner-only, highlighted when active)
- Test link creation form: field renamed to "Candidate Name", default pass threshold 80%

**Success criteria**:
1. Owner creates a new Member account; the new user logs in and can generate test links
2. Member logs in and cannot see question edit buttons or the Accounts nav item
3. Owner tries to delete the last owner account and receives a clear error
4. Admin changes their own password; old password no longer works; new password authenticates
5. Test link creation form shows "Candidate Name" label and 80% as the default pass value

---

## Phase 8 — Analytics Dashboard & Submission Deletion

**Goal**: Admins have a rich analytics overview of all testing activity and can permanently remove submissions that should not count.

**Requirements**: DASH-06, DASH-07, DASH-08, DASH-09, SUB-01

**Plans**:

**Wave 1**
- 08-01: Backend — dashboard aggregate endpoints (cross-config KPIs, recent candidates, competency breakdown), submission hard-delete

**Wave 2** *(blocked on Wave 1 completion)*
- 08-02: Frontend — dashboard page (KPI cards, recent candidates list, score distribution chart, competency breakdown chart), submission delete UI

**Cross-cutting constraints:**
- All chart components must use `dynamic(..., { ssr: false })` (Recharts v3 requires browser APIs)
- `DELETE /admin/submissions/:linkId` is owner-only; delete order: `candidate_answers` first, then `submission_results` (FK constraint)

**Deliverables**:
- `GET /dashboard/stats` — returns: `{ totalCandidates, passRate, avgScore, weakestSkillArea, recentSubmissions[10] }` (any authenticated admin)
- `GET /dashboard/competency` — returns: `{ area: string, avgScore: number }[]` (optional `testConfigId` filter)
- `DELETE /submissions/:id` — owner-only; transaction: deletes candidate_answers, submission_results, submission; audit logs before delete; 409 if not found; 204 on success
- Recharts upgraded to v3.8.1; shadcn/ui chart components added (copy-paste)
- `/admin/dashboard` page: KPI strip (4 cards), recent candidates table (10 rows), score distribution BarChart (10% bands + pass threshold line), competency horizontal BarChart — all wrapped in `dynamic(..., { ssr: false })`
- Dashboard linked from sidebar as primary landing page
- Submission detail page: "Delete Submission" button (owner-only); confirmation modal; redirects to submissions list on success; graceful 404 on `/admin/compare` if submission deleted

**Success criteria**:
1. Dashboard loads and shows total candidates count, pass rate %, and average score
2. Score distribution chart displays bars for each 10% band with a visible pass threshold line
3. Competency breakdown chart shows a horizontal bar per skill area with average scores
4. Recent candidates list shows the last 10 submissions with candidate name and result
5. Owner deletes a submission; it disappears from all lists and dashboard stats update on reload
6. Visiting `/admin/compare` with a deleted submission ID shows a graceful not-found state

---

## Milestone: v1.1 — First Iteration

**Goal:** Polish the platform for real team use — fix rough edges, add a proper analytics dashboard, and expand account management.

**12 requirements across 3 phases.** Phases continue numbering from v1.0 (ended at Phase 5).
