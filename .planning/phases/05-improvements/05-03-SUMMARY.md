# Plan 05-03 Summary — Questions Page (Export, Bulk Actions, Pagination)

## Status: Complete

## What Was Built

Updated `apps/web/src/app/(admin)/questions/page.tsx` with all Phase 5 question bank improvements:

**T01 — Paginated fetch:**
- Added `page`, `total`, `PAGE_SIZE = 25` state
- `fetchQuestions` sends `page` + `pageSize` query params, handles `{ data, total }` response
- `useEffect` resets page to 1 on any filter change
- Added `import { toast } from 'sonner'`

**T02 — Export CSV:**
- `handleExport()` calls `GET /questions/export` with current filters, triggers blob download
- "Export CSV" button added inside `{isOwner && ...}` group before Import CSV

**T03 — Checkbox selection:**
- `selectedIds: Set<string>` state with `toggleSelect` and `toggleSelectAll` helpers
- Checkbox column added as first column in `columns` array with select-all header checkbox

**T04 — Bulk actions + floating bar:**
- `bulkDeleteBlocked` state for questions blocked from deletion
- `handleBulkArchive()` → `PATCH /questions/bulk-archive`
- `handleBulkDelete()` → `POST /questions/bulk-delete` (with confirm dialog)
- Floating action bar (fixed bottom-0) visible when `selectedIds.size >= 1 && isOwner`
- Blocked questions warning panel with dismiss button

**T05 — Per-row hard delete:**
- `deleteErrors: Record<string, string>` state for inline 409 messages
- `handleHardDelete(familyId)` → `DELETE /questions/:familyId/hard`; 409 shows inline error, success toasts
- `handleArchive` updated to `toast.success('Question archived')`
- Actions column: Edit / History / Archive (orange) / Delete (red) with inline error below row

**T06 — DataTable pagination:**
- `<DataTable pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }} />`
- "Showing N questions" replaced with `${total} question(s) total`

## Verification

- `npx tsc --noEmit` passed (0 errors)
- All must_haves from plan frontmatter satisfied

## Key Files

- `apps/web/src/app/(admin)/questions/page.tsx` — complete rewrite with all features
