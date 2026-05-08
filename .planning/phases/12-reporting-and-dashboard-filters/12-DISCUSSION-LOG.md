# Phase 12: Reporting & Dashboard Filters — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 12-reporting-and-dashboard-filters
**Areas discussed:** PDF library approach, PDF answer detail level, Dashboard filter layout, Date range options

---

## PDF Library Approach

| Option | Description | Selected |
|--------|-------------|----------|
| window.print() + print CSS | Style existing submission page with @media print; zero new dependencies, always matches page | ✓ |
| html2canvas + jsPDF | Screenshot DOM then embed in PDF; can produce blurry text, 2 new packages | |
| react-pdf/renderer | Programmatic PDF via React components; crisp vector output but requires re-implementing layout | |

**User's choice:** window.print() + print CSS
**Notes:** Chosen for zero dependencies and guaranteed parity with the live page.

---

## PDF Trigger Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Button calls window.print() directly | Simple — button click triggers print dialog | ✓ |
| Dedicated /print route | Separate minimal-chrome route; more control but adds a new route and page | |

**User's choice:** Button calls window.print() directly

---

## PDF Content Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Everything on the page (summary + skill breakdown + full answer sheet) | Print CSS hides chrome, keeps all data sections | ✓ |
| Summary + skill breakdown only (no answer sheet) | 1-page output; candidates can't see per-question detail | |

**User's choice:** Full page content — summary card, skill area breakdown, complete answer sheet

---

## PDF Access Control

| Option | Description | Selected |
|--------|-------------|----------|
| All admin roles (owner, reviewer, member) | Read-only export; all roles can already see this data | ✓ |
| Owner and reviewer only | Restrict casual sharing of raw candidate data | |

**User's choice:** All admin roles

---

## Dashboard Filter Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single filter bar at top of dashboard | Controls above KPI cards; one change re-fetches everything | ✓ |
| Inline controls per chart section | Per-card filters; more granular but adds visual complexity | |

**User's choice:** Single filter bar at the top of the dashboard

---

## Dashboard Re-fetch Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Re-run both API calls on every filter change | Same Promise.all pattern as initial load | ✓ |
| Debounce fetches (300ms) | Avoids double-fetches on rapid changes; adds complexity | |

**User's choice:** Re-run both API calls immediately on any filter change

---

## KPI Filter Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All KPIs re-scope to filter (total candidates, pass rate, avg score, weakest skill, charts) | Consistent: entire page reflects selected filter | ✓ |
| KPIs stay all-time, only charts filter | Simpler backend; but KPIs and charts disagree when filter active | |

**User's choice:** All KPIs and charts re-scope to the active filter

---

## Date Range Options

| Option | Description | Selected |
|--------|-------------|----------|
| Presets only (All time, 7d, 30d, 90d) | Simple dropdown, no calendar component needed | |
| Presets + custom date picker | Four presets plus Calendar popover for custom range | ✓ |

**User's choice:** Presets + custom date picker (shadcn/ui Calendar in a Popover)

---

## Claude's Discretion

- Filter bar visual design (spacing, widths, label placement)
- Loading/skeleton behavior during filter re-fetch
- Exact print CSS (page breaks, font sizes, header/footer suppression)
- Test config dropdown empty state
- Whether to cache the test configs list or re-fetch at dashboard load

## Deferred Ideas

- URL-based filter persistence (`?configId=...&from=...&to=...`) — ROADMAP notes as optional; deferred
- Bulk PDF export from submissions list — only submission detail PDF in scope
