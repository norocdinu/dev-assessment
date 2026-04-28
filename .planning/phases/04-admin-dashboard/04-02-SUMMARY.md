---
plan: "04-02-PLAN"
phase: 4
status: complete
completed: "2026-04-28"
key-files:
  created: []
  modified:
    - apps/api/src/routes/submissions.ts
---

# Plan 04-02 Summary: CSV Export API + Candidate Comparison API

## What Was Built

Added two exact-path routes to `submissionRoutes`, both registered before `/:linkId`:

- **`GET /admin/submissions/export`** — requires `testConfigId` UUID query param. Generates CSV with headers: Test Name, Technology, Difficulty, Score %, Pass/Fail, Time (seconds), Submitted At. All values double-quoted with internal quotes escaped. Returns with `Content-Type: text/csv` and `Content-Disposition: attachment` header.
- **`GET /admin/submissions/compare`** — accepts `?ids=uuid1,uuid2[,uuid3,uuid4]`. Validates all IDs as UUIDs, requires ≥2 IDs. Fetches each submission detail in parallel via `Promise.all`. Returns 404 if any ID not found.

Route verification task (T3) confirmed ordering: `/export`, `/compare`, `/`, `/:linkId`.

## Self-Check: PASSED

- `apps/api/src/routes/submissions.ts` contains `app.get('/export')` before `app.get('/:linkId')`
- `apps/api/src/routes/submissions.ts` contains `app.get('/compare')` before `app.get('/:linkId')`
- GET /export without testConfigId returns 400
- GET /compare with 1 ID returns 400
