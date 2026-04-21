# Dev Assessment Platform

## What This Is

A web-based multi-technology candidate assessment platform for technical hiring. Interviewers send pre-configured links to candidates, who complete a timed 30-minute randomised multiple-choice test. The system auto-grades results and surfaces a per-candidate breakdown and cross-candidate comparison dashboard.

## Core Value

A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interviewer can create a pre-configured test link (technology + seniority level)
- [ ] Candidate opens link and immediately starts a 30-minute timed MCQ test (no login)
- [ ] Questions are randomly drawn from a per-technology, per-level question pool
- [ ] Test auto-submits on timer expiry
- [ ] System auto-grades submission and produces: total score, skill-area breakdown, full answer sheet
- [ ] Interviewer dashboard shows all candidates with cross-candidate comparison
- [ ] Multi-admin team can manage question banks (add, edit, delete questions per tech/level)
- [ ] Platform supports multiple technologies (Power BI v1, extensible to SFMC, Data Engineering, etc.)
- [ ] Three seniority levels per technology: Junior, Mid, Senior

### Out of Scope

- Candidate login/accounts — links are self-contained, no auth needed for candidates
- Video proctoring — test is given live with interviewer present
- Open-ended / coding questions — MCQ only for v1
- Automated email of results — interviewer views results in dashboard

## Context

- Built by a Power BI developer who runs technical interviews
- Current process is manual and subjective — this replaces ad-hoc questioning
- "Equality" is a core concern: all candidates at the same level/tech face equivalent tests
- Randomisation prevents candidates sharing exact questions between interviews
- The interviewer is present during the test (link sent live, not async)
- Team of admins will maintain the question bank collaboratively
- Power BI is the first technology, but the architecture must treat it as one of many

## Constraints

- **UX**: Candidate experience must be zero-friction — one link, no accounts, instant start
- **Time**: Tests are fixed at 30 minutes; timer is hard (auto-submit on expiry)
- **Fairness**: Random question selection must be seeded per-link (same candidate always gets same questions if link is reused)
- **Extensibility**: Technology and seniority level are first-class concepts, not hardcoded

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCQ-only for v1 | Fast to build, easy to auto-grade, sufficient for screening | — Pending |
| Pre-configured links (no candidate login) | Zero friction, interviewer controls context | — Pending |
| Random questions per tech/level pool | Equality + prevents answer sharing | — Pending |
| Multi-admin question management | Team hiring process, not solo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-21 after initialization*
