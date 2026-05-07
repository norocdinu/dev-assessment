# Phase 8: Analytics Dashboard & Submission Deletion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 08-analytics-dashboard-and-submission-deletion
**Areas discussed:** Score distribution bands, Dashboard as landing page

---

## Score Distribution Bands

| Option | Description | Selected |
|--------|-------------|----------|
| 10 equal bands | 0-9%, 10-19%… 90-100% — 10 bars, uniform width | |
| 6 unequal buckets | 0-49, 50-59, 60-69, 70-79, 80-89, 90-100 — reuses existing stats.ts SQL pattern | ✓ |

**User's choice:** 6 unequal buckets (existing pattern)
**Notes:** Reuses the bucketing logic already in `apps/api/src/routes/stats.ts`. The wide 0-49 bucket covers all clear fails; finer resolution in the pass range (80-89, 90-100) is where it matters most for hiring decisions.

---

## Dashboard as Landing Page

| Option | Description | Selected |
|--------|-------------|----------|
| First item + redirect | Dashboard first in sidebar; /admin redirects to /dashboard | ✓ |
| Added to sidebar only | New nav item alongside existing items; no redirect | |

**User's choice:** First item + redirect
**Notes:** Dashboard becomes the de-facto home for all logged-in admins. Visible to all roles (owner, member, reviewer).

---

## Claude's Discretion

- Recharts upgrade approach (raw v3 vs shadcn/ui wrapper) — evaluate during implementation
- Exact KPI card layout and icon usage
- Loading states (skeleton vs spinner)
- Audit log implementation (stdout vs DB table)
- Delete confirmation modal wording

## Deferred Ideas

- Per-config filtering on competency chart dashboard UI (API supports it, UI shows global only)
- shadcn/ui chart wrapper — deferred; add only if Recharts v3 upgrade requires it
