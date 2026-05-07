# Dev Assessment Platform

## What This Is

A web-based multi-technology candidate assessment platform for technical hiring. Interviewers send pre-configured links to candidates, who complete a timed 30-minute randomised multiple-choice test. The system auto-grades results and surfaces a per-candidate breakdown and cross-candidate comparison dashboard.

## Core Value

A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

## Current Milestone: v1.2 — Front End Improvements

**Goal:** Redesign the candidate test experience with a modern, mobile-first aesthetic and polish the admin app with dark mode, skeletons, consistent toasts, and actionable reporting tools.

**Target features:**
- Candidate test page redesign — fresh modern design, mobile-ready, dark mode; first impression of the company
- Dark mode toggle — admin app full dark/light theme switch
- Typography & spacing polish — consistent type scale and padding across admin
- Colour & brand consistency — accent colours, button styles, badge palette
- Loading skeletons — replace spinners on tables and cards
- Empty states — friendly messages when tables/charts have no data
- Toast notifications — consistent sonner toasts replacing all alert() calls
- PDF / print report — downloadable candidate submission summary
- Candidate UI polish — improved timer, progress indicator, confirmation screen
- Dashboard filters — filter stats and charts by test config or date range
- Admin responsive — admin panel usable on tablets

## Previous: v1.1 Shipped (2026-05-07)

All 7 v1.1 requirements delivered across 3 phases.
CSV fix, analytics dashboard, submission deletion, test config UX, account settings, multi-account RBAC.

## Previous: v1.0 Shipped (2026-05-07)

All 24 v1 requirements delivered across 5 phases in 17 days.
See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full archive.

## Requirements

### Validated

All 24 v1 requirements — see [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

### Active (v1.2)

- [x] Candidate test page has a fresh modern design that is mobile-ready and supports dark mode — Validated in Phase 9 (2026-05-07)
- [x] Candidate test page shows a clear progress indicator and confirmation screen on submit — Validated in Phase 9 (2026-05-07)
- [x] Admin app has a dark/light mode toggle persisted per user — Validated in Phase 10 (2026-05-07)
- [x] Typography, spacing, and colour palette are consistent across all admin pages — Validated in Phase 10 (2026-05-07)
- [ ] Tables and cards show loading skeletons instead of spinners while data loads
- [ ] All pages with no data show friendly empty state messages or illustrations
- [ ] All success/error actions use sonner toast notifications (no alert() or browser dialogs)
- [ ] Owner can download a PDF summary of a candidate's submission results
- [ ] Dashboard stats and charts can be filtered by test config and date range
- [x] Admin panel is usable on tablet-sized screens — Validated in Phase 10 (2026-05-07)

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
*Last updated: 2026-05-07 — Phase 10 complete (Admin Visual Foundation — THEME-01, UI-01, RESP-01 ✓); Phase 11 next (UX Pattern Library)*
