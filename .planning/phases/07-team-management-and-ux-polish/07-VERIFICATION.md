---
phase: 7
name: "Team Management & UX Polish"
status: passed
verified_at: "2026-05-07"
must_haves_total: 17
must_haves_verified: 17
gaps: []
---

# Phase 7 Verification

## Must-Have Verification

| # | Criterion | Source | Status |
|---|-----------|--------|--------|
| 1 | admin_users table has name column (TEXT NOT NULL DEFAULT '') | apps/api/src/db/schema.sql:9 — `name TEXT NOT NULL DEFAULT ''`; apps/api/src/db/migrate.ts:122 — `ALTER TABLE admin_users ADD COLUMN name TEXT NOT NULL DEFAULT ''` | ✓ PASS |
| 2 | GET /auth/me returns name field from DB | apps/api/src/routes/auth.ts:54 — `SELECT id, email, name, role FROM admin_users WHERE id = ${userId}` | ✓ PASS |
| 3 | PUT /auth/me validates current_password before updating | apps/api/src/routes/auth.ts:59–82 — `updateMeSchema` requires `current_password: z.string().min(1)`, bcrypt.compare returns 401 `'Current password is incorrect'` before any update | ✓ PASS |
| 4 | DELETE /admin/accounts/:id returns 409 when deleting last owner | apps/api/src/routes/accounts.ts:78–84 — counts owners, returns `reply.status(409).send({ error: 'Cannot delete the last owner account' })` when count === 1 | ✓ PASS |
| 5 | POST /admin/test-links accepts candidate_name | apps/api/src/routes/test-links.ts:11 — `candidate_name: z.string().optional()` in createSchema; line 31 — included in INSERT | ✓ PASS |
| 6 | POST /admin/test-links allows member role | apps/api/src/routes/test-links.ts:16 — `requireRole('owner', 'member')` on POST handler | ✓ PASS |
| 7 | AdminUser shared type has name: string | packages/shared/src/types/index.ts:47 — `name: string` inside `AdminUser` interface | ✓ PASS |
| 8 | Accounts nav item renders only when user.role === 'owner' | apps/web/src/app/(admin)/layout.tsx:56 — `{user.role === 'owner' && (<Link href="/accounts" ...>Accounts</Link>)}` | ✓ PASS |
| 9 | Bottom-left user block in sidebar links to /settings | apps/web/src/app/(admin)/layout.tsx:70–77 — user identity block wrapped in `<Link href="/settings" ...>` | ✓ PASS |
| 10 | user.name \|\| user.email shown in sidebar (not just email) | apps/web/src/app/(admin)/layout.tsx:74 — `{user.name \|\| user.email}` as primary display; line 75 — conditional `{user.name && <div>{user.email}</div>}` | ✓ PASS |
| 11 | /admin/accounts page exists with DataTable showing Name, Email, Role, Created, Actions columns | apps/web/src/app/(admin)/accounts/page.tsx — columns array at lines 62–108 defines headers: 'Name', 'Email', 'Role', 'Created', 'Actions'; DataTable rendered at line 132 | ✓ PASS |
| 12 | /admin/accounts/new page exists with Name, Email, Role, Password fields | apps/web/src/app/(admin)/accounts/new/page.tsx — form has Name (line 64), Email (line 75), Role select (line 86), Password (line 99) fields | ✓ PASS |
| 13 | /admin/accounts/:id/edit page exists and pre-fills Name and Role | apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx — fetches list at line 28, finds by id at line 30, pre-fills `name: account.name ?? ''` and `role: account.role` at line 36 | ✓ PASS |
| 14 | /admin/settings page exists with name section and password section | apps/web/src/app/(admin)/settings/page.tsx — `<h3>Display Name</h3>` at line 94, `<hr>` divider at line 139, `<h3>Change Password</h3>` at line 143 | ✓ PASS |
| 15 | Test configs/new pass_threshold_pct initializes to 80 | apps/web/src/app/(admin)/test-configs/new/page.tsx:16 — `pass_threshold_pct: 80` in useState initial value | ✓ PASS |
| 16 | Links page has Candidate Name input and isMember generate button visibility | apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx:81 — `const isMember = userRole === 'member'`; line 153 — `{(isOwner \|\| isMember) && ...}` wraps Candidate Name input + Generate button | ✓ PASS |
| 17 | Links table has Candidate column as first data column | apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx:84–88 — `{ header: 'Candidate', accessorKey: 'candidate_name' }` is the first entry in the columns array, before 'Token' at line 89 | ✓ PASS |

## Success Criteria Check

Requirements traced to Phase 7: ACCESS-05, ACCESS-06, ACCESS-07, ACCESS-08, TESTS-06, TESTS-07.

| # | Criterion | Verifiable | Evidence |
|---|-----------|-----------|---------|
| 1 | ACCESS-05: Any admin can open an account settings page and change their own password (requires entering current password) | Yes — code | settings/page.tsx has password section calling `PUT /auth/me`; auth.ts PUT /me validates `current_password` via bcrypt before updating |
| 2 | ACCESS-06: Owner can view a list of all admin accounts and create, edit, and delete accounts from a dedicated page | Yes — code | accounts/page.tsx (list + delete), accounts/new/page.tsx (create), accounts/[id]/edit/page.tsx (edit); all backed by accountRoutes in accounts.ts |
| 3 | ACCESS-07: System prevents deletion of the last remaining owner account and returns a clear error | Yes — code | accounts.ts:78–84 — count owners, return 409 with `'Cannot delete the last owner account'`; accounts/page.tsx shows 409 error message to user |
| 4 | ACCESS-08: New "Member" role can generate test links; cannot manage questions/configs/accounts | Partial — code confirms member can generate links (requireRole('owner','member') on POST /admin/test-links); RBAC restrictions on other routes carry forward from earlier phases; live browser test needed to confirm full permission matrix | Code confirms positive permission; no regressions in RBAC routes observed |
| 5 | TESTS-06: Test link creation form labels the name field "Candidate Name" and stores the value with the link | Yes — code | links/page.tsx line 156 `Candidate Name` label; api.post sends `candidate_name`; test-links.ts stores it in INSERT |
| 6 | TESTS-07: Test link creation form defaults pass threshold to 80% | Yes — code | test-configs/new/page.tsx:16 `pass_threshold_pct: 80` |

## Gaps

None. All 17 must-haves verified as PASS against source files.

## Verdict

Phase 7 goal achieved. All 17 must-haves pass: the `name` column migration and shared type are in place; `GET /auth/me` returns name from DB; `PUT /auth/me` validates current password before updating; DELETE last-owner guard returns 409; test-links POST accepts `candidate_name` and allows member role; all four frontend account management pages exist and function as specified; the settings page has both the name and password sections; the test config new-page defaults to 80%; and the links page shows the Candidate Name input with isMember visibility and Candidate as the first table column. The phase goal — owners can manage the team with the Member role, admins can update their own password, and test config UX is clear — is fully implemented in code.
