# Project State — Dev Assessment Platform

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

**Current focus:** Phase 1 — Foundation ✓ COMPLETE

## Current Position

- **Status**: Phase 1 complete — ready for Phase 2 planning
- **Next action**: `/gsd-plan-phase 2`
- **Milestone**: v1.0 (4 phases)

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Foundation | ✓ Complete (2026-04-21) | DB, admin auth, question bank CMS, test config |
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

## Phase 1 Outcomes

- Monorepo: apps/web (Next.js 14), apps/api (Fastify), packages/shared
- DB schema: 5 tables with question versioning (family_id + version + is_latest)
- Admin auth: JWT httpOnly cookie, Owner + Reviewer RBAC
- Question bank: CRUD with immutable versioning, soft-delete, audit log
- Test config: create/list/delete with pool size warning
- Frontend: Tailwind, auth guard, question CMS, test config UI
