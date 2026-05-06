# Dev Assessment Platform

## What This Is

A web-based multi-technology candidate assessment platform for technical hiring. Interviewers send pre-configured links to candidates, who complete a timed 30-minute randomised multiple-choice test. The system auto-grades results and surfaces a per-candidate breakdown and cross-candidate comparison dashboard.

## Core Value

A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

## Current State — v1.0 Shipped (2026-05-07)

All 24 v1 requirements delivered across 5 phases in 17 days. Platform is live and supports:
- Multi-admin question bank management (Owner + Reviewer RBAC)
- Multiple technologies and 3 seniority levels per technology
- Zero-friction candidate experience: link → timed test → auto-submit → instant results
- Full admin dashboard: paginated submissions list, side-by-side candidate comparison, aggregate stats
- CSV import/export, bulk operations, server-side pagination throughout

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full archive.

## Requirements

### Validated

All 24 v1 requirements — see [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

### Active (v2)

- [ ] PDF export of individual candidate results
- [ ] AI-assisted question generation
- [ ] Question effectiveness analytics (difficulty index, discrimination index per question)
- [ ] Candidate email notifications
- [ ] Webhook / ATS integration

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

**Next milestone** starts with `/gsd-new-milestone` — define v2 requirements from the candidate list above.

---
*Last updated: 2026-05-07 after v1.0 milestone close*
