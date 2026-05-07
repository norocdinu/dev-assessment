# Phase 11: UX Pattern Library — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 11-ux-pattern-library
**Areas discussed:** Skeleton coverage

---

## Skeleton Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Tables + dashboard cards | Skeleton rows in all 4 table pages + dashboard KPI cards only | |
| Tables only | Skeleton rows in the 4 table pages only; dashboard keeps spinner | |
| Tables + all cards | Tables + dashboard KPIs + submissions stats panel + all card sections | ✓ |

**User's choice:** Tables + all cards — most complete coverage

---

## Skeleton Row Count

| Option | Description | Selected |
|--------|-------------|----------|
| 5 rows | Enough to fill a typical viewport without looking sparse | ✓ |
| 3 rows | Lighter feel, less visual noise | |
| Match page size (25) | Full skeleton matching actual page size | |

**User's choice:** 5 rows (recommended default)

---

## Skeleton Column Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Column-aware skeletons | Each row has cells matching actual column widths/proportions | ✓ |
| Uniform placeholder rows | Single full-width bar per row; simpler, universal | |

**User's choice:** Column-aware skeletons (recommended default)

---

## Claude's Discretion

- Empty state design details (icon choice, CTA copy per page) — not discussed; Claude decides
- Confirm() replacement approach — not discussed; Claude follows roadmap guidance:
  - Permanent deletes → AlertDialog
  - Soft/reversible actions (archive, revoke) → toast-only, no pre-confirmation

## Deferred Ideas

None — discussion stayed within phase scope.
