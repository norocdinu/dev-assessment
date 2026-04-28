---
plan: "04-06-PLAN"
phase: 4
status: complete
completed: "2026-04-28"
key-files:
  created:
    - apps/web/src/app/(admin)/compare/page.tsx
  modified:
    - apps/web/src/app/(admin)/questions/page.tsx
---

# Plan 04-06 Summary: Compare Page + Bulk Import UI

## What Was Built

**Compare page** (`/admin/compare?ids=uuid1,uuid2,...`):
- Reads `?ids` param via `useSearchParams`, fetches `GET /admin/submissions/compare`
- Side-by-side table: fixed first column (field name), one column per candidate
- Rows: Score %, Pass/Fail badge (green/red), Time taken (mm:ss), Submitted date
- Skill area breakdown section: union of all skill areas across all candidates, per-candidate `correct/total — pct%` or `—` if area absent
- Loading and error states handled inline

**Bulk CSV import UI** (questions page, owner only):
- "Import CSV" label/button in the page header (next to "New Question")
- Hidden `<input type="file" accept=".csv">` triggers `handleImport` on change
- Sends `FormData` with `multipart/form-data` header to `POST /questions/import`
- On completion: shows inline result panel with import count + error table (Row / Reason columns)
- Fetches question list on successful import (imported > 0)
- Dismiss button clears the result panel

## Self-Check: PASSED

- `apps/web/src/app/(admin)/compare/page.tsx` exists
- Compare page reads `searchParams.get('ids')`
- `apps/web/src/app/(admin)/questions/page.tsx` contains `input type="file" accept=".csv"`
- Import result renders `importResult.errors` as a table with Row and Reason columns
- `handleImport` sends `FormData` with `multipart/form-data` content type
