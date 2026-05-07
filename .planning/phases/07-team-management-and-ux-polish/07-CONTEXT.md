# Phase 7: Team Management & UX Polish - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Account management: owner can create, view, edit, and delete admin accounts (with Member/Reviewer/Owner roles). Any admin can change their own password and display name via a settings page. Member RBAC enforced across the platform — Members can generate test links and view results, but cannot manage questions, test configs, or accounts. Two test config UX fixes: Candidate Name field on link generation form; pass threshold default changed to 80% on test config creation.

</domain>

<decisions>
## Implementation Decisions

### Admin user name field (DB migration required)
- **D-01:** Add `name TEXT NOT NULL DEFAULT ''` column to `admin_users` via idempotent Phase 7 migration (same pattern as Phase 6: `information_schema.columns` check + `ALTER TABLE`). Existing rows (the owner seed account) get the empty string default — the owner can update their name via settings.
- **D-02:** Name is required when creating a new account. The create-account form (`/admin/accounts/new`) collects name, email, role, and an initial password. Owner types the initial password and communicates it to the new user out-of-band (no email invite, no force-change-on-first-login flag).
- **D-03:** The account settings page (`/admin/settings`) lets admins edit their own name AND change their password. Both actions on one page: an editable name input (pre-filled) + a change-password form (current password + new password). Email is displayed as read-only (email changes are owner-managed at creation only).

### Member RBAC — sidebar and page-level restrictions
- **D-04:** The "Accounts" nav item in the sidebar is hidden for non-owner roles (Member, Reviewer). Owners see it; everyone else does not. Use `user.role === 'owner'` in layout.tsx to conditionally include the nav item.
- **D-05:** Question Bank is readable by all roles. Add/edit/delete/archive buttons are hidden for non-owners (extend `isOwner` check, same pattern as Phase 5). Members see the question list as read-only.
- **D-06:** Members can navigate to Test Configs and the Links sub-page (they need this to generate links). "Generate New Link" button is visible to owner AND member roles (update `isOwner` check to `isOwner || isMember` or `canGenerateLinks`). Test config create/edit/delete actions remain owner-only.
- **D-07:** `POST /admin/test-links` RBAC updated from `requireRole('owner')` to `requireRole('owner', 'member')`.

### Test config UX fixes
- **D-08:** `pass_threshold_pct` default on the New Test Config form (`/test-configs/new`) changes from `70` to `80`. One-line change in `page.tsx` initial state.
- **D-09:** Link generation form adds a "Candidate Name" text input (optional). Placement: inline on the links page, above the "Generate New Link" button — a small form appears with the name input and the generate button. On submit, `candidate_name` is POSTed alongside `test_config_id`. The links table gains a "Candidate" column showing the stored name.
- **D-10:** `POST /admin/test-links` schema updated: `candidate_name: z.string().optional()`. INSERT includes `candidate_name` column (added in Phase 6 migration). `GET /admin/test-links/:testConfigId` SELECT includes `candidate_name` for display in the table.

### `PUT /auth/me` endpoint
- **D-11:** New endpoint on the auth router: validates `current_password` (bcrypt compare), then updates `password_hash`. Also accepts optional `name` field to update display name in the same request. Returns `{ ok: true }`.

### Claude's Discretion
- Exact layout/spacing of the settings page (name field + password form on same page)
- Whether to show a success toast or inline success message after saving settings
- Whether `isMember` is a separate computed variable or the check is inline (`user.role === 'member'`)
- `DELETE /admin/accounts/:id` endpoint: block if deleting the last owner — the `409` error message wording
- Edit account form: whether to show it inline (table row expand) or as a separate edit page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ACCESS-05, ACCESS-06, ACCESS-07, ACCESS-08, TESTS-06, TESTS-07 (full acceptance criteria)

### API layer — files to modify
- `apps/api/src/routes/auth.ts` — Add `PUT /auth/me` (validate current password, update name + hash)
- `apps/api/src/routes/test-links.ts` — Update `POST /` schema + INSERT for `candidate_name`; relax `requireRole` to `'owner', 'member'`
- `apps/api/src/middleware/rbac.ts` — `requireRole(...roles)` pattern — new `GET/POST/PUT/DELETE /admin/accounts` routes use this
- `apps/api/src/db/schema.sql` — `admin_users` table (add `name` column); `test_links` table (already has `candidate_name` from Phase 6)
- `apps/api/src/db/migrate.ts` — Phase 6 migration pattern to copy for Phase 7 name column migration

### Frontend — files to modify
- `apps/web/src/app/(admin)/layout.tsx` — Add Accounts nav item (owner-only); make bottom-left user info block a link to `/admin/settings`; show admin `name` (not just email)
- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — Add candidate name input; update handleGenerate to include `candidate_name`; change `isOwner` → `isOwner || isMember` for Generate button; add Candidate column to table
- `apps/web/src/app/(admin)/test-configs/new/page.tsx` — Change `pass_threshold_pct` initial state from `70` to `80`

### Shared types
- `packages/shared/src/types/index.ts` — `AdminUser` type already has `role: 'owner' | 'reviewer' | 'member'` (Phase 6); add `name: string` field here too

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DataTable` (TanStack Table): use for the accounts list (`/admin/accounts`) — same pattern as questions and submissions pages
- `api` axios instance (`apps/web/src/lib/api.ts`): all admin API calls, Bearer token auth
- `requireRole` middleware (`apps/api/src/middleware/rbac.ts`): used on all owner-only routes — extend callers only, no changes to the middleware itself
- `sonner` Toaster: already installed and mounted in layout.tsx — use for success feedback on account actions and settings saves

### Established Patterns
- Admin pages: `'use client'` + useState/useEffect, inline error handling, no React Query/SWR
- Role check pattern in pages: `api.get('/auth/me')` on mount → `setUserRole(r.data.user.role)` → `const isOwner = userRole === 'owner'`
- CTA button: `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700`
- Error display: `<p className="text-sm text-red-600">{error}</p>`
- Phase 6 migration idempotency: `information_schema.columns` check before ALTER TABLE

### Integration Points
- `apps/api/src/routes/auth.ts` — Existing auth router; add `PUT /auth/me` as a new route (authMiddleware + no role restriction — any admin)
- `apps/web/src/app/(admin)/layout.tsx` — `navItems` array: add `{ href: '/accounts', label: 'Accounts' }` conditionally for owners; `user.email` display in bottom-left → show `user.name || user.email`; wrap bottom-left block in `<Link href="/settings">`
- New pages to create: `/admin/accounts/page.tsx`, `/admin/accounts/new/page.tsx`, `/admin/settings/page.tsx`

</code_context>

<specifics>
## Specific Ideas

- The existing owner seed account has no name — migration default `''` means the owner's name in the sidebar will be blank until they visit settings and fill it in. Consider defaulting the name display to email as fallback: `user.name || user.email`.
- The Candidate column in the links table should gracefully handle `null` (pre-Phase-7 links have no candidate_name): display `—` when null.
- `DELETE /admin/accounts/:id` must check "last owner" constraint — query count of accounts with `role = 'owner'` before delete; if count === 1, return 409 with clear message (from REQUIREMENTS ACCESS-07).

</specifics>

<deferred>
## Deferred Ideas

- Force-change-on-first-login: new accounts don't require a password change on first login — deferred as unnecessary complexity for a small team tool
- Email changes: Owner manages emails at creation; self-service email change out of scope for v1.1 (per REQUIREMENTS out-of-scope table)
- Reviewer-role sidebar restrictions: Reviewers were not discussed; treat them the same as Members for sidebar purposes (no Accounts nav) unless otherwise specified

</deferred>

---

*Phase: 07-team-management-and-ux-polish*
*Context gathered: 2026-05-07*
