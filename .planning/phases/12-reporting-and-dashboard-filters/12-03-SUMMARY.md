---
plan: 12-03
phase: 12
status: complete
completed: 2026-05-08
---

# Plan 12-03: Submission PDF Export — Summary

## What was built

Enabled `window.print()` based PDF export on the submission detail page:

1. **globals.css** — `@media print` block hides `<aside>` (desktop sidebar) and the mobile sticky nav (`.md\:hidden.sticky`)
2. **Inline `<style>` tag** — overrides CSS custom properties in print mode to force white background + black text; fixes `overflow-x-auto` and table width for print layout
3. **"Download PDF" button** — inserted in the summary card flex row (after PASS/FAIL badge, before Delete Submission button); calls `window.print()` and carries `print:hidden`
4. **`print:hidden`** — added to back-nav button and Delete Submission button so they're absent from print output

## Key files changed

- `apps/web/src/app/globals.css` — @media print rules appended
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` — inline style, Download PDF button, print:hidden on action buttons

## Verification

- `print:hidden` count: 3 ✓
- `window.print()` present ✓
- `@media print` in globals.css ✓
- `--background: 255 255 255` inline override ✓
- `npx tsc --noEmit` in `apps/web` exits 0 ✓

## Self-Check: PASSED
