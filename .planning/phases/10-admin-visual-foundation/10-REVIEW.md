---
phase: 10
status: issues_found
depth: standard
files_reviewed: 21
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
reviewed: 2026-05-07
---

# Code Review — Phase 10: Admin Visual Foundation

## Summary

Phase 10 delivers a complete admin UI foundation covering ThemeProvider, design token migration, a responsive sidebar, and 17 admin pages. The token migration is consistent and largely correct throughout. Two critical issues were found: a wrong navigation path in the submission detail back-button and a performance/correctness issue in the edit-account page that fetches the full accounts list to find a single record. Six warnings cover UX degradation, hook hygiene, and hardcoded chart colours that ignore the brand token; four info items are minor improvement suggestions.

---

## Findings

### CRITICAL-1: Wrong back-navigation route in submission detail

**File:** `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`
**Line:** 161
**Severity:** critical

The "Back to Test Links" button navigates to `/admin/test-configs/${result.test_config_id}/links`. All admin routes in this app are mounted at the root (`/dashboard`, `/questions`, etc.) — there is no `/admin/…` prefix in the Next.js route tree (the route group is `(admin)`, not `admin/`). The navigation will 404 on every click.

**Fix:**
```tsx
onClick={() => router.push(`/test-configs/${result.test_config_id}/links`)}
```

---

### CRITICAL-2: Wrong navigation route for "View result" in test links page

**File:** `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`
**Line:** 130
**Severity:** critical

The "View result" action navigates to `/admin/submissions/${row.original.id}`. The same route-group naming issue applies — the correct path is `/submissions/${row.original.id}`.

**Fix:**
```tsx
onClick={() => router.push(`/submissions/${row.original.id}`)}
```

---

### WARNING-1: Edit account page fetches entire accounts list instead of a single-account endpoint

**File:** `apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx`
**Line:** 28–44
**Severity:** warning

`loadAccount()` calls `GET /admin/accounts` (the full list) and then `.find()` on the client to locate the account by `id`. This transfers unnecessary data and will fail silently if the account count exceeds any pagination limit the API may impose. A dedicated `GET /admin/accounts/:id` endpoint should be used instead.

**Fix:**
Replace the list fetch with a direct lookup:
```ts
const res = await api.get(`/admin/accounts/${id}`);
const account: AdminAccount = res.data;
```

---

### WARNING-2: `useEffect` in submissions page suppresses exhaustive-deps lint rule

**File:** `apps/web/src/app/(admin)/submissions/page.tsx`
**Line:** 62–66
**Severity:** warning

The `// eslint-disable-next-line react-hooks/exhaustive-deps` comment suppresses a lint warning on a `useEffect` that calls `fetchSubmissions(1)`. `fetchSubmissions` is a non-memoised function defined inside the component — it is recreated on every render, so the deps array would normally list it. The correct fix is to either wrap `fetchSubmissions` in `useCallback` (matching the pattern used in `questions/page.tsx`) or inline the initial fetch logic inside the effect.

**Fix:**
Wrap `fetchSubmissions` in `useCallback` with its real dependencies and remove the suppression comment.

---

### WARNING-3: `handleDelete` in test-configs page swallows errors silently

**File:** `apps/web/src/app/(admin)/test-configs/page.tsx`
**Line:** 35–39
**Severity:** warning

`handleDelete` calls `api.delete` with no `try/catch`. If the request fails (e.g. the config is referenced by existing links), the error is swallowed, `fetchConfigs()` still runs returning unchanged data, and the user receives no feedback.

**Fix:**
```ts
async function handleDelete(id: string) {
  if (!confirm('Delete this test configuration?')) return;
  try {
    await api.delete(`/test-configs/${id}`);
    fetchConfigs();
  } catch {
    toast.error('Failed to delete test configuration.');
  }
}
```

---

### WARNING-4: `handleExport` in submissions page has no error handling

**File:** `apps/web/src/app/(admin)/submissions/page.tsx`
**Line:** 120–129
**Severity:** warning

`handleExport` has no `try/catch`. If the API call fails the promise rejects and the error propagates unhandled, producing a browser console error and (depending on the JS environment) possibly an uncaught rejection. Add a try/catch with a toast.

**Fix:**
```ts
async function handleExport() {
  if (!filterTestConfigId) return;
  try {
    const res = await api.get(...);
    // ... blob logic
  } catch {
    toast.error('Export failed. Please try again.');
  }
}
```

---

### WARNING-5: Hardcoded bar colours in chart components ignore brand token

**File:** `apps/web/src/app/(admin)/dashboard/ScoreDistributionChart.tsx` (line 47) and `apps/web/src/app/(admin)/dashboard/CompetencyChart.tsx` (line 36)
**Severity:** warning

Both charts use hardcoded hex colours (`#3b82f6` blue and `#8b5cf6` violet) for bar fills rather than the `--brand` CSS variable. The ReferenceLine in `ScoreDistributionChart` also hardcodes `#ef4444` red. When an account customises the brand colour via `NEXT_PUBLIC_BRAND_COLOR`, the charts will not update to match the rest of the UI.

**Fix:**
Read the brand colour from the DOM at render time and pass it as the `fill` prop:
```tsx
const brand = typeof window !== 'undefined'
  ? getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
  : '#6366f1';
```
Or expose it via a context from `AppThemeProvider`. The ReferenceLine colour can remain hardcoded red as it represents a threshold, not a brand element.

---

### WARNING-6: `fetchLinks` called inside `useEffect` without being in deps array

**File:** `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`
**Line:** 22–26
**Severity:** warning

The `useEffect` on line 22 lists `[id]` as its dependency but also calls `fetchLinks()`, which is a non-memoised function defined inside the component. Strictly, this is the same pattern suppressed with a comment in the submissions page; here no comment is present, meaning the exhaustive-deps rule would warn. While it works correctly at runtime (the effect runs when `id` changes, which is the only real dependency), it should either be stabilised via `useCallback` or declared inline.

**Fix:**
Move the fetch logic inline or wrap `fetchLinks` in `useCallback([id])`.

---

### INFO-1: `--brand-rgb` token missing from `.dark` block

**File:** `apps/web/src/app/globals.css`
**Line:** 15–21
**Severity:** info

`:root` defines `--brand-rgb: 99 102 241` but the `.dark` block does not override it. This is fine for the current palette (brand colour does not shift between light and dark), but if the brand colour is later made theme-aware the token would need to be added to `.dark` as well. A comment noting this intentional omission would prevent confusion.

---

### INFO-2: `--brand` in `.dark` block is not defined

**File:** `apps/web/src/app/globals.css`
**Line:** 15–21
**Severity:** info

Companion to INFO-1: the `.dark` block overrides background, card, foreground, muted, and border but does not redeclare `--brand`. As with `--brand-rgb`, this is intentional (brand colour is theme-invariant) but should be documented with a comment.

---

### INFO-3: Theme toggle icon semantics are inverted

**File:** `apps/web/src/app/(admin)/layout.tsx`
**Line:** 81
**Severity:** info

When `resolvedTheme === 'dark'`, a `<Moon />` icon is shown. Conventionally a moon icon is used to *enter* dark mode (i.e., shown in light mode to indicate what clicking will do), while a sun icon is shown while in dark mode to indicate you can switch back to light. The current logic shows Moon in dark mode and Sun in light mode — the icons match the current theme rather than the action. This is a minor UX inconsistency.

**Fix:**
```tsx
{resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
```

---

### INFO-4: `dashboard/page.tsx` KPI strip is not responsive below `md`

**File:** `apps/web/src/app/(admin)/dashboard/page.tsx`
**Line:** 75
**Severity:** info

The KPI strip uses `grid-cols-4` with no responsive modifier. On small viewports (phones or narrow tablet widths below the `md` breakpoint) all four cards will be crammed into a four-column row. The admin layout hides the sidebar below `md` but the main content area is still full-width. A responsive variant such as `grid-cols-2 md:grid-cols-4` would prevent overflow.

---

## Files Reviewed

1. `apps/web/src/components/ThemeProvider.tsx`
2. `apps/web/src/app/globals.css`
3. `apps/web/src/app/layout.tsx`
4. `apps/web/src/app/(admin)/layout.tsx`
5. `apps/web/src/components/ui/DataTable.tsx`
6. `apps/web/src/components/ui/QuestionForm.tsx`
7. `apps/web/src/app/(admin)/questions/page.tsx`
8. `apps/web/src/app/(admin)/submissions/page.tsx`
9. `apps/web/src/app/(admin)/dashboard/page.tsx`
10. `apps/web/src/app/(admin)/dashboard/CompetencyChart.tsx`
11. `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`
12. `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`
13. `apps/web/src/app/(admin)/compare/page.tsx`
14. `apps/web/src/app/(admin)/questions/new/page.tsx`
15. `apps/web/src/app/(admin)/questions/[familyId]/edit/page.tsx`
16. `apps/web/src/app/(admin)/test-configs/page.tsx`
17. `apps/web/src/app/(admin)/test-configs/new/page.tsx`
18. `apps/web/src/app/(admin)/accounts/page.tsx`
19. `apps/web/src/app/(admin)/accounts/new/page.tsx`
20. `apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx`
21. `apps/web/src/app/(admin)/settings/page.tsx`
