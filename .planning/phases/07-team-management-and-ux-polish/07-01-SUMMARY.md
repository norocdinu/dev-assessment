---
phase: 7
plan: "07-01"
name: "Backend — DB Migration, Auth Updates, Account CRUD, Test-Links RBAC"
subsystem: api
tags: [backend, auth, rbac, migration, accounts]
requires: []
provides:
  - GET /admin/accounts
  - POST /admin/accounts
  - PUT /admin/accounts/:id
  - DELETE /admin/accounts/:id
  - PUT /auth/me
  - member RBAC on POST /admin/test-links
affects:
  - packages/shared/src/types/index.ts
  - apps/api/src/db/migrate.ts
  - apps/api/src/db/schema.sql
  - apps/api/src/routes/auth.ts
  - apps/api/src/routes/accounts.ts
  - apps/api/src/index.ts
  - apps/api/src/routes/test-links.ts
tech-stack:
  added: []
  patterns:
    - Idempotent Phase 7 migration (information_schema check + ALTER TABLE)
    - requireRole() variadic args for multi-role RBAC
key-files:
  created:
    - apps/api/src/routes/accounts.ts
  modified:
    - packages/shared/src/types/index.ts
    - apps/api/src/db/migrate.ts
    - apps/api/src/db/schema.sql
    - apps/api/src/routes/auth.ts
    - apps/api/src/index.ts
    - apps/api/src/routes/test-links.ts
key-decisions:
  - Admin user name stored as TEXT NOT NULL DEFAULT '' — migration idempotent via information_schema check
  - GET /me now queries DB directly for name field (not JWT payload)
  - PUT /me requires current_password validation before any update (bcrypt compare)
  - DELETE /admin/accounts/:id guards last-owner deletion with 409 + clear error message
  - POST /admin/test-links RBAC relaxed to owner+member; DELETE stays owner-only
requirements-completed:
  - ACCESS-05
  - ACCESS-06
  - ACCESS-07
  - ACCESS-08
  - TESTS-06
  - TESTS-07
duration: 25 min
completed: "2026-05-07"
---

# Phase 7 Plan 07-01: Backend Summary

Shared types, DB migration, auth updates, account CRUD, and test-links RBAC — all backend work for Phase 7. Ready for 07-02 (frontend).

**Duration:** 25 min | **Tasks:** 7 | **Files:** 7 (1 created, 6 modified)

## What Was Built

- **AdminUser.name** — added `name: string` field to shared `AdminUser` interface; `AdminAccount` interface added for team management endpoint responses
- **TestLink.candidate_name** — added `candidate_name: string | null` to shared `TestLink` interface
- **Phase 7 DB migration** — idempotent `ALTER TABLE admin_users ADD COLUMN name TEXT NOT NULL DEFAULT ''` with `information_schema.columns` existence check
- **schema.sql updated** — `admin_users` CREATE TABLE now includes `name TEXT NOT NULL DEFAULT ''`
- **GET /auth/me** — now queries DB for `id, email, name, role` instead of returning JWT payload
- **PUT /auth/me** — new endpoint: validates `current_password` (bcrypt), updates `password_hash` and/or `name`; returns `{ ok: true }`
- **accounts.ts** — new file with 4 CRUD routes under `/admin/accounts`:
  - `GET /` — list all accounts ordered by created_at (owner-only)
  - `POST /` — create account with hashed password, duplicate email check → 409 (owner-only)
  - `PUT /:id` — update name and role (owner-only)
  - `DELETE /:id` — delete account with last-owner guard → 409 (owner-only)
- **index.ts** — `accountRoutes` imported and registered at `/admin/accounts`
- **test-links.ts** — `candidate_name` added to POST schema, INSERT, and GET SELECT; POST RBAC changed from `requireRole('owner')` to `requireRole('owner', 'member')`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

All 16 spot-checks from plan-level verification passed. TypeScript `npx tsc --noEmit` exits with code 0 from `apps/api/`.

## Self-Check: PASSED
