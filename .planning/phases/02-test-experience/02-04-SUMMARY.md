---
plan: 02-04
phase: 2
subsystem: api/candidate
tags: [api, fastify, candidate, session, submit, security]
requires: [02-01]
provides: [GET /candidate/session/:token, POST /candidate/submit/:token]
affects: [apps/api/src/routes/candidate.ts, apps/api/src/index.ts]
tech-stack:
  added: []
  patterns: [fastify-scoped-cors, postgres-transaction, seeded-sample]
key-files:
  created:
    - apps/api/src/routes/candidate.ts
  modified:
    - apps/api/src/index.ts
key-decisions:
  - correct_option and explanation excluded from session response (security: never send to browser)
  - ORDER BY id before seededSample guarantees deterministic question selection (ASSESS-06)
  - Server-side deadline NOW() > started_at + INTERVAL '30 minutes' is authoritative
  - Double-submit race protection via atomic UPDATE WHERE state='active'
  - Scoped candidate CORS without Access-Control-Allow-Credentials (public routes)
requirements-completed:
  - ASSESS-01
  - ASSESS-02
  - ASSESS-05
  - ASSESS-06
  - TESTS-02
  - TESTS-03
  - TESTS-04
  - TESTS-05
duration: 5 min
completed: 2026-04-27
---

# Phase 2 Plan 04: Candidate API Routes — Session + Submit Summary

Two public candidate routes registered under scoped CORS `/candidate` prefix: session GET validates token, transitions created→active, returns seeded questions stripped of correct answers; submit POST enforces server-side 30-minute deadline, validates question IDs against canonical seeded set, and atomically transitions state to submitted.

**Duration:** 5 min | **Tasks:** 2 | **Files modified/created:** 2

## What Was Built

- `apps/api/src/routes/candidate.ts`: candidateRoutes plugin with GET /session/:token and POST /submit/:token
- GET /session: link lookup with JOIN on test_configs, expires_at check, submitted/expired guards, deterministic question pool (ORDER BY id → seededSample), state transition created→active with started_at timestamp, returns {started_at, server_now, questions}
- POST /submit: state guards (not active → 410), server-side deadline (NOW() > started_at + 30min → 410), question ID validation against canonical seeded set (400 on invalid), transactional answer upsert with ON CONFLICT, atomic state=submitted transition, 409 on double-submit race
- `apps/api/src/index.ts`: scoped candidateApp registration with CORS headers but no credentials

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next

Wave 2 complete. Ready for Wave 3: Plan 02-03 (Admin Frontend) and Plan 02-05 (Candidate Frontend).

## Self-Check: PASSED

- ✓ candidateRoutes exported from candidate.ts
- ✓ ORDER BY id in both question pool SELECT queries (3 occurrences total)
- ✓ session response contains id, text, option_a, option_b, option_c, option_d, skill_area only
- ✓ server_now: serverNow in response
- ✓ NOW() > started_at + INTERVAL '30 minutes' deadline check
- ✓ ON CONFLICT (link_id, question_id) DO UPDATE SET answer = EXCLUDED.answer
- ✓ UPDATE test_links SET state = 'submitted' WHERE ... AND state = 'active'
- ✓ Returns 410 when past_deadline
- ✓ Returns 409 when state === 'submitted'
- ✓ Returns 400 for invalid question IDs
- ✓ index.ts imports and registers candidateRoutes at /candidate
- ✓ No Access-Control-Allow-Credentials in candidate scope
