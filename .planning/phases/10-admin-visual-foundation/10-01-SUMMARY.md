---
plan: "10-01"
phase: 10
status: complete
completed: 2026-05-07
---

# 10-01: ThemeProvider & Admin Layout Foundation — Summary

## What Was Built

Installed `next-themes` and `lucide-react`, added the `--brand-rgb` CSS variable to globals.css for Tailwind opacity modifier compatibility, and wired up an `AppThemeProvider` client component in the root layout with `suppressHydrationWarning`. The admin layout was fully rewritten to use design tokens instead of hardcoded Tailwind gray/blue classes, with a dark/light mode toggle (Sun/Moon icons), a responsive mobile top bar with hamburger menu, and a slide-in mobile sidebar sheet — all while keeping the desktop sidebar at `md` and above.

## Key Files

### Created
- apps/web/src/components/ThemeProvider.tsx

### Modified
- apps/web/package.json (next-themes, lucide-react added)
- apps/web/src/app/globals.css (--brand-rgb token)
- apps/web/src/app/layout.tsx (suppressHydrationWarning, AppThemeProvider)
- apps/web/src/app/(admin)/layout.tsx (full rewrite: tokens, toggle, responsive)

## Self-Check

| ID | Check | Result |
|----|-------|--------|
| 10-01-MH-01 | next-themes in package.json | PASS (^0.4.6) |
| 10-01-MH-02 | lucide-react in package.json | PASS (^1.14.0) |
| 10-01-MH-03 | --brand-rgb: 99 102 241 in globals.css | PASS (1 match) |
| 10-01-MH-04 | AppThemeProvider in layout.tsx (import + JSX) | PASS (2 matches) |
| 10-01-MH-05 | suppressHydrationWarning on html tag | PASS (1 match) |
| 10-01-MH-06 | aria-label="Toggle theme" in admin layout | PASS (1 match) |
| 10-01-MH-07 | md:hidden sticky top-0 z-30 h-12 mobile top bar | PASS (1 match) |
| 10-01-MH-08 | hidden md:flex desktop sidebar | PASS (1 match) |
| 10-01-MH-09 | fixed inset-0 bg-black/40 z-40 mobile overlay | PASS (1 match) |
| 10-01-MH-10 | No bg-gray-/text-gray-/border-gray-/bg-blue-/text-blue- | PASS (0 matches) |
| 10-01-MH-11 | npx tsc --noEmit exits 0 | PASS |

## Self-Check: PASSED
