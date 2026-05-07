---
plan: "09-01"
phase: 9
status: complete
completed: 2026-05-07
tasks_total: 4
tasks_completed: 4
---

# Summary: Design System Foundation

## What Was Built
Wired up the CSS variable token layer for the candidate redesign: semantic color tokens (background, card, foreground, muted, border) are now defined in globals.css for both light and dark modes, consumed by Tailwind via CSS variable syntax. A `CandidateThemeProvider` client component detects OS dark mode preference and applies the `dark` class to the document root, enabling automatic dark mode for candidate routes without affecting the admin app.

## Key Files
- apps/web/tailwind.config.ts — added `darkMode: 'class'` and CSS variable color token extensions
- apps/web/src/app/globals.css — defined `:root` and `.dark` CSS custom property blocks for all semantic color tokens plus `--brand`
- apps/web/src/app/layout.tsx — reads `NEXT_PUBLIC_BRAND_COLOR` env var and applies it as `--brand` CSS variable via inline style on `<html>`
- apps/web/src/components/candidate/CandidateThemeProvider.tsx — client component that syncs OS dark mode preference to the `dark` class on `document.documentElement`
- apps/web/src/app/(candidate)/layout.tsx — wraps candidate routes in `CandidateThemeProvider` for automatic dark mode

## Self-Check: PASSED

### must_haves verified:
- [x] 09-01-MH-01: tailwind.config.ts has darkMode: 'class'
- [x] 09-01-MH-02: globals.css defines CSS custom properties in :root
- [x] 09-01-MH-03: globals.css has .dark block
- [x] 09-01-MH-04: Root layout applies --brand CSS variable from env
- [x] 09-01-MH-05: CandidateThemeProvider exists and is mounted in candidate layout
- [x] 09-01-MH-06: TypeScript passes
