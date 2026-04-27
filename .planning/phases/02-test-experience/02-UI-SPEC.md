---
phase: 2
slug: test-experience
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-21
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for the candidate test portal. Generated from Phase 1 codebase patterns and Phase 2 research. Verified against 6 dimensions.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (raw Tailwind) |
| Preset | not applicable |
| Component library | none — custom components matching Phase 1 style |
| Icon library | none |
| Font | system font stack (no custom font configured in Phase 1) |

**Rationale**: Phase 1 uses raw Tailwind with no shadcn, no component library, no icon library. Phase 2 introduces a new `(candidate)` route group but must feel consistent — same visual language, different layout chrome (no sidebar, no admin nav).

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Option gap, label-to-input gap |
| md | 16px | Card internal padding, field spacing |
| lg | 24px | Section padding, card vertical rhythm |
| xl | 32px | Layout gaps between major blocks |
| 2xl | 48px | Page-level vertical padding |
| 3xl | 64px | Not used in Phase 2 |

Exceptions: Timer display uses `py-1 px-3` (12px/4px) — compact pill format only.

**Tailwind mapping**: xs=p-1, sm=p-2, md=p-4, lg=p-6, xl=p-8, 2xl=py-12

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (text-sm) | 400 | 1.5 |
| Label | 14px (text-sm) | 500 | 1.4 |
| Question text | 16px (text-base) | 400 | 1.6 |
| Option text | 14px (text-sm) | 400 | 1.5 |
| Timer display | 20px (text-xl) | 600 | 1 |
| Progress indicator | 14px (text-sm) | 500 | 1 |
| Heading (terminal pages) | 24px (text-2xl) | 600 | 1.2 |
| Body (terminal pages) | 14px (text-sm) | 400 | 1.5 |

**Note**: Question text is `text-base` (not `text-sm`) — candidate reads the question as the primary task; slightly larger improves focus and readability under test conditions.

---

## Color

| Role | Tailwind Class | Hex | Usage |
|------|---------------|-----|-------|
| Dominant (60%) | bg-gray-50 | #f9fafb | Page background |
| Surface | bg-white | #ffffff | Question card, header bar |
| Border | border-gray-200 | #e5e7eb | Card borders, dividers |
| Input border | border-gray-300 | #d1d5db | Option borders (unselected) |
| Primary text | text-gray-900 | #111827 | Question text, headings |
| Secondary text | text-gray-700 | #374151 | Option text, labels |
| Muted text | text-gray-500 | #6b7280 | Progress indicator, helper text |
| Accent (10%) | bg-blue-600 / text-blue-600 | #2563eb | Submit button, selected option border |
| Accent surface | bg-blue-50 | #eff6ff | Selected option background |
| Timer — normal | text-green-600 | #16a34a | Timer >5 minutes remaining |
| Timer — warning | text-amber-600 | #d97706 | Timer 1–5 minutes remaining |
| Timer — critical | text-red-600 | #dc2626 | Timer ≤60 seconds (+ animate-pulse) |
| Destructive | text-red-600 / bg-red-600 | #dc2626 | Destructive actions only |
| Nav — answered | bg-blue-600 | #2563eb | Question nav square: answered |
| Nav — current | border-blue-600 bg-white | #2563eb | Question nav square: current question |
| Nav — unanswered | bg-gray-200 | #e5e7eb | Question nav square: not yet visited |

Accent (`blue-600`) reserved for: Submit button, selected option border/background, answered nav squares, primary links. Never used decoratively.

---

## Component Contracts

### Timer

```
[28:43]
```

- Pill: `inline-flex items-center px-3 py-1 rounded-full text-xl font-semibold`
- Color class swaps on `remainingMs`: `text-green-600` → `text-amber-600` → `text-red-600 animate-pulse`
- Threshold cutoffs: >300000ms green, 60001–300000ms amber, ≤60000ms red+pulse
- No label text — numbers alone. Screen-reader: `aria-label="Time remaining: 28 minutes 43 seconds"`

### QuestionCard

- Outer: `bg-white rounded-lg border border-gray-200 shadow-sm p-6`
- Question number: `text-sm font-medium text-gray-500 mb-2` — "Question 3 of 20"
- Question text: `text-base text-gray-900 mb-6 leading-relaxed`
- Option list: `space-y-3`
- Option row: `flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors`
  - Unselected: `border-gray-300 bg-white hover:bg-gray-50`
  - Selected: `border-blue-600 bg-blue-50`
- Option label (A/B/C/D): `text-xs font-semibold text-gray-500 w-5 shrink-0 mt-0.5`
- Option text: `text-sm text-gray-700`
- Input: visually hidden `<input type="radio">` — entire row is the click target

### QuestionNav

- Strip: `flex flex-wrap gap-1.5`
- Square: `w-8 h-8 rounded text-xs font-medium flex items-center justify-center cursor-pointer`
  - Unanswered: `bg-gray-200 text-gray-600 hover:bg-gray-300`
  - Answered: `bg-blue-600 text-white`
  - Current: `ring-2 ring-blue-600 bg-white text-blue-600`

### Navigation Buttons

- Container: `flex items-center justify-between mt-6`
- Previous: `px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed`
- Next: `px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed`

### Submit Button

- Position: below navigation, full-width on mobile, right-aligned on desktop
- `px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50` — matches Phase 1 CTA exactly
- Unanswered count shown below: `text-xs text-gray-500 mt-1` — "3 questions not yet answered"

### SubmitModal

- Overlay: `fixed inset-0 bg-black/40 flex items-center justify-center z-50`
- Dialog: `bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4`
- Heading: `text-base font-semibold text-gray-900 mb-2`
- Body: `text-sm text-gray-600 mb-6`
- Button row: `flex gap-3 justify-end`
  - Cancel: `px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50`
  - Confirm: `px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700`

### Loading State

- Full page centered: `min-h-screen flex items-center justify-center bg-gray-50`
- Spinner: `w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`
- Text below: `mt-4 text-sm text-gray-500` — "Loading your test…"

### Candidate Layout

- No sidebar, no admin nav
- `min-h-screen bg-gray-50`
- Header bar: `sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between`
  - Left: Timer component
  - Right: "Question X of Y" in `text-sm font-medium text-gray-500`
- Content area: `max-w-2xl mx-auto px-4 py-8`
- QuestionNav strip: `mt-4` below header content wrapper, above question card
- Question card: `mt-6`

---

## Page Contracts

### /test/[token] — Main test page

Three render states:

1. **Loading**: Full-page spinner + "Loading your test…"
2. **Error/terminal** (redirect to /test/[token]/expired): see terminal page
3. **Active test**: Header (timer + progress) + QuestionNav + QuestionCard + navigation + Submit

### /test/[token]/expired — Terminal page

Used for: expired links, submitted, not-found, server error.

Layout: `min-h-screen bg-gray-50 flex items-center justify-center`
Card: `bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full mx-4 text-center`

| State | Heading | Body |
|-------|---------|------|
| Expired | "This link has expired" | "Contact your interviewer for a new link." |
| Submitted | "Test submitted" | "Your answers have been recorded. Results coming soon." |
| Not found | "Link not found" | "This link is invalid or has already been used." |
| Too late | "Time's up" | "Your test time has ended. Your progress has been submitted." |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | "Submit Test" |
| Previous button | "← Previous" |
| Next button | "Next →" |
| Unanswered count | "{N} question{s} not yet answered" |
| Submit modal heading | "Submit with unanswered questions?" |
| Submit modal body | "You have {N} unanswered question{s}. Your score will only count answered questions." |
| Submit modal cancel | "Keep going" |
| Submit modal confirm | "Submit anyway" |
| Loading message | "Loading your test…" |
| Expired heading | "This link has expired" |
| Expired body | "Contact your interviewer for a new link." |
| Submitted heading | "Test submitted" |
| Submitted body | "Your answers have been recorded. Results coming soon." |
| Not found heading | "Link not found" |
| Not found body | "This link is invalid or has already been used." |
| Time expired heading | "Time's up" |
| Time expired body | "Your test time has ended. Your progress has been submitted." |
| Timer aria-label | "Time remaining: {M} minutes {S} seconds" |
| Progress aria-label | "Question {N} of {total}" |

Copy rules:
- No exclamation points
- No "Please" — direct imperative
- Plural: "{N} question**s**" when N ≠ 1, "{N} question" when N = 1
- "Contact your interviewer" — not "contact support" (this is a live interview context)

---

## Interaction Contracts

### Timer visual states
```
remainingMs > 300000  →  text-green-600 (normal)
60001 ≤ remainingMs ≤ 300000  →  text-amber-600 (warning)
remainingMs ≤ 60000  →  text-red-600 animate-pulse (critical)
remainingMs ≤ 0  →  auto-submit fires, test locked
```

### Option selection
- Click anywhere on the option row → selects that option
- Selected border + background swap is instant (no animation)
- Selected state persists across question navigation

### Submit flow
- All answered: immediate submit (no modal)
- Has unanswered: SubmitModal with count
- Submitting state: Submit button disabled + spinner inside button
- Post-submit: redirect to /test/[token]/expired with "submitted" state

### Auto-submit (timer expiry)
- Fires when `remainingMs ≤ 0` in interval
- Submits current localStorage answer state
- On success: show /test/[token]/expired with "Time's up" state
- On 410: already handled — show same "Time's up" terminal

### Page refresh recovery
- Loading spinner shown while session is fetched
- If localStorage answers present: restore into question state silently (no user-visible message)
- Timer resumes from server `started_at` — no "your session was restored" toast needed

---

## Accessibility Contracts

- All radio inputs present in DOM (visually hidden, not `display:none`) — keyboard navigable
- Timer has `aria-live="polite"` — screen reader announces changes without interrupting
- Modal traps focus when open (`focus-trap` or manual `tabIndex` management)
- Question nav buttons: `aria-label="Go to question {N}"` + `aria-pressed` for current
- Keyboard: Tab → option rows are focusable; Enter/Space → selects option
- Color alone never conveys state — timer uses numbers; option selected state uses border + background + radio check

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| tailwindcss | animate-spin, animate-pulse (built-in) | not required — standard Tailwind |

No third-party component registries. All components are custom Tailwind compositions matching Phase 1 patterns.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-21
