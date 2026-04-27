---
plan: 02-03
phase: 2
subsystem: frontend/admin
tags: [frontend, next.js, react, test-links, admin]
requires: [02-01, 02-02]
provides: [/test-configs/[id]/links page, wired Generate Link button]
affects:
  - apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx
  - apps/web/src/app/(admin)/test-configs/page.tsx
tech-stack:
  added: []
  patterns: [use-client, useParams, DataTable-with-conditional-columns]
key-files:
  created:
    - apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx
  modified:
    - apps/web/src/app/(admin)/test-configs/page.tsx
key-decisions:
  - Token truncated to 8 chars in table (D-02 — shoulder-surfing protection)
  - No expiry date picker (D-05 — expires_at always NULL)
  - Generate/Revoke controls conditionally rendered on isOwner (defense-in-depth UX, API enforces independently)
  - Copy button uses navigator.clipboard.writeText with generatedUrl (no user input in URL construction)
requirements-completed:
  - TESTS-02
  - TESTS-03
  - TESTS-04
  - TESTS-05
duration: 5 min
completed: 2026-04-27
---

# Phase 2 Plan 03: Admin Frontend — Link Management Page Summary

Admin link management page at `/test-configs/[id]/links` using DataTable with conditional columns; Generate Link button calls POST /admin/test-links and displays returned URL in read-only input with clipboard copy; Revoke (owner-only) calls DELETE; test-configs list page "Generate Link" button wired to navigate to the new page.

**Duration:** 5 min | **Tasks:** 2 | **Files modified/created:** 2

## What Was Built

- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`: full link management page with useParams, state for links/role/loading/error/generatedUrl/copied, fetchLinks on mount, handleGenerate/handleRevoke/handleCopy handlers, DataTable columns with token truncation and conditional Actions column (owner only), generatedUrl display with read-only input + Copy button
- `apps/web/src/app/(admin)/test-configs/page.tsx`: replaced disabled Generate Link button with active button navigating to `/test-configs/${row.original.id}/links`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next

Ready for Plan 02-05 (Candidate Frontend — Test Portal).

## Self-Check: PASSED

- ✓ page.tsx exists with 'use client'
- ✓ useParams<{ id: string }>()
- ✓ api.get(`/admin/test-links/${id}`)
- ✓ api.post('/admin/test-links', { test_config_id: id })
- ✓ api.delete(`/admin/test-links/${linkId}`)
- ✓ input readOnly value={generatedUrl}
- ✓ navigator.clipboard.writeText(generatedUrl)
- ✓ .substring(0, 8) for token truncation
- ✓ text-red-600 hover:underline text-xs on Revoke
- ✓ Revoke rendered only when state !== 'submitted' && state !== 'expired'
- ✓ Generate/Revoke only when isOwner
- ✓ test-configs/page.tsx: no "Coming in Phase 2", no cursor-not-allowed on Generate Link
- ✓ router.push to /test-configs/[id]/links
