# Phase 12: Reporting & Dashboard Filters — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Two deliverables: (1) a "Download PDF" button on the submission detail page that prints the full submission as a PDF; (2) a combined test-config and date-range filter bar on the admin dashboard that scopes all KPIs and charts to the selected criteria.

**In scope:**
- PDF export of candidate submission results (RPT-01)
- Dashboard filter by test configuration (RPT-02)
- Dashboard filter by date range (RPT-03)
- Filters can be combined simultaneously

**Out of scope:**
- PDF for other pages (e.g., bulk export of submissions list)
- Additional dashboard KPIs or charts beyond what Phase 8 delivered
- URL-based filter persistence (component state only for v1.2)

</domain>

<decisions>
## Implementation Decisions

### PDF generation (RPT-01)
- **D-01:** Use `window.print()` + `@media print` CSS — zero new dependencies, always matches the live page, dark mode design tokens collapse gracefully. No `react-pdf/renderer` or `html2canvas`.
- **D-02:** "Download PDF" button on the submission detail page calls `window.print()` directly. No separate `/print` route.
- **D-03:** Full page content prints: summary card (candidate name, score, pass/fail, time taken, date) + skill area breakdown + full answer sheet (all questions with candidate answer, correct answer, ✓/✗). Print CSS hides nav, sidebar, back link, and action buttons (Delete, Download PDF).
- **D-04:** All admin roles (owner, reviewer, member) can trigger the PDF download — it is a read-only export of data they already have access to on the detail page.

### Dashboard filter bar (RPT-02 + RPT-03)
- **D-05:** Single filter bar above the KPI cards — test-config dropdown and date range selector side by side in one row. One filter bar controls the entire dashboard.
- **D-06:** Any filter change (config or date) immediately re-fetches both `/dashboard/stats` and `/dashboard/competency` in parallel — same `Promise.all` pattern as the initial load. No debounce.
- **D-07:** All KPIs re-scope to the active filter: total candidates, pass rate, avg score, weakest skill area, score distribution buckets, competency breakdown, and recent submissions all reflect the filtered window.
- **D-08:** Both filters are combinable — user can select a config AND a date range simultaneously; both params are passed to every API call.

### Date range options (RPT-03)
- **D-09:** Presets + custom date picker. Options: "All time" (no params), "Last 7 days", "Last 30 days", "Last 90 days", "Custom range" (calendar popover). Preset calculations happen at fetch time (current date minus N days). shadcn/ui `Calendar` component used for the custom picker, wrapped in a `Popover`.
- **D-10:** Date params sent to backend as ISO strings: `from` and `to`. Backend adds `WHERE tl.submitted_at >= $from AND tl.submitted_at <= $to` to both `/stats` and `/competency` queries.

### Backend changes required
- **D-11:** `GET /dashboard/stats` needs `testConfigId`, `from`, `to` query params added — currently accepts none. All three filters are optional and combinable. `recentSubmissions` list must also respect the same filters.
- **D-12:** `GET /dashboard/competency` already accepts `testConfigId` (Phase 8 implemented this). Needs `from`/`to` date params added.

### Claude's Discretion
- Visual design of the filter bar (spacing, control widths, label placement)
- Loading skeleton behavior during re-fetch after a filter change (show skeleton or dim existing data while re-fetching)
- Test config dropdown empty state (when no test configs exist)
- Exact print CSS: page break strategy across the answer sheet table, font sizes for print, header/footer suppression
- Whether to fetch the test configs list at dashboard load or reuse a cached list

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard — files to modify
- `apps/web/src/app/(admin)/dashboard/page.tsx` — Current dashboard: parallel fetch of `/stats` + `/competency`, no filter state; add filter bar, filter state, re-fetch logic
- `apps/web/src/app/(admin)/dashboard/ScoreDistributionChart.tsx` — Receives bucket props from page; no changes needed
- `apps/web/src/app/(admin)/dashboard/CompetencyChart.tsx` — Receives `data` array from page; no changes needed

### PDF — file to modify
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — Submission detail page; add "Download PDF" button + `@media print` CSS; already has summary card, skill breakdown, full answer sheet (DataTable)

### Backend — files to modify
- `apps/api/src/routes/dashboard.ts` — Both endpoints; `/stats` needs testConfigId + from/to; `/competency` needs from/to (testConfigId already implemented)

### Data shape
- `apps/web/src/app/(admin)/dashboard/page.tsx` — `DashboardStats` and `CompetencyItem` interface definitions at top of file; extend if needed for filtered variants
- `apps/api/src/routes/dashboard.ts` — Existing SQL patterns for score buckets and competency; replicate with WHERE clauses for filters

### Requirements
- `.planning/ROADMAP.md` §Phase 12 — Success criteria: PDF button, config filter re-fetches, date filter re-fetches, combined filters

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `window.print()` — native browser API, no import needed; pair with `@media print { ... }` in the page's CSS or a `<style>` tag
- `api` axios instance (`@/lib/api`) — already used for all admin API calls including dashboard fetches
- `shadcn/ui Calendar` — ships with shadcn/ui; can be composed with `Popover` for a date range picker UI
- `shadcn/ui Select` — for the test-config dropdown (may already be installed; check `components/ui/`)
- `shadcn/ui Skeleton` — for loading state during filter re-fetch (already used in `DashboardSkeleton`)
- `ConfirmDialog` (`@/components/ui/ConfirmDialog`) — not needed for this phase but shows the existing modal pattern
- `DataTable` (`@/components/ui/DataTable`) — used in submission detail; no changes needed for PDF (prints as-is)

### Established Patterns
- Dashboard parallel fetch: `Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/competency')])` — reuse and extend with query params
- Admin pages: `'use client'` + `useState`/`useEffect`, no React Query/SWR
- Query params to backend: append as axios params object, e.g. `api.get('/dashboard/stats', { params: { testConfigId, from, to } })`
- Design tokens (`bg-card`, `border-border`, `text-muted`, `text-foreground`) — established in Phase 10; all new filter controls should use these
- `dynamic(() => import(...), { ssr: false })` — already in use for chart components

### Integration Points
- Filter state lives in `dashboard/page.tsx` component state (`useState`) — no URL params, no global store
- Test configs list for the dropdown: needs a fetch from `/test-configs` (or `/admin/test-configs`) — check the existing test-configs page for the API call pattern
- Backend: `dashboardRoutes` registered in `apps/api/src/index.ts` under `/dashboard` prefix — no new route registration needed, only query param handling within existing routes
- Print CSS: can be added as a `<style>` tag in the submission detail page or in `globals.css` scoped to the print media query

</code_context>

<specifics>
## Specific Ideas

- No specific visual references provided — open to standard shadcn/ui Select + Popover patterns for the filter bar
- Print CSS should suppress: sidebar, top nav, back button, Delete button, Download PDF button; keep: page title, summary card, skill breakdown, answer sheet table

</specifics>

<deferred>
## Deferred Ideas

- URL-based filter persistence (e.g., `?configId=...&from=...&to=...`) — ROADMAP explicitly calls this an optional enhancement for v1.2; defer to backlog
- Bulk PDF export from the submissions list — only submission detail PDF is in scope

</deferred>

---

*Phase: 12-reporting-and-dashboard-filters*
*Context gathered: 2026-05-08*
