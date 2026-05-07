# Phase 11: UX Pattern Library — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply three consistent UX patterns across all admin pages: skeleton loading states replacing spinners and loading text, empty state messaging on all data pages, and eliminating all browser dialogs (`window.confirm`, `confirm()`, `window.alert`, `alert()`) in favour of sonner toasts and shadcn `AlertDialog`.

**In scope:**
- Skeleton loading on all 4 table pages (submissions, questions, accounts, test-configs) and all card sections (dashboard KPI cards, submissions stats panel)
- Shared `<EmptyState />` component used on all data pages with zero records
- All 8 `confirm()`/`window.confirm()`/`alert()` calls removed across 5 files — replaced with `AlertDialog` (destructive deletes) or toast-only flows (soft actions)

**Out of scope:**
- Dashboard filter UI (Phase 12)
- PDF export (Phase 12)
- Any new data features — this phase is purely UX polish

</domain>

<decisions>
## Implementation Decisions

### Skeleton Loading (UI-02)
- **D-01:** Scope — tables + all cards: skeleton rows in all 4 table pages (submissions, questions, accounts, test-configs) **plus** dashboard KPI cards while stats load **plus** the submissions stats panel (score distribution / pass rate)
- **D-02:** 5 skeleton rows per table while data loads — enough to fill a typical viewport without looking sparse
- **D-03:** Column-aware skeletons — each skeleton row has cells matching the actual column structure and proportions of that specific table (narrow checkbox cell, wider text cells, narrow badge/action cells). Avoids layout shift when data appears.

### Empty States (UI-03)
- **D-04:** Shared `<EmptyState />` component — single source of truth for consistent look across all pages
- **D-05:** Pages with a "create" action get a CTA button in the empty state: questions ("New Question"), test-configs ("New Test Config"), accounts ("Create Account"). Submissions empty state has no CTA (nothing to create there).

### Toast / Dialog Audit (UI-04)
- **D-06:** All `confirm()`, `window.confirm()`, `alert()`, `window.alert()` calls must be removed — success criteria requires 0 grep matches in `apps/web/src`
- **D-07:** Permanent destructive deletes → shadcn `AlertDialog` (with title, description, Cancel + confirm button). Applies to: submission delete, hard-delete question, bulk-delete questions, delete account, delete test config
- **D-08:** Soft/reversible actions (archive question, bulk-archive questions, revoke link) → no pre-confirmation; execute immediately and show a sonner toast with the result. These are lower-stakes and can be undone or repeated.

### Claude's Discretion
- Exact icon choice for empty states — use lucide-react icons (already installed via shadcn/ui); pick contextually appropriate icons per page (e.g. `FileQuestion` for questions, `ClipboardList` for submissions)
- Empty state headline copy per page
- Skeleton animation style (shadcn Skeleton uses `animate-pulse` by default — keep as-is)
- Exact AlertDialog button labels and descriptions per action

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files with confirm()/alert() to replace (primary audit targets)
- `apps/web/src/app/(admin)/accounts/page.tsx` — line 47: `confirm('Delete this account...')`
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — line 134: `window.confirm(...)`, line 141: `alert(...)`
- `apps/web/src/app/(admin)/questions/page.tsx` — lines 79, 170, 190: `confirm(...)` / `window.confirm(...)`
- `apps/web/src/app/(admin)/test-configs/page.tsx` — line 36: `confirm('Delete this test configuration?')`
- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — line 60: `confirm('Revoke this link?...')`

### Table pages (skeleton + empty state targets)
- `apps/web/src/app/(admin)/submissions/page.tsx` — table + stats panel; loading state is `<p>Loading…</p>`
- `apps/web/src/app/(admin)/questions/page.tsx` — uses `<DataTable>` component; loading state is `loading ? 'Loading...' : total count`
- `apps/web/src/app/(admin)/accounts/page.tsx` — uses `<DataTable>`; loading renders an early return with `<p>Loading…</p>`
- `apps/web/src/app/(admin)/test-configs/page.tsx` — check current loading pattern
- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — check current loading pattern

### Dashboard (card skeleton target)
- `apps/web/src/app/(admin)/dashboard/page.tsx` — loading state is a spinner; KPI cards and charts need skeleton treatment

### Shared UI components
- `apps/web/src/components/ui/DataTable.tsx` — used by questions, accounts; skeleton rows may be passed as prop or handled internally
- `apps/web/src/app/(admin)/layout.tsx` — `<Toaster position="top-right" />` already wired; no changes needed

### Requirements
- `.planning/REQUIREMENTS.md` (UI-02, UI-03, UI-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shadcn/ui Skeleton`: available — `import { Skeleton } from '@/components/ui/skeleton'` (or install via shadcn CLI if not yet added). Used with `animate-pulse` by default.
- `shadcn/ui AlertDialog`: available — `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'`
- `sonner` toast: already imported and used in `questions/page.tsx` — pattern is `toast.success(...)` / `toast.error(...)`
- `DataTable` component (`apps/web/src/components/ui/DataTable.tsx`): used by questions and accounts pages — skeleton rows may be injectable via a loading prop
- lucide-react: installed via shadcn/ui — icons available for empty state visuals

### Established Patterns
- Design tokens fully migrated (Phase 10): skeletons and empty states inherit `bg-muted`, `bg-card`, `border-border`, dark mode automatically
- `'use client'` on all admin page components — no RSC considerations for state-driven loading
- Pagination is client-side in submissions/questions; `loading` state is a boolean already present in every page component

### Integration Points
- New shared components go in `apps/web/src/components/ui/` — consistent with `DataTable.tsx`, `QuestionForm.tsx`
- `EmptyState` component: `apps/web/src/components/ui/EmptyState.tsx` (new file)
- AlertDialog wraps the delete button trigger — no separate state needed if using the `AlertDialogTrigger` pattern
- All admin pages already have `import { toast } from 'sonner'` or can add it trivially

</code_context>

<specifics>
## Specific Ideas

- No specific visual references provided — open to standard shadcn/ui skeleton and empty state patterns
- Column-aware skeletons should feel like the table's real columns: narrow cells for checkbox/badge/action columns, wider cells for name/text columns

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-ux-pattern-library*
*Context gathered: 2026-05-07*
