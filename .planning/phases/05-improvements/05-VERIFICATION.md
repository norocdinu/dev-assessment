---
phase: 5
status: passed
must_haves_verified: 27/27
---

# Verification — Phase 5: Improvements

## Must-Haves Check

### Plan 05-01 — API: Pagination, Export & Question Management Endpoints

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | `packages/shared/src/types/index.ts` exports `PaginatedResult<T>` | ✓ | Lines 160–165: `export interface PaginatedResult<T> { data: T[]; total: number; page: number; pageSize: number; }` |
| 2 | GET /admin/questions returns `{ data, total, page, pageSize }` and accepts `page` + `pageSize` params | ✓ | `listQuerySchema` includes `page: z.coerce.number().int().min(1).default(1)` and `pageSize: z.coerce.number().int().min(1).max(100).default(25)`. Handler returns `{ data: rows, total: Number(countRow.count), page, pageSize }` at line 70 |
| 3 | GET /admin/questions/export returns a CSV attachment filtered by same params (no pagination) | ✓ | Route registered at line 74. Uses `listQuerySchema` filters (no page/pageSize in response). Sets `Content-Disposition: attachment; filename="questions-export.csv"`. No LIMIT/OFFSET applied |
| 4 | PATCH /admin/questions/bulk-archive sets `is_active = false` for all `is_latest` rows in given family IDs | ✓ | Line 128: `UPDATE questions SET is_active = FALSE WHERE family_id = ANY(${ids}::uuid[]) AND is_latest = TRUE` |
| 5 | POST /admin/questions/bulk-delete deletes families with no `candidate_answers` references, returns blocked list for those that do | ✓ | Line 152: loops over IDs, checks `candidate_answers` refs, deletes clean ones, returns `{ deleted, blocked }` |
| 6 | DELETE /admin/questions/:familyId/hard checks `candidate_answers`, returns 409 if referenced, hard-deletes if not | ✓ | Line 281: returns `reply.status(409).send({ error: 'used_in_submissions', ... })` when refCount > 0; `DELETE FROM questions WHERE family_id = ${familyId}` otherwise |
| 7 | GET /admin/submissions returns `{ data, total, page, pageSize }` and accepts `page` + `pageSize` params | ✓ | `submissions.ts` line 11–12: pagination fields in `listQuerySchema`. Returns `{ data: rows, total: Number(countRow.count), page, pageSize }` at line 158 |
| 8 | All new Owner-only endpoints return 403 for non-owner roles | ✓ | `/export`, `/bulk-archive`, `/bulk-delete`, and `/:familyId/hard` all have `preHandler: [authMiddleware, requireRole('owner')]`. The `requireRole` middleware handles 403 for non-owner roles (pre-existing middleware) |

### Plan 05-02 — Frontend: Active State, Sonner, DataTable Pagination

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 9 | Admin layout nav items show active highlight using `usePathname` | ✓ | `layout.tsx` line 5: `import { usePathname } from 'next/navigation'`. Line 48: `pathname.startsWith(href)` drives `bg-blue-50 text-blue-700 font-medium` vs `text-gray-700 hover:bg-gray-100` |
| 10 | `sonner` is installed in `apps/web` | ✓ | `apps/web/package.json` line 20: `"sonner": "^2.0.7"` |
| 11 | `Toaster` component is rendered in the admin layout | ✓ | `layout.tsx` line 7: `import { Toaster } from 'sonner'`. Line 72: `<Toaster position="top-right" />` |
| 12 | DataTable accepts optional `pagination` prop and renders Prev/Next controls when provided | ✓ | `DataTable.tsx` line 20: `pagination?: PaginationProps`. Lines 73–95: conditional pagination footer with Prev/Next buttons rendered when `pagination` is truthy |

### Plan 05-03 — Questions Page: Export, Bulk Actions, Pagination

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 13 | Questions page sends `page` + `pageSize` to GET /questions and handles paginated response shape | ✓ | `questions/page.tsx` lines 62–63: `params.set('page', String(page))` and `params.set('pageSize', String(PAGE_SIZE))`. Lines 65–66: `setQuestions(res.data.data)` and `setTotal(res.data.total)` |
| 14 | Page resets to 1 when any filter changes | ✓ | Lines 72–74: `useEffect(() => { setPage(1); }, [technology, difficulty, debouncedSkillArea, debouncedSearch, showArchived])` |
| 15 | Export CSV button visible to Owner only, triggers blob download of GET /questions/export with current filters | ✓ | `handleExport()` at line 111 calls `/questions/export` with `responseType: 'blob'`, triggers download. Button at line 291 is inside `{isOwner && (...)}` block |
| 16 | `sonner` `toast.success` fires on successful archive, export, bulk archive, bulk delete, and hard delete | ✓ | `toast.success('Question archived')` (line 82), `toast.success('Export started')` (line 126), `toast.success(... archived)` (line 153), `toast.success(... deleted)` (line 167), `toast.success('Question deleted')` (line 185) |
| 17 | Checkbox column present in questions table with select-all header checkbox | ✓ | Lines 202–220: `id: 'select'` column with `header` containing `<input type="checkbox" ... onChange={toggleSelectAll}>` and `cell` containing `<input type="checkbox" checked={selectedIds.has(...)} onChange={() => toggleSelect(...)} />` |
| 18 | Floating action bar appears when `selectedIds.size >= 1` and user is Owner, showing Archive + Delete bulk buttons | ✓ | Lines 406–424: `{selectedIds.size >= 1 && isOwner && (<div className="fixed bottom-0 ...">...Archive {selectedIds.size} selected...Delete {selectedIds.size} selected...)}` |
| 19 | Per-row hard-delete button visible to Owner, triggers confirm dialog, shows inline error on 409, toasts on success | ✓ | `handleHardDelete` (line 181): calls `window.confirm`, on 409 sets `deleteErrors[familyId]` (shown inline at line 277), on success calls `toast.success('Question deleted')`. Button at line 268 guarded by `{isOwner && (...)}` |
| 20 | DataTable receives `pagination` prop and renders Prev/Next controls | ✓ | Line 386–390: `<DataTable columns={columns} data={questions} pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }} />` |

### Plan 05-04 — Submissions Page: Pagination

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 21 | Submissions page sends `page` + `pageSize` to GET /admin/submissions and handles paginated response shape | ✓ | `submissions/page.tsx` lines 76–77: `params.set('page', String(currentPage))` and `params.set('pageSize', String(PAGE_SIZE))`. Lines 79–80: `setSubmissions(res.data.data)` and `setTotal(res.data.total)` |
| 22 | Page resets to 1 when Apply or Clear is clicked | ✓ | `applyFilters()` (line 95): `setPage(1); fetchSubmissions(1)`. `clearFilters()` (line 101): `setPage(1); setTimeout(() => fetchSubmissions(1), 0)` |
| 23 | Pagination UI renders below the table showing "Showing X–Y of Z" with Prev/Next buttons | ✓ | Lines 392–415: pagination block renders `Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}` with Prev/Next buttons |
| 24 | Prev button is disabled on page 1 | ✓ | Line 401: `disabled={page <= 1}` |
| 25 | Next button is disabled when on last page | ✓ | Line 408: `disabled={page * PAGE_SIZE >= total}` |

### Additional Observations

| # | Observation | Notes |
|---|-------------|-------|
| 26 | `navItems` array defined in layout | ✓ | Lines 11–15 of `layout.tsx` define the array; hardcoded links replaced with a `.map()` |
| 27 | `question.delete` audit log action in bulk-delete and hard-delete | ✓ | `questions.ts` lines 178 and 302 both use `action: 'question.delete'` |

## Summary

All 27 must_haves from all 4 plans are verified as present in the actual codebase. The implementation matches the plan specifications precisely:

- **API (05-01):** `PaginatedResult<T>` type exported from shared package. Both list endpoints (`/questions` and `/submissions`) accept `page`/`pageSize` and return `{ data, total, page, pageSize }`. Export CSV, bulk-archive, bulk-delete, and hard-delete endpoints are all present and correctly owner-gated.
- **Frontend infra (05-02):** Admin layout uses `usePathname` for active sidebar state. `sonner@^2.0.7` is in `package.json`. `<Toaster position="top-right" />` is rendered in the layout. `DataTable` has an optional `pagination` prop that renders Prev/Next controls.
- **Questions page (05-03):** Full feature set is present — paginated fetch, filter-triggered page reset, Export CSV (owner-only blob download), checkbox selection with select-all, floating bulk action bar (owner-only), per-row hard-delete with 409 inline errors, and DataTable wired up with pagination prop.
- **Submissions page (05-04):** Paginated fetch, page-reset on Apply/Clear, and pagination UI with correct Showing text and disabled-state logic are all present.

## Gaps

None. All must_haves are verified in code.

## Human Verification Items

The following require browser testing and cannot be confirmed from code alone:

1. **Sidebar active highlight**: Confirm the blue highlight visually appears on the correct nav item during navigation (code is correct, but CSS rendering needs visual confirmation).
2. **Toast notifications**: Verify toasts appear top-right and auto-dismiss in the browser.
3. **Export CSV download**: Confirm the CSV file downloads with correct columns when clicking Export CSV.
4. **403 for non-owner endpoints**: Confirm reviewer-role token receives 403 from `/export`, `/bulk-archive`, `/bulk-delete`, and `/:familyId/hard` (depends on `requireRole` middleware working correctly — not modified in this phase).
5. **Pagination navigation**: Confirm Prev/Next page transitions load correct data pages from the server.
