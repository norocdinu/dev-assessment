# Project State — Dev Assessment Platform

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

**Current focus:** Phase 1 — Foundation

## Current Position

- **Status**: Initialized — ready for Phase 1 planning
- **Next action**: `/gsd-plan-phase 1`
- **Milestone**: v1.0 (4 phases)

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Foundation | ⬜ Not started | DB, admin auth, question bank CMS, test config |
| Phase 2 — Test Experience | ⬜ Not started | Candidate portal, timer, submission |
| Phase 3 — Grading & Results | ⬜ Not started | Auto-grading, results views |
| Phase 4 — Admin Dashboard | ⬜ Not started | Submissions list, comparison, export |

## Key Decisions

- MCQ-only for v1
- No candidate auth — zero-friction link-based access
- Seeded RNG — same link = same questions always
- Hybrid timer — client UI + server hard cutoff
- PostgreSQL + Redis stack
- React/Next.js frontend, Node.js backend

## Session Notes

- Project initialized 2026-04-21
- Research completed: stack, features, architecture, pitfalls
- 24 v1 requirements defined across 5 categories
- 4 coarse phases mapped; all requirements covered
