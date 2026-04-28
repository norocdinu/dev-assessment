# Phase 4: Admin Dashboard & Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 04-admin-dashboard
**Areas discussed:** Submissions list entry point

---

## Submissions List Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| New 'Submissions' nav item | Top-level `/admin/submissions` page in sidebar | ✓ |
| Extend per-config links page | Add global filtering to existing `/test-configs/:id/links` | |
| New 'Dashboard' nav item | Combined submissions + stats at `/admin/dashboard` | |

**User's choice:** New 'Submissions' nav item
**Notes:** Clean dedicated home for candidate tracking; sidebar already has "Question Bank" and "Test Configs" at the same level.

---

## Filter Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Inline dropdowns above table | Client-side filtering, no server roundtrip | ✓ |
| Server-side query params | URL params trigger fresh API fetch | |
| You decide | Claude picks simplest approach | |

**User's choice:** Inline dropdowns above table

---

## Default Sort

| Option | Description | Selected |
|--------|-------------|----------|
| Newest first | Most recent at top | ✓ |
| Highest score first | Best performers at top | |
| You decide | Claude picks default | |

**User's choice:** Newest first

---

## Columns

| Option | Description | Selected |
|--------|-------------|----------|
| Pass / Fail badge | Visual indicator alongside score | |
| Test name + difficulty | Config and seniority level | |
| Time taken | Duration on test | |
| You decide | Claude picks sensible column set | ✓ |

**User's choice:** You decide
**Claude's choice:** Score %, Pass/Fail badge, Test name + difficulty, Time taken, Submitted date, Actions

---

## Areas Not Discussed (Claude's Discretion)

- **Candidate comparison (DASH-03)**: Checkboxes in list → "Compare selected" button → `/admin/compare` page; side-by-side table of score, pass/fail, time, skill breakdown.
- **Stats & charts (DASH-04)**: CSS-only horizontal bar chart for score distribution (no new chart library dependency).
- **CSV export (DASH-05)**: Server-side `GET /admin/submissions/export?testConfigId=X`, client downloads via anchor tag.
- **CSV import (QBANK-03)**: "Import CSV" button on questions page (owner only), file input, inline per-row results table.
