# Phase 3: Grading & Results - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 03-grading-results
**Areas discussed:** Results page routing

---

## Results Page Routing

| Option | Description | Selected |
|--------|-------------|----------|
| New /results route | Redirect to /test/:token/results after submit. Candidate can bookmark and return. Auto-redirect on reopen. | ✓ |
| Upgrade /expired page | ?state=submitted becomes full results view. Simpler but URL says "expired", no return-to-results flow. | |

**User's choice:** New `/test/:token/results` route

**Follow-up: Reopening test link after submission**

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /results | API 409 → frontend auto-redirects to results | ✓ |
| Show expired page with link | Two-click flow | |

**Follow-up: Admin access pattern**

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/submissions/:linkId standalone | Accessible from links page, Phase 4 links to same URL | |
| Same /test/:token/results, admin-aware | One page for both roles | |
| You decide | Claude picks cleanest approach | ✓ |

**Claude's choice (discretion):** `/admin/submissions/:linkId` standalone route — cleanest separation, consistent with existing admin route group pattern.

---

## Claude's Discretion

- Answer sheet format: full option text, full question text, skill area per row
- Skill area breakdown: only areas present in drawn questions
- Grading: synchronous in submit route, MCQ exact-match
- Results storage: pre-computed `submission_results` table
- Pass/fail styling: green/red matching timer urgency convention

## Deferred Ideas

- App hosting / open-source publishing — raised during discussion, out of scope for Phase 3
