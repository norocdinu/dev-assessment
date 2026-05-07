# Phase 10: Admin Visual Foundation — Research

**Researched:** 2026-05-07
**Requirements:** THEME-01, UI-01, RESP-01

---

## Summary

The admin app is entirely hardcoded with Tailwind `gray-*` and `blue-*` classes across 14 files — no design tokens are used yet. Neither `next-themes` nor any shadcn/ui components (Sheet, Button) are installed; both must be added as new dependencies. The root layout has a critical constraint: it sets `--brand` via inline `style` on `<html>`, which means adding `next-themes` `ThemeProvider` there requires care to preserve that brand injection pattern while also adding `suppressHydrationWarning` to the `<html>` tag.

---

## 1. next-themes Integration

### How ThemeProvider Should Be Placed

`next-themes` `ThemeProvider` must be placed in the **root layout** (`apps/web/src/app/layout.tsx`), not the admin layout, so it wraps all routes including the login page. The root layout is currently a server component (no `'use client'`), so a thin wrapper client component is the standard pattern:

```tsx
// apps/web/src/components/ThemeProvider.tsx  (new file)
'use client';
import { ThemeProvider } from 'next-themes';
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>{children}</ThemeProvider>;
}
```

Then in `apps/web/src/app/layout.tsx`, wrap `<body>` children with `<AppThemeProvider>`.

### suppressHydrationWarning Requirement

The `<html>` tag **must** receive `suppressHydrationWarning` because `next-themes` adds the `class` attribute (`class="dark"` or `class="light"`) server-side vs. client-side and React will warn about the mismatch without it.

**Current root layout `<html>` tag:**
```tsx
<html lang="en" style={{ '--brand': brandColor } as React.CSSProperties}>
```
Must become:
```tsx
<html lang="en" suppressHydrationWarning style={{ '--brand': brandColor } as React.CSSProperties}>
```

The inline `style` prop for `--brand` survives this change — it is orthogonal to `suppressHydrationWarning`.

### useTheme() Toggle Pattern

The toggle button must live in a `'use client'` component (the admin layout already is `'use client'`). Pattern:

```tsx
import { useTheme } from 'next-themes';
const { theme, setTheme } = useTheme();
// Toggle:
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
</button>
```

Because `next-themes` may report `theme = undefined` on first render (before hydration), use `resolvedTheme` instead of `theme` for the icon condition to avoid a flicker.

### localStorage Persistence

`next-themes` automatically stores the user's choice in `localStorage` under the key `theme`. This is the default — no configuration needed. Preference survives page refresh and browser restarts. This satisfies THEME-01 with zero extra code.

### SSR/Hydration Gotchas

- Without `suppressHydrationWarning` on `<html>`, React throws a hydration warning in development because the server renders without the `dark` class but the client adds it immediately.
- The `next-themes` `ThemeProvider` with `enableSystem={false}` and `defaultTheme="light"` means first-time visitors get light mode (per D-05: no OS-sync for admin).
- Do NOT try to read `useTheme()` in a server component — it will throw. The admin layout is already `'use client'` so this is fine.
- There is a known brief flash of light theme before the JS runs if the user had selected dark. `next-themes` injects an inline script into `<head>` to apply the class before first paint, which mitigates this almost entirely. No extra work needed.

---

## 2. Current Admin Layout Audit

### File: `apps/web/src/app/(admin)/layout.tsx`

**`'use client'` directive:** YES — already present (line 1). No change needed for this directive.

**All hardcoded color classes found:**

| Location | Class(es) |
|---|---|
| Loading spinner wrapper div | `bg-gray-50` |
| Loading spinner element | `border-gray-200 border-t-blue-600` |
| Outer flex container | `bg-gray-50` |
| Sidebar `<aside>` | `bg-white border-r border-gray-200` |
| Sidebar header div | `border-b border-gray-200` |
| Sidebar title `<h1>` | `text-gray-900` |
| Nav link — active state | `bg-blue-50 text-blue-700 font-medium` |
| Nav link — inactive state | `text-gray-700 hover:bg-gray-100` |
| Sidebar footer div | `border-t border-gray-200 text-gray-500` |
| User info link | `hover:bg-gray-50` |
| User name div | `text-gray-700` |
| User email div | `text-gray-500` |
| User role div | `text-gray-400` |
| Sign out button | `text-gray-400 hover:text-gray-600` |

### Sidebar Footer Location (where toggle goes)

The sidebar footer is the `<div className="p-4 border-t border-gray-200 text-xs text-gray-500">` block at lines 70–88. It currently contains:
1. A `<Link href="/settings">` block showing name, email, and role
2. A `<button>` for Sign out

The theme toggle button should be inserted inline with or just above the Sign out button — this is the exact insertion point for D-02.

### Nav Active State

Active: `bg-blue-50 text-blue-700 font-medium`
Inactive: `text-gray-700 hover:bg-gray-100`

These must both be migrated per D-07 to:
- Active: `bg-[var(--brand)]/10 text-[var(--brand)] font-medium`
- Inactive: `text-foreground/70 hover:bg-muted/40` (or equivalent token classes)

### No Responsive Logic Currently

The layout has no mobile/tablet handling at all. The sidebar `<aside>` has `w-56` with no breakpoint qualifiers. There is no mobile top bar, no hamburger, no Sheet component. Everything for RESP-01 is net-new code.

---

## 3. Design Token Migration Map

### Token Reference (from `globals.css` + `tailwind.config.ts`)

| CSS Variable | Value (light) | Value (dark) | Tailwind Class |
|---|---|---|---|
| `--background` | `#fafafa` | `#09090b` | `bg-background`, `text-background` |
| `--card` | `#ffffff` | `#1a1a2e` | `bg-card` |
| `--foreground` | `#18181b` | `#f4f4f5` | `text-foreground` |
| `--muted` | `#71717a` | `#71717a` | `text-muted` |
| `--border` | `#e4e4e7` | `#27272a` | `border-border` |
| `--brand` | `#6366f1` | same | `bg-[var(--brand)]`, `text-[var(--brand)]` |

Note: `muted` is used in `tailwind.config.ts` as a color but its semantic meaning in design token parlance covers both muted text AND muted background. For `bg-gray-50` use `bg-background` (or `bg-muted/10` for subtle differentiation); for `bg-gray-100` hover states use `hover:bg-muted/20`.

### Hardcoded → Token Mapping

| Hardcoded Class | Token Replacement | Notes |
|---|---|---|
| `bg-white` | `bg-card` | Card/panel backgrounds |
| `bg-gray-50` | `bg-background` | Page/layout backgrounds |
| `bg-gray-50` (table header, sticky top) | `bg-muted/10` | Subtle alt row/header bg |
| `bg-gray-50/50` | `bg-muted/5` | Alternating table rows |
| `bg-gray-100` | `bg-muted/20` | Hover backgrounds |
| `hover:bg-gray-50` | `hover:bg-muted/10` | Hover states |
| `hover:bg-gray-100` | `hover:bg-muted/20` | Hover states |
| `border-gray-200` | `border-border` | Standard borders |
| `border-gray-100` | `border-border/50` | Subtle/divider borders |
| `border-gray-300` | `border-border` | Input borders |
| `text-gray-900` | `text-foreground` | Primary text |
| `text-gray-700` | `text-foreground/80` | Secondary text |
| `text-gray-600` | `text-foreground/70` | Tertiary text |
| `text-gray-500` | `text-muted` | Muted/label text |
| `text-gray-400` | `text-muted/70` | Placeholder/faint text |
| `bg-blue-50 text-blue-700` | `bg-[var(--brand)]/10 text-[var(--brand)]` | Active nav, info banners |
| `text-blue-600` | `text-[var(--brand)]` | Links, action text |
| `bg-blue-600 hover:bg-blue-700` | `bg-[var(--brand)] hover:bg-[var(--brand)]/90` | Primary buttons |
| `border-t-blue-600` | `border-t-[var(--brand)]` | Spinners |
| `hover:bg-blue-50` | `hover:bg-[var(--brand)]/10` | Table row hover |
| `bg-blue-500` | `bg-[var(--brand)]/80` | Score bar fill (submissions) |
| `bg-blue-100 text-blue-700` | `bg-[var(--brand)]/10 text-[var(--brand)]` | Role badge (accounts page) |

**Preserved as-is (semantic status colors):**
- `bg-green-100 text-green-700` — pass badges
- `bg-red-100 text-red-700` — fail badges
- `text-green-600` — correct answer indicator
- `text-red-500`/`text-red-600` — wrong answer / error text
- `text-orange-600` — archive action
- `bg-yellow-50 border-yellow-200 text-yellow-800/700` — bulk delete warning
- `bg-green-50 border-green-200` — generated link success box
- `bg-amber-50 text-amber-600` — test config warning

### Files Requiring Token Migration (14 total)

| File | Hardcoded Colors | Complexity |
|---|---|---|
| `apps/web/src/app/(admin)/layout.tsx` | `bg-gray-50`, `bg-white`, `border-gray-200`, `text-gray-900/700/500/400`, `bg-blue-50`, `text-blue-700`, `hover:bg-gray-100`, `border-t-blue-600` | Medium — also gets ThemeProvider wiring + responsive sidebar |
| `apps/web/src/app/(admin)/dashboard/page.tsx` | `bg-white`, `border-gray-200`, `text-gray-900/500`, `border-gray-100`, `border-t-blue-600`, `text-gray-400` | Low |
| `apps/web/src/app/(admin)/questions/page.tsx` | `text-gray-900/700/600/400/500`, `border-gray-300/200/100`, `bg-white`, `bg-yellow-50/border-yellow-200`, `bg-blue-600/hover:bg-blue-700`, `text-blue-600`, `border-gray-300` | High — many classes, bulk action bar, modal |
| `apps/web/src/app/(admin)/questions/new/page.tsx` | `text-gray-900` | Trivial — just page heading |
| `apps/web/src/app/(admin)/questions/[familyId]/edit/page.tsx` | Likely same as new — needs inspection | Low (not read, but pattern matches) |
| `apps/web/src/app/(admin)/submissions/page.tsx` | `bg-white`, `border-gray-200/300/100`, `text-gray-900/500/400/600`, `bg-blue-600/hover:bg-blue-700`, `text-blue-600`, `bg-blue-50`, `bg-gray-50`, `bg-gray-100`, `bg-blue-500` | High — filter bar, stats panel, table, pagination |
| `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` | `bg-white`, `border-gray-200/100`, `text-gray-900/700/500/400`, `border-t-blue-600`, `text-blue-600`, `divide-gray-100` | Medium |
| `apps/web/src/app/(admin)/test-configs/page.tsx` | `text-gray-900/400`, `text-blue-600`, `bg-blue-600/hover:bg-blue-700` | Low |
| `apps/web/src/app/(admin)/test-configs/new/page.tsx` | `text-gray-900/700/600`, `border-gray-300`, `bg-blue-600/hover:bg-blue-700`, `text-amber-600 bg-amber-50` | Low — amber is semantic, keep |
| `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` | `text-gray-900/700/600/400`, `border-gray-300/200`, `bg-white`, `bg-green-50 border-green-200`, `text-blue-600`, `bg-blue-600/hover:bg-blue-700`, `hover:bg-gray-50` | Medium — success box is semantic green, keep |
| `apps/web/src/app/(admin)/accounts/page.tsx` | `text-gray-900/700`, `text-blue-600`, `bg-blue-600/hover:bg-blue-700`, `bg-blue-100 text-blue-700` (role badge) | Low-Medium — role badge accent is migratable |
| `apps/web/src/app/(admin)/accounts/new/page.tsx` | `text-gray-900/700`, `border-gray-300`, `bg-blue-600/hover:bg-blue-700` | Low |
| `apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx` | `text-gray-900/700/500`, `border-gray-300`, `bg-gray-50 cursor-not-allowed`, `bg-blue-600/hover:bg-blue-700` | Low |
| `apps/web/src/app/(admin)/settings/page.tsx` | `text-gray-900/700/500`, `border-gray-300/200`, `bg-gray-50 cursor-not-allowed`, `bg-blue-600/hover:bg-blue-700` | Low |
| `apps/web/src/app/(admin)/compare/page.tsx` | `text-gray-900/700/600/500/400`, `border-gray-200/100`, `bg-gray-50/50`, `bg-gray-100`, `text-blue-600` | Medium |
| `apps/web/src/components/ui/DataTable.tsx` | `bg-gray-50`, `border-gray-200/100/300`, `text-gray-600/700/400`, `bg-white`, `hover:bg-blue-50`, `bg-gray-50/50`, `hover:bg-gray-50` | Medium — shared component, highest impact |
| `apps/web/src/components/ui/QuestionForm.tsx` | `text-gray-700`, `border-gray-300`, `bg-blue-50 text-blue-600` (version banner), `bg-blue-600/hover:bg-blue-700` | Low |

**Total: 16 files** (14 admin pages/layouts + 2 shared UI components)

### Special Cases / Non-trivial Migrations

1. **`DataTable.tsx` alternating rows:** `i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'` — conditional class; both values need migrating. Becomes `i % 2 === 1 ? 'bg-muted/5' : 'bg-card'`.

2. **`submissions/page.tsx` score distribution bars:** `bg-blue-500` on a width-dynamic inline style div. Migrates to `bg-[var(--brand)]/80`.

3. **`accounts/page.tsx` role badge:** `roleBadgeClass` is a constant object — only the `owner` entry (`bg-blue-100 text-blue-700`) migrates to brand token; `reviewer` (`bg-gray-100 text-gray-700`) becomes muted tokens; `member` (`bg-green-100 text-green-700`) is semantic, keep.

4. **`settings/page.tsx` and `accounts/[id]/edit/page.tsx` read-only input:** `bg-gray-50 cursor-not-allowed text-gray-500` — the `bg-gray-50` migrates to `bg-muted/10`, the text becomes `text-muted`.

5. **`test-configs/[id]/links/page.tsx` generated-link box:** `bg-green-50 border-green-200` — semantic success color, keep as-is.

---

## 4. Responsive Sidebar Implementation

### Current Sidebar Structure

The entire sidebar is a single `<aside className="w-56 bg-white border-r border-gray-200 flex flex-col">` with no breakpoint qualifiers. It always renders. The outer wrapper is `<div className="flex h-screen bg-gray-50">` — standard full-height flex row.

There is **no mobile top bar, no hamburger, no responsive logic** currently.

### Sheet Component Availability

No shadcn/ui Sheet component exists in the codebase. The `apps/web/src/components/ui/` directory only contains `DataTable.tsx` and `QuestionForm.tsx`. The Sheet must be either:

**Option A — Install shadcn/ui Sheet:** Run `npx shadcn@latest add sheet` which adds `apps/web/src/components/ui/sheet.tsx` and requires `@radix-ui/react-dialog` as a peer dependency.

**Option B — Hand-roll a simple Sheet:** A custom slide-in panel using a fixed-position div + backdrop + CSS `translate-x` transition. No extra dependencies. Simpler to implement and maintain for a single use case.

Given that shadcn/ui is referenced in STATE.md as already present for charts (Recharts integration), **but no shadcn/ui component files exist in `/components/ui/`**, Option B (hand-roll) is safer and avoids installing the full Radix Dialog dependency chain. The sheet pattern is straightforward: fixed overlay, fixed panel, CSS transition.

### Responsive Pattern (Decision D-11 through D-15)

```
≥768px:  sidebar always visible (w-56, no changes from current layout)
<768px:  sidebar hidden (hidden md:flex or similar)
         → sticky top bar: h-12, flex, items-center, px-4
           contains: hamburger button (left) + app title (center or right of button)
         → hamburger opens slide-in sheet (fixed, z-50, left-0, top-0, h-full, w-56)
         → overlay backdrop (fixed inset-0, bg-black/40, z-40) closes on click
```

### State Management

Since `(admin)/layout.tsx` is already `'use client'`, add a single `useState` for `mobileMenuOpen`:

```tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

The hamburger button sets it to `true`; the overlay click and nav link clicks set it to `false`. No additional state library needed.

### Top Bar Structure

```tsx
{/* Mobile-only top bar */}
<div className="md:hidden sticky top-0 z-30 h-12 bg-card border-b border-border flex items-center px-4 gap-3">
  <button onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
    {/* ☰ hamburger icon — lucide-react Menu icon */}
  </button>
  <span className="text-sm font-semibold text-foreground">Dev Assessment</span>
</div>
```

### Sheet Overlay Implementation

```tsx
{/* Mobile sidebar overlay */}
{mobileMenuOpen && (
  <>
    <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
    <aside className="fixed left-0 top-0 h-full w-56 bg-card border-r border-border flex flex-col z-50 md:hidden">
      {/* Same nav content as desktop sidebar */}
    </aside>
  </>
)}
```

The desktop sidebar becomes `hidden md:flex flex-col` (hidden on mobile, visible on desktop).

---

## 5. Dependencies

### next-themes

**Status: NOT installed.** Not present in `apps/web/package.json` dependencies or devDependencies.

**Install:** `npm install next-themes` in `apps/web/`

**Latest stable version:** 0.4.x (as of research date). The `package.json` uses caret ranges so `"next-themes": "^0.4.0"` is appropriate.

### lucide-react (Sun/Moon/Menu icons)

**Status: NOT installed.** Not present in `apps/web/package.json`. The codebase currently uses no icon library — icons are absent from the layout.

**Install:** `npm install lucide-react` in `apps/web/`

Needed icons: `Sun`, `Moon` (theme toggle), `Menu` (hamburger). All in one lightweight package.

**Alternative:** Use text/emoji (`☰`, `🌙`, `☀`) or inline SVGs to avoid adding a dependency. Given the project uses no icon library at all, installing lucide-react for just 3 icons is a judgment call for the planner.

### shadcn/ui Sheet

**Status: NOT installed.** No shadcn/ui component files exist. The `/components/ui/` folder only has hand-written `DataTable.tsx` and `QuestionForm.tsx`.

**Recommendation:** Hand-roll the sheet (see Section 4) rather than pulling in Radix UI. The admin layout is the only place a sheet is needed.

### @tanstack/react-table, axios, sonner, recharts

All already installed — no changes needed.

---

## 6. Implementation Sequence & Risks

### Correct Sequence

**Wave 1 — Foundation (blocks everything else):**
1. Install `next-themes` (and optionally `lucide-react`)
2. Add `suppressHydrationWarning` to `<html>` in `apps/web/src/app/layout.tsx`
3. Create `AppThemeProvider` wrapper client component
4. Wrap root layout `<body>` with `AppThemeProvider`
5. Add theme toggle button to admin layout sidebar footer (uses `useTheme()`)

**Wave 2 — Token Migration (can start once Wave 1 is in):**
6. Migrate `apps/web/src/components/ui/DataTable.tsx` — highest priority as it affects all list pages
7. Migrate `apps/web/src/app/(admin)/layout.tsx` hardcoded classes (alongside responsive sidebar work)
8. Migrate all admin pages (can be done in parallel across files)

**Wave 3 — Responsive Sidebar (can run parallel with Wave 2):**
9. Add `mobileMenuOpen` state to admin layout
10. Add mobile top bar (hidden on ≥768px)
11. Add desktop sidebar visibility breakpoint qualifier
12. Add mobile sheet overlay with nav content

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Hydration flash (FOUC)** — brief white flash before dark mode applies | Medium | `suppressHydrationWarning` + `next-themes` inline script handles this; use `resolvedTheme` not `theme` for icon rendering |
| **Root layout ThemeProvider breaks brand color injection** | Low | The `--brand` inline style on `<html>` is preserved independently; ThemeProvider only adds/removes the `dark` CSS class, doesn't touch inline styles |
| **`useTheme()` returns `undefined` on first render** | Medium | Use `resolvedTheme ?? 'light'` pattern for icon condition; avoids wrong icon on mount |
| **Token opacity modifiers not working for `--brand`** | Medium-High | `--brand` is defined as a hex value (`#6366f1`), NOT as RGB triplets like other tokens. Tailwind opacity modifiers (`bg-[var(--brand)]/10`) require the value to be resolvable to RGB. This WILL work with arbitrary value syntax `bg-[var(--brand)]/10` only if Tailwind can process it — in practice Tailwind cannot apply opacity to arbitrary CSS variable references using the slash syntax. Use `bg-[color:var(--brand)]/10` or create a `bg-brand/10` Tailwind token. **Alternative that definitely works:** `bg-[var(--brand)]` at full opacity, and use `opacity-10` on a wrapper, or define brand as RGB triplet too. This is a non-trivial gotcha requiring a decision. |
| **DataTable alternating row classes are conditional JS expressions** | Low | Just migrate both sides of the ternary — `'bg-muted/5'` and `'bg-card'` — no structural change needed |
| **Mobile sheet overlaps `Toaster`** | Low | Set `Toaster` z-index higher (or `z-[100]`) and ensure it's rendered outside the sheet |
| **`sticky top-0` table header in DataTable conflicts with mobile top bar** | Low | Sticky header is scoped to `overflow-x-auto` scroll container; no conflict with page-level sticky top bar |
| **CandidateThemeProvider conflicts with next-themes on admin routes** | None | `CandidateThemeProvider` only runs in candidate routes (`/test/`, `/result/`); admin routes use the admin layout; no overlap |

### The --brand Opacity Gotcha (Important for Planner)

This is the most significant technical risk. The existing CSS variables `--background`, `--card`, `--foreground`, `--muted`, `--border` are defined as **RGB triplets** (e.g., `250 250 250`) which enables Tailwind's opacity modifier syntax like `bg-background/50`. However, `--brand` is defined as **hex** (`#6366f1`) because it doesn't need opacity modifiers for most uses.

For D-07 (active nav: `bg-[var(--brand)]/10`), the slash opacity syntax will NOT work with a hex CSS variable.

**Solutions (pick one):**
1. Add `--brand-rgb: 99 102 241` (the RGB triplet for indigo-500) to `:root` in `globals.css`, and use `bg-[rgb(var(--brand-rgb))]/10` for opacity-modifiable brand backgrounds. This mirrors how the other tokens work.
2. Use a fixed low-opacity indigo color for the active nav background (e.g., `bg-indigo-50`) and only use `text-[var(--brand)]` for the text — partial token migration.
3. Use Tailwind's `opacity` utility in combination with `bg-[var(--brand)]` — but this affects child element opacity too, which is undesirable.

**Recommended:** Option 1 — add `--brand-rgb` alongside `--brand` in `globals.css`.

---

## Planning Recommendations

### Task Breakdown Suggestion

**Plan A — ThemeProvider & Toggle** (1 plan, ~3–4 tasks):
- Install `next-themes` + `lucide-react`
- Patch root layout: `suppressHydrationWarning` + `AppThemeProvider` wrapper
- Add toggle button to admin sidebar footer using `useTheme()`
- Test: toggle persists in localStorage, dark class applied to `<html>`, no hydration warning

**Plan B — Design Token Migration** (1 plan, ~5–6 tasks):
- Resolve `--brand-rgb` question before coding (add RGB triplet to `globals.css` or choose alternative)
- Migrate `DataTable.tsx` and `QuestionForm.tsx` (shared components — do first)
- Migrate `layout.tsx` hardcoded classes
- Migrate high-complexity pages: `questions/page.tsx`, `submissions/page.tsx`
- Migrate remaining low-complexity pages (accounts, settings, test-configs, compare, submissions/[linkId], questions/new|edit)
- Visual review: each page in both light and dark mode

**Plan C — Responsive Sidebar** (1 plan, ~4 tasks):
- Add `mobileMenuOpen` state + sticky mobile top bar (hamburger + title)
- Make desktop sidebar `hidden md:flex`
- Implement mobile sheet overlay (hand-rolled)
- Test at 768px boundary: sidebar shows/hides correctly, overlay closes on backdrop click

### Wave Ordering for Parallel Execution

Plans A and B can partially overlap: ThemeProvider must land before token migration can be visually tested in dark mode, but the token migration coding itself is independent. Plan C is independent of A and B at the code level (responsive layout changes) but should be merged after A for correct dark mode classes on the mobile top bar and sheet.

### Key Gotchas for the Planner

1. **`--brand` RGB triplet** — must be resolved in `globals.css` before Plan B token migration starts
2. **`suppressHydrationWarning` must be on `<html>`, not `<body>`** — common mistake
3. **`resolvedTheme` not `theme`** — prevents wrong icon on first render
4. **No shadcn/ui Sheet installed** — hand-roll it; don't assume it's available
5. **No `lucide-react` installed** — must be added to `package.json`
6. **16 files need migration** — the scope is wider than "just admin pages"; `DataTable.tsx` and `QuestionForm.tsx` in `components/ui/` are shared and should be migrated first
7. **`questions/[familyId]/edit/page.tsx` was not read** — inspect before migrating; it likely mirrors `new/page.tsx` + `QuestionForm.tsx` patterns
8. **Semantic status colors** (`green`, `red`, `orange`, `yellow`, `amber`) are intentionally preserved and must NOT be migrated to brand/neutral tokens
9. **Admin layout renders `<Toaster>` outside the sidebar** — no z-index conflict with the planned mobile sheet unless the sheet z-index is ≥ the Toaster's default; set Toaster to `z-[100]` to be safe

---

## RESEARCH COMPLETE
