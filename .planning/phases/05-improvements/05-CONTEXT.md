# Phase 5: Improvements to the Existing App - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Targeted improvements to the deployed v1 platform across two areas: (1) Question Bank — better filtering, CSV export, bulk archive, and delete capability; (2) Admin UX — sidebar active state, feedback notifications, and pagination on data-heavy lists. No new candidate-facing features. No new test lifecycle capabilities.

</domain>

<decisions>
## Implementation Decisions

### Question Bank — Filtering

- **D-01:** Add four client-side filters above the question table: text search (matches question text as you type), technology dropdown, difficulty dropdown (Junior/Mid/Senior), and skill area dropdown. All four filter the already-loaded table — no additional backend query needed.
- **D-02:** Filters are additive (AND logic): all active filters apply simultaneously.

### Question Bank — CSV Export

- **D-03:** Add a "Export CSV" button to the question list page (Owner role only). The export respects the currently active filters — it exports whatever subset is currently shown in the table, not always the full bank.
- **D-04:** Columns: Technology, Difficulty, Skill Area, Question Text, Option A, Option B, Option C, Option D, Correct Option. Same server-side CSV generation pattern as the existing submissions export (`Content-Disposition: attachment`).
- **D-05:** The export endpoint is `GET /admin/questions/export` with the same filter params as the list endpoint (technology, difficulty, skillArea, search). No new auth pattern — reuse the existing `authMiddleware`.

### Question Bank — Bulk Archive

- **D-06:** Add checkboxes to each question row. When ≥1 row is checked, an "Archive X selected" button appears (toolbar or floating). Consistent with the compare-select checkbox pattern already used in the submissions list.
- **D-07:** Bulk archive sets `is_active = false` on all selected question IDs in one request. Owner role only.

### Question Bank — Delete

- **D-08:** Delete is available both per-row (a Delete button on each row with a confirmation prompt) and in bulk (a "Delete X selected" action alongside "Archive X selected" when checkboxes are checked).
- **D-09:** Delete is available to Owner role only, exclusively via the Question Bank UI — never automated.
- **D-10:** If a question is referenced in past submissions (FK constraint on `candidate_answers.question_id`), the delete is blocked with a clear inline message: "This question was used in past submissions and cannot be deleted. Archive it to hide it from future tests." The admin decides what to do; the system never auto-redirects to archive.
- **D-11:** Questions with no submission history are hard-deleted (permanent `DELETE FROM questions WHERE id = $id`).

### Admin UX — Sidebar Active State

- **D-12:** The current page's sidebar nav item gets a highlighted style (e.g. `bg-blue-50 text-blue-700 font-medium`) determined by `usePathname()` matching the link href. The admin layout is already `'use client'`, so this requires no architecture change.

### Admin UX — Feedback Notifications

- **D-13:** Claude's discretion. Recommended: add `sonner` (lightweight, well-maintained toast library) for success confirmations (archive, delete, import, export triggered). Keep inline `<p className="text-sm text-red-600">` for error messages where context is important. Success toasts appear top-right, auto-dismiss after 3s.

### Admin UX — Pagination

- **D-14:** Add server-side pagination to both the questions list (`GET /admin/questions`) and the submissions list (`GET /admin/submissions`). Use `page` and `pageSize` query params (default pageSize: 25). The response returns `{ data: [...], total: N, page: N, pageSize: N }`.
- **D-15:** Client-side: simple prev/next pagination controls below the table showing "Showing X–Y of Z". The existing `DataTable` component is extended — no replacement.
- **D-16:** The CSV export and question filters are not paginated — they operate on the full matching dataset server-side.

### Claude's Discretion

- Exact toast library — `sonner` recommended (small, no peer deps), but `react-hot-toast` is acceptable.
- Exact confirmation UI for delete (inline row expand, modal, or inline prompt) — pick what's cleanest with existing patterns.
- Whether to use `useSearchParams` / URL-synced filters or keep filter state local to the component — choose based on simplicity.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing admin page patterns
- `apps/web/src/app/(admin)/layout.tsx` — Sidebar nav (add active state here using `usePathname`)
- `apps/web/src/app/(admin)/questions/page.tsx` — Question list page (add filters, export button, checkboxes here)
- `apps/web/src/app/(admin)/submissions/page.tsx` — Submissions list page (add pagination here)
- `apps/web/src/components/ui/DataTable.tsx` — TanStack Table component (extend for pagination)

### Existing API patterns to follow
- `apps/api/src/routes/submissions.ts` — `/export` endpoint pattern (Content-Disposition CSV, authMiddleware, filter params)
- `apps/api/src/routes/questions.ts` — Existing question CRUD, archive endpoint, bulk import
- `apps/api/src/middleware/auth.ts` and `apps/api/src/middleware/rbac.ts` — Auth + Owner role check pattern

### Schema
- `apps/api/src/db/schema.sql` — `questions` table (technology_id, difficulty, skill_area, is_active, is_latest, family_id, version); `candidate_answers` table (FK on question_id — the constraint that blocks deletion of used questions)

### Prior phase context
- `.planning/phases/04-admin-dashboard/04-CONTEXT.md` — Established patterns: checkbox compare-select in submissions, inline error handling, CSS-only chart preference, no new dependencies unless clearly needed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DataTable` (TanStack Table): already used on questions, test-configs, submissions pages. Phase 5 extends it with pagination controls rather than replacing it.
- Submissions export endpoint (`GET /admin/submissions/export`): exact pattern to copy for questions export — same auth, same CSV response headers, filter params passed as query string.
- Checkbox compare-select in submissions list: the multi-select + floating action bar pattern already exists — reuse it for bulk archive/delete in questions.
- `api` axios instance (`apps/web/src/lib/api.ts`): all admin API calls use this with Bearer token auth.

### Established Patterns
- Admin pages: `'use client'` + `useState`/`useEffect`, inline error handling, no React Query/SWR.
- Role checks: `api.get('/auth/me')` on mount → `isOwner = userRole === 'owner'` guards Owner-only actions.
- CTA buttons: `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700`.
- No toast library currently — D-13 adds `sonner` as the first toast dependency.
- CSS-only where possible (prior preference from Phase 4).

### Integration Points
- `apps/api/src/routes/questions.ts` — Add: `GET /admin/questions` pagination params, `GET /admin/questions/export` endpoint, `DELETE /admin/questions/:id` endpoint, `DELETE /admin/questions` bulk delete endpoint.
- `apps/api/src/routes/submissions.ts` — Add: `page` + `pageSize` params to `GET /admin/submissions`.
- `apps/web/src/app/(admin)/layout.tsx` — Add `usePathname()` active state logic to nav links.
- `packages/shared/src/types/index.ts` — Add paginated response type `PaginatedResult<T>`.

</code_context>

<specifics>
## Specific Ideas

- Export respects active filters: if the admin has filtered to "Power BI / Senior / DAX", the export downloads only those questions — not the whole bank.
- Delete confirmation should make it unambiguous: "Delete this question permanently?" with a destructive-style button (red).
- The FK block message on delete should be informative: "This question was used in N past submissions and cannot be deleted. Archive it to hide it from future tests."

</specifics>

<deferred>
## Deferred Ideas

- Candidate name / identification — raised during area selection but not discussed. Adding a name field to the test start flow, or a memo on link generation, would improve submission tracking. Worth revisiting in a future phase.
- Link cancellation / invalidation — no way to invalidate a sent link. Deferred.

</deferred>

---

*Phase: 05-improvements*
*Context gathered: 2026-05-07*
