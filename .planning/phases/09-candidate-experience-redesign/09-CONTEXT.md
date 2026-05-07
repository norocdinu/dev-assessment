# Phase 9: Candidate Experience Redesign — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Source:** Inline context capture (discuss-phase inline)

<domain>
## Phase Boundary

This phase redesigns the candidate test-taking experience: the main test page, results page, expired/error page, and all candidate-facing components. It does NOT touch the admin app.

**Files in scope:**
- `apps/web/src/app/(candidate)/test/[token]/page.tsx`
- `apps/web/src/app/(candidate)/test/[token]/results/page.tsx`
- `apps/web/src/app/(candidate)/test/[token]/expired/page.tsx`
- `apps/web/src/components/candidate/Timer.tsx`
- `apps/web/src/components/candidate/QuestionCard.tsx`
- `apps/web/src/components/candidate/QuestionNav.tsx`
- `apps/web/src/components/candidate/SubmitModal.tsx`
- `apps/web/tailwind.config.ts` (CSS variable extension)
- `apps/web/src/app/globals.css` (dark mode CSS variables)

**New files:**
- `apps/web/src/components/candidate/SubmitConfirmation.tsx` (CAND-04: confirmation screen)
- `apps/web/src/components/candidate/ProgressBar.tsx` (CAND-03: visual progress bar)

</domain>

<decisions>
## Implementation Decisions

### Branding (CAND-01)
- Brand name sourced from `NEXT_PUBLIC_BRAND_NAME` env var; fallback: `"Dev Assessment"`
- Brand logo URL sourced from `NEXT_PUBLIC_BRAND_LOGO_URL` env var; if set, render `<img>` in header; if not set, render brand name as typography
- Brand accent colour sourced from `NEXT_PUBLIC_BRAND_COLOR` env var (hex, e.g. `#6366f1`); fallback: `#6366f1` (indigo)
- Brand colour wired into CSS custom property `--brand` in `globals.css`, used via Tailwind `bg-[var(--brand)]` or extend config
- Candidate test header shows: brand logo/name (left) — NO navigation, NO admin links

### Dark Mode (CAND-02)
- Use `@media (prefers-color-scheme: dark)` CSS media query — NO manual toggle (that's admin only)
- Apply dark mode via Tailwind `dark:` class variant (requires `darkMode: 'media'` in tailwind.config.ts)
- Current admin app uses `darkMode: 'class'` (for the admin toggle in Phase 10) — these must coexist:
  - Set `darkMode: ['class', 'media']` OR configure separate CSS layer for candidate route
  - Simplest approach: add a `data-theme="candidate"` attribute on the candidate root layout and target `[data-theme="candidate"] @media (prefers-color-scheme: dark)` in globals.css
  - ALTERNATIVE (simpler): keep `darkMode: 'class'` for tailwind, add a `<CandidateThemeProvider>` that reads `window.matchMedia` and applies `class="dark"` to the candidate layout root
  - **Decision: Use CandidateThemeProvider client component** that sets `document.documentElement.classList` based on `prefers-color-scheme` + handles changes dynamically via `matchMedia.addEventListener`. This avoids conflicts with admin's class-based toggle.

### Color Palette
- Light mode base: `#fafafa` background, `#ffffff` cards, `#18181b` text
- Dark mode base: `#09090b` background, `#1a1a2e` cards, `#f4f4f5` text
- Accent: CSS variable `--brand` (from env var), fallback `#6366f1`
- Success green: `#10b981`, Error red: `#ef4444`, Warning amber: `#f59e0b`
- Question answered state: brand accent colour with 10% opacity bg + full-opacity border

### Typography
- Use system font stack (already in Tailwind) — no new font packages
- Question text: `text-lg` (18px), relaxed leading — more readable than current `text-base`
- Option labels: `text-sm` (14px)
- Timer: `text-2xl` (24px) bold — larger and more prominent
- Brand name in header: `text-lg font-bold` or logo image

### Progress Indicator (CAND-03)
- Visual progress bar: thin horizontal bar below the header showing % of questions answered
- `<ProgressBar answeredCount={N} totalCount={M} />` — new component
- Bar fills left-to-right with brand accent colour as answered count increases
- Also keep the "Question N / M" text in the header (ARIA label on the progress bar provides accessible equivalent)

### Mobile Layout (CAND-01)
- Container: `max-w-2xl mx-auto px-4` (already set) — keep this
- Navigation squares: wrap correctly at small screens — already works with `flex-wrap`
- Buttons: min touch target `44px` — update Previous/Next buttons to `h-11 px-5`
- No horizontal overflow at 375px width — verify via component audit
- Header: stays sticky, compact on mobile (Timer left, question counter right)

### Submit Confirmation Screen (CAND-04)
- New `<SubmitConfirmation>` component replaces the SubmitModal entirely
- Shown as a full-screen overlay (not a small modal) when user clicks "Submit Test"
- Shows:
  - Heading: "Ready to submit?"
  - Answered count: "You've answered X of Y questions"
  - Unanswered warning (if any): "X questions are unanswered — they will score 0"
  - Time remaining display
  - Two buttons: "Submit" (brand accent) + "Back to review" (ghost)
- This is shown for ALL submissions (not just when unanswered) — replaces current direct-submit-when-all-answered flow
- `SubmitModal` component is replaced/retired by `SubmitConfirmation`

### Results / Thank-you Screen (CAND-04)
- Add a thank-you header section above the summary card:
  - "Test submitted" headline
  - Short message: "Thank you for completing the assessment. Here are your results."
  - PASS/FAIL banner (large, prominent) immediately below
- Rest of results page structure stays the same (skill breakdown + answer sheet)
- Add explicit "That's it — you can close this tab" note at the bottom

### What's NOT Changing
- Test logic, timer, auto-submit, session persistence — all functional code stays as-is
- API calls and data models — no backend changes in this phase
- QuestionNav dot pattern — keep small numbered squares, just restyle colours for dark mode
- Question navigation (Prev/Next buttons) — keep layout, just improve visual polish

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Candidate Components (read before modifying)
- `apps/web/src/app/(candidate)/test/[token]/page.tsx` — main test page
- `apps/web/src/app/(candidate)/test/[token]/results/page.tsx` — results page
- `apps/web/src/app/(candidate)/test/[token]/expired/page.tsx` — expired/error page
- `apps/web/src/components/candidate/Timer.tsx`
- `apps/web/src/components/candidate/QuestionCard.tsx`
- `apps/web/src/components/candidate/QuestionNav.tsx`
- `apps/web/src/components/candidate/SubmitModal.tsx`

### Tailwind Config (dark mode strategy must be set here)
- `apps/web/tailwind.config.ts`

### Global CSS (CSS variables for brand + dark mode)
- `apps/web/src/app/globals.css`

### Requirements
- `.planning/REQUIREMENTS.md` (CAND-01 through CAND-04)

</canonical_refs>

<specifics>
## Specific Ideas

- Timer should pulse red + show urgency styling when under 5 minutes (already under 1 min today — expand to 5 min threshold)
- QuestionNav: answered questions use brand accent background (not hard-coded blue-600)
- ProgressBar: 3px tall, full width below header, smooth CSS transition as it fills
- All `bg-gray-50` → `bg-background` CSS var; all `bg-white` → `bg-card` CSS var — enables dark mode swap
- Option selection: use brand accent with 10% opacity background + solid border (instead of `bg-blue-50 border-blue-600` hardcoded)
- shadcn/ui is already installed — use `cn()` utility for conditional classes; no new packages needed
- CandidateThemeProvider: small client component that calls `window.matchMedia('(prefers-color-scheme: dark)')` and adds/removes `dark` class on `<html>`; add `onChange` listener for live switching

</specifics>

<deferred>
## Deferred Ideas

- Logo upload UI in admin settings (deferred to Phase 10 or v1.3)
- Brand color picker in admin settings (deferred — env var is sufficient for v1.2)
- Animated entrance transitions between questions (future enhancement)
- Sound effects or haptic feedback (out of scope)
- Multi-language support (out of scope)

</deferred>

---

*Phase: 09-candidate-experience-redesign*
*Context gathered: 2026-05-07 via inline capture*
