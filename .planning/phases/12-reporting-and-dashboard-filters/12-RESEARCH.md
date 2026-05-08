# Phase 12 Research: Reporting & Dashboard Filters

## Summary

The submission detail page is a fully client-side `'use client'` component with three distinct printable sections (summary card, skill breakdown, answer sheet DataTable) and zero existing `@media print` rules anywhere in the codebase — a clean slate for print CSS. The dashboard is also a `'use client'` page using a single `Promise.all` to fetch `/dashboard/stats` and `/dashboard/competency` with no filter state today; adding filters requires adding `useState` for filter values and wrapping the fetch in a new callback triggered by filter changes. Critically, shadcn/ui is NOT installed — there are no `@radix-ui` packages and no `react-day-picker`/`date-fns` — so the date picker must be built with native HTML `<input type="date">` or a lightweight alternative matching the existing pattern already used on the Submissions page. The submissions page already demonstrates the exact filter-bar pattern (native `<select>` + `<input type="date">`) and the `/test-configs` endpoint already exists for populating the config dropdown.

---

## 1. PDF / Print (RPT-01)

### Current submission detail page

File: `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`

The page is `'use client'`, fetches from `/admin/submissions/${linkId}`, and renders three sections in a wrapping `<div className="p-6 space-y-6">`:

1. **Back navigation button** — `<button onClick={() => router.push(...)}>← Back to Test Links</button>` — must be hidden in print
2. **Summary Card** — `<div className="bg-card rounded-lg border border-border p-6">` containing:
   - Test name (`result.test_name`) as `<h1>`
   - Pass/Fail badge (`.rounded-full` span with green/red background)
   - Delete Submission button (owner-only) — must be hidden in print
   - 3-column grid: Score (`result.score_pct%`), Time taken (`formatTime(result.time_taken_seconds)`), Submitted date
   - Meta line: pass threshold, technology, difficulty
3. **Skill Breakdown** — `<div className="bg-card rounded-lg border border-border p-6">` with `<h2>` + divide-y list of skill areas showing `correct / total` and `pct%`
4. **Answer Sheet** — `<div className="bg-card rounded-lg border border-border p-6">` with `<h2>` + `<DataTable>` rendering 8 columns: #, Question, Skill Area, Your Answer, Correct Answer, Result (✓/✗), Family ID, Version
5. **ConfirmDialog** (delete modal overlay) — already conditionally rendered; hidden when `confirmDelete` is false; should also be hidden in print via `display:none`

**No "Download PDF" button exists yet.** The candidate name is available via `result.test_name` (the test config name), not directly from the API response shape shown in the page — the page displays `result.test_name` as the header.

**Data shape available:** `AdminSubmissionResult` includes `test_name`, `score_pct`, `pass`, `pass_threshold_pct`, `time_taken_seconds`, `submitted_at`, `technology_name`, `difficulty`, `skill_area_scores` (object), `answer_sheet` (array of `AdminAnswerSheetRow`).

### Print implementation plan

**No existing `@media print` rules** anywhere — confirmed by grep across `apps/web/src/`. The admin layout (`apps/web/src/app/(admin)/layout.tsx`) renders:
- `.hidden.md:flex` desktop sidebar — needs `@media print { display: none }`
- `.md:hidden` mobile topbar — needs `@media print { display: none }`
- `<Toaster>` — handled automatically (not visible in print)

**CSS elements to hide in print:**
- Back navigation button (first child of `p-6 space-y-6`)
- Delete Submission button (inside the summary card's button group)
- The Download PDF button itself (once added)
- Desktop sidebar: `aside.hidden.md\\:flex`
- Mobile topbar: `.md\\:hidden.sticky` div

**Approach:** Add a `<style>` JSX tag inside `SubmissionDetailPage` with `@media print { ... }` rules. This is scoped to the component and avoids touching `globals.css`. Alternatively add to `globals.css` with a page-specific class.

**Page break strategy:** The answer sheet DataTable renders a standard HTML `<table>`. Add `page-break-inside: avoid` on each `<tr>` OR simply allow natural breaks. For the section cards, `page-break-before: auto` is acceptable. The answer sheet can be many rows (one per question), so natural page breaks within the table are fine.

**Dark mode in print:** The `dark` class is on `<html>`. Print CSS should force light colors — override `--background`, `--card`, `--foreground` to white/black values in `@media print` to avoid printing dark backgrounds. Pass/Fail badge uses hardcoded Tailwind `bg-green-100 text-green-700` / `bg-red-100 text-red-700` — these print fine.

**Gotcha — DataTable overflow wrapper:** The answer sheet's `DataTable` wraps in `<div className="overflow-x-auto">`. In print, this can clip content. Override with `overflow: visible` in print CSS for this wrapper.

---

## 2. Dashboard current state

### Data fetching pattern

File: `apps/web/src/app/(admin)/dashboard/page.tsx`

- Component: `'use client'` — NOT a server component
- State: `useState<DashboardStats | null>(null)`, `useState<CompetencyItem[]>([])`
- Initial fetch: single `useEffect([], [])` → `Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/competency')])`
- Loading: renders `<DashboardSkeleton />` (already implemented with `Skeleton` components)
- Error: simple `<p className="text-sm text-red-600">` fallback
- The `useEffect` dependency array is currently empty `[]` — must change to depend on filter state

**Required change:** Extract the fetch into a `fetchData` callback that accepts filter params, call it on mount and whenever filter state changes.

### Components affected by filters

Everything in the dashboard must re-scope when filters change:

| Component / Section | Data source | Re-fetches? |
|---|---|---|
| Total Candidates KPI | `stats.totalCandidates` | Yes — from `/dashboard/stats` |
| Pass Rate KPI | `stats.passRate` | Yes — from `/dashboard/stats` |
| Average Score KPI | `stats.avgScore` | Yes — from `/dashboard/stats` |
| Weakest Skill Area KPI | `stats.weakestSkillArea` | Yes — from `/dashboard/stats` |
| Score Distribution Chart | `stats.bucket0_49` … `stats.bucket90_100` (6 props) | Yes — from `/dashboard/stats` |
| Competency Breakdown Chart | `competency[]` array | Yes — from `/dashboard/competency` |
| Recent Candidates table | `stats.recentSubmissions[]` | Yes — from `/dashboard/stats` |

Both chart components (`ScoreDistributionChart.tsx`, `CompetencyChart.tsx`) are pure display components receiving props — no changes needed to them, only the parent page re-fetches and passes new props.

### Filter state management approach

```typescript
// Filter state in DashboardPage
const [testConfigId, setTestConfigId] = useState<string>('');
const [datePreset, setDatePreset] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');
const [customFrom, setCustomFrom] = useState<string>(''); // ISO date string
const [customTo, setCustomTo] = useState<string>('');   // ISO date string

// Computed from/to to pass to API
function computeDateRange(): { from?: string; to?: string } {
  const now = new Date();
  if (datePreset === '7d') return { from: daysAgo(7), to: now.toISOString() };
  if (datePreset === '30d') return { from: daysAgo(30), to: now.toISOString() };
  if (datePreset === '90d') return { from: daysAgo(90), to: now.toISOString() };
  if (datePreset === 'custom') return { from: customFrom, to: customTo };
  return {}; // 'all' — no params
}
```

**Re-fetch trigger:** Per D-06, filter changes immediately re-fetch — no Apply button, no debounce. A `useEffect` watching `[testConfigId, datePreset, customFrom, customTo]` calls `fetchData()` which calls `Promise.all` with all filter params.

**Loading during re-fetch:** The `DashboardSkeleton` can be shown again (set `loading = true` at the start of each fetch) OR the existing data can be dimmed with `opacity-50` while refetching. The CONTEXT leaves this to Claude's discretion. Showing the skeleton again is simpler and consistent with Phase 11 patterns.

**Test configs list:** Fetch from `/test-configs` at dashboard load (separate from the filter-triggered fetch). Store as `const [testConfigs, setTestConfigs] = useState<TestConfigOption[]>([])`. Load once in a separate `useEffect([], [])`.

---

## 3. Backend changes required

### GET /dashboard/stats changes

File: `apps/api/src/routes/dashboard.ts` lines 7–67

**Current state:** Accepts NO query params. Three separate SQL queries: (1) aggregate KPIs, (2) weakest skill area, (3) recent submissions. No JOINs in the main stats query — it queries `submission_results sr` directly without joining `test_links`.

**Required additions:**
- Read `testConfigId`, `from`, `to` from `request.query`
- For `testConfigId` filter: add `JOIN test_links tl ON tl.id = sr.link_id` + `WHERE tl.test_config_id = ${testConfigId}` to both the KPI query and the weakest skill area query
- For date filter: add `WHERE tl.submitted_at >= ${from} AND tl.submitted_at <= ${to}` (requires `tl` JOIN)
- For `recentSubmissions`: already JOINs `test_links tl` and `test_configs tc` — add `WHERE` clauses for `testConfigId` and date range

**Pattern to follow:** The `/dashboard/competency` endpoint (lines 70–105) already implements this branching pattern (`if (testConfigId) { ...filtered query... } else { ...unfiltered query... }`).

**Complexity:** With three optional filters (testConfigId, from, to), hard-coding every combination (8 branches) is unmanageable. Use `postgres.js` dynamic query building via conditional template fragments, or use a flag-based approach — build a where-clause array and join with `AND`.

**Note on postgres.js dynamic SQL:** The project uses `postgres` (the `db` tagged template literal). Dynamic WHERE clause construction requires care since `postgres` uses tagged templates. The safest approach is to use the `if (condition)` branching pattern extended to cover combined cases, or use `db.unsafe()` for a fully dynamic query (not recommended). The cleanest approach for 3 optional params: use `postgres`'s ability to conditionally include SQL fragments via `db`...`${condition ? db`AND col = ${val}` : db``}`.

### GET /dashboard/competency changes

File: `apps/api/src/routes/dashboard.ts` lines 70–105

**Current state:** Already accepts `testConfigId` and correctly branches between filtered/unfiltered queries using JOIN on `test_links`.

**Required addition:** Add `from` and `to` params. The filtered query already has `JOIN test_links tl ON tl.id = sr.link_id` — just add `AND tl.submitted_at >= ${from}` and `AND tl.submitted_at <= ${to}` to the existing WHERE clause. The unfiltered query has no JOIN — must add the JOIN when date params are present even without `testConfigId`.

**Combined filter case:** With 3 params (testConfigId, from, to) the 2-branch approach becomes unwieldy. Same dynamic SQL strategy as `/stats` applies.

### Test configs endpoint

**Endpoint:** `GET /test-configs` — already exists in `apps/api/src/routes/test-configs.ts` line 23.

**Response shape:**
```typescript
{
  id: string;           // UUID
  name: string;         // display name (e.g. "Senior React Engineer")
  technology_id: string;
  technology_name: string; // joined from technologies table
  difficulty: 'junior' | 'mid' | 'senior';
  num_questions: number;
  pass_threshold_pct: number;
  created_at: string;
  is_active: boolean;
}
```

The frontend submissions page already uses `api.get('/test-configs')` to populate its filter dropdown — reuse the exact same call. No new endpoint needed.

**Dropdown label pattern** from submissions page: `{tc.name} — {tc.difficulty}` (e.g., "Senior React — senior"). The dashboard can use a simpler label or the same pattern.

---

## 4. shadcn/ui components available

**Critical finding: shadcn/ui is NOT installed.** The `apps/web/package.json` has NO `@radix-ui/*` packages, no `cmdk`, no `react-day-picker`, no `date-fns`, no `class-variance-authority`. The CONTEXT.md references "shadcn/ui Calendar", "shadcn/ui Select", and "shadcn/ui Popover" but these are not installed.

**What IS installed and available:**

| Component | File | Import path |
|---|---|---|
| `Skeleton` | `apps/web/src/components/ui/Skeleton.tsx` | `@/components/ui/Skeleton` |
| `EmptyState` | `apps/web/src/components/ui/EmptyState.tsx` | `@/components/ui/EmptyState` |
| `ConfirmDialog` | `apps/web/src/components/ui/ConfirmDialog.tsx` | `@/components/ui/ConfirmDialog` |
| `DataTable` | `apps/web/src/components/ui/DataTable.tsx` | `@/components/ui/DataTable` |
| `QuestionForm` | `apps/web/src/components/ui/QuestionForm.tsx` | `@/components/ui/QuestionForm` |

No Select, Calendar, Popover, or Combobox components exist.

**Established native pattern:** The Submissions page filter bar (lines 254–314) uses native HTML elements styled with Tailwind: `<select className="text-sm border border-border rounded-md px-2 py-1">` for dropdowns and `<input type="date" className="text-sm border border-border rounded-md px-2 py-1">` for date inputs. This is the correct pattern to replicate for the dashboard filter bar — no new dependencies needed.

**Date preset implementation:** A native `<select>` dropdown with preset options ("All time", "Last 7 days", "Last 30 days", "Last 90 days", "Custom") is the right approach. When "Custom" is selected, reveal two `<input type="date">` fields (from / to). This matches the existing Submissions page pattern and requires zero new packages.

**Package additions required for this phase: NONE.** The native HTML approach covers all filter UI needs. `window.print()` is a browser API.

---

## 5. Implementation risks and gotchas

1. **No shadcn/ui installed.** The CONTEXT.md and ROADMAP.md both reference shadcn/ui components that don't exist. The plan must use native HTML elements styled with existing Tailwind tokens — same as the Submissions page. Do NOT install shadcn/ui for this phase (it would be a significant scope expansion).

2. **postgres.js dynamic SQL complexity.** The `db` tagged template literal does not trivially support dynamic WHERE clauses with optional conditions. With 3 optional params (testConfigId, from, to), the branching approach used in `/competency` (2 branches) scales to 8 combinations — unmanageable. The plan should specify a clean strategy: use `postgres`'s ability to include conditional SQL fragments in template literals via nested tagged calls or a helper function.

3. **Dashboard stats query missing JOIN for date filter.** The current `/stats` KPI query `SELECT ... FROM submission_results sr` has no JOIN — it only queries `submission_results` directly. Adding date filtering requires `JOIN test_links tl ON tl.id = sr.link_id` since `submitted_at` lives on `test_links`, not `submission_results`. Same for the weakest skill area query.

4. **Print: dark mode colors.** The admin app supports dark mode via `next-themes` (`darkMode: 'class'`). When printing from dark mode, dark backgrounds (near-black `--card: 26 26 46`) will print as dark boxes. The `@media print` CSS must override the CSS variables to white/black or use `-webkit-print-color-adjust: exact` selectively. The plan must specify this.

5. **Print: DataTable overflow wrapper.** The answer sheet uses `DataTable` which wraps content in `<div className="overflow-x-auto">`. This clips content in print. The print CSS must set `overflow: visible` on the DataTable wrapper.

6. **Missing candidate name on submission detail.** The submission detail page uses `result.test_name` as the main heading — this is the test configuration name, not the candidate's name. The API response (`AdminSubmissionResult`) should also include `candidate_name` (it's available from `test_links.candidate_name` in the backend). Verify the API response shape includes `candidate_name` — if not, this is a minor backend addition.

7. **Loading state during re-fetch.** The CONTEXT (D-06) says filter changes immediately re-fetch. If the full skeleton is shown on every re-fetch, users see a blank skeleton flash when adjusting filters. Consider dimming (`opacity-50 pointer-events-none`) existing content during re-fetch instead of re-showing the full skeleton. This is Claude's discretion per CONTEXT.

8. **Empty state when no test configs exist.** The config dropdown will be empty for a fresh install. The plan should specify an appropriate empty state/placeholder in the dropdown.

---

## 6. Recommended plan structure

**Plan A — Backend: Add filter params to dashboard endpoints**
- Modify `apps/api/src/routes/dashboard.ts`
- Add `testConfigId`, `from`, `to` to `/stats` (including the weakest skill area and recentSubmissions sub-queries)
- Add `from`, `to` to `/competency` (testConfigId already done)
- Implement clean dynamic SQL strategy for combined optional filters
- Test all combinations: no filters, testConfigId only, date only, both

**Plan B — Dashboard frontend: Filter bar + re-fetch logic**
- Modify `apps/web/src/app/(admin)/dashboard/page.tsx`
- Add filter state: `testConfigId`, `datePreset`, `customFrom`, `customTo`
- Add test configs fetch on mount (separate `useEffect`)
- Refactor `useEffect` fetch into `fetchData` callback, triggered when filter state changes
- Add filter bar UI (native `<select>` + `<input type="date">` matching Submissions page pattern)
- Handle custom date range: show/hide from/to inputs based on preset selection
- Loading state during re-fetch (dim or re-show skeleton — implementer's choice)
- Verify all KPIs, charts, and recent submissions update correctly

**Plan C — PDF print: Submission detail page**
- Modify `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`
- Add "Download PDF" button that calls `window.print()`
- Add `<style>` block with `@media print` CSS:
  - Hide: back button, Delete button, Download PDF button, sidebar, mobile topbar, ConfirmDialog overlay
  - Fix DataTable overflow wrapper
  - Force light colors (override CSS variables for print)
  - Page break handling for answer sheet rows
- No new dependencies

**Execution order:** Plan A → Plan B → Plan C. Backend must be done before frontend filter testing. PDF (Plan C) is fully independent and could be done first if desired.

---

## RESEARCH COMPLETE
