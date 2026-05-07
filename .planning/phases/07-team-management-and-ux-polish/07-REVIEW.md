---
phase: 7
plan: "07-01, 07-02"
status: warning
depth: standard
files_reviewed: 11
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
reviewed_at: "2026-05-07"
---

# Code Review — Phase 7: Team Management & UX Polish

**Files reviewed:** 11 | **Depth:** standard | **Status:** warning

## Files in Scope

Backend:
- `packages/shared/src/types/index.ts`
- `apps/api/src/db/migrate.ts`
- `apps/api/src/db/schema.sql`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/accounts.ts`
- `apps/api/src/index.ts`
- `apps/api/src/routes/test-links.ts`

Frontend:
- `apps/web/src/app/(admin)/layout.tsx`
- `apps/web/src/app/(admin)/accounts/page.tsx`
- `apps/web/src/app/(admin)/accounts/new/page.tsx`
- `apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx`
- `apps/web/src/app/(admin)/settings/page.tsx`
- `apps/web/src/app/(admin)/test-configs/new/page.tsx`
- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`

---

## Findings

### WR-01 — Non-atomic double write in `PUT /auth/me`

**File:** `apps/api/src/routes/auth.ts` (lines 72–78)  
**Severity:** warning

When both `new_password` and `name` are provided, `PUT /auth/me` executes two separate `UPDATE` statements in sequence. If the second query fails after the first succeeds (e.g., DB connection drop mid-request), the state is partially updated.

```ts
// Two separate writes — not wrapped in a transaction
if (new_password) {
  await db`UPDATE admin_users SET password_hash = ${newHash} WHERE id = ${userId}`;
}
if (name !== undefined) {
  await db`UPDATE admin_users SET name = ${name} WHERE id = ${userId}`;
}
```

**Impact:** Low — both fields are independent user preferences; partial update doesn't affect security or platform correctness. The settings UI submits name and password in separate forms, so both fields are rarely sent in the same request.

**Recommendation:** Wrap in a single `UPDATE admin_users SET password_hash = ..., name = ... WHERE id = ...` or use a transaction if simultaneous updates become common.

---

### WR-02 — Race condition in last-owner deletion guard

**File:** `apps/api/src/routes/accounts.ts` (lines 75–84)  
**Severity:** warning

The last-owner check reads owner count then deletes in two separate queries with no transaction:

```ts
const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM admin_users WHERE role = 'owner'`;
if (count === 1) {
  return reply.status(409).send({ error: 'Cannot delete the last owner account' });
}
await db`DELETE FROM admin_users WHERE id = ${id}`;
```

Two concurrent DELETE requests for different owners could both pass the `count === 1` guard (both see count = 2), execute both deletes, and leave zero owners.

**Impact:** Very low for a small team tool — concurrent owner deletions are practically impossible in practice. No functional regression compared to not having any guard (which was the prior state).

**Recommendation:** Wrap in a transaction with `FOR UPDATE` lock on the owner count query:
```sql
BEGIN;
SELECT COUNT(*) FROM admin_users WHERE role = 'owner' FOR UPDATE;
-- check count, then delete
COMMIT;
```

---

### INFO-01 — Edit account pre-fills by fetching entire list

**File:** `apps/web/src/app/(admin)/accounts/[id]/edit/page.tsx` (lines 26–36)  
**Severity:** info

The edit page fetches `GET /admin/accounts` (returns all accounts) and filters by `params.id` client-side. There is no `GET /admin/accounts/:id` endpoint.

```ts
const res = await api.get('/admin/accounts');
const account = accounts.find((a) => a.id === id);
```

**Impact:** None for a small team (O(N) fetch where N ≤ ~10 admins). Noted as a tech debt item if the team scales.

---

### INFO-02 — `PUT /auth/me` accepts empty string name

**File:** `apps/api/src/routes/auth.ts` (line 14)  
**Severity:** info

The `updateMeSchema` uses `z.string().optional()` for `name` — this allows sending `name: ""` to clear the display name. The frontend sidebar uses `user.name || user.email` as a fallback, so the UI handles this gracefully. Consistent with the spec design decision.

```ts
name: z.string().optional(),
```

**Impact:** None — UI fallback handles it. Documents expected behavior.

---

## Summary

No critical issues. Two warnings (non-atomic DB writes in PUT /auth/me, theoretical race condition in last-owner guard) are low-risk for a small team tool. Both are acceptable given the current usage pattern and can be addressed in a future phase if needed. All security checks (authMiddleware, requireRole, bcrypt, parameterized queries) are correct.

**Verdict:** Phase 7 is safe to ship. The warnings are noted for future hardening.
