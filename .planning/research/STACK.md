# Stack Research — v1.1

## Charting Library Decision

### Key Finding: Recharts Already Installed

`recharts ^2.12.7` is already a declared dependency in `apps/web/package.json`. No new charting library needs to be added — the decision is whether to **upgrade to v3** and whether to layer on **shadcn/ui chart components** on top.

### Options Evaluated

| Library | Bundle Size | SSR Safe | Tailwind Theming | License | Verdict |
|---------|-------------|----------|-----------------|---------|---------|
| **Recharts v3** (already installed) | ~150 kB (tree-shakeable) | Requires `"use client"` — standard pattern | CSS variables or inline hex/hsl; pairs well with Tailwind tokens | MIT | **Use — already present, v3 upgrade recommended** |
| shadcn/ui Charts (wrapper over Recharts) | +0 (ships as copy-paste source, not a package) | Same as Recharts — `"use client"` required | First-class — uses CSS vars mapped to Tailwind theme | MIT | **Recommended layer** — zero extra deps, excellent DX |
| Nivo | 186–500+ kB (per-package, per chart type) | Requires `dynamic(() => …, { ssr: false })` — more friction | No Tailwind integration; custom theme object required | MIT | Skip — heavier, more friction, no benefit over Recharts here |
| Chart.js / react-chartjs-2 | ~213 kB | Canvas-based; hydration issues common in Next.js App Router | No Tailwind integration | MIT | Skip — Canvas adds complexity, redundant with Recharts |
| Victory | ~200–350 kB | Works with `"use client"`, D3-based | No Tailwind integration | MIT | Skip — lower download volume, no advantage |
| Tremor (`@tremor/react`) | ~200 kB (Recharts-based wrapper) | Requires `"use client"` | Good but opinionated; conflicts can arise with custom Tailwind config | Apache 2.0 | Skip — last published ~Jan 2025, lower activity; adds a dependency on top of Recharts which is already present |

### Recommendation

**Upgrade Recharts from `^2.12.7` to `^3.8.1` and use shadcn/ui chart components.**

Rationale:
- Recharts is already in the project — zero additional vendor risk or install footprint.
- Recharts v3 (released Dec 2024, latest 3.8.1 as of May 2026) rewrote internal state management, fixes long-standing bugs, adds a `responsive` prop, and is what shadcn/ui charts now target.
- shadcn/ui chart components ship as copy-paste source code (no extra `npm install`). They provide a `ChartContainer` with CSS-variable-based theming that maps cleanly to the existing Tailwind config.
- The three required chart types — **bar/histogram** (score distribution), **radar or grouped bar** (competency breakdown), **KPI cards** (no chart library needed, plain Tailwind) — are all supported by Recharts v3: `BarChart`, `RadarChart`, `Radar`, `ResponsiveContainer`.
- Pattern for Next.js 14 App Router: mark chart files with `"use client"` at the top. Data can still be fetched server-side and passed as props.
- 27,000+ GitHub stars, 2.4M+ weekly downloads, 4 active maintainers — best-maintained React charting library available.

### v2 → v3 Breaking Changes to Handle During Upgrade

- `recharts-scale` dependency removed (internal only, no consumer API change).
- `activeIndex` prop removed from `Bar`, `Scatter`, `Pie` — use controlled state instead.
- `blendStroke` prop removed from `PieChart` — use `stroke="none"`.
- `alwaysShow` and `isFront` props removed from Reference components.
- Internal Customized component no longer receives extra internal state props.

Because Recharts is not yet used in any source files (confirmed: no existing chart components in `apps/web/src`), there is no migration work — just update the version specifier.

### Installation

```bash
# Upgrade Recharts to v3
npm install recharts@^3.8.1 --workspace=apps/web

# shadcn/ui chart components are copy-paste — no npm install needed.
# Add them via the shadcn CLI (already in use if shadcn is configured), or copy manually:
npx shadcn@latest add chart --cwd apps/web
```

---

## Other Stack Additions

### Account Management (add/edit/delete admin accounts — Owner, Member, Reviewer roles)

No new libraries needed. The existing stack is sufficient:
- **API**: Fastify + PostgreSQL (via `postgres`) + `zod` for validation — all present.
- **UI**: TanStack Table (already installed) for the accounts list. Forms can reuse the existing form pattern used in `QuestionForm.tsx`.
- **Auth check**: `@fastify/jwt` already handles role-based guards.

### Account Settings — Change Password Form

**`react-hook-form`** and **`@hookform/resolvers`** are recommended additions.

The existing codebase uses no form library (forms are plain controlled components — see `QuestionForm.tsx`). For a change-password form, plain controlled state works, but a lightweight form library avoids boilerplate for validation, dirty-state tracking, and submission handling. Given `zod` is already installed in both workspaces, pairing it with `react-hook-form` + `@hookform/resolvers/zod` is the idiomatic Next.js 14 pattern (works with both client components and Server Actions).

This is optional — the team may prefer to keep the existing plain-controlled-input pattern for consistency. If added, install once and it becomes available for all future forms.

```bash
npm install react-hook-form @hookform/resolvers --workspace=apps/web
```

### CSV Import Round-Trip Fix

No new libraries needed. This is a bug fix in the existing CSV serialization/deserialization logic. The `@fastify/multipart` package already handles file uploads on the API side.

---

## Versions (verified current as of research date — 2026-05-07)

| Package | Latest Version | Notes |
|---------|---------------|-------|
| `recharts` | `3.8.1` | Upgrade from `2.12.7` already in package.json |
| `react-hook-form` | `7.74.0` | New addition (optional, for password form) |
| `@hookform/resolvers` | `3.x` (check npm for exact patch) | Peer of react-hook-form; zod resolver included |

> shadcn/ui chart components have no version — they are copied into the project source tree via the shadcn CLI and become your own code.
