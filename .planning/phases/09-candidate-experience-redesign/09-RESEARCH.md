# Phase 9 Research — Candidate Experience Redesign

## RESEARCH COMPLETE

---

## Findings

### 1. Dark Mode Strategy (Critical)

**Problem:** Phase 10 will set `darkMode: 'class'` for the admin toggle. Phase 9 needs candidate pages to auto-respond to OS preference. These two requirements must coexist in the same Tailwind config.

**Solution:** `CandidateThemeProvider` client component
- Set `darkMode: 'class'` in `tailwind.config.ts` (needed for both candidate + Phase 10 admin toggle)
- `CandidateThemeProvider` reads `window.matchMedia('(prefers-color-scheme: dark)')` on mount
- Adds/removes `dark` class on `document.documentElement` accordingly
- Adds `addEventListener('change', ...)` for live switching when OS preference changes
- Mounted in `apps/web/src/app/(candidate)/layout.tsx` — only affects candidate routes

```tsx
// apps/web/src/components/candidate/CandidateThemeProvider.tsx
'use client';
import { useEffect } from 'react';
export function CandidateThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return <>{children}</>;
}
```

**Why not `darkMode: ['class', 'media']`?** Tailwind v3.4 supports this but it would activate dark styles for admin when OS is dark even without the user toggling the admin theme switch — undesirable after Phase 10.

---

### 2. CSS Variables for Theming

**Pattern:** Define semantic color tokens as CSS custom properties; Tailwind consumes them via `rgb(var(--token) / <alpha-value>)` syntax.

**globals.css additions:**
```css
:root {
  --background: 250 250 250;   /* #fafafa */
  --card: 255 255 255;         /* #ffffff */
  --foreground: 24 24 27;      /* #18181b */
  --muted: 113 113 122;        /* #71717a */
  --border: 228 228 231;       /* #e4e4e7 */
  --brand: 99 102 241;         /* #6366f1 indigo fallback */
}
.dark {
  --background: 9 9 11;        /* #09090b */
  --card: 26 26 46;            /* #1a1a2e */
  --foreground: 244 244 245;   /* #f4f4f5 */
  --muted: 113 113 122;        /* #71717a */
  --border: 39 39 42;          /* #27272a */
  /* --brand stays the same in dark mode */
}
```

**tailwind.config.ts additions:**
```ts
theme: {
  extend: {
    colors: {
      background: 'rgb(var(--background) / <alpha-value>)',
      card: 'rgb(var(--card) / <alpha-value>)',
      foreground: 'rgb(var(--foreground) / <alpha-value>)',
      muted: 'rgb(var(--muted) / <alpha-value>)',
      border: 'rgb(var(--border) / <alpha-value>)',
      brand: 'rgb(var(--brand) / <alpha-value>)',
    }
  }
}
```

**Usage:** `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-brand text-white`

---

### 3. Brand Color from Env Var

**Root layout approach:** `NEXT_PUBLIC_BRAND_COLOR` is baked in at build time. Apply via inline style on `<html>` in the root server layout:

```tsx
// apps/web/src/app/layout.tsx
export default function RootLayout({ children }) {
  const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR ?? '99 102 241';
  return (
    <html lang="en" style={{ '--brand': brandColor } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
```

**Note:** `NEXT_PUBLIC_BRAND_COLOR` should be an RGB triplet `"99 102 241"` (not hex) to work with the `rgb(var(--brand) / <alpha-value>)` pattern. OR use hex and override `--brand` separately:
```css
:root { --brand: #6366f1; }
```
Then Tailwind uses `bg-[var(--brand)]` (arbitrary) instead of semantic token. **Simpler: store hex, use arbitrary syntax `bg-[var(--brand)]` where needed and `text-[var(--brand)]`.**

---

### 4. Brand Logo + Name in Header

```tsx
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment';
const BRAND_LOGO = process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? null;

// In header:
{BRAND_LOGO
  ? <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-8 object-contain" />
  : <span className="text-lg font-bold text-foreground">{BRAND_NAME}</span>
}
```

**These env vars are server-side accessible in server components.** Candidate test page is `'use client'` so we cannot read `process.env` directly there — brand vars must be read in a layout (server component) and passed down, or use `NEXT_PUBLIC_*` vars which ARE available client-side too.

---

### 5. Current State Audit (What Changes)

| Component / File | Currently | Change Needed |
|---|---|---|
| `tailwind.config.ts` | Minimal, no dark mode | Add `darkMode: 'class'`, CSS variable colors |
| `globals.css` | 4 lines | Add CSS custom properties |
| `layout.tsx` (root) | Bare `<html>` | Add brand color inline style |
| `(candidate)/layout.tsx` | Passthrough | Add `<CandidateThemeProvider>` |
| `Timer.tsx` | Green/amber/red text | Larger, add urgency ring at <5min |
| `QuestionCard.tsx` | `bg-blue-50 border-blue-600` | Use `bg-brand/10 border-[var(--brand)]` |
| `QuestionNav.tsx` | `bg-blue-600` answered | Use `bg-brand` |
| `SubmitModal.tsx` | Small unanswered warning dialog | Replace with full-screen `SubmitConfirmation` |
| `page.tsx` (test) | `bg-gray-50` background | `bg-background`, add ProgressBar, new submit flow |
| `results/page.tsx` | No thank-you | Add thank-you header, polish pass/fail banner |
| `expired/page.tsx` | Plain card | Polish with brand header |

---

### 6. SubmitConfirmation vs SubmitModal

Current `SubmitModal` only shows when there are unanswered questions. 

New flow (CAND-04):
1. User clicks "Submit Test" (whether answered all or not)
2. Full-screen `SubmitConfirmation` overlay shows:
   - "Ready to submit?" heading
   - "You've answered X / Y questions"
   - Time remaining
   - Submit button (calls `doSubmit`)
   - "Keep reviewing" button (dismisses overlay)
3. `SubmitModal` is retired — `SubmitConfirmation` handles both cases

---

### 7. ProgressBar Component

```tsx
// apps/web/src/components/candidate/ProgressBar.tsx
interface ProgressBarProps { answered: number; total: number; }
export function ProgressBar({ answered, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="h-1 w-full bg-border" role="progressbar"
         aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-[var(--brand)] transition-all duration-300"
           style={{ width: `${pct}%` }} />
    </div>
  );
}
```

---

### 8. Mobile Concerns

- QuestionNav buttons: `w-8 h-8` = 32px — below the 44px recommendation. Add `w-9 h-9` or `w-10 h-10` on mobile.
- Prev/Next buttons: current `py-2 px-4` — should be `py-3 px-5` minimum for comfortable touch
- No `<meta name="viewport">` in layout — Next.js adds this automatically via `metadata.viewport`
- Answer options: current `p-3` — acceptable touch target (48px+ at 14px font)
