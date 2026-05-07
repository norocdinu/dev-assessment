# Features Research — v1.1

## Context

This research is grounded in the existing v1.0 codebase:
- Stack: Next.js 16 + Fastify + PostgreSQL + Tailwind + TanStack Table + Recharts (installed, unused)
- Auth: JWT in localStorage, Bearer token, two roles (`owner` / `reviewer`)
- Schema: `admin_users`, `submission_results`, `test_links`, `test_configs`, `technologies`, `questions`, `candidate_answers`, `audit_log`
- The stats endpoint (`GET /admin/stats/:testConfigId`) already computes: total submissions, avg score, pass rate, score buckets (10-point bands)
- The submissions list already has: TanStack sort/filter, CSV export, side-by-side comparison

---

## Dashboard Analytics

### Table Stakes

Every hiring assessment dashboard that gets used day-to-day includes these:

- **KPI card strip** at the top of the page: 4–5 numbers readable in 2 seconds
- **Recent activity list**: last 5–10 candidates, shown as a feed (name/link, score, pass/fail, time ago)
- **Score distribution chart**: histogram over all submissions, not just one test config — hiring managers want the global picture
- **Pass/fail breakdown**: simple donut or split bar showing pass % vs fail % at a glance
- **Competency breakdown**: which skill areas are consistently weak across all candidates — this is the most actionable chart for question bank maintenance
- **Per-test-config selector**: ability to filter the dashboard to one test config (e.g., "Power BI Senior") without navigating away

Things that look useful but aren't actually used after week 1 (anti-features — see below):
- Time-series "submissions over time" trend charts (too sparse for small hiring teams)
- Funnel conversion metrics (require candidate pipeline data we don't have)

### Chart Types (Recommended)

**Score distribution — Histogram (bar chart, 10-point buckets)**
- Already computed server-side in `GET /admin/stats/:testConfigId` (buckets 0–10, 11–20, … 91–100)
- Recharts `BarChart` + `Bar` is already installed in `apps/web` — zero additional dependency
- Show the pass threshold as a vertical reference line (`ReferenceLine`) so the pass zone is visually obvious
- X-axis: score range label. Y-axis: count of candidates.
- Color bars below the threshold red/orange, above threshold blue/green

**Competency breakdown — Grouped horizontal bar chart**
- One row per skill area tag (DAX, Data Modelling, Power Query, etc.)
- Each row: average score % for that skill across all submissions in scope
- Horizontal bar is easier to read when skill names are long strings
- Recharts `BarChart layout="vertical"` covers this
- No need for a radar chart — radar is visually appealing but hard to compare precise values

**Pass/fail — Simple stat with colored fraction, not a donut**
- A donut/pie chart for a two-value split is overkill; a large number "67% Pass Rate" with a thin color bar underneath is more scannable
- Reserve chart real estate for the score distribution and competency breakdown

**Recent candidates — Plain table/list, not a chart**
- Last 10 submissions: candidate identifier (link ID or test name), score %, pass/fail badge, time since submission
- Clicking a row opens the existing submission detail page
- No chart type needed — dense text table is faster to scan than any visualization

### KPIs

Ordered by how often a hiring manager actually acts on the number:

| KPI | Why it matters | Source |
|---|---|---|
| Pass Rate % | Primary hiring funnel metric | `pass_rate_pct` from stats endpoint |
| Average Score % | Calibrates question difficulty | `avg_score_pct` from stats endpoint |
| Total Candidates | Throughput / hiring volume | `total_submissions` from stats endpoint |
| Weakest Skill Area | Most actionable — tells you what to train | Computed from `skill_area_scores` across submissions |
| Active Links | How many live test links are circulating | `COUNT(*) FROM test_links WHERE state = 'active'` or `'created'` |

KPIs to skip:
- Median score (not meaningfully different from average for small N, harder to explain)
- Standard deviation (too technical for non-stats users)
- Time-to-complete average (interesting but rarely acted on)

### Dashboard Scope Decision

The dashboard should aggregate **across all test configs by default**, with an optional filter to scope to one test config. This is more useful than the current per-config stats panel on the submissions page, which only surfaces stats when you've already drilled into a specific test.

The existing `GET /admin/stats/:testConfigId` endpoint needs a new companion: `GET /admin/stats` (no config filter) for the global dashboard view. Or extend the existing endpoint to accept an optional `testConfigId`.

---

## Account Management + Member Role

### Member Role Capabilities

The "Member" role sits between the existing `reviewer` (read-only) and `owner` (full access). Its defining characteristic is **generating test links** — Members are typically the recruiters or hiring managers who run the day-to-day assessment process but should not have access to administrative functions.

**Can:**
- Log in to the admin portal
- View all submissions (same as Reviewer)
- Drill into individual submission details (same as Reviewer)
- Compare candidates side-by-side (same as Reviewer)
- View the question bank (read-only, same as Reviewer)
- View test configurations (read-only)
- Generate test links for any existing test config
- Revoke test links they generated (or all links — TBD, owner-only revoke is safer)
- Export submission results to CSV (they're the ones sending results to hiring managers)
- View the analytics dashboard

**Cannot:**
- Create, edit, or delete questions
- Create, edit, or delete test configurations
- Delete submissions
- Manage admin accounts (add/edit/delete users)
- View audit log
- Import questions via CSV
- Archive/hard-delete questions

**RBAC implementation note:** The existing `requireRole('owner')` middleware factory in `apps/api/src/middleware/rbac.ts` accepts varargs — `requireRole('owner', 'member')` will work without changes to the factory. The DB `admin_users.role` column is currently `CHECK (role IN ('owner', 'reviewer'))` — this constraint must be updated to add `'member'`.

**Link generation specifically:** Currently `POST /admin/test-links` requires `requireRole('owner')`. This must be relaxed to `requireRole('owner', 'member')`. Consider storing `created_by` on `test_links` so Members can only revoke their own links (prevents them from killing links another Member or Owner generated).

### Account Settings ("My Account" page)

Industry-standard fields for a "My Account" or "Account Settings" page in an internal B2B tool:

**Always present (table stakes):**
- Display name (editable) — used in the sidebar greeting and audit log
- Email address (editable, but changing email requires re-authentication or confirmation — defer to v2 or make owner-only)
- Change password form: current password + new password + confirm new password
- Role display (read-only — user cannot change their own role)

**Commonly present (worth including):**
- Last login timestamp (read-only, useful for security awareness)
- Account created date (read-only)

**Defer to v2 or skip entirely:**
- Timezone preference (the platform has no timezone-sensitive display that users act on — all timestamps are UTC)
- Profile photo / avatar (not relevant for an internal assessment tool)
- Notification preferences (no notification system exists yet)
- Two-factor authentication (adds complexity, out of scope for v1.1)

**Password change implementation notes:**
- Require current password before accepting a new one — prevents privilege escalation if a session is stolen
- New password validation: minimum 8 characters, at least one number or symbol (matches the existing seed admin password `Admin1234!` pattern)
- Use bcrypt with 12 rounds (matches `apps/api/src/db/seed-admin.ts`)
- Endpoint: `PATCH /auth/password` or `PATCH /admin/accounts/me/password`
- No email confirmation needed for password change (internal tool, small team)

### Owner — Managing Admin Accounts

**Account list page** (`/admin/accounts`):
- Table: Name, Email, Role badge, Created date, Last login
- Actions per row: Edit role, Delete account (with confirmation)
- "Invite / Add user" button — creates account with temporary password or sends invite email (defer email to v2; for now, Owner creates account and shares credentials directly)

**Create account form:**
- Name, Email, Role (dropdown: Owner / Member / Reviewer), Temporary password
- Validation: email must be unique, password must meet complexity rules

**Edit account:**
- Owner can change another user's name, email, and role
- Owner cannot demote themselves (must keep at least one Owner — enforce server-side)
- Owner can reset another user's password (generates temporary password shown once)

**Delete account:**
- Confirmation dialog: "Delete [Name]? This cannot be undone."
- Soft considerations: if the deleted user generated test links, those links remain valid (link ownership is informational, not a FK dependency)
- Audit log the deletion

---

## Submission Deletion

### Expected Behavior

**Who can delete:** Owner only. Member and Reviewer cannot delete submissions.

**What gets deleted (cascade):**
1. `submission_results` row for that link
2. `candidate_answers` rows for that link (all individual answers)
3. `test_links` row itself — or set `state = 'deleted'` if a soft-delete is preferred

**What does NOT get deleted:**
- Questions (they have their own versioning/lifecycle)
- Test config (unaffected)
- Audit log entries referencing this submission (audit logs are append-only)

**Hard vs soft delete decision:**
- Hard delete is appropriate here — the Owner chose to permanently remove a candidate record
- Soft delete (state = 'deleted') is acceptable if there are audit/compliance reasons to retain the row, but adds UI complexity (need to hide deleted submissions from all list views)
- Recommended: hard delete with an audit log entry recording `submission.delete` with the link ID, score, and admin identity before the DELETE executes

**Cascade implementation:**
```sql
-- In a single transaction:
DELETE FROM candidate_answers WHERE link_id = $linkId;
DELETE FROM submission_results WHERE link_id = $linkId;
DELETE FROM test_links WHERE id = $linkId;
-- (or UPDATE test_links SET state = 'deleted' if soft-delete chosen)
```

**Dashboard/stats impact:**
- The stats endpoint re-queries `submission_results` live — deleting a submission row immediately removes it from all aggregate stats (pass rate, avg score, distribution buckets)
- No separate cache invalidation needed because there is no denormalised stats cache in v1 (stats are computed on-demand via SQL)
- The dashboard KPI cards will reflect the deletion on next page load

**Confirmation UX:**
- Modal dialog (not `window.confirm()`) with the candidate details visible: "Delete submission for [test name] scored [X%] on [date]? This permanently removes the submission and all answers. This cannot be undone."
- Two buttons: "Cancel" and "Delete permanently" (styled destructively in red)
- After deletion: toast notification "Submission deleted", redirect to submissions list
- The existing `SubmitModal.tsx` component pattern can be reused for the confirmation modal

**Endpoint:**
- `DELETE /admin/submissions/:linkId`
- `requireRole('owner')` — owner only
- Returns 204 No Content on success
- Returns 404 if not found, 403 if not Owner

**Where the button appears:**
- On the submission detail page (`/admin/submissions/:linkId`) — prominent but styled to avoid accidental clicks
- Optionally on the submissions list as a row action — but list-level delete is higher risk (easier to click wrong row); safer to put it only on the detail page for v1.1

---

## Anti-Features (What NOT to Build)

These are features that sound logical for v1.1 but add implementation complexity or maintenance burden without proportional value at this stage:

**1. Soft-delete / recycle bin for submissions**
Adds a hidden "deleted" state that must be filtered out of every query, complicates stats, and creates UI debt (a "trash" view). For an internal hiring tool with small data volumes, hard delete with an audit log entry is sufficient. If compliance needs arise, add soft-delete in v2.

**2. Email invites for new admin accounts**
Sending email requires an email provider (SMTP, SendGrid, Resend), email templates, and error handling. For a small internal team, the Owner creating an account and sharing credentials directly is adequate. Defer to v2 alongside candidate email notifications.

**3. Per-user dashboard customisation (reorder widgets, save filter presets)**
Dashboard personalisation is a feature for tools with 20+ daily active users. With a small hiring team, a single well-designed default layout serves everyone better than drag-and-drop customisation.

**4. Role-specific dashboard views**
Members and Reviewers get the same analytics dashboard as Owners. Hiding charts based on role adds conditional rendering complexity with zero security benefit (all data shown on the dashboard is already accessible via other authenticated endpoints).

**5. Time-series "submissions over time" trend chart**
Requires grouping submissions by week/month. For a team that runs 5–20 assessments per month, the resulting chart is too sparse to show meaningful trends and adds query complexity. The recent activity list serves the same informational need.

**6. Bulk submission deletion**
Deleting multiple submissions at once significantly increases the risk of accidental data loss. Single-record deletion with an explicit confirmation is the right UX for v1.1. Bulk delete can be added in v2 with additional safeguards.

**7. Timezone configuration in account settings**
The platform has no timezone-sensitive user-facing feature — all timestamps are stored as UTC and displayed as-is. Adding timezone selection adds form fields, a TZ database dependency, and display logic changes across all date columns, for zero practical benefit at this scale.

**8. Password reset via email (forgot password)**
Requires an email provider and token-based reset flow. For an internal tool where the Owner manages accounts, a simpler "Owner resets password" flow is sufficient. Defer forgotten-password email flow to v2.

**9. Audit log UI**
The `audit_log` table already captures question CRUD events. Exposing this as a browsable admin page sounds useful but is rarely consulted in practice by hiring teams. Defer to v2 alongside a broader operations/security dashboard.

**10. Recharts radar chart for competency breakdown**
Radar charts look impressive but are notoriously hard to read — comparative area sizes are not intuitively interpretable. A simple horizontal bar chart per skill area communicates the same information more clearly. The `recharts` package is already installed; use `BarChart layout="vertical"` instead.
