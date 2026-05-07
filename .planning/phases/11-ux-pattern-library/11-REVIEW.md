---
plan: "11"
phase: 11
status: warning
files_reviewed: 11
depth: standard
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
reviewed_at: "2026-05-07T17:35:00Z"
---

# Code Review — Phase 11: UX Pattern Library

**Files reviewed:** 11 source files
**Depth:** standard

---

## Summary

All 4 plans executed cleanly. TypeScript passes. Zero browser dialogs remain. Two warnings and two info items found.

---

## Findings

### WR-01 — EmptyState shown on fetch failure (accounts, test-configs, links pages)

**Severity:** warning
**Files:** `apps/web/src/app/(admin)/accounts/page.tsx`, `apps/web/src/app/(admin)/test-configs/page.tsx`, `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`

**Issue:** When a network error occurs during data fetch, the `data` state stays `[]` (empty array) and `loading` becomes `false`. The condition `!loading && data.length === 0` then renders `<EmptyState>` alongside the error message — both elements appear simultaneously, which contradicts the empty state intent (empty state should mean "nothing exists yet", not "load failed").

**Example (accounts page):**
```tsx
{error && <p className="text-sm text-red-600 mb-4">{error}</p>}
<DataTable columns={columns} data={accounts} loading={loading} />
{!loading && accounts.length === 0 && (
  <EmptyState ... />  // ← also shows when error occurred
)}
```

**Fix:** Guard empty state with `!error`:
```tsx
{!loading && !error && accounts.length === 0 && (
  <EmptyState ... />
)}
```

**Note:** Questions page uses a silent error path (no `setError` in catch) so this manifests differently — but has the same empty-state-on-error effect.

---

### WR-02 — ConfirmDialog lacks keyboard accessibility (Escape key)

**Severity:** warning
**File:** `apps/web/src/components/ui/ConfirmDialog.tsx`

**Issue:** The modal overlay cannot be dismissed with the Escape key. Native `window.confirm` dismisses on Escape. The current implementation relies solely on clicking the backdrop or Cancel button. This is a regression for keyboard users.

**Fix:** Add `onKeyDown` handling — either on the overlay div (needs `tabIndex`) or via a `useEffect` on `document`:

```tsx
// Simple approach: add to overlay div
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  onClick={onCancel}
  onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
  tabIndex={-1}
>
```

Or via `useEffect` in the component:
```tsx
useEffect(() => {
  if (!open) return;
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [open, onCancel]);
```

---

### INFO-01 — EmptyState uses React.ReactNode without explicit React import

**Severity:** info
**File:** `apps/web/src/components/ui/EmptyState.tsx`

`React.ReactNode` is used in the props interface but `React` is not imported. This works in Next.js 13+ (automatic JSX transform) but relies on global JSX types. For explicitness, add:

```tsx
import type { ReactNode } from 'react';
// Then use ReactNode instead of React.ReactNode
```

---

### INFO-02 — Skeleton className concatenation produces double space on empty string

**Severity:** info
**File:** `apps/web/src/components/ui/Skeleton.tsx`

```tsx
className={`animate-pulse rounded-md bg-muted/20 ${className}`}
```

When `className` is the default `''` (empty string), the rendered class string ends with a trailing space: `"animate-pulse rounded-md bg-muted/20 "`. Browsers handle this fine but it is slightly impure. Could be:
```tsx
className={['animate-pulse rounded-md bg-muted/20', className].filter(Boolean).join(' ')}
```
or simply trim: `className={`animate-pulse rounded-md bg-muted/20 ${className}`.trim()}`.

---

## Verdict

**WR-01** (EmptyState on error) is the highest priority fix — it's a semantic issue visible to users when network requests fail. **WR-02** (keyboard accessibility) is a UX regression. Both should be addressed before shipping.
