# Phase 10: Admin Visual Foundation — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 10-admin-visual-foundation
**Areas discussed:** Theme toggle UX, Admin accent colour, Tablet sidebar behaviour

---

## Theme Toggle UX

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar footer, icon-only | Sun/moon icon button next to user info at the bottom; clean, no label clutter | ✓ |
| Sidebar footer, icon+label | "Light mode / Dark mode" label next to icon — more discoverable | |
| Top of sidebar, header area | Toggle next to app title — always visible without scrolling | |

**User's choice:** Sidebar footer, icon-only  
**Notes:** Clean, standard placement. No label needed.

## Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage (next-themes default) | Survives refresh and restarts; simple | ✓ |
| Cookie (SSR-safe) | Prevents flash of wrong theme on first load; more setup | |

**User's choice:** localStorage

---

## Admin Accent Colour

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt --brand indigo token | Migrate admin from blue-600/700 to #6366f1; unified brand colour | ✓ |
| Keep admin blue, candidate indigo | Admin stays blue; deliberate visual distinction between surfaces | |

**User's choice:** Adopt --brand indigo token  
**Notes:** Unified brand across candidate and admin.

---

## Tablet Sidebar Behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Hamburger + slide-in sheet | Sheet overlay at <768px; content doesn't shift | ✓ |
| Icon-only collapsed sidebar | Sidebar shrinks to 48px icons; content shifts; needs lucide-react | |

**User's choice:** Hamburger + slide-in sheet

## Hamburger Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky top bar | Thin top header with hamburger + app title; always accessible | ✓ |
| Fixed corner button | Floating top-left button; simpler but overlaps content | |

**User's choice:** Sticky top bar

---

## Claude's Discretion

- Exact icon choice for sun/moon toggle (lucide-react vs SVG vs emoji)
- Hover and transition states on the toggle button
- Dark mode card palette fine-tuning (--card: #1a1a2e from Phase 9 carries over; may nudge to zinc if needed)
- Exact spacing of toggle in sidebar footer

## Deferred Ideas

- Logo upload UI (admin settings) — v1.3
- Brand colour picker (admin settings) — env var sufficient for v1.2
- Full mobile admin (<768px) — out of scope
- Icon-only collapsed sidebar — rejected in favour of hamburger+sheet
