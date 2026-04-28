---
plan: "03-04"
phase: 3
status: complete
completed_at: "2026-04-28"
---

# Summary: Admin Submission Detail + Links Page Update

## What was built

Created `/admin/submissions/[linkId]/page.tsx` — an auth-guarded `'use client'` admin page using the `api` axios instance. Renders summary card (score, pass/fail, time, threshold, tech, difficulty), skill breakdown, and a `DataTable` answer sheet with `family_id` and `version` columns (admin-only data from `AdminSubmissionResult`). Includes "← Back to Test Links" navigation using `result.test_config_id`. Updated `test-configs/[id]/links/page.tsx`: added `useRouter` import and declaration, replaced the owner-only conditional Actions column with an unconditional Actions column that shows "View result" for submitted rows (all roles) and "Revoke" for owners on non-submitted/non-expired rows.

## key-files

### created
- apps/web/src/app/(admin)/submissions/[linkId]/page.tsx

### modified
- apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx

## Self-Check: PASSED

- Admin page: `AdminSubmissionResult`, `AdminAnswerSheetRow`, `family_id`, `version`, `DataTable`, "Back to Test Links", loading spinner
- Links page: `useRouter`, `const router`, "View result" button, `isOwner &&` guard on Revoke, no `...(isOwner ?` spread for Actions column
