# Phase 8: Research — Analytics Dashboard & Submission Deletion

**Researched:** 2026-05-07
**Status:** Complete — ready for planning

---

## 1. Recharts v2 → v3 Migration

### Current installed version
`package.json` declares `recharts: "^2.12.7"`. The root `node_modules` contains `2.15.4` (latest v2 patch). The plan requires upgrading to `3.8.1`.

### Breaking changes that affect Phase 8

**Core component API — mostly unchanged for our usage:**
The `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, and `ReferenceLine` components retain the same import syntax and nearly the same prop API. Code like:
```ts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
```
works identically in v3. The rename/removal changes in v3 are focused on internal state exposure (`CategoricalChartState`), the `Customized` component, and formerly-deprecated props — none of which we need for Phase 8 charts.

**Specific prop changes relevant to Phase 8:**
- `accessibilityLayer` now defaults to `true` (was `false`). This adds ARIA attributes automatically. No action required — it's a good default.
- XAxis/YAxis axis lines now render even when there are no ticks. With real data this is invisible; with an empty dataset, the axis line will still appear. Handle with the empty-data guard pattern (show a placeholder instead of an empty chart).
- Multiple Y-axes now render alphabetically by `yAxisId`, not in render order. Not relevant since we use single-axis charts.
- Tooltip: `TooltipProps` type renamed to `TooltipContentProps` for custom tooltip components. Not relevant unless we write a custom tooltip (we won't — default tooltip is fine).
- `Bar layout` prop: when the parent `BarChart` already defines `layout`, do **not** also set it on `<Bar>` — it causes a warning in v3. For horizontal competency chart, set `layout="vertical"` on `BarChart` only.

**Removed props NOT relevant to Phase 8:**
- `activeIndex` removed from Bar/Pie — we don't use it.
- `isFront` removed from reference elements — we don't use it.
- `alwaysShow` deprecated prop removed from Reference components — we don't use it.
- `blendStroke` removed from Pie — we don't use Pie.
- `recharts-scale` dependency removed — doesn't affect imports.
- `react-smooth` removed; animations now internal — no change needed.

**SSR / hydration — `dynamic()` import still required:**
Recharts v3 still uses browser-only APIs (SVG/DOM measurement via `ResizeObserver`, `getBoundingClientRect`). The `dynamic(..., { ssr: false })` pattern (D-10) remains correct and necessary in Next.js App Router. The `ChartContainer` in shadcn/ui's updated v3 version adds `initialDimension: { width: 320, height: 200 }` as a default to avoid the "negative dimension" console warning that occurs during SSR — but the `ssr: false` guard is still the clean solution.

**shadcn/ui chart component and v3:**
As of PR #8486 (merged), shadcn/ui has updated its `chart.tsx` to Recharts v3. However, since Phase 8 does not install the shadcn chart component (it doesn't exist in the codebase yet), this is only relevant if we choose to use it. D-11 says: use raw Recharts components unless the upgrade introduces breaking changes that the wrapper resolves. Based on research, the wrapper is not needed — raw Recharts v3 works cleanly for BarChart and horizontal BarChart patterns. **Recommendation: use raw Recharts v3, skip the shadcn chart wrapper.**

**Migration steps needed for upgrade:**
1. In `apps/web/package.json`: change `"recharts": "^2.12.7"` → `"recharts": "^3.8.1"`.
2. Run `npm install` (or `pnpm install`) in `apps/web/`.
3. No import changes required.
4. For the horizontal bar chart (competency): set `layout="vertical"` on `<BarChart>` only, not on `<Bar>`.
5. The `<ReferenceLine>` component API is unchanged; `x` or `y` prop plus `stroke` works as before.

---

## 2. Dashboard Aggregate SQL

### stats.ts — the 6-bucket pattern

The existing `GET /admin/stats/:testConfigId` in `apps/api/src/routes/stats.ts` uses this exact SQL pattern:

```sql
SELECT
  COUNT(*)                                                                 AS total_submissions,
  COALESCE(ROUND(AVG(sr.score_pct)), 0)                                   AS avg_score_pct,
  COALESCE(ROUND(COUNT(*) FILTER(WHERE sr.pass) * 100.0
        / NULLIF(COUNT(*), 0)), 0)                                         AS pass_rate_pct,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 0  AND 49)                   AS bucket_0_49,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 50 AND 59)                   AS bucket_50_59,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 60 AND 69)                   AS bucket_60_69,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 70 AND 79)                   AS bucket_70_79,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 80 AND 89)                   AS bucket_80_89,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 90 AND 100)                  AS bucket_90_100
FROM submission_results sr
JOIN test_links tl ON tl.id = sr.link_id
WHERE tl.test_config_id = ${testConfigId}   -- ← remove this line for cross-config
```

### GET /dashboard/stats — cross-config query

The cross-config version removes the WHERE clause filter and adds a JOIN to `test_configs` to get `test_config_name` for `recentSubmissions`. The `recentSubmissions` subquery is a separate SQL call or a CTE — it's cleaner as a separate query.

**Stats query (no WHERE filter):**
```sql
SELECT
  COUNT(*)                                                                AS total_candidates,
  COALESCE(ROUND(AVG(sr.score_pct)), 0)                                  AS avg_score_pct,
  COALESCE(ROUND(COUNT(*) FILTER(WHERE sr.pass) * 100.0
        / NULLIF(COUNT(*), 0)), 0)                                        AS pass_rate_pct,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 0  AND 49)                  AS bucket_0_49,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 50 AND 59)                  AS bucket_50_59,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 60 AND 69)                  AS bucket_60_69,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 70 AND 79)                  AS bucket_70_79,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 80 AND 89)                  AS bucket_80_89,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 90 AND 100)                 AS bucket_90_100
FROM submission_results sr
```

**Recent submissions subquery (separate db call):**
```sql
SELECT
  tl.candidate_name,
  sr.score_pct,
  sr.pass,
  tl.submitted_at,
  tc.name AS test_config_name
FROM submission_results sr
JOIN test_links   tl ON tl.id = sr.link_id
JOIN test_configs tc ON tc.id = tl.test_config_id
ORDER BY tl.submitted_at DESC
LIMIT 10
```

### GET /dashboard/competency — jsonb_each_text lateral join pattern

`skill_area_scores` is a `JSONB NOT NULL DEFAULT '{}'` column on `submission_results`. Each row stores an object like `{ "TypeScript Generics": { "correct": 3, "total": 5, "pct": 60 }, ... }`. The competency endpoint needs to average the `pct` value across all rows, grouped by skill area key.

**Using `jsonb_each_text` and a lateral join:**
```sql
SELECT
  kv.key                    AS area,
  ROUND(AVG((kv.value::jsonb->>'pct')::numeric)) AS avg_score
FROM submission_results sr,
     jsonb_each(sr.skill_area_scores) AS kv(key, value)
-- optional filter: JOIN test_links tl ON tl.id = sr.link_id
--                  WHERE tl.test_config_id = ${testConfigId}
GROUP BY kv.key
ORDER BY avg_score DESC
```

**Key detail:** `skill_area_scores` stores objects as JSONB values (not plain text), so use `jsonb_each(sr.skill_area_scores)` (not `jsonb_each_text`). The value is a JSONB object with a `pct` field, so extract with `(kv.value::jsonb->>'pct')::numeric`. This lateral join unnests every row and groups globally.

**Weakest skill area query (for the KPI strip):**
```sql
SELECT
  kv.key                    AS area,
  ROUND(AVG((kv.value::jsonb->>'pct')::numeric)) AS avg_score
FROM submission_results sr,
     jsonb_each(sr.skill_area_scores) AS kv(key, value)
GROUP BY kv.key
ORDER BY avg_score ASC
LIMIT 1
```

This returns the single skill area with the lowest average percentage across all submissions globally. Embed this as a subquery or separate db call inside `GET /dashboard/stats`.

**Postgres implicit lateral join:** The comma in `FROM submission_results sr, jsonb_each(sr.skill_area_scores)` is an implicit `CROSS JOIN LATERAL` — this is valid PostgreSQL and well-supported. Each input row produces N output rows (one per JSONB key). Rows with empty `skill_area_scores` (`{}`) produce zero lateral rows and are silently excluded from the aggregation.

**postgres.js library compatibility:** The existing codebase uses the `postgres` (postgres.js) library with tagged template literals (`db\`...\``). The lateral join syntax works with this library; no special handling needed.

---

## 3. Submission Delete Transaction

### FK constraint analysis from schema.sql

The relevant tables and their FK relationships:

```
test_links (id PK)
  ← candidate_answers (link_id FK → test_links.id)
  ← submission_results (link_id FK → test_links.id, UNIQUE(link_id))
```

Both `candidate_answers` and `submission_results` reference `test_links.id` with standard REFERENCES (no ON DELETE CASCADE specified). This means:
- You **cannot** delete a `test_links` row while either `candidate_answers` or `submission_results` rows referencing it exist.
- You **can** delete `candidate_answers` and `submission_results` rows freely (they only reference `test_links` and `questions`, both of which are preserved).

### D-09 implementation: preserve test_links row

Per D-09, the `test_links` row is NOT deleted. Only the submission data is removed. This means:

**Correct delete order:**
1. `DELETE FROM candidate_answers WHERE link_id = $linkId`
2. `DELETE FROM submission_results WHERE link_id = $linkId`
3. (test_links row stays — no DELETE needed)

The `test_links` row retains its state `'submitted'` and `submitted_at` after the submission data deletion. This is intentional for audit purposes. The link will look like a submitted link but have no result — subsequent queries to `GET /admin/submissions/:linkId` will return 404 because `submission_results` is gone.

**Transaction wrapping with postgres.js:**
```ts
await db.begin(async sql => {
  await sql`DELETE FROM candidate_answers WHERE link_id = ${linkId}`;
  await sql`DELETE FROM submission_results WHERE link_id = ${linkId}`;
});
```
The `db.begin()` API in postgres.js wraps both statements in a single transaction.

**Lookup before delete:** Check `submission_results WHERE link_id = $linkId` first. If not found → 404. If found → proceed with transaction.

**audit_log table exists in schema.sql** (created in Phase 5/earlier): has `id, admin_id, action, entity_type, entity_id, detail, created_at`. D-08 says "audit log written before the transaction executes". Since the CONTEXT.md "Claude's Discretion" section says `console.log` is acceptable and no explicit `audit_log` table write is mandated, either approach works. However, since the table exists, writing a structured audit log entry is cleaner. The authenticated user ID is available from `getAuthUser(request).id`. Write the audit log entry before the `db.begin()` call.

**Route path decision:** The endpoint is `DELETE /admin/submissions/:linkId` (matching the existing route file prefix `/admin/submissions` in `index.ts`). The `link_id` is the path param — consistent with `GET /admin/submissions/:linkId`.

### Complete delete flow:
```
1. Extract linkId from request.params
2. Check submission_results WHERE link_id = linkId → 404 if not found
3. Write audit_log entry (entity_type: 'submission', entity_id: linkId, action: 'submission.delete')
4. db.begin(): DELETE candidate_answers, DELETE submission_results
5. Return 204 No Content
```

---

## 4. Frontend Patterns

### Sidebar nav — adding Dashboard as first item

`apps/web/src/app/(admin)/layout.tsx` uses a `navItems` array rendered with `.map()`:

```ts
const navItems = [
  { href: '/questions', label: 'Question Bank' },
  { href: '/test-configs', label: 'Test Configs' },
  { href: '/submissions', label: 'Submissions' },
];
```

The Accounts link is rendered conditionally **outside** the `navItems.map()` block — it's a separate JSX block with `{user.role === 'owner' && <Link>...}`.

**To add Dashboard as first nav item:**
- Prepend `{ href: '/dashboard', label: 'Dashboard' }` to the `navItems` array.
- Dashboard is visible to all roles (D-04), so it goes in `navItems` (no role guard needed).
- Active state detection uses `pathname.startsWith(href)` — the Dashboard item needs to be `/dashboard` not `/` (the root) to avoid matching everything. This is correct since the page will be at `/admin/dashboard`.

**The `/admin` root redirect (D-03):** Create `apps/web/src/app/(admin)/page.tsx` that simply calls `redirect('/dashboard')` from `next/navigation`. Since all pages in this codebase are `'use client'`, the redirect should use Next.js router:
```ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function AdminRootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return null;
}
```
Alternatively, use Next.js App Router's server-side `redirect()` in a server component — but since the layout is client-side, a client redirect is consistent with the codebase pattern. Note: the admin root may not exist yet — check if there's already a `(admin)/page.tsx`. From the glob scan, there is none.

### Role-based nav visibility pattern

The existing pattern for owner-only items (Accounts) is:
```tsx
{user.role === 'owner' && (
  <Link href="/accounts" ...>Accounts</Link>
)}
```

The same `user.role === 'owner'` check is used in submission detail page for the delete button.

The `user` state is populated from `GET /auth/me` in the layout's `useEffect`. In child pages, there are two options:
1. Make another `GET /auth/me` call (the pattern used in some Phase 7 pages).
2. Pass user down as a prop — not feasible without a context.

**For the submission detail page:** The existing page already manages its own state (result, loading, error). To add an owner-only delete button, add `userRole` state and a `GET /auth/me` call on mount — consistent with Phase 7 frontend patterns:
```ts
const [userRole, setUserRole] = useState<string | null>(null);
// in useEffect:
api.get('/auth/me').then(r => setUserRole(r.data.user.role)).catch(() => {});
// in JSX:
{userRole === 'owner' && <DeleteButton ... />}
```

### Confirmation modal pattern

The accounts page (`accounts/page.tsx`) uses the **browser native `confirm()` dialog**:
```ts
if (!confirm('Delete this account? This action cannot be undone.')) return;
```
This is the established pattern for confirmation in this codebase — **not** a custom modal component.

D-12 says "confirmation modal" — this will be implemented as `confirm()` per the established codebase pattern (unless a custom dialog is built). The browser `confirm()` is consistent with the existing code and avoids introducing a new component. The CONTEXT.md leaves "exact wording of the delete confirmation modal" to Claude's discretion.

### Submission detail page — current structure

The page at `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`:
- Is a `'use client'` component.
- Fetches submission data from `GET /admin/submissions/:linkId`.
- Shows: a summary card (score, time, pass/fail), a skill breakdown table, a full answer sheet (DataTable).
- Has a "Back to Test Links" button at the top (`router.push(...)`).
- Error state: shows `<p className="text-sm text-red-600">{error}</p>` if fetch fails.
- No role-based logic currently — add `userRole` state for the delete button.

**Where to add the delete button:** In the summary card `div`, alongside the pass/fail badge — right side of the `flex items-center justify-between` header bar. Or as a standalone danger button at the bottom of the page. Top-right of the summary card is the cleanest UX position (visible without scrolling).

**After delete:** Call `DELETE /admin/submissions/:linkId`, then `router.push('/submissions')` on success.

### dynamic() import pattern for charts

No existing `dynamic()` usage in the codebase (confirmed via grep — no matches). This is a new pattern for Phase 8. Pattern to use:

```ts
import dynamic from 'next/dynamic';

const ScoreDistributionChart = dynamic(() => import('./ScoreDistributionChart'), { ssr: false });
const CompetencyChart = dynamic(() => import('./CompetencyChart'), { ssr: false });
```

Chart components are extracted into separate files and dynamically imported into `dashboard/page.tsx`. This keeps the dashboard page itself from pulling in Recharts during SSR.

---

## 5. Route Registration

### How index.ts registers routes

`apps/api/src/index.ts` uses Fastify's plugin registration:
```ts
await app.register(accountRoutes, { prefix: '/admin/accounts' });
await app.register(statsRoutes, { prefix: '/admin/stats' });
```

**For Phase 8, add:**
```ts
import { dashboardRoutes } from './routes/dashboard.js';
// ...
await app.register(dashboardRoutes, { prefix: '/dashboard' });
```

Note the prefix is `/dashboard` (not `/admin/dashboard`) per D-05/D-06. The `dashboardRoutes` handler applies `authMiddleware` internally (same as all other admin routes). This matches the CONTEXT.md canonical refs which say "register in `apps/api/src/index.ts` under `/dashboard` prefix".

**New file:** `apps/api/src/routes/dashboard.ts` — exports `dashboardRoutes(app: FastifyInstance)`.

**Submission delete:** Added as a new handler inside the existing `submissionRoutes` function in `apps/api/src/routes/submissions.ts`. No new registration needed — it's added to the already-registered `/admin/submissions` prefix.

---

## 6. Compare Page Error Handling

### Does existing error state handle 404 gracefully?

`apps/web/src/app/(admin)/compare/page.tsx` fetches `GET /admin/submissions/compare?ids=...` and handles errors with:
```ts
.catch(() => setError('Failed to load comparison data.'))
```

The render path:
```tsx
if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
```

When a submission is deleted and the compare endpoint is called with its ID, the backend already returns:
```ts
return reply.status(404).send({ error: `Submission not found: ${ids[missingIndex]}` });
```

The axios `catch()` on the frontend intercepts any non-2xx response (including 404) and sets the error string to `'Failed to load comparison data.'`. The page then renders a red error message. This is **graceful** — no crash, no blank page. The message is generic but clear enough.

Per D-13: "the existing error state in compare/page.tsx already handles this gracefully. No additional changes needed." This is confirmed correct — the `catch()` block is a catch-all and 404 is handled identically to any other failure.

**One nuance:** The error message says "Failed to load comparison data." rather than "One of the submissions has been deleted." This is acceptable per D-13 (no changes needed) and is consistent with how other pages handle errors.

---

## 7. Implementation Risks & Gotchas

### Risk 1: jsonb_each vs jsonb_each_text
`skill_area_scores` stores objects as JSONB values (each value is `{ correct, total, pct }`), not plain text. Using `jsonb_each_text()` would return the JSONB object as a string (e.g., `'{"correct":3,"total":5,"pct":60}'`), and casting it would fail. Must use `jsonb_each()` which returns `jsonb` typed values, then extract with `->>` operator.

### Risk 2: Empty skill_area_scores JSONB
Rows with `skill_area_scores = '{}'` produce no lateral join rows and are excluded from the competency aggregation. This is the correct behavior — don't include empty submissions in the competency average. No special handling needed.

### Risk 3: Zero submissions edge case in dashboard
The cross-config stats query runs against `submission_results` with no WHERE clause. If there are zero rows:
- `COUNT(*)` = 0
- `AVG(score_pct)` = NULL → `COALESCE(ROUND(NULL), 0)` = 0
- `pass_rate_pct` = `ROUND(0 * 100.0 / NULLIF(0, 0))` = NULL → 0
- The weakest skill area query returns no rows

The stats endpoint should handle zero-submission state by returning zeros/nulls rather than 404 (unlike the per-config stats endpoint which returns 404 for no data). The dashboard should show "0 candidates" rather than an error.

### Risk 4: test_links.candidate_name can be NULL
The `candidate_name TEXT` column was added in Phase 6 migration. Older test links (created before the migration) have `NULL` candidate_name. The `recentSubmissions` response must handle this: return `candidate_name` as nullable and the frontend should display a fallback (e.g., "—" or "Unknown").

### Risk 5: Recharts v3 `accessibilityLayer` adds focusable elements
With `accessibilityLayer` defaulting to `true` in v3, the chart SVG will have tab-focusable elements and ARIA roles. This could affect Tailwind layout (focus rings) in the dashboard. If it causes visual issues, add `accessibilityLayer={false}` to the chart components.

### Risk 6: `<Bar>` `layout` prop in horizontal BarChart
For the competency horizontal bar chart, set `layout="vertical"` on `<BarChart layout="vertical">` and do NOT also set it on `<Bar>`. In Recharts v3, setting `layout` on `<Bar>` when the parent already sets it produces a warning. In v2 this was silently ignored.

### Risk 7: `pathname.startsWith` active state for Dashboard
The dashboard nav item uses `href: '/dashboard'`. The `pathname.startsWith('/dashboard')` check in `layout.tsx` should work correctly since no other nav item starts with `/dashboard`. However, the root `/admin` bare path (before redirect) does not start with `/dashboard` — but since the root redirects immediately to `/dashboard`, the active state will be correct by the time the nav renders.

### Risk 8: DELETE route ordering in submissions.ts
Like the existing `/export` and `/compare` routes, the `DELETE /:id` handler must be registered **after** any static-path routes (export, compare) and before the wildcard `/:linkId` GET handler — but since DELETE is a different HTTP method, there is no ordering conflict. Fastify routes by method + path, so `DELETE /:id` and `GET /:linkId` coexist without conflict regardless of declaration order.

### Risk 9: audit_log insert before transaction
The audit log insert happens before `db.begin()`. If the `db.begin()` transaction fails (e.g., DB error), the audit log entry will still exist for an action that wasn't completed. This is acceptable for an audit log (it's better to over-log than under-log). For a production system a rollback-aware audit would use a separate connection, but that's out of scope here.

### Risk 10: PostgreSQL `db.begin()` in postgres.js
The postgres.js library's `db.begin(sql => ...)` API takes a callback that receives a transaction-scoped `sql` tag. Both DELETE statements must use this `sql` tag (not the outer `db` tag) to be part of the transaction. Verify this pattern against the existing codebase — no existing transactions were found in `submissions.ts`, but `db.begin()` is the standard postgres.js pattern.

---

## 8. Recommended Approach

### Backend (08-01)

**New file:** `apps/api/src/routes/dashboard.ts` with two endpoints:
- `GET /` (mounted at `/dashboard`) → `GET /dashboard/stats`: two parallel db queries (stats + weakest skill area; recent submissions separately), merged into single response.
- `GET /competency` (mounted at `/dashboard/competency`): competency lateral join query with optional `testConfigId` filter.

**Existing file:** `apps/api/src/routes/submissions.ts` — add `DELETE /:linkId` handler with `requireRole('owner')`, submission existence check, audit log, transaction.

**index.ts:** Add one import + one `app.register()` call.

**Order of tasks:** Dashboard routes first (self-contained, no risk), then submission delete (modifies existing file, needs care around route ordering).

### Frontend (08-02)

**New files:**
- `apps/web/src/app/(admin)/dashboard/page.tsx` — main dashboard with KPI cards + chart dynamic imports.
- `apps/web/src/app/(admin)/dashboard/ScoreDistributionChart.tsx` — raw Recharts BarChart.
- `apps/web/src/app/(admin)/dashboard/CompetencyChart.tsx` — raw Recharts horizontal BarChart.
- `apps/web/src/app/(admin)/page.tsx` — client-side redirect to `/dashboard`.

**Modified files:**
- `apps/web/package.json` — recharts version bump.
- `apps/web/src/app/(admin)/layout.tsx` — prepend Dashboard to navItems.
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — add userRole state, delete button, confirm dialog, redirect on success.

**Recharts v3 upgrade:** Change version in `package.json`, run install. No import changes needed. Set `layout="vertical"` on `<BarChart>` only for horizontal chart.

**Dynamic import pattern:** Extract chart components to separate files, import with `dynamic(..., { ssr: false })`.

**shadcn/ui chart wrapper:** Not needed. Raw Recharts v3 is sufficient and avoids a dependency on a component that requires copy-pasting from the shadcn CLI.

### Key decisions for the planner to know:
1. The weakest skill area is computed with a separate SQL call inside the `/dashboard/stats` handler (not a subquery in the main stats query) — simpler to read and maintain.
2. The `skill_area_scores` JSONB structure stores objects (not scalars) as values — use `jsonb_each()` with `->>` extraction, not `jsonb_each_text()`.
3. The dashboard stats endpoint should return 200 with zeros (not 404) when there are no submissions — different behavior from the per-config stats endpoint.
4. Confirmation for delete uses `window.confirm()` (the established pattern from accounts page), not a custom modal component.
5. The `test_links` row is preserved after delete — only `candidate_answers` and `submission_results` are deleted, in that order.
6. The audit log is written as a DB `audit_log` table entry (the table exists) before the delete transaction — consistent with question audit logging in the codebase.

---

## RESEARCH COMPLETE
