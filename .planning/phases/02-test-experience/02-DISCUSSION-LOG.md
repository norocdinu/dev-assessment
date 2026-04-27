# Phase 2: Test Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 02-test-experience
**Areas discussed:** Generate Link flow, Link Expiry, Admin Link List View, Candidate Network Error Recovery

---

## Generate Link flow (admin UX)

| Option | Description | Selected |
|--------|-------------|----------|
| Inline modal | Opens dialog over configs list, URL + Copy button | |
| Slide-over / drawer | Panel slides in showing URL + existing links | |
| Dedicated page `/test-configs/:id/links` | Full link management, separate navigation | ✓ |

**User's choice:** Dedicated link management page (option 3)
**Notes:** "Generate Link" button on the configs table navigates to the dedicated page rather than opening a modal.

---

## Link Expiry

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate generation (no expiry input) | POST fires on click, no date picker | |
| Modal-first with expiry date picker | Admin sets optional expiry before generating | |
| Expires when test is taken | No date expiry — state machine handles it | ✓ |

**User's choice:** "Expires after the test is taken" — `expires_at` stays NULL, no date picker anywhere.
**Notes:** Link lifecycle is purely state-machine driven. This simplifies both UI and backend.

---

## Admin link list view

| Option | Description | Selected |
|--------|-------------|----------|
| Modal only (new link) | No history, minimal | |
| Modal + existing links | History inside modal | |
| Separate link management page | Full history, richer controls | ✓ |

**User's choice:** Separate dedicated page — confirmed after clarification.
**Notes:** Page shows all links for a config with state/timestamps and revoke capability.

---

## Candidate network error recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error + retry button | Show message, retry same answers | |
| Optimistic / silent retry | localStorage "pending" + background retry | |
| Claude's discretion | Claude picks sensible default | ✓ |

**User's choice:** Claude's discretion — implemented as inline error + retry button.
**Notes:** Simple recovery that reuses existing localStorage answer state.

---

## Claude's Discretion

- Loading skeleton vs spinner design (follow UI-SPEC: spinner)
- Copy text for admin link management page (direct imperative style, matching Phase 1)
- Retry delay on network error (immediate for v1)

## Deferred Ideas

None — discussion stayed within Phase 2 scope
