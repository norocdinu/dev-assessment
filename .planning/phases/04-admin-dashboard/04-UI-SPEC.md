---
phase: 4
slug: admin-dashboard
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-28
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for Admin Dashboard & Export.
> Grounded in existing admin panel patterns (layout.tsx, DataTable.tsx, test-configs/page.tsx).
> All decisions are LOCKED — do not re-open during planning or execution.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (pure Tailwind) |
| Preset | not applicable |
| Component library | TanStack Table v8 (already installed — extend only) |
| Icon library | none (text labels only) |
| Font | system-ui (no custom font — Tailwind default) |
| New dependencies | NONE — no chart library, no toast library, no new packages |

---

## Spacing Scale

Tailwind default scale. All Phase 4 components must use these tokens only — no arbitrary values.

| Token | Tailwind class | px value | Usage in Phase 4 |
|-------|---------------|----------|-----------------|
| xs | p-1 / gap-1 | 4px | Badge inner padding, icon gaps |
| sm | p-2 / gap-2 | 8px | Filter control spacing, inline gaps |
| md | p-4 / gap-4 | 16px | Card padding, section padding (matches sidebar `p-4`) |
| lg | p-6 / gap-6 | 24px | Page header padding, comparison column gap |
| xl | p-8 / gap-8 | 32px | Page-level top/bottom padding |
| 2xl | p-12 | 48px | Major section breaks |
| 3xl | p-16 | 64px | Full-page vertical centering (empty states only) |

Exceptions: none

---

## Typography

All text uses `font-sans` (system-ui). No custom fonts. Matches existing admin panel exactly.

| Role | Tailwind class | Usage |
|------|---------------|-------|
| Page heading | `text-xl font-semibold text-gray-900` | Page titles ("Submissions", "Compare Candidates") |
| Section heading | `text-sm font-semibold text-gray-900` | Stats card labels, filter section headers |
| App name | `text-sm font-semibold text-gray-900` | Sidebar header (existing — do not touch) |
| Body / cell | `text-sm text-gray-700` | Table cells, form labels, description text |
| Column header | `text-sm font-medium text-gray-600` | DataTable `<th>` (existing class — preserve) |
| Metadata | `text-xs text-gray-500` | Submitted date, candidate count, footer notes |
| Loading | `text-sm text-gray-400` | Loading states: `Loading…` |
| Empty | `text-sm text-gray-400` | Empty state body, "No results" in table |
| Error | `text-sm text-red-600` | Inline error messages |
| Link/action | `text-blue-600 hover:underline text-xs` | Row-level "View result" links (matches existing) |

---

## Color

60/30/10 rule applied to admin panel surfaces.

| Role | Tailwind token | Hex | Usage |
|------|---------------|-----|-------|
| Dominant (60%) | `bg-gray-50` | #F9FAFB | Page background, table header rows |
| Secondary (30%) | `bg-white` | #FFFFFF | Sidebar, cards, DataTable rows (even), filter bar |
| Accent (10%) | `blue-600` | #2563EB | CTAs only — Export CSV, Compare selected, Import CSV |
| Accent hover | `blue-700` | #1D4ED8 | CTA hover state |
| Accent bg hover | `hover:bg-blue-50` | #EFF6FF | Table row hover (existing DataTable pattern) |
| Destructive | `red-600` | #DC2626 | Inline error text only |
| Border | `gray-200` / `gray-100` | — | Section borders (gray-200), row dividers (gray-100) |
| Pass badge | `bg-green-100 text-green-700` | — | Pass/Fail badge — PASS variant |
| Fail badge | `bg-red-100 text-red-700` | — | Pass/Fail badge — FAIL variant |
| Chart bar fill | `bg-blue-500` | #3B82F6 | Score distribution bar segments |
| Chart bar bg | `bg-gray-200` | #E5E7EB | Score distribution bar background track |
| Odd table row | `bg-gray-50/50` | — | DataTable alternating row (existing) |
| Checkbox checked | browser default | — | Row selection checkboxes — no custom styling |

Accent reserved for: Export CSV button, Import CSV button, Compare selected button. Never applied to nav links, badges, chart elements, or metadata.

---

## Component Contracts

### Pass/Fail Badge

```
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
  Pass
</span>
```

Fail variant: `bg-red-100 text-red-700`. Applied in the Score % column of the submissions table. One badge per row — never stacked.

### Filter Bar (Submissions List)

Inline above the DataTable. Client-side filtering — no API round-trip.

```
<div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
  <select className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700" />  {/* Test config */}
  <input type="date" className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700" />  {/* Date from */}
  <input type="date" className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700" />  {/* Date to */}
  <select className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700" />  {/* Seniority */}
  <button className="text-xs text-gray-500 hover:text-gray-700">Clear filters</button>
</div>
```

Filters sit in a `flex` row. On narrow viewports they wrap (no explicit breakpoint handling for v1).

### Checkbox Selection (Comparison Flow)

Each DataTable row in `/admin/submissions` gets a leading checkbox column. Selection state is `useState<string[]>(selectedIds)`.

- Unchecked: `<input type="checkbox" className="rounded border-gray-300" />`
- When ≥ 2 rows checked: sticky footer bar appears with "Compare selected (N)" button
- Sticky bar: `fixed bottom-0 left-56 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between`
- Max selection: no hard limit — comparison page handles overflow with horizontal scroll

### Compare Selected Button (in sticky bar)

```
<button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
  Compare selected (N)
</button>
```

Routes to `/admin/compare?ids=id1,id2,...` via `router.push`.

### Score Distribution Chart (CSS-only)

Horizontal bar chart. No SVG, no canvas, no chart library.

```jsx
{buckets.map(({ label, count, pct }) => (
  <div key={label} className="flex items-center gap-3 text-sm">
    <span className="w-16 text-right text-gray-600 text-xs">{label}</span>
    <div className="flex-1 bg-gray-200 rounded-full h-3">
      <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${pct}%` }} />
    </div>
    <span className="w-8 text-gray-500 text-xs">{count}</span>
  </div>
))}
```

Buckets: 0–49%, 50–59%, 60–69%, 70–79%, 80–89%, 90–100%. Rendered above a summary row showing average score and pass rate as plain numbers (`text-2xl font-semibold text-gray-900`).

### Stats Summary Numbers

```
<div className="flex gap-8 mb-6">
  <div>
    <div className="text-2xl font-semibold text-gray-900">{avgScore}%</div>
    <div className="text-xs text-gray-500">Average score</div>
  </div>
  <div>
    <div className="text-2xl font-semibold text-gray-900">{passRate}%</div>
    <div className="text-xs text-gray-500">Pass rate</div>
  </div>
  <div>
    <div className="text-2xl font-semibold text-gray-900">{totalCount}</div>
    <div className="text-xs text-gray-500">Total submissions</div>
  </div>
</div>
```

### Export CSV Button

Anchor tag styled as a button. No JS download logic — `href` points to the API endpoint with `download` attribute.

```
<a
  href={`${API_URL}/admin/submissions/export?testConfigId=${selectedConfigId}`}
  download
  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 inline-block"
>
  Export CSV
</a>
```

Rendered in the page header row next to the "Submissions" heading. Hidden when no testConfigId selected.

### CSV Import (Questions Page)

File input + inline result table. No drag-and-drop.

```jsx
<label className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer inline-block">
  Import CSV
  <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
</label>
```

After upload:
- Loading: `<p className="text-sm text-gray-400">Processing…</p>`
- Success/error table: standard DataTable with columns: Row | Status | Details
- Status column: `bg-green-100 text-green-700` badge for "Imported", `bg-red-100 text-red-700` badge for "Error"
- Details column: plain `text-sm text-gray-700` for error reason, empty for successful rows

### Comparison Page Layout (`/admin/compare`)

Horizontal scroll if more than 2 candidates. Each candidate in a `min-w-[280px]` card.

```
<div className="overflow-x-auto">
  <div className="flex gap-6 p-6 min-w-max">
    {candidates.map(c => (
      <div className="w-72 bg-white border border-gray-200 rounded-md p-6">
        {/* Score, pass/fail, time taken, skill breakdown */}
      </div>
    ))}
  </div>
</div>
```

Skill breakdown inside card: one row per skill area. Score as `N/M (X%)` text — no chart inside comparison cards (save chart for the aggregate stats page).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Submissions page title | `Submissions` |
| Compare page title | `Compare Candidates` |
| Stats page title | `Test Statistics` (or inline section heading on dashboard) |
| Export CTA | `Export CSV` |
| Import CTA | `Import CSV` |
| Compare CTA (sticky bar) | `Compare selected (N)` |
| Filter clear | `Clear filters` |
| Submissions empty state heading | `No submissions yet` |
| Submissions empty state body | `Submissions will appear here once candidates complete a test.` |
| Filtered empty state | `No submissions match the current filters.` |
| Compare empty state | `Select at least 2 submissions to compare.` |
| Loading state | `Loading…` |
| Submission error | `Failed to load submissions. Refresh the page to try again.` |
| Import processing | `Processing…` |
| Import success summary | `{N} rows imported · {M} rows failed` |
| Import row status — success | `Imported` |
| Import row status — error | `Error: {reason}` |
| Column — Score | `Score` |
| Column — Result | `Result` |
| Column — Test | `Test` |
| Column — Time taken | `Time taken` |
| Column — Submitted | `Submitted` |
| Column — Actions | `Actions` |
| Row action link | `View result` |

---

## Registry Safety

| Registry | Components Used | Safety Gate |
|----------|----------------|-------------|
| TanStack Table (npm) | `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel` | Not required — already installed, extending existing API |
| No other registries | — | No new packages added in Phase 4 |

New npm packages: none. If any PR adds a new dependency, it must be explicitly approved — this contract prohibits it.

---

## Page Layout Map

| Route | Layout | New nav item? |
|-------|--------|---------------|
| `/admin/submissions` | Standard admin (sidebar + main) | Yes — "Submissions" link in sidebar, between "Question Bank" and "Test Configs" |
| `/admin/compare` | Standard admin (sidebar + main, overflow-x) | No |
| `/admin/questions` | Existing — add Import CSV button to page header | No |
| Stats | Inline section on submissions page or separate `/admin/stats` | TBD by planner — scoped to test config select |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-28
