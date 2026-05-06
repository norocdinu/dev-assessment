# Phase 5: Improvements to the Existing App - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 05-improvements
**Areas discussed:** Question Bank improvements, Admin UX polish

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Candidate identification | Submissions show only link IDs — no candidate name | |
| Link lifecycle management | Can't invalidate/cancel links, no label on generation | |
| Admin UX polish | Sidebar active state, spinner, toast notifications | ✓ |
| Question bank improvements | Filters, export, bulk archive, delete | ✓ |

---

## Question Bank Improvements

### Filters

| Option | Description | Selected |
|--------|-------------|----------|
| Text search + skill-area filter | Search box + skill area dropdown | |
| Skill-area filter only | Dropdown for skill area tag only | |
| You decide | Claude picks | |
| All filters (user freeform) | All filters for all areas + CSV/Excel export | ✓ |

**User's choice:** All 4 filters (text search, technology, difficulty, skill area) + CSV export of filtered questions.

---

### Filter scope

| Option | Selected |
|--------|----------|
| Text search | ✓ |
| Technology filter | ✓ |
| Difficulty filter | ✓ |
| Skill area filter | ✓ |

**Notes:** User confirmed "All filters".

---

### CSV Export

| Option | Description | Selected |
|--------|-------------|----------|
| CSV — active questions only | Exports current filtered set | |
| CSV — all including archived | Full bank export | |
| You decide | Claude picks | |
| Selected/filtered questions (user freeform) | Export respects active filters | ✓ |

**User's choice:** Export the currently filtered/selected questions, not always the full bank.

---

### Bulk Archive

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — checkboxes + Archive selected | Checkbox rows + floating action bar | ✓ |
| No — per-row archive only | Keep existing edit workflow | |
| You decide | Claude decides | |

---

### Delete Questions (added via freeform)

**User request:** "Ability to delete questions"

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete if unused, archive if used | System decides automatically | |
| Hard delete always | Always permanent, breaks submission history | |
| Soft delete only (same as archive) | Delete = archive | |
| Never auto delete — user decides | Only manual via admin UI | ✓ |

**Notes:** User explicitly said "never auto delete — only a user can delete a question."

| Availability | Option | Selected |
|-------------|--------|----------|
| Per-row only | Delete button per row | |
| Both — per-row + bulk | Per-row + bulk-select delete | ✓ |

**FK constraint handling:**

| Option | Description | Selected |
|--------|-------------|----------|
| Block + explain | Show error, let admin decide to archive | ✓ |
| Delete anyway — remove history | Cascade delete candidate answers | |

**Notes:** User clarified "a question can be deleted only by admin from question bank UI" — manual, admin-only action.

---

## Admin UX Polish

### Sidebar Active State

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add active state styling | Highlight current page nav item | ✓ |
| No — leave as-is | Keep uniform styling | |

---

### Feedback Notifications

| Option | Description | Selected |
|--------|-------------|----------|
| Keep inline text | Current pattern, no new dependency | |
| Add toast notifications | sonner or react-hot-toast | |
| You decide | Claude picks | ✓ |

---

### Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| No — client-side filtering enough | Keep full-load pattern | |
| Yes — paginate both lists | Server-side pagination | ✓ |
| You decide | Claude picks | |

---

### Specific Pain Points

| Option | Selected |
|--------|----------|
| Nothing specific — improvements above cover it | ✓ |
| Yes, let me describe something | |

---

## Claude's Discretion

- Toast library selection (sonner recommended)
- Delete confirmation UI style (modal vs inline)
- Whether to sync filters to URL params or keep local state

## Deferred Ideas

- Candidate name / identification — raised in area selection, not discussed in Phase 5
- Link cancellation / invalidation — raised in area selection, not discussed in Phase 5
