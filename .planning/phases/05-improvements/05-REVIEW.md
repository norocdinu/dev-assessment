---
phase: 5
status: issues_found
depth: standard
files_reviewed: 8
findings:
  critical: 1
  warning: 9
  info: 4
  total: 14
---

# Code Review — Phase 5: Improvements

## Summary

The Phase 5 changes introduce solid pagination, bulk operations, CSV import/export, and a submission comparison feature, but several security gaps (missing RBAC on export/compare endpoints, correct_option exposure in version history) and reliability issues (missing error handling, stale closure bug in submissions page, wrong "Showing" text on empty results) need to be addressed before shipping.

## Findings

### CR-001: Submissions export and compare endpoints missing RBAC

**File:** `apps/api/src/routes/submissions.ts`:19, 69
**Severity:** critical
**Issue:** Both `/export` and `/compare` are protected only by `authMiddleware`, not `requireRole('owner')`. A `reviewer`-role user can export a full CSV of every submission for any test config and can call the compare endpoint arbitrarily. The questions `/export` route (line 74 of `questions.ts`) correctly restricts to `owner` only. The submissions routes should follow the same pattern.
**Fix:** Add `requireRole('owner')` (or at minimum `requireRole('reviewer')` if reviewers should have read access, consistent with the rest of the submissions routes) to the `preHandler` array on both `/export` and `/compare`.

---

### WR-001: `GET /:familyId/versions` lacks UUID validation and has no RBAC

**File:** `apps/api/src/routes/questions.ts`:190-199
**Severity:** warning
**Issue:** The route accepts any string as `familyId` without validating it is a UUID before passing it to the database. Additionally it is protected only by `authMiddleware` — any authenticated user (reviewer) can read full version history including `correct_option`, which is a sensitive field that should not be accessible to reviewer-role users.
**Fix:** Validate `familyId` with a UUID regex or `z.string().uuid()` before the DB call. If `correct_option` should remain hidden from reviewers, add `requireRole('owner')` or strip the field from the response for non-owner callers.

---

### WR-002: `bulk-delete` performs N serial DB round-trips

**File:** `apps/api/src/routes/questions.ts`:160-174
**Severity:** warning
**Issue:** The bulk-delete loop issues one `SELECT COUNT(*)` and one `DELETE` per family ID. With a large batch (up to the client-submitted list size — no server-side limit is enforced) this can cause severe latency and hold locks for an extended period.
**Fix:** Batch the reference check with a single query: `SELECT q.family_id, COUNT(*) FROM candidate_answers ca JOIN questions q ON q.id = ca.question_id WHERE q.family_id = ANY(${ids}::uuid[]) GROUP BY q.family_id`. Separate the IDs into blocked/deletable in application code, then issue a single `DELETE FROM questions WHERE family_id = ANY(${deletableIds}::uuid[])`.

---

### WR-003: No upper bound on `bulk-delete` / `bulk-archive` input size

**File:** `apps/api/src/routes/questions.ts`:129, 153
**Severity:** warning
**Issue:** The Zod schema only requires `min(1)` on the `ids` array. A caller can submit thousands of UUIDs, which combined with the serial loop in `bulk-delete` (WR-002) could exhaust database connections or cause a denial-of-service.
**Fix:** Add `.max(200)` (or a similarly reasonable cap) to the `ids` array schema: `z.array(z.string().uuid()).min(1).max(200)`.

---

### WR-004: CSV import has no file size limit

**File:** `apps/api/src/routes/questions.ts`:335-338
**Severity:** warning
**Issue:** The import handler calls `data.toBuffer()` with no size constraint. An attacker (owner-role) or misconfigured client can upload an arbitrarily large file, exhausting memory.
**Fix:** Check `data.file.bytesRead` or configure Fastify's `limits.fileSize` on the multipart plugin (e.g. `{ limits: { fileSize: 5 * 1024 * 1024 } }`) and return a 413 if exceeded.

---

### WR-005: Stale-closure bug in `clearFilters` using `setTimeout`

**File:** `apps/web/src/app/(admin)/submissions/page.tsx`:101-109
**Severity:** warning
**Issue:** `clearFilters` calls `setFilter*('')` to reset state and then uses `setTimeout(() => fetchSubmissions(1), 0)` to defer the fetch. However `fetchSubmissions` closes over the current filter state values — React state updates from `setFilter*` are batched and are not guaranteed to have flushed by the time the deferred callback runs. In practice the clear works in React 18 concurrent mode only because all `setFilter*` calls are synchronous and the timeout fires after the batch, but this is a fragile pattern that breaks if the component ever moves to async transitions. More directly, `fetchSubmissions` itself closes over `filterTestConfigId` / `filterDateFrom` etc. via its definition scope, not via parameters.
**Fix:** Refactor `fetchSubmissions` to accept an explicit filter object as a parameter, or use a `useCallback` / `useEffect` dependency pattern so that a single state change to a "pending fetch" flag triggers a proper re-render cycle. At minimum, pass the cleared values as arguments: `fetchSubmissions(1, { testConfigId: '', dateFrom: '', dateTo: '', difficulty: '' })`.

---

### WR-006: `handleExport` and `handleHistory` / `handleArchive` have no error handling

**File:** `apps/web/src/app/(admin)/questions/page.tsx`:78-88, `apps/web/src/app/(admin)/submissions/page.tsx`:116-125
**Severity:** warning
**Issue:** `handleArchive` (line 78) and `handleHistory` (line 85) in questions/page.tsx, and `handleExport` (line 116) in submissions/page.tsx, have no `try/catch`. A network error or non-2xx response will throw an unhandled rejection, silently failing for the user.
**Fix:** Wrap each in try/catch and call `toast.error(...)` on failure, consistent with how `handleBulkArchive` and `handleBulkDelete` handle errors.

---

### WR-007: `DataTable` shows "Showing 1–0 of 0" when data is empty

**File:** `apps/web/src/components/ui/DataTable.tsx`:26-27
**Severity:** warning
**Issue:** When `pagination.total === 0`, `showingStart` evaluates to `(0 - 1) * pageSize + 1 = 1` and `showingEnd` evaluates to `Math.min(0, 0) = 0`, producing the string "Showing 1–0 of 0".
**Fix:** Guard the showing text: `const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;` and display "Showing 0–0 of 0" or hide the row entirely when `total === 0`.

---

### WR-008: `fastify`, `@fastify/jwt`, and `vitest` listed as runtime dependencies in the web package

**File:** `apps/web/package.json`:13-20
**Severity:** warning
**Issue:** `fastify` (5.8.5), `@fastify/jwt` (10.0.0), and `vitest` (4.1.5) are listed under `dependencies` in the Next.js web app. These are server-side / test-only packages that have no place in a browser bundle. Next.js will attempt to bundle them, increasing the client bundle size and potentially causing build failures if they depend on Node.js built-ins.
**Fix:** Move `fastify` and `@fastify/jwt` out of `apps/web/package.json` entirely — they belong only in `apps/api`. Move `vitest` to `devDependencies`.

---

### WR-009: PUT `/questions/:familyId` returns without explicit status code

**File:** `apps/api/src/routes/questions.ts`:277
**Severity:** warning
**Issue:** The handler returns `newVersion` directly (bare `return newVersion`) without calling `reply.status(200).send(newVersion)`. Fastify will serialize and send it with a 200 status by default, but it bypasses any explicit response schema validation and is inconsistent with every other handler in the file which uses `reply.status(...).send(...)`.
**Fix:** Change line 277 to `return reply.status(200).send(newVersion);`.

---

### IR-001: `correct_option` included in CSV export

**File:** `apps/api/src/routes/questions.ts`:97-118
**Severity:** info
**Issue:** The CSV export (line 117) includes `correct_option` in the download. If export links are shared or the CSV is stored without access controls, correct answers are leaked.
**Fix:** Consider whether exporting correct answers is intentional. If the export is for question bank review purposes by admins only (which it is — owner-only route), this is acceptable, but the header should be clearly labelled and the file should be served with `Cache-Control: no-store`.

---

### IR-002: Admin layout sign-out does not invalidate server-side session

**File:** `apps/web/src/app/(admin)/layout.tsx`:61-64
**Severity:** info
**Issue:** Sign-out only removes `auth_token` from `localStorage` and redirects to `/login`. If the API uses stateless JWT, this is functionally correct. If token revocation / blocklisting is ever added server-side, the client must also call a `POST /auth/logout` endpoint to invalidate the token.
**Fix:** Add a `POST /auth/logout` call before clearing localStorage. This is a no-op if the server is stateless but future-proofs the sign-out flow.

---

### IR-003: `parseCsvLine` trims field values, which corrupts leading/trailing spaces in questions

**File:** `apps/api/src/routes/questions.ts`:441
**Severity:** info
**Issue:** `result.push(current.trim())` trims whitespace from every parsed CSV field. For fields like `text`, `option_a`–`option_d`, and `explanation`, this could silently strip intentional leading/trailing spaces (e.g. code snippets with leading whitespace).
**Fix:** Remove `.trim()` from the push (line 441) and instead only trim the `techSlug` field (which must match a slug exactly) at the point of use.

---

### IR-004: `useEffect` in submissions page has suppressed exhaustive-deps lint warning

**File:** `apps/web/src/app/(admin)/submissions/page.tsx`:62-66
**Severity:** info
**Issue:** `// eslint-disable-next-line react-hooks/exhaustive-deps` is used to suppress a warning about `fetchSubmissions` being excluded from the `useEffect` dependency array. `fetchSubmissions` is not wrapped in `useCallback`, so it is re-created on every render. The disable comment masks the underlying architectural issue (see WR-005).
**Fix:** Wrap `fetchSubmissions` in `useCallback` with proper dependencies, or restructure to use a `useEffect` that responds to filter state changes, removing the need for the suppression comment.

---

## Clean Files

- `packages/shared/src/types/index.ts` — type definitions are accurate and complete; the new `PaginatedResult<T>` generic is well-structured.
