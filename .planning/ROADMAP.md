# Roadmap — Dev Assessment Platform v1.2

**Milestone:** v1.2 — Front End Improvements
**Phases:** 4 (continuing from v1.1, phases 9–12)
**Requirements:** 13
**Defined:** 2026-05-07

---

## Phase Map

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 9 | Candidate Experience Redesign ✓ | Modern, mobile-ready test page with dark mode | CAND-01, CAND-02, CAND-03, CAND-04 | 4/4 — Complete 2026-05-07 |
| 10 | Admin Visual Foundation ◆ | Dark mode toggle, consistent design system, tablet layout | THEME-01, UI-01, RESP-01 | Plan 10-01 complete 2026-05-07 |
| 11 | UX Pattern Library | Skeletons, empty states, consistent toast notifications | UI-02, UI-03, UI-04 | 4 |
| 12 | Reporting & Dashboard Filters | PDF export, dashboard filter by config and date | RPT-01, RPT-02, RPT-03 | 4 |

---

## Phase Details

### Phase 9: Candidate Experience Redesign

**Goal:** Redesign the candidate test-taking page with a modern, mobile-first visual design, dark mode support, progress feedback, and a clear submission flow.

**Requirements:**
- CAND-01: Modern mobile-first design conveying quality and trust
- CAND-02: Dark mode via `prefers-color-scheme`
- CAND-03: Progress indicator (question N of M)
- CAND-04: Submission confirmation step + results/thank-you screen

**Success Criteria:**
1. Candidate test page loads correctly on a 375px-wide mobile screen with no horizontal scroll
2. OS dark mode preference is honoured — page switches between light and dark without manual toggle
3. A question progress counter (e.g. "Question 3 / 15") is visible throughout the test
4. Clicking "Submit" presents a confirmation before final submission; after confirmation the candidate sees a thank-you or results screen

**Key technical notes:**
- Candidate app is in `apps/web/src/app/(test)/` — entirely separate route group from admin
- Use Tailwind `dark:` classes + `@media (prefers-color-scheme: dark)`
- shadcn/ui components already support dark mode via `class="dark"` on root — leverage this
- No new packages required; Tailwind + shadcn/ui covers all design needs

---

### Phase 10: Admin Visual Foundation

**Goal:** Introduce a dark/light mode toggle in the admin app, lock in a consistent design system across all admin pages, and make the admin layout functional on tablets.

**Requirements:**
- THEME-01: Admin dark/light toggle persisted per session
- UI-01: Consistent type scale, spacing, and accent colour palette
- RESP-01: Admin panel functional at ≥768px (tablet)

**Success Criteria:**
1. Clicking the theme toggle in the admin sidebar switches between dark and light mode; preference survives a page refresh
2. All admin pages use the same heading sizes, body text, and spacing — no ad-hoc inline styles or size overrides
3. Admin sidebar collapses gracefully on a 768px viewport; navigation and main content remain usable

**Key technical notes:**
- `next-themes` is the standard approach for admin dark mode with Next.js App Router
- Theme class applied to `<html>` root so all shadcn/ui components respond automatically
- Sidebar responsive: use a sheet/drawer on mobile, persistent sidebar on ≥768px
- Design token audit: enforce via Tailwind config (no raw hex values in JSX)

---

### Phase 11: UX Pattern Library

**Goal:** Apply consistent UX patterns across all admin pages: skeleton loading states, empty state messaging, and unified sonner toast notifications replacing all native browser dialogs.

**Requirements:**
- UI-02: Skeleton placeholders on tables and cards while loading
- UI-03: Empty states on all data pages with message and suggested action
- UI-04: sonner toasts for all success/error feedback (no window.alert / window.confirm)

**Success Criteria:**
1. Navigating to any table page (submissions, question bank, accounts) shows skeleton rows before data arrives; no flash of empty content
2. Each table/chart page with zero records shows a styled empty state (icon, headline, optional CTA button)
3. Creating, updating, or deleting any resource shows a sonner toast; the delete confirmation on submissions uses a shadcn `AlertDialog` instead of `window.confirm`
4. `grep` for `window.alert`, `window.confirm`, `alert(`, `confirm(` in `apps/web/src` returns 0 matches

**Key technical notes:**
- shadcn/ui ships a `Skeleton` component — use for rows/cards
- Shared `<EmptyState />` component keeps look consistent
- Toast audit: grep for `window.alert`, `window.confirm`, `alert(`, `confirm(` across `apps/web/src`
- Delete confirmation should switch from `window.confirm` to shadcn `AlertDialog`

---

### Phase 12: Reporting & Dashboard Filters

**Goal:** Allow owners and reviewers to export a candidate's results as a PDF, and add test-config and date-range filters to the analytics dashboard.

**Requirements:**
- RPT-01: PDF download of candidate submission results
- RPT-02: Dashboard filter by test configuration
- RPT-03: Dashboard filter by date range

**Success Criteria:**
1. A "Download PDF" button on the submission detail page generates and downloads a PDF containing candidate name, score, pass/fail, skill area breakdown, and answer summary
2. Selecting a test config from the dashboard filter dropdown re-fetches stats scoped to that config; "All configs" shows the aggregate
3. Selecting a date range (last 7/30/90 days or custom picker) re-fetches and re-renders all dashboard KPIs and charts for that period
4. Both filters can be combined (e.g. filter by config AND last 30 days simultaneously)

**Key technical notes:**
- PDF: `react-pdf/renderer` (client-side, no server changes) or `html2canvas + jsPDF` for screenshot approach
- Dashboard filter: add `testConfigId` and `from`/`to` query params to `GET /dashboard/stats` and `GET /dashboard/competency`; backend already has partial `testConfigId` support in `/competency`
- Date filter requires backend changes: add `WHERE tl.submitted_at >= $from AND tl.submitted_at <= $to`
- Filter state lives in component state for v1.2 (URL params optional enhancement)

---

## Dependency Order

```
Phase 9  ──┐  (independent — candidate route group)
            ├── can parallelise
Phase 10 ──┘  (admin theme foundation)
            │
Phase 11 ──── depends on Phase 10 (dark mode tokens + skeleton component)
            │
Phase 12 ──── independent, benefits from Phase 11 toasts
```

Recommended execution order: **9 → 10 → 11 → 12**

Phases 9 and 10 are fully independent and can be executed in parallel if desired.

---

## Coverage

| Requirement | Phase | Covered |
|-------------|-------|---------|
| CAND-01 | 9 | ✓ |
| CAND-02 | 9 | ✓ |
| CAND-03 | 9 | ✓ |
| CAND-04 | 9 | ✓ |
| THEME-01 | 10 | ✓ |
| UI-01 | 10 | ✓ |
| RESP-01 | 10 | ✓ |
| UI-02 | 11 | ✓ |
| UI-03 | 11 | ✓ |
| UI-04 | 11 | ✓ |
| RPT-01 | 12 | ✓ |
| RPT-02 | 12 | ✓ |
| RPT-03 | 12 | ✓ |

**13 / 13 requirements covered ✓**

---

## Archive — v1.1 Phases

See `.planning/milestones/v1.1-ROADMAP.md` (phases 6–8) for the previous milestone's roadmap.

---
*Roadmap defined: 2026-05-07*
