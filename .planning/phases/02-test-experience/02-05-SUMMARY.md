---
plan: 02-05
phase: 2
subsystem: frontend/candidate
tags: [frontend, next.js, react, candidate, timer, test-portal, accessibility]
requires: [02-01, 02-04]
provides: [(candidate) route group, Timer, QuestionCard, QuestionNav, SubmitModal, /test/[token] page, /test/[token]/expired page]
affects:
  - apps/web/src/app/(candidate)/layout.tsx
  - apps/web/src/app/(candidate)/test/[token]/page.tsx
  - apps/web/src/app/(candidate)/test/[token]/expired/page.tsx
  - apps/web/src/components/candidate/Timer.tsx
  - apps/web/src/components/candidate/QuestionCard.tsx
  - apps/web/src/components/candidate/QuestionNav.tsx
  - apps/web/src/components/candidate/SubmitModal.tsx
tech-stack:
  added: []
  patterns: [use-client, useRef-race-guard, localStorage-recovery, clock-skew-correction, suspense-boundary]
key-files:
  created:
    - apps/web/src/app/(candidate)/layout.tsx
    - apps/web/src/app/(candidate)/test/[token]/page.tsx
    - apps/web/src/app/(candidate)/test/[token]/expired/page.tsx
    - apps/web/src/components/candidate/Timer.tsx
    - apps/web/src/components/candidate/QuestionCard.tsx
    - apps/web/src/components/candidate/QuestionNav.tsx
    - apps/web/src/components/candidate/SubmitModal.tsx
  modified: []
key-decisions:
  - submittingRef = useRef(false) prevents double-submit race (client-side guard + server atomic state transition)
  - clockOffset = serverNow - Date.now() corrects for honest client clock drift (server remains authoritative)
  - localStorage key: da_session_${token} — token-scoped prevents stale session bleed
  - Native fetch (not axios) for candidate routes — no withCredentials on public endpoints
  - D-09: 409 on submit treated as success (redirect to submitted state)
  - D-08: 410 on submit redirects to timelimit state
  - Suspense boundary required for useSearchParams in Next.js 14 App Router
requirements-completed:
  - ASSESS-01
  - ASSESS-02
  - ASSESS-03
  - ASSESS-04
  - ASSESS-05
  - ASSESS-06
  - TESTS-04
  - TESTS-05
duration: 10 min
completed: 2026-04-27
---

# Phase 2 Plan 05: Candidate Frontend — Test Portal Summary

Complete zero-auth candidate test portal: (candidate) route group with pass-through layout, four reusable components (Timer with green/amber/red thresholds, QuestionCard with accessible sr-only radios, QuestionNav with 3-state squares, SubmitModal with exact UI-SPEC copy), main test page with localStorage recovery + clock-skew-corrected timer + submittingRef race guard + auto-submit, and terminal expired/submitted page with 4 states.

**Duration:** 10 min | **Tasks:** 7 | **Files created:** 7

## What Was Built

- **CandidateLayout**: minimal pass-through, no auth guard, no cookies, isolated from admin
- **Timer**: formatTime helper, 300s/60s color thresholds, animate-pulse at critical, aria-live="polite", pill format
- **QuestionCard**: sr-only radio inputs, A/B/C/D label spans, blue-50 selected state, option_${opt} key mapping, no correct_option reference
- **QuestionNav**: flex-wrap grid of w-8 h-8 buttons, ring-2 current / bg-blue-600 answered / bg-gray-200 unanswered, aria-pressed
- **SubmitModal**: focus-trap with confirmRef autoFocus, "Submit with unanswered questions?" heading, exact keep going / submit anyway copy, role="dialog" aria-modal
- **TestPage**: session load with 410/409/other error routing, offset = serverNow - Date.now() clock correction, localStorage da_session_ recovery, setInterval timer with auto-submit, submittingRef race guard, D-07 inline error with Retry, D-08/D-09 routing
- **ExpiredPage**: STATE_CONTENT map for 4 states, Suspense wrapper for useSearchParams, gray-50 background with centered white card

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next

Wave 3 complete. All 5 plans complete. Ready for phase verification.

## Self-Check: PASSED

- ✓ (candidate)/layout.tsx exists with no auth guard, no cookies check
- ✓ Timer: thresholds 300000/60000, animate-pulse at critical, aria-live, inline-flex pill classes
- ✓ QuestionCard: bg-white rounded-lg border border-gray-200 shadow-sm p-6, sr-only radio, option label classes, no correct_option
- ✓ QuestionNav: flex flex-wrap gap-1.5, w-8 h-8, ring-2/bg-blue-600/bg-gray-200 states, aria-pressed
- ✓ SubmitModal: fixed inset-0 bg-black/40, shadow-xl, exact copy, role/aria-modal
- ✓ TestPage: 'use client', submittingRef guard, da_session_ prefix, clockOffset, DURATION_MS formula, ?state routing
- ✓ ExpiredPage: useSearchParams, Suspense, all 4 state headings, outer/card classes
- ✓ No api import — uses native fetch
