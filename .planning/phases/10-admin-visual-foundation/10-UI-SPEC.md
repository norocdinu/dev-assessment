---
phase: 10
slug: admin-visual-foundation
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-07
---

# UI-SPEC — Phase 10: Admin Visual Foundation

This document is the visual and interaction contract for Phase 10. It is consumed by planners and executors. Every value here is specific and verifiable.

---

## 1. Design System

| Dimension | Choice |
|-----------|--------|
| Styling tool | CSS variables + Tailwind utility classes |
| Component library | None — all components are hand-rolled |
| Icon library | `lucide-react` (NOT currently installed — must be added) |
| Icons required | `Sun`, `Moon` (theme toggle), `Menu` (hamburger) |
| Dark mode mechanism | `darkMode: 'class'` in Tailwind; `dark` class toggled on `<html>` by `next-themes` |
| Theme persistence | `localStorage` (key: `theme`) via `next-themes` default — no cookie needed |
| Font | System font stack (no custom font defined in `globals.css`; Tailwind default applies: `ui-sans-serif, system-ui, sans-serif`) |
| shadcn/ui Sheet | Not installed — hand-roll the mobile slide-in sheet (see Section 8) |

---

## 2. Spacing Scale

Uses Tailwind default spacing scale. The following tokens are the ones actually used in the admin layout — executors MUST use these and not invent new values.

| Context | Token | Pixel value |
|---------|-------|-------------|
| Sidebar padding (sides, top, nav items) | `p-4` | 16px |
| Sidebar header vertical padding | `py-4` | 16px top + bottom |
| Sidebar nav section top margin | `mt-1` | 4px |
| Nav item padding | `px-3 py-2` | 12px / 8px |
| Nav item icon gap | `gap-3` | 12px |
| Sidebar footer padding | `p-4` | 16px |
| Sidebar footer item gap | `gap-2` | 8px |
| Mobile top bar padding | `px-4` | 16px |
| Mobile top bar height | `h-12` | 48px |
| Mobile top bar icon-to-title gap | `gap-3` | 12px |
| Main content area padding | `p-6` | 24px |
| Card padding | `p-6` | 24px |
| Card inner section gap | `gap-4` | 16px |
| Table cell padding | `px-4 py-3` | 16px / 12px |

---

## 3. Typography

No custom font is loaded. The app uses Tailwind's default system font stack throughout.

### Admin Layout Type Scale

| Element | Tailwind classes | Notes |
|---------|-----------------|-------|
| Sidebar title / app name | `text-sm font-semibold` | "Dev Assessment" |
| Nav item labels | `text-sm` | 14px, default weight |
| Active nav item label | `text-sm font-medium` | 14px, medium weight |
| Mobile top bar app title | `text-sm font-semibold` | Same as sidebar title |
| Sidebar footer user name | `text-xs font-medium` | 12px |
| Sidebar footer user email | `text-xs` | 12px |
| Sidebar footer user role | `text-xs` | 12px |
| Sign Out button label | `text-xs` | 12px |
| Page headings (admin pages) | `text-2xl font-bold` | 24px, used on dashboard and list pages |
| Section headings | `text-lg font-semibold` | 18px |
| Table column headers | `text-xs font-medium uppercase tracking-wider` | 12px |
| Table body cells | `text-sm` | 14px |
| Label / helper text | `text-xs text-muted` | 12px, muted color |
| Badge text | `text-xs font-medium` | 12px |

---

## 4. Color

### 4.1 CSS Variable Definitions (from `globals.css`)

All non-brand variables are stored as **RGB triplets** (no `#` prefix), enabling Tailwind's opacity modifier syntax (`bg-background/50`).

#### Light Mode (`:root`)

| Variable | Raw value | Hex | Semantic meaning |
|----------|-----------|-----|-----------------|
| `--background` | `250 250 250` | `#fafafa` | Page/layout background |
| `--card` | `255 255 255` | `#ffffff` | Panel, sidebar, modal background |
| `--foreground` | `24 24 27` | `#18181b` | Primary text |
| `--muted` | `113 113 122` | `#71717a` | Secondary/label/placeholder text |
| `--border` | `228 228 231` | `#e4e4e7` | Dividers, input borders, card borders |
| `--brand` | `#6366f1` | `#6366f1` | Accent / brand indigo (hex, not RGB triplet — see Section 4.3) |

#### Dark Mode (`.dark`)

| Variable | Raw value | Hex | Notes |
|----------|-----------|-----|-------|
| `--background` | `9 9 11` | `#09090b` | Near-black zinc |
| `--card` | `26 26 46` | `#1a1a2e` | Bluish-dark panel (carry from Phase 9 — may be tuned to `#18181b` zinc if it looks wrong) |
| `--foreground` | `244 244 245` | `#f4f4f5` | Near-white |
| `--muted` | `113 113 122` | `#71717a` | Same as light (intentional) |
| `--border` | `39 39 42` | `#27272a` | Dark zinc border |
| `--brand` | _(not overridden)_ | `#6366f1` | Same indigo in dark mode |

### 4.2 Token-to-Class Mapping

| CSS Variable | Tailwind class (background) | Tailwind class (text) | Tailwind class (border) |
|---|---|---|---|
| `--background` | `bg-background` | — | — |
| `--card` | `bg-card` | — | — |
| `--foreground` | — | `text-foreground` | — |
| `--muted` | `bg-muted` / `bg-muted/10` / `bg-muted/20` | `text-muted` / `text-muted/70` | — |
| `--border` | — | — | `border-border` / `border-border/50` |
| `--brand` | `bg-[var(--brand)]` | `text-[var(--brand)]` | `border-[var(--brand)]` / `border-t-[var(--brand)]` |
| `--brand-rgb` (to be added) | `bg-[rgb(var(--brand-rgb))]/10` | — | — |

Opacity modifiers on `background`, `card`, `foreground`, `muted`, `border` work because those variables are RGB triplets. The `--brand` token is a hex value — see Section 4.3 for the required fix.

### 4.3 Required Change: `--brand-rgb` Addition to `globals.css`

The active nav item background (`bg-[var(--brand)]/10`) requires the brand color as an RGB triplet to support Tailwind opacity modifiers. Tailwind cannot apply the `/10` opacity modifier to an arbitrary CSS variable that resolves to a hex value.

**Required addition to `:root` in `globals.css`:**

```css
--brand-rgb: 99 102 241;   /* RGB triplet for #6366f1 — enables opacity modifiers */
```

The existing `--brand: #6366f1` line is kept as-is (used for full-opacity `text-[var(--brand)]` and `bg-[var(--brand)]`).

**Usage pattern for brand with opacity:**
```
bg-[rgb(var(--brand-rgb))]/10    ← active nav background (10% opacity indigo)
text-[var(--brand)]              ← active nav text (full opacity)
```

This addition must land **before** any token migration coding begins (Plan B dependency).

### 4.4 Preserved Colors (Semantic — Do NOT Migrate)

These classes carry semantic meaning and must be preserved exactly as-is across all admin pages. Executors must not replace these with brand or neutral tokens.

| Class pattern | Semantic meaning |
|---------------|-----------------|
| `bg-green-100 text-green-700` | Pass badges, correct answer indicators |
| `text-green-600` | Correct answer inline text |
| `bg-red-100 text-red-700` | Fail badges |
| `text-red-500` / `text-red-600` | Wrong answer / error text |
| `text-orange-600` | Archive action text |
| `bg-yellow-50 border-yellow-200 text-yellow-800` | Bulk delete warning banner |
| `bg-yellow-50 border-yellow-200 text-yellow-700` | Bulk delete warning banner (variant) |
| `bg-green-50 border-green-200` | Generated link success box background |
| `bg-amber-50 text-amber-600` | Test config warning / info |
| `bg-member` variant: `bg-green-100 text-green-700` | Role badge for "member" accounts |

### 4.5 Migrated Colors (Gray and Blue → Tokens)

All of the following classes must be replaced with design tokens across all 16 files in scope.

#### Gray → Neutral Tokens

| Hardcoded class | Replacement | Notes |
|---|---|---|
| `bg-white` | `bg-card` | Sidebar, card, panel backgrounds |
| `bg-gray-50` | `bg-background` | Page-level background |
| `bg-gray-50` (table header / sticky row) | `bg-muted/10` | Subtle alt background |
| `bg-gray-50/50` | `bg-muted/5` | Alternating table rows (odd rows) |
| `bg-gray-100` | `bg-muted/20` | Hover / pressed backgrounds |
| `hover:bg-gray-50` | `hover:bg-muted/10` | Hover state |
| `hover:bg-gray-100` | `hover:bg-muted/20` | Hover state |
| `border-gray-200` | `border-border` | Standard border |
| `border-gray-100` | `border-border/50` | Subtle divider |
| `border-gray-300` | `border-border` | Input / form border |
| `text-gray-900` | `text-foreground` | Primary text |
| `text-gray-700` | `text-foreground/80` | Secondary text |
| `text-gray-600` | `text-foreground/70` | Tertiary text |
| `text-gray-500` | `text-muted` | Muted label text |
| `text-gray-400` | `text-muted/70` | Placeholder / faint text |
| `bg-gray-50 cursor-not-allowed` | `bg-muted/10 cursor-not-allowed` | Read-only input fields |
| `bg-gray-100 text-gray-700` (reviewer badge) | `bg-muted/20 text-foreground/70` | Role badge for "reviewer" accounts |
| `divide-gray-100` | `divide-border/50` | Table row dividers |

#### Blue → Brand Tokens

| Hardcoded class | Replacement | Notes |
|---|---|---|
| `bg-blue-50 text-blue-700` | `bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)]` | Active nav, info banners — requires `--brand-rgb` |
| `text-blue-600` | `text-[var(--brand)]` | Links, action text |
| `text-blue-700` | `text-[var(--brand)]` | Active state text |
| `bg-blue-600` | `bg-[var(--brand)]` | Primary button background |
| `hover:bg-blue-700` | `hover:bg-[var(--brand)]/90` | Primary button hover |
| `border-t-blue-600` | `border-t-[var(--brand)]` | Loading spinner accent border |
| `hover:bg-blue-50` | `hover:bg-[rgb(var(--brand-rgb))]/10` | Table row hover (submissions) |
| `bg-blue-500` | `bg-[var(--brand)]/80` | Score distribution bar fill |
| `bg-blue-100 text-blue-700` (owner badge) | `bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)]` | Role badge for "owner" accounts |
| `bg-blue-50 text-blue-600` (version banner) | `bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)]` | QuestionForm version banner |

---

## 5. Copywriting Contract

These strings are locked. Executors must use exactly these values — no paraphrasing.

| Element | Text / Value | Notes |
|---------|-------------|-------|
| Sidebar app title | `Dev Assessment` | Existing — preserve |
| Mobile top bar app title | `Dev Assessment` | Same as sidebar title |
| Theme toggle button | _(no text — icon only)_ | Sun icon in light mode, Moon icon in dark mode |
| Theme toggle `aria-label` | `Toggle theme` | Required for accessibility |
| Hamburger button `aria-label` | `Open menu` | Required for accessibility |
| Sidebar "Sign out" button | `Sign out` | Existing — preserve exactly (lowercase "out") |
| Nav item labels | _(existing labels — preserve)_ | Dashboard, Questions, Submissions, Test Configs, Accounts, Settings, Compare — do not rename |

### Icon Convention

The toggle shows the icon representing the **current mode** (so the user knows what mode they are in, not where they are going):
- Light mode active → show `Sun` icon
- Dark mode active → show `Moon` icon

Implementation uses `resolvedTheme` (not `theme`) to avoid a wrong icon on first render:
```tsx
{resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
```

---

## 6. Interaction States

All class strings below are exact and verifiable. Executors must use these verbatim.

### Nav Items

| State | Exact class string |
|-------|-------------------|
| Active | `bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)] font-medium` |
| Inactive | `text-foreground/80 hover:bg-muted/20` |
| Inactive (transition) | `text-foreground/80 hover:bg-muted/20 transition-colors` |

Note: The active background requires `--brand-rgb` to be defined in `globals.css` (Section 4.3). Without it, fall back to `bg-indigo-50` for light mode only — but the `--brand-rgb` approach is the required solution.

### Theme Toggle Button

| State | Exact class string |
|-------|-------------------|
| Default | `p-1.5 rounded-md text-muted` |
| Hover | `p-1.5 rounded-md text-muted hover:bg-muted/20 hover:text-foreground transition-colors` |

### Sign Out Button

| State | Exact class string |
|-------|-------------------|
| Default | `text-muted` |
| Hover | `text-muted hover:text-foreground transition-colors` |

### Hamburger Button (mobile)

| State | Exact class string |
|-------|-------------------|
| Default | `text-foreground` |
| Hover | `text-foreground hover:bg-muted/20 p-1.5 rounded-md transition-colors` |

### Primary Buttons (admin pages)

| State | Exact class string |
|-------|-------------------|
| Default | `bg-[var(--brand)] text-white` |
| Hover | `bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white transition-colors` |

### Mobile Overlay Backdrop

| Element | Exact class string |
|---------|-------------------|
| Overlay div | `fixed inset-0 bg-black/40 z-40 md:hidden` |

### Loading Spinner

| Element | Exact class string |
|---------|-------------------|
| Wrapper | `bg-background` (was `bg-gray-50`) |
| Spinner border | `border-border border-t-[var(--brand)]` (was `border-gray-200 border-t-blue-600`) |

### DataTable Alternating Rows

| Row | Exact class string |
|-----|-------------------|
| Even rows | `bg-card` (was `bg-white`) |
| Odd rows | `bg-muted/5` (was `bg-gray-50/50`) |
| Row hover | `hover:bg-[rgb(var(--brand-rgb))]/10` (submissions table) or `hover:bg-muted/10` (general tables) |

---

## 7. Responsive Breakpoints

| Viewport | Sidebar | Top bar | Behaviour |
|----------|---------|---------|-----------|
| ≥768px (`md` and above) | Persistent `w-56` left panel, always visible | Hidden (`md:hidden` on top bar) | Current behaviour preserved — no functional change |
| <768px (below `md`) | Hidden (`hidden md:flex`) | Sticky, `h-12`, `z-30` | Hamburger icon opens sheet overlay |

### Desktop Sidebar Classes

```
hidden md:flex flex-col w-56 bg-card border-r border-border
```

### Mobile Top Bar Classes

```
md:hidden sticky top-0 z-30 h-12 bg-card border-b border-border flex items-center px-4 gap-3
```

### Mobile Sheet (slide-in overlay — hand-rolled, no Radix)

```
fixed left-0 top-0 h-full w-56 bg-card border-r border-border flex flex-col z-50 md:hidden
```

**Animation:** Snap-open (no slide transition) is acceptable for v1.2. If a slide-in is desired, add `transition-transform duration-200` with controlled `translate-x-0` / `-translate-x-full` — but this requires a conditional class based on `mobileMenuOpen` state. Default to snap unless the project specifically requests animation.

The sheet contains the **full sidebar content** (logo/title, nav links, user footer with theme toggle and Sign Out). This is a content duplication between desktop sidebar and mobile sheet — it is intentional per D-15.

### State Variable

In `apps/web/src/app/(admin)/layout.tsx` (already `'use client'`):

```tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

- `setMobileMenuOpen(true)` — hamburger button `onClick`
- `setMobileMenuOpen(false)` — overlay backdrop `onClick`, nav link `onClick`

### Z-Index Stack

| Layer | `z-index` | Element |
|-------|-----------|---------|
| Page content | default | Main content area |
| Sticky top bar | `z-30` | Mobile top bar |
| Overlay backdrop | `z-40` | `bg-black/40` dimming layer |
| Mobile sheet | `z-50` | Slide-in sidebar |
| Toaster | `z-[100]` | Sonner Toaster — must be above all overlay layers |

---

## 8. next-themes Wiring Contract

This section locks the ThemeProvider integration contract that executors must follow exactly.

### New File: `apps/web/src/components/ThemeProvider.tsx`

```tsx
'use client';
import { ThemeProvider } from 'next-themes';
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
```

### Root Layout `<html>` Tag Patch

File: `apps/web/src/app/layout.tsx`

Before:
```tsx
<html lang="en" style={{ '--brand': brandColor } as React.CSSProperties}>
```

After:
```tsx
<html lang="en" suppressHydrationWarning style={{ '--brand': brandColor } as React.CSSProperties}>
```

`suppressHydrationWarning` is required because `next-themes` adds the `class="dark"` or `class="light"` attribute client-side, causing a React hydration mismatch warning without this flag. The `--brand` inline style is orthogonal and must be preserved.

### Admin Layout Toggle Pattern

```tsx
import { useTheme } from 'next-themes';
const { resolvedTheme, setTheme } = useTheme();
// ...
<button
  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
  aria-label="Toggle theme"
  className="p-1.5 rounded-md text-muted hover:bg-muted/20 hover:text-foreground transition-colors"
>
  {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
</button>
```

Use `resolvedTheme` (not `theme`) to avoid rendering the wrong icon on first hydration.

---

## 9. Package Registry Safety

| Package | Version | Registry | Safety verdict |
|---------|---------|----------|---------------|
| `next-themes` | `^0.4.0` | npm (official) | Safe — no shadcn registry involved; pure JS, zero transitive dependencies |
| `lucide-react` | `latest` | npm (official) | Safe — standard icon library, tree-shakeable; only 3 icons imported |

Neither package routes through the shadcn/ui CLI or Radix UI registry. Install directly:

```bash
npm install next-themes lucide-react
```

Run in `apps/web/` directory.

---

## 10. Token Migration File Scope

17 files require token migration. Executors must not skip any.

| File | Complexity | Notes |
|------|-----------|-------|
| `apps/web/src/components/ui/DataTable.tsx` | Medium | Shared — migrate first; affects all list pages |
| `apps/web/src/components/ui/QuestionForm.tsx` | Low | Shared — migrate with DataTable |
| `apps/web/src/app/(admin)/layout.tsx` | Medium | Also receives ThemeProvider wiring + responsive sidebar |
| `apps/web/src/app/(admin)/dashboard/page.tsx` | Low | — |
| `apps/web/src/app/(admin)/questions/page.tsx` | High | Bulk action bar, modal, many classes |
| `apps/web/src/app/(admin)/questions/new/page.tsx` | Trivial | Only page heading |
| `apps/web/src/app/(admin)/questions/[familyId]/edit/page.tsx` | Low | Inspect before migrating — likely mirrors new/page.tsx |
| `apps/web/src/app/(admin)/submissions/page.tsx` | High | Filter bar, stats panel, score bars, pagination |
| `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` | Medium | — |
| `apps/web/src/app/(admin)/test-configs/page.tsx` | Low | — |
| `apps/web/src/app/(admin)/test-configs/new/page.tsx` | Low | Amber warning is semantic — preserve |
| `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` | Medium | Green success box is semantic — preserve |
| `apps/web/src/app/(admin)/accounts/page.tsx` | Low-Medium | `roleBadgeClass` constant has 3 entries — only `owner` and `reviewer` migrate |
| `apps/web/src/app/(admin)/accounts/new/page.tsx` | Low | — |
| `apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx` | Low | Read-only input special case (Section 4.5) |
| `apps/web/src/app/(admin)/settings/page.tsx` | Low | Read-only input special case (Section 4.5) |
| `apps/web/src/app/(admin)/compare/page.tsx` | Medium | `text-gray-*`, `border-gray-*`, `bg-gray-*`, `text-blue-600` — all migrate |

### Special Migration Cases

1. **DataTable alternating rows** — conditional expression, both sides migrate:
   ```tsx
   // Before:
   i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
   // After:
   i % 2 === 1 ? 'bg-muted/5' : 'bg-card'
   ```

2. **accounts/page.tsx `roleBadgeClass` object** — only `owner` and `reviewer` keys migrate; `member` is semantic green and is preserved:
   ```tsx
   owner: 'bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)]',   // was bg-blue-100 text-blue-700
   reviewer: 'bg-muted/20 text-foreground/70',                    // was bg-gray-100 text-gray-700
   member: 'bg-green-100 text-green-700',                         // PRESERVED — semantic
   ```

3. **submissions/page.tsx score bars** — `bg-blue-500` on width-dynamic div → `bg-[var(--brand)]/80`

4. **Read-only inputs** (settings, accounts/[id]/edit) — `bg-gray-50 cursor-not-allowed text-gray-500` → `bg-muted/10 cursor-not-allowed text-muted`

5. **QuestionForm version banner** — `bg-blue-50 text-blue-600` → `bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)]`

---

## 11. Checker Sign-Off

- [ ] `--brand-rgb: 99 102 241` added to `:root` in `globals.css`
- [ ] `suppressHydrationWarning` added to `<html>` in root layout
- [ ] `AppThemeProvider` wraps `<body>` children in root layout
- [ ] `next-themes` installed in `apps/web/package.json`
- [ ] `lucide-react` installed in `apps/web/package.json`
- [ ] Theme toggle renders `Sun` in light mode, `Moon` in dark mode
- [ ] Theme toggle is icon-only with `aria-label="Toggle theme"`
- [ ] Theme preference persists across page refresh (localStorage `theme` key)
- [ ] Desktop sidebar has class `hidden md:flex` (hidden below 768px)
- [ ] Mobile top bar has class `md:hidden sticky top-0 z-30 h-12`
- [ ] Mobile top bar title reads exactly "Dev Assessment"
- [ ] Hamburger button has `aria-label="Open menu"`
- [ ] Mobile sheet overlay backdrop has class `fixed inset-0 bg-black/40 z-40 md:hidden`
- [ ] Mobile sheet panel has class `fixed left-0 top-0 h-full w-56 ... z-50 md:hidden`
- [ ] Clicking backdrop closes mobile sheet
- [ ] Clicking nav item inside mobile sheet closes mobile sheet
- [ ] Toaster z-index is `z-[100]` (above sheet overlay)
- [ ] Active nav class is `bg-[rgb(var(--brand-rgb))]/10 text-[var(--brand)] font-medium`
- [ ] Inactive nav class is `text-foreground/80 hover:bg-muted/20 transition-colors`
- [ ] All 17 files in scope have been token-migrated (including `compare/page.tsx`)
- [ ] All semantic status colors (green/red/orange/yellow/amber) are unchanged after migration
- [ ] Dark mode: sidebar, cards, and backgrounds use dark token values (no white or light-gray visible in dark mode)
- [ ] Light mode: all admin pages match pre-migration appearance (no visual regression)

---

## UI-SPEC COMPLETE
