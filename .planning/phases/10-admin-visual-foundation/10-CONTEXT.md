# Phase 10: Admin Visual Foundation — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Introduce a dark/light mode toggle in the admin app, migrate all admin pages to a consistent design token system, and make the admin layout functional on tablet-sized screens (≥768px).

**In scope:**
- `next-themes` integration + ThemeProvider wrapping the admin layout
- Theme toggle button in the admin sidebar footer
- CSS variable token migration: replace hardcoded `gray-*` and `blue-*` with design tokens across all admin pages
- Admin accent colour migration from `blue-600/blue-700` to `--brand` indigo token
- Responsive sidebar: persistent at ≥768px, hamburger + sheet below 768px

**Out of scope:**
- Candidate-side theming (complete — Phase 9)
- Skeleton loaders and empty states (Phase 11)
- Toast audit and alert replacement (Phase 11)

</domain>

<decisions>
## Implementation Decisions

### Theme Toggle (THEME-01)
- **D-01:** Use `next-themes` for theme management — wraps admin layout with `ThemeProvider`
- **D-02:** Toggle is an icon-only button (sun/moon icon) placed in the **sidebar footer**, inline with the Sign Out link
- **D-03:** Preference persisted via **localStorage** (next-themes default) — survives page refresh and browser restarts; no server-side cookie needed
- **D-04:** Theme class applied to `<html>` root so all CSS variable tokens and Tailwind `dark:` classes respond automatically
- **D-05:** No system-preference auto-follow for admin — user explicitly chooses via the toggle (unlike the candidate app's OS-sync approach)

### Accent Colour & Design Tokens (UI-01)
- **D-06:** Migrate admin accent from hardcoded `blue-600/blue-700` to the `--brand` CSS variable (indigo `#6366f1`) — unified brand colour across candidate and admin
- **D-07:** Active nav items: `bg-[var(--brand)]/10` background + `text-[var(--brand)]` — replaces `bg-blue-50 text-blue-700`
- **D-08:** Spinners and primary buttons: `border-t-[var(--brand)]` / `bg-[var(--brand)]` — replaces hardcoded `border-t-blue-600`
- **D-09:** Background, card, and border colours migrate to the existing CSS variable tokens (`bg-background`, `bg-card`, `border-border`) already defined in `globals.css` — no new variables needed
- **D-10:** Migration scope: ALL admin pages, not just the layout. Replace all hardcoded `bg-gray-50`, `bg-white`, `bg-gray-200`, `text-gray-900`, `text-gray-700`, `border-gray-200` etc. with token-based equivalents across `(admin)` route group

### Claude's Discretion
- Dark mode palette values (the `--card: #1a1a2e` bluish dark from Phase 9 was set in globals.css — carry as-is unless it looks wrong; may tune to a more neutral zinc)
- Exact icon choice (sun/moon — could use lucide-react `Sun`/`Moon` icons if adding that package, or use emoji/SVG if keeping dependencies minimal)
- Hover and transition states on the toggle button
- Exact spacing of the toggle in the sidebar footer (whether it's on the same row as Sign Out or a separate row)

### Tablet / Responsive (RESP-01)
- **D-11:** At ≥768px: sidebar renders persistently as `w-56` left panel (current behaviour, unchanged)
- **D-12:** Below 768px: sidebar is hidden; a **sticky top bar** appears containing the hamburger icon (☰) and the app title
- **D-13:** Tapping the hamburger opens the sidebar as a **slide-in sheet overlay** (not push — main content does not shift)
- **D-14:** Overlay dims the main content behind the sheet; clicking outside closes it
- **D-15:** The sheet contains the full sidebar content (logo, nav, user footer with theme toggle)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Admin Layout (primary file to modify)
- `apps/web/src/app/(admin)/layout.tsx` — current admin layout: sidebar, nav, user footer, Toaster; all hardcoded colors live here

### Tailwind & Global Styles
- `apps/web/tailwind.config.ts` — `darkMode: 'class'` already set; CSS variable colors already extended
- `apps/web/src/app/globals.css` — CSS variable definitions for `:root` and `.dark`; `--brand` is here

### All Admin Pages (design token migration target)
- `apps/web/src/app/(admin)/dashboard/page.tsx`
- `apps/web/src/app/(admin)/questions/` — all files
- `apps/web/src/app/(admin)/submissions/` — all files
- `apps/web/src/app/(admin)/test-configs/` — all files
- `apps/web/src/app/(admin)/accounts/` — all files
- `apps/web/src/app/(admin)/settings/page.tsx`
- `apps/web/src/app/(admin)/compare/page.tsx`
- `apps/web/src/components/ui/DataTable.tsx`
- `apps/web/src/components/ui/QuestionForm.tsx`

### Requirements
- `.planning/REQUIREMENTS.md` (THEME-01, UI-01, RESP-01)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css` CSS variables: `--background`, `--card`, `--foreground`, `--muted`, `--border`, `--brand` — all defined, just not used in admin yet
- `tailwind.config.ts` extended colors: `background`, `card`, `foreground`, `muted`, `border` — mapped to CSS vars with opacity support
- `sonner` Toaster: already in admin layout at `<Toaster position="top-right" />` — Phase 11 builds on this

### Established Patterns
- `darkMode: 'class'` in tailwind: means adding/removing the `dark` class on `<html>` triggers all `dark:` variants — next-themes handles this automatically
- Admin layout is a `'use client'` component managing auth state — ThemeProvider wraps around it (or wraps its children) in the root layout
- Phase 9 used `CandidateThemeProvider` for OS-sync on candidate routes — admin does NOT use this; it uses next-themes explicit toggle instead

### Integration Points
- `apps/web/src/app/layout.tsx` (root layout) — ThemeProvider must wrap here, outside the `(admin)` route group, so it also covers the login page if needed
- Sidebar footer (user section in `layout.tsx`): toggle button added inline with Sign Out link
- New dependency: `next-themes` — needs to be added to `package.json`

</code_context>

<specifics>
## Specific Ideas

- Sun icon in light mode, moon icon in dark mode — switches to the opposite icon showing the "switch to" state vs. "current state" is Claude's discretion (both conventions exist)
- The `--card: #1a1a2e` dark value is slightly bluish; if it looks odd on admin UI after migration, nudging it toward pure zinc (`#18181b`) is acceptable without re-discussing

</specifics>

<deferred>
## Deferred Ideas

- Logo upload UI in admin settings — noted from Phase 9 discussion, still deferred to v1.3
- Brand colour picker in admin settings — env var is sufficient for v1.2
- Admin full mobile optimisation (<768px) — out of scope per REQUIREMENTS.md; tablet (≥768px) is the target
- Icon-only collapsed sidebar — considered but rejected in favour of hamburger+sheet (cleaner UX, no need to add icon set)

</deferred>

---

*Phase: 10-admin-visual-foundation*
*Context gathered: 2026-05-07*
