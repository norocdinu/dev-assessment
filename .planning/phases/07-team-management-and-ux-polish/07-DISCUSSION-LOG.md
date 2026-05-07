# Phase 7: Team Management & UX Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 07-team-management-and-ux-polish
**Areas discussed:** Admin name field, Member UI restrictions

---

## Admin name field

| Option | Description | Selected |
|--------|-------------|----------|
| Required (name TEXT NOT NULL) | Migration sets existing rows to empty string. Clean going forward; accounts list shows real names. | ✓ |
| Optional (name TEXT nullable) | No migration needed for existing rows. Email used as fallback when name is blank. | |

**User's choice:** Required — `name TEXT NOT NULL DEFAULT ''`

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — editable name + change password | Settings page has an editable name field and a change-password form. | ✓ |
| No — change password only | Name set at creation only, settings shows read-only display. | |

**User's choice:** Editable name + change password on settings page

---

## Member UI restrictions

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden for non-owners (Accounts nav) | Members see Question Bank, Test Configs, Submissions — no Accounts item. | ✓ |
| Shown but disabled | Accounts link visible, grayed out with lock icon for non-owners. | |

**User's choice:** Accounts nav hidden for non-owners

| Option | Description | Selected |
|--------|-------------|----------|
| Hide add/edit/delete buttons (QB) | Members see question list as read-only; no Add/Edit/Delete/Archive buttons. | ✓ |
| Show buttons, block at API level only | Buttons remain visible; API returns 403. | |

**User's choice:** Hide add/edit/delete buttons for non-owners on Question Bank

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — Members see Test Configs and Links pages | Members browse configs to pick one and generate a link. Config create/edit/delete hidden. | ✓ |
| No — Members only generate from a dedicated page | New simplified link-generation page with a config dropdown. | |

**User's choice:** Members can navigate full Test Configs and Links pages

---

## Claude's Discretion

- New account password flow (not discussed): owner types initial password in the create-account form; communicates to new user out-of-band. No email invite, no force-change-on-login.
- Candidate Name input UX (not discussed): inline form on the links page (input above Generate button), not a modal.
- Edit account form: inline row expand or separate edit page — Claude decides based on existing patterns.

## Deferred Ideas

- Force-change-on-first-login — unnecessary complexity for a small team tool
- Email changes for existing accounts — out of scope per REQUIREMENTS
