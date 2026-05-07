---
phase: "09"
phase_name: "Candidate Experience Redesign"
status: findings
files_reviewed: 13
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
reviewed_at: 2026-05-07
depth: standard
---

# Code Review: Phase 09 — Candidate Experience Redesign

## Summary

The redesign is largely well-structured with good accessibility groundwork, but two critical issues stand out: the `doSubmit` callback captures a stale `answers` snapshot at the moment the timer fires, meaning auto-submit on time expiry can silently discard last-second answers; and the `BRAND_LOGO` env var is rendered in an `<img>` without any origin/path validation, opening a trivial open-redirect / mixed-content vector. Several warnings cover missing focus-trap in the modal, a missing `'use client'` directive on `ProgressBar`, a clock-skew edge case that produces a negative timer on load, and accessibility gaps in the results table.

---

## Findings

### CR-001 — Stale `answers` closure in timer-triggered auto-submit `apps/web/src/app/(candidate)/test/[token]/page.tsx:94`
**Severity:** critical
**Issue:** The countdown `useEffect` calls `doSubmit` when `remaining <= 0`. `doSubmit` is a `useCallback` that closes over `answers` at the time the callback was last recreated. Because `answers` is listed in `doSubmit`'s dependency array, `doSubmit` itself changes identity on every keypress — which in turn re-creates the timer `useEffect` interval every time an answer is saved. This teardown/re-create cycle means the timer restarts from the current wall-clock reading each time, so the last ~1 s of state is always included. **However**, if the user answers a question in the final tick window (between the last interval check and expiry), the re-created interval may not fire before the navigation occurs, causing that final answer to be excluded from the submitted payload. The root issue is that `answers` should be read from a ref at submit time rather than closed over.
**Fix:** Maintain an `answersRef` that is kept in sync alongside the `answers` state. In `doSubmit`, read `answersRef.current` instead of the state variable `answers`. Remove `answers` from `doSubmit`'s `useCallback` dependency array (replacing with the ref, which is stable). This eliminates the stale-closure risk and stops the interval from being torn down on every answer change.

```ts
const answersRef = useRef<Record<string, 'a'|'b'|'c'|'d'>>({});
// In handleAnswer: answersRef.current = updated;
// In doSubmit: body: JSON.stringify({ answers: answersRef.current })
```

---

### CR-002 — Unvalidated `BRAND_LOGO` URL rendered directly as `<img src>` `apps/web/src/app/(candidate)/test/[token]/page.tsx:215`
**Severity:** critical
**Issue:** `BRAND_LOGO` is set from `process.env.NEXT_PUBLIC_BRAND_LOGO_URL` without any validation. An attacker who controls the environment configuration (e.g., a misconfigured deployment pipeline or a compromised `.env` file) can inject an arbitrary URL. This enables mixed-content loading (http:// image on https:// page), loading tracking pixels from third-party domains, or — in environments where `dangerouslySetInnerHTML` is also present elsewhere — providing a base for further exploitation. Additionally, Next.js `<Image>` should be used instead of raw `<img>` to gain domain allow-listing enforced by `next.config`.
**Fix:** Replace the raw `<img>` with Next.js `<Image>` (with explicit `width`/`height`) and add the expected brand domain(s) to `images.remotePatterns` in `next.config`. If the raw `<img>` must be kept, validate the URL at module load time to ensure it starts with `https://` and matches an expected hostname pattern before using it.

---

### WR-001 — `ProgressBar` missing `'use client'` directive `apps/web/src/components/candidate/ProgressBar.tsx:1`
**Severity:** warning
**Issue:** `ProgressBar` uses no hooks and is rendered inside the `'use client'` `TestPage`, so it works today. But the component is consumed directly from a server component in the `<header>` slot and has no directive, meaning if it is ever imported from a server boundary it will silently be treated as a server component. The `role="progressbar"` with dynamic `aria-valuenow` is purely presentational/DOM state, so this is low risk now but fragile.
**Fix:** Add `'use client';` at the top of `ProgressBar.tsx` to make the boundary explicit, or leave it as a pure server component and verify it never uses browser APIs.

---

### WR-002 — No focus trap in `SubmitModal` `apps/web/src/components/candidate/SubmitModal.tsx:30`
**Severity:** warning
**Issue:** The modal correctly sets initial focus on the confirm button via `useEffect`, but keyboard navigation (Tab/Shift-Tab) can escape the dialog and reach elements behind the modal overlay. WCAG 2.1 §2.1.2 (No Keyboard Trap, success criterion advisory) and ARIA Authoring Practices require that focus remain inside a modal dialog while it is open.
**Fix:** Implement a focus trap: collect all focusable elements inside the dialog container, intercept `keydown` for Tab and Shift-Tab, and cycle focus within the set. The `focus-trap-react` library or a small bespoke hook achieves this. Also add `onKeyDown` to handle `Escape` → `onCancel`.

---

### WR-003 — Missing `Escape` key handler on `SubmitModal` `apps/web/src/components/candidate/SubmitModal.tsx:34`
**Severity:** warning
**Issue:** The dialog has no `onKeyDown` handler for the `Escape` key. The ARIA dialog pattern requires that pressing Escape closes the dialog. Currently a keyboard user has no way to dismiss the modal without reaching the "Keep reviewing" button.
**Fix:** Add a `useEffect` that listens for `keydown` with `key === 'Escape'` and calls `onCancel`. Remove the listener on cleanup.

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [onCancel]);
```

---

### WR-004 — Clock skew can produce large negative `remainingMs` on initial render `apps/web/src/app/(candidate)/test/[token]/page.tsx:153`
**Severity:** warning
**Issue:** `initialRemaining` is computed as `DURATION_MS - (Date.now() + offset - startedAtMs)`. If the server's `server_now` field lags behind the actual server wall clock (e.g., the HTTP response is delayed by several seconds), `offset` absorbs that network latency into a permanent negative bias, making the displayed time shorter than the actual remaining time. More critically, if the candidate's device clock is significantly behind the server and the request takes time, `initialRemaining` can be negative before the interval starts, triggering an immediate `doSubmit()` on the very first tick — submitting an empty or partial answer sheet.
**Fix:** Clamp `initialRemaining` to `[0, DURATION_MS]` before calling `setRemainingMs`. The `Math.max(0, remainingMs)` in the render already masks the display, but does not prevent the premature auto-submit path. Additionally, consider using the server-authoritative `remaining_seconds` field from the session endpoint (if available) rather than recomputing from `started_at` plus local clock.

---

### WR-005 — `aria-current` on nav buttons uses string `'true'` instead of `'page'` or `'step'` `apps/web/src/components/candidate/QuestionNav.tsx:29`
**Severity:** warning
**Issue:** `aria-current={isCurrent ? 'true' : undefined}` passes the literal string `'true'`. The WAI-ARIA spec defines `aria-current` as an enumerated token; valid values for a navigation step are `"page"`, `"step"`, `"location"`, `"date"`, `"time"`, or `true`/`false` (boolean). Passing the string `'true'` is not the boolean `true`; in JSX it is treated as a valid attribute value but assistive technologies may not announce it correctly. For a question stepper, `"step"` is the most semantically appropriate value.
**Fix:** Change to `aria-current={isCurrent ? 'step' : undefined}`.

---

### WR-006 — Results table uses array index as `key` and has no accessible column headers for screen readers `apps/web/src/app/(candidate)/test/[token]/results/page.tsx:165`
**Severity:** warning
**Issue:** `result.answer_sheet.map((row, i) => <tr key={i}>` uses the index as the React key — harmless here since the list is static and never reordered, but a recognised anti-pattern. More importantly, the `<th>` elements in the `<thead>` lack `scope="col"`, so screen readers cannot reliably associate data cells with their column headers in the results table.
**Fix:** Use `row.question_id` (or another stable identifier from the data) as the key. Add `scope="col"` to each `<th>` element.

---

### WR-007 — `handleAnswer` and `handleNavigate` are not wrapped in `useCallback`, causing `QuestionCard`/`QuestionNav` to re-render on every state change `apps/web/src/app/(candidate)/test/[token]/page.tsx:165`
**Severity:** warning
**Issue:** `handleAnswer` and `handleNavigate` are plain functions defined inside the component body. Every state change (including the 1-second timer tick) recreates these function references, causing `QuestionCard` and `QuestionNav` — which receive them as props — to re-render every second. With 30+ question nav buttons this is a meaningful but not catastrophic overhead. It is also inconsistent: `doSubmit` is already `useCallback`.
**Fix:** Wrap both in `useCallback` with appropriate dependency arrays. If `answersRef` is introduced (CR-001 fix), `handleAnswer` can depend on the ref instead of `answers` state, eliminating re-renders on answer changes too.

---

### IN-001 — `formatTime` is duplicated across `Timer.tsx` and `SubmitModal.tsx`
**Severity:** info
**Issue:** Both `Timer.tsx` (lines 7–13) and `SubmitModal.tsx` (lines 13–18) define a local `formatTime` function with slightly different signatures and output formats (`MM:SS` vs `M:SS`). This duplication risks the two drifting out of sync.
**Fix:** Extract a shared `formatDuration(ms: number, opts?: { padMinutes?: boolean }): string` utility to `src/lib/formatDuration.ts` and import it in both components.

---

### IN-002 — `DURATION_MS` is hardcoded; server-provided duration is ignored `apps/web/src/app/(candidate)/test/[token]/page.tsx:15`
**Severity:** info
**Issue:** `const DURATION_MS = 30 * 60 * 1000` is a client-side constant. If the test duration is ever configurable per-assessment on the server, this constant will diverge from the authoritative value and the displayed/enforced timer will be wrong.
**Fix:** Include `duration_seconds` (or `duration_ms`) in the session API response and use that value instead of the constant. Fall back to 30 minutes only if the field is absent for backwards compatibility.

---

### IN-003 — `CandidateThemeProvider` toggles `dark` on `<html>` which already has a class set server-side, causing a flash `apps/web/src/components/candidate/CandidateThemeProvider.tsx:6`
**Severity:** info
**Issue:** The `RootLayout` renders `<html lang="en">` without a `dark` class. `CandidateThemeProvider` applies the class only after hydration (inside `useEffect`). On a dark-mode device there is a brief flash of the light theme between SSR and the first client paint. This is a common pattern issue with CSS class–based dark mode.
**Fix:** Inject an inline `<script>` in `RootLayout` that reads `matchMedia('(prefers-color-scheme: dark)')` synchronously and adds the `dark` class before the page renders. This is the standard approach used by `next-themes` and eliminates the FOUC.

---

### IN-004 — `--brand` CSS variable set via inline `style` on `<html>` but also declared in `:root` `apps/web/src/app/globals.css:11` / `apps/web/src/app/layout.tsx:12`
**Severity:** info
**Issue:** `globals.css` declares `--brand: #6366f1` as a fallback in `:root`, and `layout.tsx` unconditionally sets `--brand` via an inline `style` prop (even when `NEXT_PUBLIC_BRAND_COLOR` is not set, it inlines the same `#6366f1` default). The duplication is harmless but the comment "fallback indigo — overridden via inline style" is misleading: the CSS value is never actually used as a fallback because the inline style always wins.
**Fix:** Remove the `--brand` declaration from `:root` in `globals.css` and rely solely on the inline style in `layout.tsx`, or set the inline style only when `NEXT_PUBLIC_BRAND_COLOR` is explicitly defined, letting the CSS variable serve as a genuine fallback.

---

## Files Reviewed

| File | Status |
|------|--------|
| `apps/web/tailwind.config.ts` | ✓ clean |
| `apps/web/src/app/globals.css` | ⚠ findings (IN-004) |
| `apps/web/src/app/layout.tsx` | ⚠ findings (CR-002, IN-004) |
| `apps/web/src/app/(candidate)/layout.tsx` | ✓ clean |
| `apps/web/src/components/candidate/CandidateThemeProvider.tsx` | ⚠ findings (IN-003) |
| `apps/web/src/components/candidate/Timer.tsx` | ⚠ findings (IN-001) |
| `apps/web/src/components/candidate/ProgressBar.tsx` | ⚠ findings (WR-001) |
| `apps/web/src/components/candidate/QuestionCard.tsx` | ✓ clean |
| `apps/web/src/components/candidate/QuestionNav.tsx` | ⚠ findings (WR-005) |
| `apps/web/src/components/candidate/SubmitModal.tsx` | ⚠ findings (WR-002, WR-003, IN-001) |
| `apps/web/src/app/(candidate)/test/[token]/page.tsx` | ⚠ findings (CR-001, CR-002, WR-004, WR-007, IN-002) |
| `apps/web/src/app/(candidate)/test/[token]/results/page.tsx` | ⚠ findings (WR-006) |
| `apps/web/src/app/(candidate)/test/[token]/expired/page.tsx` | ✓ clean |
