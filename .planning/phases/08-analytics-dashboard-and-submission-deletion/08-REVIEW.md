---
phase: "08"
status: "fixed"
depth: standard
files_reviewed: 9
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
reviewed_at: "2026-05-07"
---

# Code Review — Phase 8: Analytics Dashboard & Submission Deletion

**Depth:** Standard | **Files:** 9 | **Status:** Fixed (1 warning auto-corrected during review)

## Files Reviewed

- `apps/api/src/routes/dashboard.ts` (created)
- `apps/api/src/routes/submissions.ts` (modified — DELETE endpoint added)
- `apps/api/src/index.ts` (modified — route registration)
- `apps/web/src/app/(admin)/page.tsx` (created)
- `apps/web/src/app/(admin)/layout.tsx` (modified)
- `apps/web/src/app/(admin)/dashboard/page.tsx` (created)
- `apps/web/src/app/(admin)/dashboard/ScoreDistributionChart.tsx` (created)
- `apps/web/src/app/(admin)/dashboard/CompetencyChart.tsx` (created)
- `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` (modified)

---

## Findings

### WR-01: Route Path Mismatch — `GET /` instead of `GET /stats` [WARNING — AUTO-FIXED]

**File:** `apps/api/src/routes/dashboard.ts:7`
**Severity:** warning
**Status:** Fixed in commit `313e500`

**Issue:** The stats endpoint was registered as `app.get('/', ...)` which resolves to `/dashboard/` under the `/dashboard` prefix. The frontend fetches `/dashboard/stats` (per CONTEXT.md D-05 and `dashboard/page.tsx:43`). This would produce a 404 for all dashboard stats loads.

**Fix applied:** Changed `app.get('/', ...)` → `app.get('/stats', ...)` so the full path is `/dashboard/stats`.

**Verification:**
- `grep -n "app.get('/stats'" apps/api/src/routes/dashboard.ts` → matches line 7
- Frontend at `apps/web/src/app/(admin)/dashboard/page.tsx:43`: `api.get('/dashboard/stats')` — now matches

---

### IR-01: No UUID Validation for `testConfigId` Query Param [INFO]

**File:** `apps/api/src/routes/dashboard.ts:72`
**Severity:** info

**Issue:** `GET /dashboard/competency` accepts `testConfigId` as a raw query string and passes it directly to a parameterized SQL query. While parameterized queries prevent SQL injection, a malformed non-UUID string (e.g., `testConfigId=foo`) will cause PostgreSQL to throw a cast error, producing a Fastify-generated 500 instead of a clean 400.

**Recommendation:** Add UUID format validation before the DB query:
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (testConfigId && !UUID_RE.test(testConfigId)) {
  return reply.status(400).send({ error: 'Invalid testConfigId format' });
}
```

**Not blocking:** The endpoint is authenticated; dashboard UI doesn't pass a `testConfigId` in Phase 8. Low risk in practice.

---

### IR-02: Sequential DB Queries in Stats Endpoint [INFO]

**File:** `apps/api/src/routes/dashboard.ts:8-46`
**Severity:** info

**Issue:** `GET /dashboard/stats` runs three sequential `await db\`...\`` queries (stats, weakest, recentSubmissions). These are independent — none depends on a previous result. Running them in parallel via `Promise.all` would reduce P99 latency by ~2x on the stats endpoint.

**Recommendation (future iteration):**
```ts
const [statsResult, weakestResult, recentResult] = await Promise.all([
  db`SELECT COUNT(*) ... FROM submission_results sr`,
  db`SELECT kv.key ... ORDER BY avg_score ASC LIMIT 1`,
  db`SELECT tl.candidate_name ... ORDER BY tl.submitted_at DESC LIMIT 10`,
]);
const [stats] = statsResult;
const [weakest] = weakestResult;
const recentSubmissions = recentResult;
```

**Not blocking:** Dashboard is a low-frequency page load. Sequential execution is acceptable for v1.1.

---

### IR-03: `window.alert()` for Delete Error — Inconsistent with `sonner` Toast Pattern [INFO]

**File:** `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx:141`
**Severity:** info

**Issue:** `handleDelete`'s catch block calls `alert('Failed to delete submission...')` — a blocking native dialog. The rest of the admin app (e.g., accounts page) uses `sonner`'s `toast.error()` for error feedback, which is non-blocking and styled consistently.

**Recommendation:**
```ts
import { toast } from 'sonner';
// ...
} catch {
  setDeleting(false);
  toast.error('Failed to delete submission. Please try again.');
}
```

**Not blocking:** The alert is functional. UX inconsistency only.

---

## Security Assessment

| Area | Status | Notes |
|------|--------|-------|
| SQL Injection | ✓ Safe | All queries use parameterized tagged templates |
| Auth enforcement | ✓ Safe | Stats/competency: `authMiddleware`; delete: `authMiddleware + requireRole('owner')` |
| RBAC delete | ✓ Safe | Owner-only enforced at middleware level before handler runs |
| Audit trail | ✓ Safe | Audit log written before transaction — persists even on transaction rollback |
| Input validation | ⚠ Partial | `testConfigId` not UUID-validated (IR-01 above) |
| XSS | ✓ Safe | React JSX encoding prevents XSS in chart labels and table cells |

---

## Summary

1 warning (route path mismatch, auto-fixed) + 3 informational findings. No critical issues. The implementation is correct after the fix. The 3 info findings (UUID validation, parallel queries, alert vs toast) are all low-priority and don't affect functionality in Phase 8 scope.
