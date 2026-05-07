# Dev Assessment Platform

## What This Is

A web-based multi-technology candidate assessment platform for technical hiring. Interviewers send pre-configured links to candidates, who complete a timed 30-minute randomised multiple-choice test. The system auto-grades results and surfaces a per-candidate breakdown and cross-candidate comparison dashboard.

## Core Value

A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

## Current Milestone: v1.1 — First Iteration

**Goal:** Polish the platform for real team use — fix rough edges, add a proper analytics dashboard, and expand account management.

**Target features:**
- CSV import round-trip fix — exported CSV imports cleanly without errors
- Submission deletion — owners can delete test submissions
- Test config UX — rename link "Name" to "Candidate Name", default pass threshold 80%
- Comprehensive dashboard — recent candidates list, overall score chart, competency breakdown charts, KPIs
- Account settings page — clickable admin info (bottom-left) → change password
- Multi-account management — add/manage accounts; new Member role (generate links + view results; cannot manage questions or delete submissions)

## Previous: v1.0 Shipped (2026-05-07)

All 24 v1 requirements delivered across 5 phases in 17 days.
See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full archive.

## Requirements

### Validated

All 24 v1 requirements — see [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

### Active (v1.1)

- [x] CSV import accepts files exported from the system without errors — Validated in Phase 6
- [ ] Owner can delete a test submission (removes from dashboard and reports)
- [x] Test config link creation uses "Candidate Name" label with 80% pass default — Validated in Phase 7
- [ ] Dashboard shows recent candidates list, score distribution chart, competency breakdown, and KPI summary
- [x] Admin can open an account settings page and change their password — Validated in Phase 7
- [x] Owner can create and manage admin accounts with Owner, Member, or Reviewer roles — Validated in Phase 7
- [x] Member role can generate test links and view results but cannot manage questions or delete submissions — Validated in Phase 7

### Out of Scope

- Candidate login/accounts — links are self-contained; validated as correct ✓
- Video proctoring — test is administered live with interviewer present ✓
- Open-ended / coding questions — MCQ auto-grading sufficient for v1 ✓
- Mobile native app — responsive web covers the use case ✓
- Real-time collaboration on question editing — CRDT complexity for negligible gain ✓

## Context

- Built by a Power BI developer who runs technical interviews
- Replaced a manual, subjective interview process
- Equality is a core concern: all candidates at the same level/tech face equivalent tests
- Randomisation prevents candidates sharing exact questions between interviews
- The interviewer is present during the test (link sent live, not async)
- Team of admins collaboratively maintain the question bank

## Constraints

- **UX**: Candidate experience must be zero-friction — one link, no accounts, instant start
- **Time**: Tests are fixed at 30 minutes; timer is hard (auto-submit on expiry)
- **Fairness**: Random question selection must be seeded per-link (same candidate always gets same questions if link is reused)
- **Extensibility**: Technology and seniority level are first-class concepts, not hardcoded

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCQ-only for v1 | Fast to build, easy to auto-grade, sufficient for screening | Validated — sufficient for hiring decisions |
| Pre-configured links (no candidate login) | Zero friction, interviewer controls context | Validated — no candidate complained about UX |
| Random questions per tech/level pool | Equality + prevents answer sharing | Validated — seeded RNG ensures fairness |
| Multi-admin question management | Team hiring process, not solo | Validated — Owner + Reviewer RBAC works well |
| Immutable question versioning | Past submissions permanently tied to version used | Validated — audit trail works as expected |
| Server-side pagination | Question bank and submissions scale beyond in-memory sort | Validated in Phase 5 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-05-07 — Phase 7 complete (account CRUD, Member RBAC, settings, test config UX)*
