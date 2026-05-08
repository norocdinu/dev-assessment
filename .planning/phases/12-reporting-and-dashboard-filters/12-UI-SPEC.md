---
phase: 12
slug: reporting-and-dashboard-filters
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-08
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for Phase 12: Reporting & Dashboard Filters. No new dependencies — native HTML + Tailwind throughout.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (native HTML + Tailwind) |
| Preset | not applicable |
| Component library | none |
| Icon library | lucide-react (version per package.json — 0.4xx series) |
| Font | system-ui / OS default (no custom font imported in globals.css) |

---

## Spacing Scale

Tokens used in new components, derived directly from existing admin page patterns observed in source:

| Token | px value | Usage in this phase |
|-------|----------|---------------------|
| `p-6` | 24px | Outer page wrapper (matches dashboard `div.p-6` and submission detail `div.p-6`) |
| `p-4` | 16px | Filter bar container inner padding (exact match: submissions filter bar `flex flex-wrap gap-3 mb-4 p-4 bg-card`) |
| `gap-3` | 12px | Gap between filter control groups in the filter bar row (exact match: submissions filter bar) |
| `gap-2` | 8px | Gap between from/to date inputs inside the custom range group |
| `gap-4` | 16px | KPI card grid column gap (matches dashboard `grid grid-cols-4 gap-4`) |
| `space-y-6` | 24px | Vertical rhythm between page sections (matches dashboard `space-y-6`) |
| `mb-4` | 16px | Below filter bar before KPI strip; below card section headings |
| `mb-1` | 4px | Below `<label>` above each filter control (exact match: submissions `block text-xs text-muted mb-1`) |
| `px-2 py-1` | 8px / 4px | Native `<select>` and `<input type="date">` internal padding (exact match: submissions filter controls) |
| `px-3 py-1` | 12px / 4px | Download PDF button padding (matches Delete Submission button on detail page) |
| `px-4 py-1.5` | 16px / 6px | **Not used in Phase 12** — included for reference only. Phase 12 uses immediate re-fetch on filter change (no Apply/Clear button). |

---

## Typography

All text styles are exact matches of existing admin patterns — no new sizes introduced.

| Role | Tailwind class | Usage |
|------|---------------|-------|
| Filter label | `block text-xs text-muted mb-1` | Label above each filter control — exact submissions page pattern |
| Filter control | `text-sm` | Text inside `<select>` and `<input type="date">` controls |
| Button | `text-sm` | Download PDF button text; also Apply/Clear if used |
| Dashboard page heading | `text-xl font-semibold text-foreground` | `<h1>Dashboard</h1>` — unchanged, filter bar goes below it |
| Section heading | `text-base font-semibold text-foreground` | Dashboard card headings (`<h2>`) — unchanged |
| KPI card label | `text-xs text-muted uppercase tracking-wide` | KPI metric labels in the 4-card strip — unchanged |
| KPI card value | `text-3xl font-bold text-foreground mt-1` | KPI large numbers — unchanged |
| Table/body text | `text-sm text-foreground/80` | General body text and table cell content — unchanged |

---

## Color Tokens

All tokens are the CSS variables from `apps/web/src/app/globals.css`. Dark mode is handled automatically via the `.dark` class on `<html>`.

| Token | CSS var | Light value | Dark value | Usage in this phase |
|-------|---------|-------------|------------|---------------------|
| Background | --background | `250 250 250` (#fafafa) | `9 9 11` (#09090b) | Page background |
| Card | --card | `255 255 255` (#ffffff) | `26 26 46` (#1a1a2e) | Filter bar wrapper background; all card containers |
| Border | --border | `228 228 231` (#e4e4e7) | `39 39 42` (#27272a) | All card and control borders |
| Foreground | --foreground | `24 24 27` (#18181b) | `244 244 245` (#f4f4f5) | Primary text: headings, KPI values, button text |
| Muted | --muted | `113 113 122` (#71717a) | `113 113 122` (#71717a) | Filter labels, secondary text, empty state copy |
| Brand | --brand / --brand-rgb | `#6366f1` / `99 102 241` | same | Primary action links. Usage forms: `bg-[var(--brand)]` (hex, for solid fills) vs `bg-[rgb(var(--brand-rgb))]` (space-separated RGB triplet, for opacity modifiers like `/10`). |
| Print: background | forced `255 255 255` | — | dark override | Print CSS forces white page background |
| Print: card | forced `255 255 255` | — | dark override | Print CSS forces white card backgrounds |
| Print: foreground | forced `0 0 0` | — | dark override | Print CSS forces black text |
| Print: border | forced `200 200 200` | — | dark override | Print CSS forces light gray borders |
| Print: muted | forced `100 100 100` | — | dark override | Print CSS forces readable gray for label text |

Pass/Fail badges use hardcoded `bg-green-100 text-green-700` / `bg-red-100 text-red-700` — opaque Tailwind colors that print correctly without any override.

---

## Component Specs

### A. Dashboard Filter Bar

**Layout:** A full-width card-style row inserted in `apps/web/src/app/(admin)/dashboard/page.tsx` immediately after the `<h1>Dashboard</h1>` heading and before the KPI cards grid. The filter bar is always visible — it is not toggled by a button.

**Container:** `<div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-lg">`

This exactly replicates the submissions page filter bar container (`flex flex-wrap gap-3 mb-4 p-4 bg-card border border-border rounded-lg`). The `mb-4` may be added to the wrapper or applied via `space-y-6` on the parent — match whichever the dashboard's outer `space-y-6` provides naturally.

Each control group is a `<div>` containing a `<label>` followed by its control:

```html
<div>
  <label className="block text-xs text-muted mb-1">[Label]</label>
  <select ...> or <input ...>
</div>
```

**Test config dropdown:**
```html
<select
  value={testConfigId}
  onChange={e => setTestConfigId(e.target.value)}
  className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
>
  <option value="">All configurations</option>
  {testConfigs.map(tc => (
    <option key={tc.id} value={tc.id}>{tc.name} — {tc.difficulty}</option>
  ))}
</select>
```

- Label text: `Test config`
- Placeholder option value: empty string `""` (always first)
- Option label format: `{tc.name} — {tc.difficulty}` — replicates submissions page pattern exactly (e.g., "Senior React — senior")
- When `testConfigs` array is empty after a successful fetch, only the "All configurations" option is shown — no additional disabled option required since the dashboard still works in aggregate mode
- `onChange` immediately triggers `fetchData()` — no Apply button for dashboard filters (per D-06: immediate re-fetch on any filter change)

**Date preset dropdown:**
```html
<select
  value={datePreset}
  onChange={e => setDatePreset(e.target.value)}
  className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
>
  <option value="all">All time</option>
  <option value="7d">Last 7 days</option>
  <option value="30d">Last 30 days</option>
  <option value="90d">Last 90 days</option>
  <option value="custom">Custom range</option>
</select>
```

- Label text: `Date range`
- Default selected: `All time` (value `"all"`)
- `onChange`: selecting any non-`custom` option immediately triggers `fetchData()`; selecting `"custom"` reveals the from/to inputs below and does not trigger a fetch until both date fields are populated

**Conditional custom date inputs (shown only when `datePreset === 'custom'`):**
```html
<div className="flex items-end gap-2">
  <div>
    <label className="block text-xs text-muted mb-1">From</label>
    <input
      type="date"
      value={customFrom}
      onChange={e => setCustomFrom(e.target.value)}
      className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
    />
  </div>
  <div>
    <label className="block text-xs text-muted mb-1">To</label>
    <input
      type="date"
      value={customTo}
      onChange={e => setCustomTo(e.target.value)}
      className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
    />
  </div>
</div>
```

- Both inputs use `type="date"` — native browser date picker, zero new dependencies
- `items-end` aligns the bottoms of the from/to groups to match the other controls in the flex row
- Fetch trigger: `fetchData()` fires only when both `customFrom` and `customTo` are non-empty (guard condition in `useEffect`)
- When preset switches from `"custom"` back to any preset, the from/to inputs are hidden and both state values reset to `''`

**Focus / hover / disabled states (deliberate decision):** All `<select>` and `<input type="date">` controls rely on native browser-default focus rings and hover treatment — the same approach used on the submissions page. No additional Tailwind focus or hover classes are applied. When a fetch is in-flight the controls remain enabled (the full `DashboardSkeleton` overlay provides the "busy" signal). This is a conscious choice, not an omission: adding custom focus styles would require duplicating the existing submissions-page conventions with no design benefit.

**Loading state during re-fetch:** Re-show the full `<DashboardSkeleton />` component on every filter-triggered re-fetch. Set `setLoading(true)` at the start of `fetchData()`. The existing `if (loading) { return <DashboardSkeleton /> }` guard already handles this path. This approach is consistent with the initial-load behavior, avoids stale-data confusion, and requires no new skeleton or dimming CSS.

**Empty test configs state:** When the `/test-configs` fetch returns an empty array, render only the `"All configurations"` option. The dashboard remains fully functional showing aggregate data. No special visual empty state is needed for the dropdown itself.

---

### B. "Download PDF" Button

**Placement:** Inside the Summary Card header flex row in `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`. The existing row is:

```html
<div className="flex items-center justify-between mb-4">
  <h1 className="text-xl font-semibold text-foreground">{result.test_name}</h1>
  <div className="flex items-center gap-3">
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${passClass}`}>
      {result.pass ? 'PASS' : 'FAIL'}
    </span>
    {userRole === 'owner' && (
      <button ... className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50">
        Delete Submission
      </button>
    )}
  </div>
</div>
```

The Download PDF button is inserted inside the `flex items-center gap-3` div, placed before the Delete Submission button (the non-destructive action comes first):

```
[Pass/Fail badge]  [Download PDF]  [Delete Submission — owner only]
```

**Button element:**
```html
<button
  onClick={() => window.print()}
  className="px-3 py-1 text-sm text-foreground/80 border border-border rounded-md hover:bg-muted/10 print:hidden"
>
  Download PDF
</button>
```

- `px-3 py-1` — matches Delete Submission button padding exactly
- `text-sm text-foreground/80` — neutral text, lower visual weight than destructive red
- `border border-border rounded-md` — matches the outline style of Delete Submission button
- `hover:bg-muted/10` — subtle hover matching other secondary admin buttons (e.g., Clear button on submissions page: `hover:bg-muted/10`)
- `print:hidden` — Tailwind print variant; hides the button when `window.print()` renders the print dialog (belt-and-suspenders alongside the `@media print` block)
- No icon — text only, consistent with Delete Submission button
- No role guard — visible to all admin roles (owner, reviewer, member) per D-04

**Print visibility:** The `print:hidden` class on the button compiles to `@media print { display: none }` automatically via Tailwind's print variant. Additionally mark the back navigation button and Delete Submission button with `print:hidden` in their `className` props — this avoids fragile structural CSS selectors.

---

### C. Print CSS (@media print)

**Placement strategy:** Split across two files:

1. **`apps/web/src/app/globals.css`** — admin layout chrome (sidebar, mobile topbar) that lives in `layout.tsx` outside the detail page component
2. **`<style>` JSX tag inside `SubmissionDetailPage`** — page-specific overrides (color, overflow, page breaks)

Element hiding for the back button, Delete button, and Download PDF button is handled via `print:hidden` Tailwind classes added directly to those `<button>` elements in JSX — no CSS rules needed for them.

**globals.css additions:**
```css
@media print {
  /* Desktop sidebar: aside.hidden.md:flex */
  aside {
    display: none !important;
  }
  /* Mobile top bar: div.md:hidden.sticky */
  .md\:hidden.sticky {
    display: none !important;
  }
}
```

**`<style>` tag in SubmissionDetailPage** (placed as first child of the return JSX, before the wrapping `<div className="p-6 space-y-6">`):
```jsx
<style>{`
  @media print {
    /* Force light colors — overrides dark mode CSS variables */
    :root,
    .dark {
      --background: 255 255 255;
      --card: 255 255 255;
      --foreground: 0 0 0;
      --border: 200 200 200;
      --muted: 100 100 100;
    }
    /* belt-and-suspenders: catches any element not using CSS token classes */
    body {
      background-color: white !important;
      color: black !important;
    }

    /* Fix DataTable overflow clipping in print */
    .overflow-x-auto {
      overflow: visible !important;
    }
    table {
      width: 100% !important;
    }

    /* Prevent orphaned headings */
    h2 {
      page-break-after: avoid;
    }
  }
`}</style>
```

**Elements to hide — summary:**

| Element | Method |
|---------|--------|
| Desktop sidebar (`aside.hidden.md:flex`) | CSS rule in globals.css: `aside { display: none !important }` |
| Mobile top bar (`.md:hidden.sticky`) | CSS rule in globals.css: `.md\:hidden.sticky { display: none !important }` |
| Back navigation `<button>` | Add `print:hidden` to its `className` in JSX |
| Delete Submission `<button>` | Add `print:hidden` to its `className` in JSX |
| Download PDF `<button>` | Already has `print:hidden` in its `className` |
| `<ConfirmDialog>` | Already conditionally rendered (`open={confirmDelete}`) — when `confirmDelete` is false the dialog is not in the DOM; add `print:hidden` to ConfirmDialog wrapper if needed as a guard |

**Page break strategy:** Natural page breaks throughout. No forced `page-break-before` rules. Add `page-break-after: avoid` on `<h2>` elements only (prevents a heading appearing alone at the bottom of a print page with its content on the next page). Allow the answer sheet `<table>` to break across pages naturally — it can have 30+ rows and forcing `page-break-inside: avoid` per row would create abnormally long pages.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| PDF button | "Download PDF" |
| Filter section label | none — controls are self-labeling via their individual `<label>` elements above each control |
| Config dropdown label | "Test config" |
| Config dropdown placeholder | "All configurations" |
| Date preset dropdown label | "Date range" |
| Date preset: all time | "All time" |
| Date preset: 7 days | "Last 7 days" |
| Date preset: 30 days | "Last 30 days" |
| Date preset: 90 days | "Last 90 days" |
| Date preset: custom | "Custom range" |
| Custom from label | "From" |
| Custom to label | "To" |
| Re-fetch loading | no text — full DashboardSkeleton shown (purely visual, no loading message) |
| No configs in dropdown | "All configurations" only (no extra disabled option; aggregate mode still works) |
| Print page title | auto from browser tab title — no custom `<title>` or print header needed |
| Config fetch error | `<option value="" disabled>Failed to load configurations</option>` — replaces placeholder when `GET /test-configs` fails; select remains disabled |
| Re-fetch error message | "Failed to load dashboard data. Try again." — rendered as `<p className="text-sm text-red-600">` below the filter bar (reuses existing submissions-page error paragraph pattern) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Native HTML | `select`, `input[type=date]`, `button`, `style` | not required |
| Browser API | `window.print()` | not required |
| lucide-react | no new icons added in Phase 12 | not required (already installed) |
| Tailwind print variant | `print:hidden` | not required (built into Tailwind v3) |

| **DO NOT INSTALL** | shadcn/ui Calendar · Popover · react-day-picker · date-fns | CONTEXT.md D-09 referenced these in error. Native `<input type="date">` is used instead, per RESEARCH.md §4 finding. Introducing any of these packages would violate the zero-new-dependency contract for Phase 12. |

**No new npm packages are introduced. No shadcn/ui. No Radix UI. No react-day-picker. No date-fns.**

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-08
