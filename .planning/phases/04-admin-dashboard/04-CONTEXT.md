# Phase 4: Admin Dashboard & Export - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins get global visibility into all submissions across all tests: a filterable/sortable submissions list, side-by-side candidate comparison, aggregate stats per test, CSV export, and bulk question import from CSV. DASH-02 (individual submission detail) was completed in Phase 3 and is NOT re-done here.

</domain>

<decisions>
## Implementation Decisions

### Submissions List (DASH-01)

- **D-01:** Global submissions list lives at `/admin/submissions` — a new top-level page with its own sidebar nav item "Submissions" (alongside "Question Bank" and "Test Configs").
- **D-02:** Filters (test config select, date range inputs, seniority select) sit inline above the DataTable as client-side dropdowns — no server roundtrip needed for v1 data volumes.
- **D-03:** Default sort: newest submission first (matches the 'just ran a test' workflow where the interviewer wants to see the latest candidate immediately). Column headers are clickable to re-sort.
- **D-04:** Columns (Claude's choice per user): Score %, Pass/Fail badge, Test name + difficulty (e.g. "Power BI — Senior"), Time taken, Submitted date, Actions ("View result" → existing `/admin/submissions/[linkId]`).

### Candidate Comparison (DASH-03)

### Claude's Discretion
- Candidate comparison (DASH-03): Claude decides the selection mechanism and comparison view layout. Recommended approach: checkboxes in the submissions list rows → "Compare selected" button appears when ≥2 rows checked → comparison view at `/admin/compare` (or inline modal/panel). Side-by-side table showing score %, pass/fail, time taken, and skill area breakdown per candidate.
- Stats & charts (DASH-04): Claude decides chart approach. Recommended: CSS-only horizontal bar chart for score distribution (no new dependency). Average score and pass rate shown as summary numbers above the chart. Stats scoped per test config.
- CSV export (DASH-05): Server-side CSV generation via a new `GET /admin/submissions/export?testConfigId=X` endpoint. Client triggers download via anchor tag with `download` attribute. Columns: test name, difficulty, score %, pass/fail, time taken, submitted date.
- CSV import (QBANK-03): "Import CSV" button on the `/admin/questions` page (owner role only). File input (no drag-and-drop for v1). After upload, show a results table with per-row status (imported / error + reason). No page reload — inline result state.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 Foundation
- `.planning/phases/03-grading-results/03-CONTEXT.md` — Admin submission detail decisions (already built at `/admin/submissions/[linkId]`)
- `.planning/phases/03-grading-results/03-02-SUMMARY.md` — `GET /admin/submissions/:linkId` endpoint (admin results API already wired)

### Existing Admin Patterns
- `apps/web/src/app/(admin)/layout.tsx` — Sidebar nav (add "Submissions" link here)
- `apps/web/src/app/(admin)/test-configs/page.tsx` — Pattern for admin list pages: `'use client'`, `useState`/`useEffect`, `DataTable`, inline error handling
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — Submission detail page (already done in Phase 3 — do NOT recreate)
- `apps/web/src/components/ui/DataTable.tsx` — TanStack Table component (basic: no built-in sort/filter — extend with TanStack sorting/filtering APIs for Phase 4)
- `apps/web/src/lib/api.ts` — Axios instance with `withCredentials` (use for all admin API calls)

### API Foundation
- `apps/api/src/routes/submissions.ts` — Existing `GET /admin/submissions/:linkId` (Phase 3); Phase 4 adds list and export endpoints here or in a new file
- `apps/api/src/db/schema.sql` — `submission_results` table (Phase 3); aggregate queries join with `test_configs`, `technologies`, `test_links`

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 4 requirement IDs: DASH-01, DASH-02 (done), DASH-03, DASH-04, DASH-05, QBANK-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DataTable` (TanStack Table): used across questions, test-configs, links, and submission detail pages. Phase 4 should extend it with sorting/filtering hooks (`getSortedRowModel`, `getFilteredRowModel`) rather than building a custom table.
- `api` axios instance: all admin fetch calls use this — do NOT use native `fetch` for admin pages.
- Admin layout sidebar: Server Component — add the "Submissions" `<Link>` here.

### Established Patterns
- Admin pages: `'use client'` + `useState`/`useEffect` for data fetching, no React Query or SWR.
- Loading: `<p className="text-sm text-gray-400">Loading…</p>` or spinner.
- Error: inline `<p className="text-sm text-red-600">{error}</p>`.
- Role checks: `api.get('/auth/me')` on mount to get `userRole`, then `isOwner = userRole === 'owner'` guards owner-only actions.
- CTA buttons: `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700`.
- No toast library — all feedback is inline.

### Integration Points
- Sidebar (`layout.tsx`) needs a new "Submissions" `<Link href="/submissions">` nav entry.
- Submissions list page needs a new `GET /admin/submissions` list endpoint (not just the per-linkId detail).
- CSV export needs a new `GET /admin/submissions/export` endpoint.
- Bulk import needs a new `POST /admin/questions/import` endpoint (multipart/form-data).

</code_context>

<specifics>
## Specific Ideas

- No specific visual references given — use existing admin page style (clean, minimal Tailwind, no flashy UI).
- Score distribution chart: CSS-only horizontal bars preferred to avoid adding a chart library dependency.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-admin-dashboard*
*Context gathered: 2026-04-28*
