# Phase 5: Improvements — Research

**Researched:** 2026-05-07
**Status:** RESEARCH COMPLETE

---

## Summary

Phase 5 adds targeted UX improvements to the existing admin: question bank filtering enhancements, CSV export, bulk archive/delete, sidebar active state, toast notifications, and server-side pagination. All work builds on patterns already in the codebase — there are no new architectural concepts.

---

## Finding 1: Filters Already Exist on Questions Page

**CONTEXT D-01 says** "client-side filters, no additional backend query needed." **Reality:** the filters already exist AND already send API query params. The questions page (`apps/web/src/app/(admin)/questions/page.tsx`) already has:
- Technology dropdown (sends `technology` param)
- Difficulty dropdown (sends `difficulty` param)
- Skill area input (sends `skill_area` param with 300ms debounce)
- Text search input (sends `search` param with 300ms debounce)
- "Show archived" toggle

The `GET /questions` backend already accepts and filters by all these params. **Implication:** D-01 and D-02 are effectively already implemented. The plan should NOT add more filters — they exist. The plan should focus on adding the **Export CSV button** (D-03/D-04/D-05) which is missing, and the **checkboxes + bulk actions** (D-06/D-07/D-08).

---

## Finding 2: Existing DELETE Route is Soft-Delete Only

Current `DELETE /questions/:familyId` sets `is_active = false` and logs `question.archive`. It is an **archive**, not a hard delete. The frontend "Archive" button calls this. Per D-08 through D-11:

- **Archive** = existing soft-delete behavior (keep for the per-row archive button)
- **Hard delete** = new endpoint — `DELETE /questions/:familyId/hard` or separate logic — checks FK constraint first

**FK constraint:** `candidate_answers.question_id` references `questions.id`. If a question has answers, the DB will throw a FK violation on `DELETE`. The API must:
1. Check `SELECT COUNT(*) FROM candidate_answers WHERE question_id = $id` before attempting DELETE
2. If count > 0: return 409 with `{ error: "used_in_submissions", count: N }`
3. If count = 0: execute `DELETE FROM questions WHERE family_id = $familyId`

**Note:** Hard delete removes ALL versions in the family (all rows with same `family_id`), not just `is_latest`. The questions table has `family_id` grouping multiple versions. A delete should check if ANY version in the family is referenced in `candidate_answers`.

---

## Finding 3: Pagination — API is Unpaginated

Both `GET /admin/questions` and `GET /admin/submissions` return all rows. The `listQuerySchema` for questions does not include `page`/`pageSize`. For submissions similarly.

**Changes needed:**
- Add `page: z.coerce.number().int().min(1).default(1)` and `pageSize: z.coerce.number().int().min(1).max(100).default(25)` to both list schemas
- SQL: add `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}` 
- Run a separate `SELECT COUNT(*)` with the same WHERE clause for the `total` field
- Return shape: `{ data: [...], total: N, page: N, pageSize: N }`

**CSV export must NOT paginate** — `GET /admin/questions/export` and `GET /admin/submissions/export` fetch all matching rows.

---

## Finding 4: DataTable Has No Pagination

`apps/web/src/components/ui/DataTable.tsx` only accepts `{ columns, data }`. TanStack Table `getPaginationRowModel` can handle client-side pagination, but since pagination is server-side (backend returns only the current page's rows), the DataTable just needs optional pagination controls as a UI overlay.

**Simplest approach:** Add optional props `pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }`. When present, render a "Showing X–Y of Z" bar with Prev/Next buttons below the table. DataTable renders the rows it receives — no internal pagination model needed.

---

## Finding 5: Submissions Checkbox Pattern to Reuse for Bulk Actions

`apps/web/src/app/(admin)/submissions/page.tsx` already has a working checkbox + sticky footer pattern:
- `selectedIds: Set<string>` state
- `toggleSelect(id)` function
- Sticky `<div className="fixed bottom-0 ...">` appears when `selectedIds.size >= 2`

**Reuse directly** for the questions bulk archive/delete. The questions page needs:
- Checkbox column (same pattern)
- Floating action bar: "Archive X selected" + "Delete X selected" (appears when `selectedIds.size >= 1`)
- Both Owner-only (guard with `isOwner`)

---

## Finding 6: No Toast Library Currently Installed

The existing code has NO toast library. D-13 recommends `sonner`. Verify it's not in package.json:

```
apps/web/package.json — no sonner or react-hot-toast currently listed
```

**Install path:** `npm install sonner` in `apps/web`. Add `<Toaster />` to the admin layout. Replace current `confirm()` calls (archive confirmation) with toast confirmations or keep `confirm()` for destructive actions and add `toast.success()` for success feedback.

**Pattern after installation:**
```tsx
import { toast } from 'sonner';
// on success:
toast.success('3 questions archived');
// keep window.confirm() for destructive delete confirmations
```

---

## Finding 7: Sidebar Active State — Simple `usePathname` Addition

`apps/web/src/app/(admin)/layout.tsx` is already `'use client'`. The nav links have a fixed class `"flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"` with no active state. Import `usePathname` from `next/navigation` and apply a conditional class:

```tsx
import { usePathname } from 'next/navigation';
// inside component:
const pathname = usePathname();
// on each Link:
className={`flex items-center px-3 py-2 text-sm rounded-md ${
  pathname.startsWith(href)
    ? 'bg-blue-50 text-blue-700 font-medium'
    : 'text-gray-700 hover:bg-gray-100'
}`}
```

---

## Finding 8: Questions Export Endpoint Pattern

`GET /admin/submissions/export` is the reference pattern:
- Accepts filter query params (`testConfigId`)
- Requires `authMiddleware` (no `requireRole` — any admin can see)
- Runs a DB query with filters
- Builds CSV string with `Content-Disposition: attachment`
- Returns with `Content-Type: text/csv`

Questions export (`GET /admin/questions/export`) will:
- Accept same filter params as `GET /admin/questions` (technology, difficulty, skill_area, search, include_archived)
- Require `authMiddleware` + `requireRole('owner')` (D-03: Owner only)
- Return columns: Technology, Difficulty, Skill Area, Question Text, Option A, Option B, Option C, Option D, Correct Option
- **No pagination** — full matching dataset

**Client-side trigger** (same blob download pattern as submissions export):
```tsx
async function handleExport() {
  const res = await api.get(`/questions/export?${params}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a'); a.href = url; a.download = 'questions.csv'; a.click();
  URL.revokeObjectURL(url);
}
```

---

## Finding 9: Shared Types — Add PaginatedResult

`packages/shared/src/types/index.ts` has no paginated response type. Add:
```typescript
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

Both the API and the frontend should import this type for the paginated list responses.

---

## Finding 10: Bulk Archive/Delete API

**Bulk archive** (`PATCH /questions/bulk-archive`):
- Body: `{ ids: string[] }` (family IDs)
- Sets `is_active = false` WHERE `family_id IN (...)` AND `is_latest = TRUE`
- Owner only
- Returns `{ archived: number }`

**Bulk delete** — two approaches possible:
1. Loop client-side: call per-question delete for each selected, collect errors
2. Single bulk endpoint: `POST /questions/bulk-delete` with `{ ids: string[] }`

**Recommended:** Single bulk delete endpoint for atomicity. Check each family for FK refs before deleting. Return `{ deleted: number, blocked: Array<{ id, reason, count }> }`.

---

## Conclusion

All Phase 5 work involves extending existing code — no new architectural patterns. The implementation order should be:

1. **Shared types** — add `PaginatedResult<T>` (unblocks API + frontend types)
2. **API: Questions** — export endpoint, bulk archive, hard delete, pagination
3. **API: Submissions** — add pagination params
4. **Frontend: Layout** — sidebar active state, install sonner, add `<Toaster />`
5. **Frontend: DataTable** — add optional pagination props
6. **Frontend: Questions page** — checkboxes, bulk action bar, export button, delete button, pagination controls
7. **Frontend: Submissions page** — pagination controls

## RESEARCH COMPLETE
