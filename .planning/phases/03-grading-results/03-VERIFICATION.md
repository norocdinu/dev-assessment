---
phase: 3
status: passed
verified_at: 2026-04-28
requirements_checked:
  - GRADE-01
  - GRADE-02
  - GRADE-03
  - GRADE-04
---

# Phase 3 Verification: Grading & Results

## Summary

All four requirements are fully satisfied. Every must-have check passed against the actual source files. The grading engine is atomic (inside `db.begin()`), results are persisted in `submission_results`, the candidate results page and admin detail view are complete, and the test-links page has been updated with role-appropriate "View result" navigation.

## Must-Haves Check

| Requirement | Check | Status |
|-------------|-------|--------|
| GRADE-01 | submission_results table + migration + shared types | ✓ |
| GRADE-02 | Grading engine in submit transaction | ✓ |
| GRADE-03 | Results API endpoints (candidate + admin) | ✓ |
| GRADE-04 | Frontend pages (results + admin detail + links update) | ✓ |

## Detailed Findings

### GRADE-01 — DB + Types Foundation

**schema.sql** (`apps/api/src/db/schema.sql`, lines 104–115):
- `-- Phase 3: Submission Results` comment present before `-- Seed initial data`
- `CREATE TABLE IF NOT EXISTS submission_results` with all required columns
- `UNIQUE (link_id)` constraint confirmed
- `score_pct INT NOT NULL CHECK (score_pct BETWEEN 0 AND 100)` confirmed
- `skill_area_scores JSONB NOT NULL DEFAULT '{}'` confirmed
- `time_taken_seconds INT NOT NULL CHECK (time_taken_seconds >= 0)` confirmed
- `idx_submission_results_link` index confirmed

**migrate.ts** (`apps/api/src/db/migrate.ts`, lines 51–72):
- Phase 3 block present after Phase 2 block, before `// Always apply seed data`
- `table_name = 'submission_results'` existence check confirmed
- `Running Phase 3 migration...` log confirmed
- `schema.indexOf('-- Phase 3: Submission Results')` confirmed
- `Phase 3 schema already present — skipping DDL` guard confirmed
- `Phase 3 migration complete` log confirmed

**shared types** (`packages/shared/src/types/index.ts`, lines 85–128):
- `// Phase 3: Grading & Results` comment present
- `export interface SkillAreaScore` with `correct`, `total`, `pct` fields confirmed
- `export interface AnswerSheetRow` with `candidate_answer: 'a' | 'b' | 'c' | 'd' | null` confirmed
- `export interface AdminAnswerSheetRow extends AnswerSheetRow` with `family_id`, `version` confirmed
- `export interface SubmissionResult` with `test_config_id`, `skill_area_scores: Record<string, SkillAreaScore>`, `answer_sheet: AnswerSheetRow[]` confirmed
- `export interface AdminSubmissionResult extends SubmissionResult` with `answer_sheet: AdminAnswerSheetRow[]` confirmed

### GRADE-02 — Grading Engine

**candidate.ts** (`apps/api/src/routes/candidate.ts`):
- `POST /submit/:token` initial SELECT includes `tc.pass_threshold_pct` (line 87)
- `let scorePct = 0` and `let pass = false` declared before `db.begin()` (lines 137–138)
- Grading JOIN `JOIN questions q ON q.id = ca.question_id` inside `db.begin()` (line 172)
- `pass = scorePct >= link.pass_threshold_pct` computed inside transaction (line 179)
- Skill area breakdown computed inside transaction (lines 182–194)
- `INSERT INTO submission_results (link_id, score_pct, pass, skill_area_scores, time_taken_seconds)` inside `db.begin()` (lines 200–203)
- `sql.json(skillAreaScores)` used for JSONB serialization (line 202)
- Final reply: `{ ok: true, submitted_at: submittedAt, score_pct: scorePct, pass }` (line 210)
- If `!updated` (concurrent submission race), `alreadySubmitted = true; return;` exits transaction cleanly without inserting

### GRADE-03 — Results API

**candidate.ts** — `GET /candidate/results/:token` (lines 213–280):
- Route present inside `candidateRoutes` (no auth guard)
- Returns `link_id`, `score_pct`, `pass`, `pass_threshold_pct`, `skill_area_scores`, `answer_sheet` confirmed
- Also returns `test_config_id`, `time_taken_seconds`, `submitted_at`, `graded_at`, `test_name`, `technology_name`, `difficulty`
- 404 on unknown token: `'Link not found'`
- 404 on non-submitted state: `'Results not available'`
- 404 if result row absent: `'Results not yet available'`
- Answer sheet ordered by `q.skill_area, q.id`

**submissions.ts** (`apps/api/src/routes/submissions.ts`):
- `export async function submissionRoutes` confirmed
- `GET /:linkId` with `preHandler: [authMiddleware]` confirmed
- `import { authMiddleware } from '../middleware/auth.js'` confirmed
- `q.family_id` and `q.version` in answer sheet SELECT confirmed (lines 35–36)
- `WHERE tl.id = ${linkId}` confirmed
- `'Submission not found'` 404 confirmed

**index.ts** (`apps/api/src/index.ts`):
- `import { submissionRoutes } from './routes/submissions.js'` confirmed (line 12)
- `await app.register(submissionRoutes, { prefix: '/admin/submissions' })` confirmed (line 33)
- Registration is at top-level `app` scope, before the `candidateApp` sub-app block (line 35), so it inherits global auth cookie config

### GRADE-04 — Frontend

**Candidate results page** (`apps/web/src/app/(candidate)/test/[token]/results/page.tsx`):
- File exists, `'use client';` on line 1
- `export default function ResultsPage()` confirmed
- `import type { SubmissionResult } from '@dev-assessment/shared'` confirmed
- Native `fetch(\`${API_URL}/candidate/results/${token}\`)` — no axios, no auth (line 28)
- Pass/fail badge: `'bg-green-100 text-green-700'` / `'bg-red-100 text-red-700'` confirmed
- `formatTime` with `Math.floor(seconds / 60)` and `padStart(2, '0')` confirmed
- Skill breakdown via `Object.entries(result.skill_area_scores)` confirmed
- Answer sheet table via `result.answer_sheet.map` confirmed
- Loading spinner with `w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin` confirmed

**Test page redirect fixes** (`apps/web/src/app/(candidate)/test/[token]/page.tsx`):
- 0 occurrences of `/expired?state=submitted` — confirmed (grep returned 0 matches)
- Exactly 3 occurrences of `` `/test/${token}/results` ``:
  - Line 63: `doSubmit` — successful submit (200)
  - Line 69: `doSubmit` — already submitted race (409)
  - Line 121: `loadSession` — 409 on session load
- Preserved: `/expired?state=expired` (line 117), `/expired?state=timelimit` (line 76), `/expired?state=notfound` (lines 125, 161)

**Admin submission detail page** (`apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`):
- File exists, `'use client';` on line 1
- `export default function SubmissionDetailPage()` confirmed
- `import { api } from '@/lib/api'` with `withCredentials` inherited from axios instance
- `import type { AdminSubmissionResult, AdminAnswerSheetRow } from '@dev-assessment/shared'` confirmed
- `api.get(\`/admin/submissions/${linkId}\`)` confirmed
- `accessorKey: 'family_id'` column confirmed (line 82)
- `accessorKey: 'version'` column confirmed (line 90)
- `← Back to Test Links` button navigating to `/admin/test-configs/${result.test_config_id}/links` confirmed
- `DataTable` with `answerSheetColumns` confirmed

**Links page updates** (`apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`):
- `useRouter` imported from `'next/navigation'` (line 4)
- `const router = useRouter();` declared (line 12)
- `View result` button text confirmed (line 123)
- `router.push(\`/admin/submissions/${row.original.id}\`)` confirmed (line 119)
- `row.original.state === 'submitted'` condition for View result (line 117)
- `isOwner &&` guard on Revoke button (line 125) — not gating View result
- Actions column is unconditional (not wrapped in `...(isOwner ? [...]` spread)

## Human Verification Items

The following should be confirmed with a live browser session before considering Phase 3 fully production-ready:

1. **End-to-end grading flow**: Submit a test as a candidate, verify the browser redirects to `/test/[token]/results`, and confirm the score, pass/fail badge, time taken, skill breakdown, and answer sheet all render correctly with real data.

2. **Admin detail view**: Log in as an admin (any role), navigate to a submitted link via the "View result" button, and confirm the answer sheet shows `Family ID` and `Ver` columns with real values.

3. **Reviewer role access**: Log in as a reviewer (non-owner) and confirm "View result" is visible for submitted links (it should be — the button is not owner-gated).

4. **Already-submitted race condition**: Verify that navigating directly to `/test/[token]/results` after submission (or if the 409 path fires) shows results rather than an error, since `submission_results` will already be populated.

5. **Migration on existing DB**: Restart the API against a Phase 2 DB (no `submission_results` table) and confirm the Phase 3 migration block fires exactly once and the table is created.
