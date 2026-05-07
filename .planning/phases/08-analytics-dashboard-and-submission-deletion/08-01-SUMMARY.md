---
phase: "08"
plan: "08-01"
subsystem: api
tags: [dashboard, analytics, submissions, delete]
requires: []
provides:
  - GET /dashboard/stats
  - GET /dashboard/competency
  - DELETE /admin/submissions/:linkId
affects:
  - apps/api/src/index.ts
tech-stack:
  added: []
  patterns: [lateral-json-join, transactional-delete, audit-log]
key-files:
  created:
    - apps/api/src/routes/dashboard.ts
  modified:
    - apps/api/src/routes/submissions.ts
    - apps/api/src/index.ts
key-decisions:
  - Dashboard routes registered at /dashboard (no /admin prefix) for all authenticated roles
  - jsonb_each lateral join for competency scores — separate branches for filtered/unfiltered
  - Audit log written before transaction (not inside) so it persists if transaction rolls back
requirements-completed:
  - DASH-06
  - DASH-07
  - DASH-08
  - DASH-09
  - SUB-01
duration: "8 min"
completed: "2026-05-07"
---

# Phase 8 Plan 01: Backend Dashboard Endpoints & Submission Delete Summary

Fastify dashboard route module with cross-config aggregate KPIs, recent submissions list, skill area competency breakdown, and owner-only hard-delete for submissions with transactional cleanup and pre-transaction audit logging.

**Duration:** ~8 min | **Tasks:** 4 | **Files:** 3 (1 created, 2 modified)

## What Was Built

- **`GET /dashboard/stats`** — cross-config stats: total candidates, pass rate %, average score, weakest skill area, 6-bucket score distribution (0-49 through 90-100), recent 10 submissions with candidate name/score/test config
- **`GET /dashboard/competency`** — lateral `jsonb_each` join over `skill_area_scores`, returns `{ area, avgScore }[]` ordered by score desc; optional `testConfigId` query param for per-config filtering
- **`DELETE /admin/submissions/:linkId`** — owner-only; 404 if not found; audit log entry (`submission.delete`) before transaction; `db.begin()` deletes `candidate_answers` then `submission_results`; `test_links` row preserved; returns 204
- **`apps/api/src/index.ts`** — dashboardRoutes registered at prefix `/dashboard`

## Deviations from Plan

**[Rule 1 - Minor deviation] jsonb_each appears 3 times, not 2**
Found during: Task 08-01-02 acceptance criteria check
Issue: Competency handler has two query branches (with/without `testConfigId`), each using `jsonb_each`, yielding 3 total occurrences vs. the expected 2 in the criteria
Fix: Implementation is correct per the plan's action spec — the criteria comment "(one for stats weakest, one for competency)" understates the split branch
Files modified: None — criteria was incorrect, not the code
Impact: Cosmetic; all functional requirements satisfied

**Total deviations:** 1 (documentation mismatch in acceptance criteria, no code impact). **Impact:** None.

## Self-Check: PASSED

- [x] `apps/api/src/routes/dashboard.ts` created, exports `dashboardRoutes`
- [x] `GET /` and `GET /competency` both use `preHandler: [authMiddleware]`
- [x] Stats SQL uses 6-bucket FILTER pattern, no per-config WHERE
- [x] Competency SQL uses `jsonb_each`, orders DESC, handles optional filter
- [x] `DELETE /:linkId` guarded by `requireRole('owner')`, 404 on missing, audit log before transaction, transaction deletes child rows first, 204 on success
- [x] `npx tsc --noEmit` exits 0 in `apps/api/`
- [x] dashboardRoutes registered in index.ts at `/dashboard`
