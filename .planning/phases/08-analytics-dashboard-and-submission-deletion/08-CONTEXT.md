# Phase 8: Analytics Dashboard & Submission Deletion - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins get a cross-platform analytics overview: KPI strip (total candidates, pass rate, avg score, weakest skill area), recent candidates list, score distribution BarChart, and competency breakdown horizontal BarChart. Owners can permanently hard-delete a submission (removes candidate_answers, submission_results, and the test_link record's submitted state) from the submission detail page. Dashboard becomes the primary landing page for all authenticated admins.

</domain>

<decisions>
## Implementation Decisions

### Score distribution chart bands
- **D-01:** Use 6 unequal buckets: 0-49, 50-59, 60-69, 70-79, 80-89, 90-100 — same grouping as the existing per-config stats endpoint (`apps/api/src/routes/stats.ts`). Reuse the same SQL FILTER expressions for the cross-config dashboard query. The 0-49 bucket covers all clear fails; finer granularity in the pass range (80-89, 90-100) where it matters most.
- **D-02:** Pass threshold reference line drawn at 80% — between the 70-79 and 80-89 bars.

### Dashboard navigation placement
- **D-03:** Dashboard is the **first** item in the sidebar nav (before Question Bank). `/admin` bare root redirects to `/dashboard` via Next.js `redirect()` in a `page.tsx` or via `next.config` rewrites.
- **D-04:** Dashboard nav item is visible to all authenticated roles (owner, member, reviewer) — it's a read-only analytics view.

### Backend — dashboard aggregate endpoints
- **D-05:** `GET /dashboard/stats` — cross-config (no testConfigId filter); returns `{ totalCandidates, passRate, avgScore, weakestSkillArea, recentSubmissions[10] }`. `recentSubmissions` includes `candidate_name`, `score_pct`, `pass`, `submitted_at`, `test_config_name`.
- **D-06:** `GET /dashboard/competency` — returns `{ area: string, avgScore: number }[]`; the optional `testConfigId` query param is supported at the API level but the dashboard UI shows **global** competency (no filter exposed on the dashboard page). Per-config filtering is deferred.
- **D-07:** Weakest skill area computed server-side: aggregate `skill_area_scores` JSONB across all submission_results, average per area, return the area with the lowest avg. Use `jsonb_each_text` and a lateral join in PostgreSQL.

### Backend — submission hard-delete
- **D-08:** `DELETE /submissions/:id` is owner-only (`requireRole('owner')`). Transaction order (FK constraint): delete `candidate_answers` first, then `submission_results`, then the `test_links` row (or mark as deleted — see D-09). Audit log written before the transaction executes.
- **D-09:** The delete removes `candidate_answers`, `submission_results` where `link_id = <id>`. The `test_links` row itself is **not** deleted (preserves the link for audit purposes) — only the submission data. If the link has no submission result, the link is already effectively unused. 404 if `submission_results` row not found for the given id; 204 on success.

  > Note: The roadmap says "deletes candidate_answers, submission_results, submission" — interpret "submission" as the submission_results row (there is no separate `submissions` table; `submission_results` IS the submission record).

### Frontend — chart rendering
- **D-10:** All chart components wrapped in `dynamic(..., { ssr: false })` to prevent Next.js SSR hydration errors with Recharts.
- **D-11:** Recharts upgraded to v3.8.1. Use raw Recharts components (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ReferenceLine`) directly — no shadcn/ui chart wrapper required unless the upgrade introduces breaking changes that the wrapper resolves. Claude's discretion on whether to introduce the shadcn/ui chart layer.

### Frontend — submission delete UX
- **D-12:** "Delete Submission" button on the **submission detail page** (`/admin/submissions/[linkId]/page.tsx`) only — not on the list. Button visible to owners only. Clicking opens a confirmation modal ("This will permanently remove this candidate's results. Are you sure?"). On confirm: call `DELETE /admin/submissions/:linkId`, redirect to `/admin/submissions` on success.
- **D-13:** Visiting `/admin/compare` with a deleted submission ID returns an error from the API — the existing error state in `compare/page.tsx` (`setError(...)`) already handles this gracefully. No additional changes needed beyond the API returning a clear error.

### Claude's Discretion
- Exact KPI card layout (grid columns, icon usage, stat label formatting)
- Loading skeleton or spinner for dashboard charts during fetch
- Whether to use shadcn/ui chart wrapper or raw Recharts v3 (D-11 above)
- Exact wording of the delete confirmation modal
- Whether the audit log is a `console.log`, a DB `audit_log` table, or a structured log — no audit table exists, so log to stdout is acceptable

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-06, DASH-07, DASH-08, DASH-09, SUB-01 (full acceptance criteria for dashboard KPIs, charts, recent candidates, submission delete)

### API layer — files to read/modify
- `apps/api/src/routes/stats.ts` — Contains the 6-bucket SQL pattern to replicate for the cross-config dashboard stats endpoint
- `apps/api/src/routes/submissions.ts` — Extend with `DELETE /:id` (owner-only, transaction, audit log)
- `apps/api/src/db/schema.sql` — `submission_results`, `candidate_answers`, `test_links` table structures (FK constraints dictate delete order)
- `apps/api/src/middleware/rbac.ts` — `requireRole('owner')` pattern for the delete endpoint

### Frontend — files to read/modify
- `apps/web/src/app/(admin)/layout.tsx` — Add Dashboard as first nav item (all roles); add `/admin` → `/dashboard` redirect
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — Add owner-only Delete button + confirmation modal
- `apps/web/src/app/(admin)/compare/page.tsx` — Verify existing error state handles deleted-submission 404 gracefully (likely already works)
- `apps/web/package.json` — Upgrade recharts from ^2.12.7 to ^3.8.1

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `stats.ts` 6-bucket SQL: `COUNT(*) FILTER(WHERE sr.score_pct BETWEEN X AND Y)` — copy this pattern for `GET /dashboard/stats`
- `authMiddleware` + `requireRole`: established pattern for all protected routes
- Existing `sonner` Toaster in layout.tsx — available for delete success/error toasts
- TanStack Table (`DataTable`): available for the recent candidates list, though 10 rows may be simpler as plain `<table>`

### Established Patterns
- Admin pages: `'use client'` + useState/useEffect, no React Query/SWR
- Role check: `api.get('/auth/me')` on mount → `setUserRole(r.data.user.role)` → `const isOwner = userRole === 'owner'`
- Confirmation before destructive actions: modal pattern (used in accounts delete)
- `dynamic(() => import(...), { ssr: false })` for client-only components

### Integration Points
- New routes to register: `GET /dashboard/stats`, `GET /dashboard/competency` — register in `apps/api/src/index.ts` under `/dashboard` prefix
- New page to create: `apps/web/src/app/(admin)/dashboard/page.tsx`
- New redirect: `apps/web/src/app/(admin)/page.tsx` → `redirect('/dashboard')` (or next.config rewrite)
- `submission_results` has `UNIQUE (link_id)` — the `link_id` from the URL param IS the lookup key for the delete endpoint (not `submission_results.id`)

</code_context>

<specifics>
## Specific Ideas

- The `link_id` is the natural identifier for a submission (used in the submissions list URL and compare page). The delete endpoint should accept `link_id` as the path param and look up `submission_results WHERE link_id = $1` — consistent with existing routes.
- For `weakestSkillArea`: PostgreSQL query using `jsonb_each_text(skill_area_scores)` lateral join to unnest per-row skill scores, then `AVG` grouped by area key, then `ORDER BY avg ASC LIMIT 1`.
- The `recentSubmissions[10]` in `GET /dashboard/stats` needs `candidate_name` from `test_links` and `test_config name` from `test_configs` — multi-join query joining `submission_results → test_links → test_configs`.

</specifics>

<deferred>
## Deferred Ideas

- Per-config filtering on the dashboard competency chart — API supports `testConfigId` filter but dashboard UI shows global view only; filter UI can be added in a future iteration
- shadcn/ui chart component layer — evaluate during implementation; add only if Recharts v3 upgrade introduces breaking API changes that the wrapper resolves

</deferred>

---

*Phase: 08-analytics-dashboard-and-submission-deletion*
*Context gathered: 2026-05-07*
