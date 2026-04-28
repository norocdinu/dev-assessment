---
plan: "04-04-PLAN"
phase: 4
status: complete
completed: "2026-04-28"
key-files:
  created:
    - apps/web/src/app/(admin)/submissions/page.tsx
  modified:
    - apps/web/src/app/(admin)/layout.tsx
---

# Plan 04-04 Summary: Submissions List Page + Sidebar Nav

## What Was Built

- **Sidebar nav updated** in `layout.tsx`: "Submissions" link added between Test Configs and the footer, pointing to `/submissions`

- **`/admin/submissions` page** created with:
  - `GET /admin/submissions` fetch with optional filter params (testConfigId, dateFrom, dateTo, difficulty)
  - TanStack Table with `getSortedRowModel` + `getFilteredRowModel` — Score and Submitted columns have sortable headers with ↑↓↕ indicators
  - Filter bar: test config select, date-from/to inputs, difficulty select, Apply + Clear buttons
  - Checkbox column per row — tracks `selectedIds: Set<string>`
  - Sticky footer bar appears when ≥2 rows selected: "Compare selected (N)" → navigates to `/compare?ids=...`
  - "Export CSV" button visible only when a testConfigId filter is active → uses `responseType: 'blob'` + `URL.createObjectURL` for auth-cookie-safe download

## Self-Check: PASSED

- `apps/web/src/app/(admin)/layout.tsx` contains `href="/submissions"`
- `apps/web/src/app/(admin)/submissions/page.tsx` exists
- Submissions link is between Test Configs and sidebar footer
- `getSortedRowModel` and `getFilteredRowModel` imported from `@tanstack/react-table`
- Export CSV button only renders when `filterTestConfigId` is truthy
