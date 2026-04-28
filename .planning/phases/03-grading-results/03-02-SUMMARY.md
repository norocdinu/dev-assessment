---
plan: "03-02"
phase: 3
status: complete
completed_at: "2026-04-28"
---

# Summary: Grading Engine + Submit Route + Results API

## What was built

Enhanced `POST /candidate/submit/:token` to: (1) select `tc.pass_threshold_pct` in the initial link query, (2) run synchronous MCQ grading inside the same `db.begin()` transaction — computes `scorePct`, `pass`, `skillAreaScores`, and `timeTakenSeconds` — and (3) inserts into `submission_results` inside the transaction so rollback is atomic. Added `GET /candidate/results/:token` (public, no auth) to `candidate.ts`. Created `apps/api/src/routes/submissions.ts` with `GET /admin/submissions/:linkId` (auth-guarded). Registered `submissionRoutes` at `/admin/submissions` in `index.ts`.

## key-files

### created
- apps/api/src/routes/submissions.ts

### modified
- apps/api/src/routes/candidate.ts
- apps/api/src/index.ts

## Self-Check: PASSED

All acceptance criteria met:
- Grading runs synchronously inside `db.begin()` — rollback-safe
- `pass_threshold_pct` fetched in the link SELECT
- `GET /candidate/results/:token` public, returns full result + answer sheet
- `GET /admin/submissions/:linkId` auth-guarded, includes `family_id` and `version` per answer row
- `submissionRoutes` registered at `/admin/submissions` prefix outside `candidateApp` sub-app
