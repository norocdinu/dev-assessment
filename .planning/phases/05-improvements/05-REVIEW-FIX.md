---
phase: 5
status: all_fixed
findings_in_scope: 10
fixed: 10
skipped: 0
iteration: 1
---

# Code Review Fix Report — Phase 5

## Fixed

| ID | File | Fix Applied |
|----|------|-------------|
| CR-001 | apps/api/src/routes/submissions.ts | Added `requireRole('owner')` to `/export` and `/compare` preHandler arrays; imported `requireRole` from rbac middleware |
| WR-001 | apps/api/src/routes/questions.ts | Added UUID regex validation at start of `GET /:familyId/versions` handler; returns 400 on invalid format |
| WR-002 | apps/api/src/routes/questions.ts | Replaced serial per-family loop with single `SELECT DISTINCT` query; separated deletable/blocked in app code; single batched `DELETE` for all deletable families |
| WR-003 | apps/api/src/routes/questions.ts | Added `.max(200)` to `ids` array schema in both `/bulk-archive` and `/bulk-delete` routes |
| WR-004 | apps/api/src/routes/questions.ts | Added 5MB size check after `data.toBuffer()`; returns 413 if exceeded |
| WR-005 | apps/web/src/app/(admin)/submissions/page.tsx | Refactored `fetchSubmissions` to accept explicit `opts` parameter; `clearFilters` passes cleared values directly, removing the `setTimeout` workaround |
| WR-006 | apps/web/src/app/(admin)/questions/page.tsx | Wrapped `handleArchive` and `handleHistory` in try/catch blocks with `toast.error(...)` on failure |
| WR-007 | apps/web/src/components/ui/DataTable.tsx | Guarded `showingStart` to return `0` when `pagination.total === 0`, producing "Showing 0–0 of 0" |
| WR-008 | apps/web/package.json | Removed `fastify` and `@fastify/jwt` from `dependencies` entirely; moved `vitest` from `dependencies` to `devDependencies` |
| WR-009 | apps/api/src/routes/questions.ts | Changed bare `return newVersion` to `return reply.status(200).send(newVersion)` in PUT handler |

## Skipped

None — all critical and warning findings were fixed.

## TypeScript Verification

- apps/api: pass
- apps/web: pass

## Notes

A follow-up commit was needed after WR-002 to correct a TypeScript cast: the `postgres` library's `Row` type requires `as unknown as Array<{ family_id: string }>` before calling `.map()` with a typed callback. Both `apps/api` and `apps/web` pass `tsc --noEmit` cleanly with no errors.
