# 05-02 Summary: Admin Layout Active State, Sonner, DataTable Pagination

**Status:** Complete
**Date:** 2026-05-07

## Tasks Completed

### T01: Admin layout sidebar active state + Toaster
- Replaced `apps/web/src/app/(admin)/layout.tsx` entirely
- Added `usePathname` from `next/navigation` for active route detection
- Added `Toaster` from `sonner` rendered after `<main>` at `position="top-right"`
- Refactored hardcoded `<Link>` elements into a `navItems` array mapped with `pathname.startsWith(href)` conditional styling
- Active state: `bg-blue-50 text-blue-700 font-medium`; inactive: `text-gray-700 hover:bg-gray-100`

### T02: Install sonner
- Ran `npm install sonner` from `apps/web`
- `sonner@^2.0.7` added to `apps/web/package.json` dependencies
- Root `package-lock.json` updated

### T03: DataTable optional pagination controls
- Replaced `apps/web/src/components/ui/DataTable.tsx` entirely
- Added `PaginationProps` interface: `{ page, pageSize, total, onPageChange }`
- Added optional `pagination?: PaginationProps` to `DataTableProps<T>`
- Added pagination footer: "Showing X–Y of Z" with Prev/Next buttons
- Prev disabled when `page <= 1`; Next disabled when `page * pageSize >= total`

## Verification

- `npx tsc --noEmit` in `apps/web`: **0 errors**
- `apps/web/package.json` contains `"sonner": "^2.0.7"`

## Commits

1. `feat(05-02): add sidebar active state with usePathname + Toaster to admin layout`
2. `feat(05-02): install sonner in apps/web`
3. `feat(05-02): extend DataTable with optional pagination controls`
4. `docs(05-02): create SUMMARY.md`
