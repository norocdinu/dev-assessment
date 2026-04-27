---
plan: 02-02
phase: 2
subsystem: api/test-links
tags: [api, fastify, test-links, crud, rbac]
requires: [02-01]
provides: [POST /admin/test-links, GET /admin/test-links/:testConfigId, DELETE /admin/test-links/:id]
affects: [apps/api/src/routes/test-links.ts, apps/api/src/index.ts]
tech-stack:
  added: []
  patterns: [fastify-route-plugin, zod-validation, requireRole-prehandler]
key-files:
  created:
    - apps/api/src/routes/test-links.ts
  modified:
    - apps/api/src/index.ts
key-decisions:
  - expires_at always NULL on creation (D-05 from Phase 2 context)
  - Token uses crypto.randomBytes(32) = 256-bit entropy (brute force infeasible)
  - Revoke is soft-delete: sets state=expired, never hard-deletes (preserves FK integrity)
  - DELETE blocks on submitted/expired states only
requirements-completed:
  - ASSESS-06
  - TESTS-02
  - TESTS-03
  - TESTS-04
  - TESTS-05
duration: 5 min
completed: 2026-04-27
---

# Phase 2 Plan 02: Admin API Routes — Test Links CRUD Summary

Three Fastify admin routes for test link management registered under `/admin/test-links`: POST generates a 256-bit token link with derived seed (owner only); GET lists all links for a config; DELETE revokes by setting state=expired with owner RBAC enforcement.

**Duration:** 5 min | **Tasks:** 2 | **Files modified/created:** 2

## What Was Built

- `apps/api/src/routes/test-links.ts`: testLinkRoutes plugin with POST, GET, DELETE
- POST: validates owner role, verifies test config exists, generates 64-char hex token, derives seed via `deriveSeed(test_config_id, token)`, inserts with expires_at=NULL, returns `{id, token, state, created_at, url}`
- GET: auth-only (any role), returns array of link objects with state/timestamps
- DELETE: owner-only, atomic UPDATE with `state NOT IN ('submitted', 'expired')` guard, returns 404 on terminal states
- `apps/api/src/index.ts`: registered at prefix `/admin/test-links`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next

Ready for Plan 02-04 (Candidate API Routes — Session + Submit) — same wave, sequential due to shared index.ts.

## Self-Check: PASSED

- ✓ apps/api/src/routes/test-links.ts exists
- ✓ exports testLinkRoutes
- ✓ contains crypto.randomBytes(32).toString('hex')
- ✓ contains deriveSeed(test_config_id, token)
- ✓ requireRole('owner') on POST preHandler
- ✓ requireRole('owner') on DELETE preHandler
- ✓ expires_at: NULL in INSERT VALUES
- ✓ state NOT IN ('submitted', 'expired') in DELETE UPDATE
- ✓ index.ts imports and registers testLinkRoutes at /admin/test-links
