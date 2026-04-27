# Phase 3: Grading & Results - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Submissions are auto-graded instantly on receipt. Candidates see their score, pass/fail verdict, time taken, skill-area breakdown, and full answer sheet. Admins can view the same detail view plus question version info. Dashboard list of all submissions is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Results Page Routing
- **D-01:** Create a new `/test/:token/results` route — candidate lands here after submitting. URL is clean, bookmark-able, and sharable with the interviewer.
- **D-02:** After submit, the frontend redirects to `/test/:token/results` (not the old expired page).
- **D-03:** When a candidate reopens the test link after already submitting: the session API returns 409 → frontend automatically redirects to `/test/:token/results`. No dead-end error screen.
- **D-04:** The existing `/test/:token/expired?state=submitted` terminal state is no longer used for the happy path; the `?state=submitted` variant can be retired or repurposed as a fallback for edge cases.

### Admin Detail View
- **D-05:** Admin submission detail lives at `/admin/submissions/:linkId` — a standalone route in the `(admin)` route group (auth-guarded, uses the sidebar layout). Both Owner and Reviewer roles can view.
- **D-06:** Phase 3 adds a "View result" action to each submitted link row on `/admin/test-configs/:id/links`. Phase 4 will also link to this same URL from the submissions dashboard.
- **D-07:** The admin detail view shows all candidate-facing fields (score, pass/fail, time taken, skill breakdown, full answer sheet) plus question version info: `family_id`, `version`, and the full question text/options as stored at submission time.

### Claude's Discretion
- Answer sheet row format: full option text (not just letter), question text shown in full, skill area tag shown per row. Both candidate and admin views use this same level of detail.
- Skill area breakdown: show only skill areas that actually appeared in the drawn question set for this test — not all skill areas for the technology. Omit areas with zero drawn questions.
- Grading algorithm: synchronous in the submit route, MCQ exact-match (candidate answer === correct_option). Run inside the existing `db.begin` transaction or immediately after it commits — commit answers first, then grade, then persist results.
- Results DB table: pre-computed `submission_results` table with score (percentage), pass (boolean), skill_area_scores (JSON/JSONB), time_taken_seconds. Written once at grading time. Results page reads from this table, no re-computation on load.
- Pass/fail verdict styling: "Pass" in green, "Fail" in red — matching the existing green/red timer urgency pattern from Phase 2.
- Results page layout: summary card at top (score %, pass/fail badge, time taken), skill breakdown table below, full answer sheet at bottom. Clean, no sidebar — candidate-facing layout (like the existing test page).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Submission Foundation
- `.planning/phases/02-test-experience/02-RESEARCH.md` — DB schema for `test_links` and `candidate_answers`, submit endpoint logic, seeded question selection, state machine (`created → active → submitted`)
- `.planning/phases/02-test-experience/02-CONTEXT.md` — Phase 2 decisions: link lifecycle, error recovery patterns, candidate UX conventions

### Existing Code
- `apps/api/src/routes/candidate.ts` — The submit endpoint (`POST /candidate/submit/:token`); grading must be added here or wired in immediately after the `db.begin` block
- `apps/web/src/app/(candidate)/test/[token]/page.tsx` — After-submit redirect logic (currently goes to expired page — Phase 3 changes this to `/test/:token/results`)
- `apps/web/src/app/(candidate)/test/[token]/expired/page.tsx` — Terminal page; `?state=submitted` variant will be retired for the happy path
- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — The links management page where Phase 3 adds a "View result" button per submitted link row

### Project Requirements
- `.planning/REQUIREMENTS.md` — Phase 3 requirement IDs: GRADE-01, GRADE-02, GRADE-03, GRADE-04
- `.planning/ROADMAP.md` — Phase 3 deliverables and success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/ui/DataTable.tsx` — Use for the admin submission detail's answer sheet table (same TanStack Table pattern as questions and test-configs pages)
- `apps/web/src/lib/api.ts` — Axios instance for admin API calls; admin submissions detail page is an admin route, use this
- `apps/web/src/app/(admin)/layout.tsx` — Admin layout (sidebar + main, auth guard); wrap `/admin/submissions/:linkId` in this

### Established Patterns
- All admin pages: `'use client'` with `useState`/`useEffect` for data fetching, inline error handling, no toast library
- Candidate pages: public routes, native `fetch`, no `withCredentials`
- Loading state: spinner div (`w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`)
- CTA buttons: `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700`
- `questions.correct_option` is the source of truth for grading — already in the schema, Phase 2 candidate routes fetch `skill_area` from questions
- `candidate_answers.question_id` is a FK to the specific question version UUID — grading JOINs against this directly (no version ambiguity)

### Integration Points
- `apps/api/src/routes/candidate.ts` `POST /submit/:token` — Grading and result persistence wires in here
- `apps/api/src/db/schema.sql` / `migrate.ts` — Must add `submission_results` table (Phase 3 migration gate)
- `apps/web/src/app/(candidate)/test/[token]/page.tsx` `doSubmit` handler — Change the post-submit redirect from `/test/${token}/expired?state=submitted` to `/test/${token}/results`
- `packages/shared/src/types/index.ts` — Add `SubmissionResult`, `SkillAreaScore`, `AnswerSheetRow` types

</code_context>

<specifics>
## Specific Ideas

- Hosting/open source publishing was raised during discussion — noted as a deferred idea (out of Phase 3 scope; deployment is a separate concern after v1 is feature-complete).

</specifics>

<deferred>
## Deferred Ideas

- **App hosting / open-source publishing** — raised during discussion. Deploying the platform publicly or packaging it as open source is a separate milestone-level concern. Worth planning after v1 is complete.

</deferred>

---

*Phase: 03-grading-results*
*Context gathered: 2026-04-27*
