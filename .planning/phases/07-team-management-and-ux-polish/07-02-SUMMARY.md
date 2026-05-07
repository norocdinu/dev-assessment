---
phase: 7
plan: "07-02"
name: "Frontend — Layout, Accounts Pages, Settings, Test Config UX"
subsystem: web
tags: [frontend, accounts, settings, rbac, ux]
requires:
  - 07-01 (backend routes)
provides:
  - /admin/accounts page
  - /admin/accounts/new page
  - /admin/accounts/[id]/edit page
  - /admin/settings page
  - Accounts sidebar nav (owner-only)
  - Settings link from sidebar user block
  - Candidate Name input on links page
affects:
  - apps/web/src/app/(admin)/layout.tsx
  - apps/web/src/app/(admin)/accounts/page.tsx
  - apps/web/src/app/(admin)/accounts/new/page.tsx
  - apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx
  - apps/web/src/app/(admin)/settings/page.tsx
  - apps/web/src/app/(admin)/test-configs/new/page.tsx
  - apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx
tech-stack:
  added: []
  patterns:
    - Role-conditional nav item (user.role === 'owner')
    - Fetch list then find by id for edit pre-fill (no dedicated GET /:id endpoint)
    - sonner toast for success feedback on settings saves
key-files:
  created:
    - apps/web/src/app/(admin)/accounts/page.tsx
    - apps/web/src/app/(admin)/accounts/new/page.tsx
    - apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx
    - apps/web/src/app/(admin)/settings/page.tsx
  modified:
    - apps/web/src/app/(admin)/layout.tsx
    - apps/web/src/app/(admin)/test-configs/new/page.tsx
    - apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx
key-decisions:
  - Edit account pre-fills via GET /admin/accounts list (no dedicated GET /:id endpoint); acceptable for small team
  - user.name || user.email fallback in sidebar — existing owner seed has empty name
  - Settings page uses two separate forms (name section + password section) with HR divider
  - Candidate column added as first data column in links table
requirements-completed:
  - ACCESS-05
  - ACCESS-06
  - ACCESS-07
  - ACCESS-08
  - TESTS-06
  - TESTS-07
duration: 20 min
completed: "2026-05-07"
---

# Phase 7 Plan 07-02: Frontend Summary

All frontend changes for Phase 7: sidebar updates, accounts management pages, settings page, test config UX fixes. All requirements covered, TypeScript check passes.

**Duration:** 20 min | **Tasks:** 7 | **Files:** 7 (4 created, 3 modified)

## What Was Built

- **layout.tsx** — Three changes: (1) "Accounts" nav item visible only when `user.role === 'owner'`, with active state matching `/accounts` path; (2) bottom-left user identity block wrapped in `<Link href="/settings">` — clickable to settings page; (3) display `user.name || user.email` with conditional secondary email line
- **accounts/page.tsx** — DataTable with Name, Email, Role (colored badges: owner=blue, reviewer=gray, member=green), Created, Actions (Edit → `/accounts/:id/edit`, Delete with 409 guard and confirm dialog)
- **accounts/new/page.tsx** — Create form with Name, Email, Role select, Password; client validation including min-8 password; redirects to `/accounts` on success
- **accounts/[id]/edit/page.tsx** — Edit form pre-filled by fetching list and finding by id; Email is read-only; Name and Role editable; redirects to `/accounts` on success
- **settings/page.tsx** — Two-section page: "Display Name" (name input + read-only email + current password confirm, calls `PUT /auth/me` with name) and "Change Password" (current + new + confirm, client mismatch check, calls `PUT /auth/me` with new_password); toast success feedback; HR divider
- **test-configs/new/page.tsx** — `pass_threshold_pct` initial state changed from 70 to 80
- **test-configs/[id]/links/page.tsx** — (1) `isMember` constant added; (2) `candidateName` state; (3) `handleGenerate` sends `candidate_name`, clears field on success; (4) generate section visibility changed to `(isOwner || isMember)` with Candidate Name input; (5) Candidate column added as first data column

## Deviations from Plan

None - plan executed exactly as written.

## Verification

All spot-checks from plan-level verification passed. TypeScript `npx tsc --noEmit` exits with code 0 from `apps/web/`.

## Self-Check: PASSED
