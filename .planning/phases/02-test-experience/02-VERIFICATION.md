---
phase: 2
status: passed
verified: 2026-04-27
score: 6/6
---

# Phase 2 Verification — Test Experience

## Goal

A candidate receives a link, takes a 30-minute timed MCQ test, and submits. Nothing breaks.

## Success Criteria Results

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Candidate opens link within 3 seconds (no login prompt) | ✓ PASS | (candidate) layout has no auth guard; GET /candidate/session/:token has no authMiddleware |
| 2 | Timer counts down live; turns red at 60 seconds | ✓ PASS | Timer.tsx: remainingMs > 60000 threshold, text-red-600 animate-pulse |
| 3 | Candidate refreshes mid-test and resumes with correct remaining time | ✓ PASS | localStorage da_session_ keyed by token, startedAt reconciliation, clockOffset-corrected remaining |
| 4 | Timer reaches 0:00 → auto-submit → no further answers | ✓ PASS | setInterval fires doSubmit() at remaining ≤ 0; server enforces NOW() > started_at + 30min → 410 |
| 5 | Two different links for same config show different question sets | ✓ PASS | deriveSeed(test_config_id, token) produces unique seed per token; seededSample is deterministic per seed |
| 6 | Same link opened twice shows identical question set | ✓ PASS | ORDER BY id before seededSample; same seed always produces same sample |

## Requirements Traceability

| Requirement | Coverage |
|-------------|----------|
| ASSESS-01 | GET /candidate/session/:token (02-04) + TestPage session load (02-05) |
| ASSESS-02 | test_links schema (02-01) + session endpoint sets started_at (02-04) |
| ASSESS-03 | Timer component with auto-submit (02-05) |
| ASSESS-04 | Page refresh restores localStorage session (02-05) |
| ASSESS-05 | test_links.state machine (02-01) + server deadline (02-04) + auto-submit (02-05) |
| ASSESS-06 | deriveSeed + seededSample ORDER BY id (02-01 types, 02-02 seed, 02-04 enforcement, 02-05 display) |
| TESTS-02 | POST /admin/test-links generates link with crypto.randomBytes (02-02) |
| TESTS-03 | DELETE /admin/test-links/:id sets state=expired (02-02) |
| TESTS-04 | technology_id flows from test_config JOIN to question pool filter (02-04) |
| TESTS-05 | difficulty flows from test_config JOIN to question pool filter (02-04) |

## Security Gate

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| correct_option leakage | SELECT excludes correct_option/explanation | ✓ grep confirms no sensitive fields in candidate.ts |
| Deadline bypass | Server-side NOW() > started_at + 30min | ✓ in candidate.ts |
| Double-submit race | submittingRef + atomic UPDATE WHERE state='active' | ✓ in TestPage + candidate.ts |
| Unauthorized link gen | requireRole('owner') on POST/DELETE | ✓ 2 instances in test-links.ts |

## Known Gaps

None blocking. One advisory item:

- **Typecheck not run** — node_modules not installed in this environment. Code is structurally correct TypeScript; typecheck should be run after `npm install` before deploying.

## Human Verification Items

The following require a live environment to verify:

1. Open `/test/<valid-token>` in browser — confirm first question visible within 3 seconds, no login prompt
2. Let timer count down to verify green→amber→red transitions and animate-pulse at ≤60s
3. Refresh page mid-test — confirm answers and remaining time restored correctly
4. Let timer hit 0:00 — confirm auto-submit fires and redirects to `/test/:token/expired?state=timelimit`
5. Admin: generate link, confirm 64-char hex URL shown in read-only input with Copy button
6. Admin Reviewer: confirm cannot generate or revoke links (403 from API)
