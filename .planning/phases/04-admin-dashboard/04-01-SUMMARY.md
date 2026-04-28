---
plan: "04-01-PLAN"
phase: 4
status: complete
completed: "2026-04-28"
key-files:
  created:
    - apps/api/src/routes/stats.ts
  modified:
    - apps/api/src/routes/submissions.ts
    - apps/api/src/index.ts
    - packages/shared/src/types/index.ts
---

# Plan 04-01 Summary: Submissions List API + Aggregate Stats API

## What Was Built

Added two new admin-only read endpoints:

- **`GET /admin/submissions`** — filtered submissions list joining `submission_results`, `test_links`, `test_configs`, `technologies`. Optional query params: `testConfigId` (UUID), `dateFrom`, `dateTo`, `difficulty`. Zod-validated, ordered newest-first.
- **`GET /admin/stats/:testConfigId`** — aggregate stats with 6 score buckets (0–49, 50–59, …, 90–100) using PostgreSQL `COUNT(*) FILTER(WHERE ...)`. Returns `total_submissions`, `avg_score_pct`, `pass_rate_pct`, and bucket counts as JavaScript numbers (bigint cast).

Added `SubmissionListRow` and `TestConfigStats` types to `packages/shared/src/types/index.ts`.

Route ordering: `/export` and `/compare` registered before `/:linkId` in submissions.ts.

## Self-Check: PASSED

- `apps/api/src/routes/submissions.ts` contains `app.get('/')` before `app.get('/:linkId')`
- `apps/api/src/routes/stats.ts` exists and exports `statsRoutes`
- `apps/api/src/index.ts` imports and registers `statsRoutes` at `/admin/stats`
- `packages/shared/src/types/index.ts` exports `SubmissionListRow` and `TestConfigStats`
