# Phase 7 Research — Team Management & UX Polish

## RESEARCH COMPLETE

---

## 1. DB Migration Pattern (Phase 7 name column)

### How Phase 6 Migration Works

`apps/api/src/db/migrate.ts` follows a strictly incremental, idempotent pattern:

1. **Check if Phase 1 exists** via `information_schema.tables` for `admin_users`. If fresh DB, run entire `schema.sql` and exit.
2. **Check each subsequent phase** via table existence or column existence using `information_schema` queries.
3. **Phase 6 pattern for column addition** (the exact pattern to copy):
   ```ts
   const [{ candidateNameExists }] = await db`
     SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'test_links'
         AND column_name = 'candidate_name'
     ) AS "candidateNameExists"
   `;
   if (!candidateNameExists) {
     await db`ALTER TABLE test_links ADD COLUMN candidate_name TEXT`;
   }
   ```
4. **Seed data** is always applied at the end (`ON CONFLICT ... DO NOTHING` keeps it safe).

### Phase 7 Migration: Add `name` to `admin_users`

```ts
// At the end of migrate.ts, before the seed section:
const [{ nameExists }] = await db`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_users'
      AND column_name = 'name'
  ) AS "nameExists"
`;
if (!nameExists) {
  console.log('Running Phase 7 migration: adding name to admin_users...');
  await db`ALTER TABLE admin_users ADD COLUMN name TEXT NOT NULL DEFAULT ''`;
  console.log('Phase 7: name column added');
} else {
  console.log('Phase 7: name column already present — skipping');
}
```

### schema.sql Update

Add `name TEXT NOT NULL DEFAULT ''` to the `admin_users` table definition (after `email`), and add a Phase 7 comment block at the bottom similar to the Phase 6 comment. Existing owner seed account gets empty string; the owner sets their name via `/admin/settings`.

**Critical note**: The `test_links.candidate_name` column is already in `schema.sql` (added Phase 6). The `admin_users` role CHECK constraint already includes `'member'` (Phase 6). Only the `name` column is new in Phase 7.

---

## 2. Backend: Account CRUD Routes

### Router Structure

No separate admin router file exists. New account routes go in a new file `apps/api/src/routes/accounts.ts` (following the pattern of every other route file), then registered in `index.ts` at prefix `/admin/accounts`:

```ts
await app.register(accountRoutes, { prefix: '/admin/accounts' });
```

### RBAC Middleware

`requireRole` in `apps/api/src/middleware/rbac.ts` accepts variadic role strings and checks `user.role` from the JWT:

```ts
export function requireRole(...roles: string[]) {
  return async function (request, reply) {
    const user = getAuthUser(request);
    if (!user || !roles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}
```

All 4 account routes are owner-only: `preHandler: [authMiddleware, requireRole('owner')]`.

### Route Implementations

**GET /admin/accounts** — List all admin users:
```sql
SELECT id, email, name, role, created_at, last_login_at
FROM admin_users
ORDER BY created_at ASC
```

**POST /admin/accounts** — Create account (name, email, role, password):
- Zod schema: `{ name: z.string().min(1), email: z.string().email(), role: z.enum(['owner','reviewer','member']), password: z.string().min(8) }`
- Hash password: `bcrypt.hash(password, 10)`
- INSERT with `RETURNING id, email, name, role, created_at`
- Return 201

**PUT /admin/accounts/:id** — Update name and/or role:
- Zod schema: `{ name: z.string().min(1).optional(), role: z.enum(['owner','reviewer','member']).optional() }`
- Build partial UPDATE dynamically; only update provided fields
- Return updated record

**DELETE /admin/accounts/:id** — Delete account (guard last owner):
```sql
-- First: count owner accounts
SELECT COUNT(*) FROM admin_users WHERE role = 'owner'
-- If count === 1 AND this account has role = 'owner':
-- return 409 { error: 'Cannot delete the last owner account' }
-- Else:
DELETE FROM admin_users WHERE id = $id RETURNING id
-- If no row: 404
```

### bcrypt Pattern in Existing Code

In `auth.ts`:
- **Verify**: `bcrypt.compare(password, user.password_hash)` — returns boolean
- **Hash** (for new accounts and password changes): `bcrypt.hash(plaintext, 10)` — bcrypt is already imported in auth.ts; import same way in accounts.ts

---

## 3. Backend: PUT /auth/me

This route is added to the existing `authRoutes` function in `apps/api/src/routes/auth.ts`.

### Implementation

```ts
const updateMeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).optional(),
  name: z.string().optional(),
});

app.put('/me', { preHandler: authMiddleware }, async (request, reply) => {
  const body = updateMeSchema.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: 'Invalid request body' });

  const { current_password, new_password, name } = body.data;
  const userId = (request as any).user.id;

  // Fetch current hash
  const [user] = await db`SELECT password_hash FROM admin_users WHERE id = ${userId}`;
  if (!user) return reply.status(404).send({ error: 'User not found' });

  // Validate current password
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return reply.status(401).send({ error: 'Current password is incorrect' });

  // Build updates
  if (new_password) {
    const newHash = await bcrypt.hash(new_password, 10);
    await db`UPDATE admin_users SET password_hash = ${newHash} WHERE id = ${userId}`;
  }
  if (name !== undefined) {
    await db`UPDATE admin_users SET name = ${name} WHERE id = ${userId}`;
  }

  return { ok: true };
});
```

**Key decisions from D-11**: The endpoint validates `current_password` via bcrypt compare before any update. Accepts optional `name` field (no separate endpoint for name-only updates). Returns `{ ok: true }`.

**Note on `GET /auth/me`**: Currently returns `request.user` from JWT payload, which only contains `id`, `email`, `role`. The JWT does NOT include `name`. For the settings page to display the current name, the GET /me endpoint must be updated to fetch `name` from the DB (or the JWT payload must be extended). Simplest approach: update `GET /auth/me` to do a DB lookup:

```ts
app.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
  const userId = (request as any).user.id;
  const [user] = await db`SELECT id, email, name, role FROM admin_users WHERE id = ${userId}`;
  return { user };
});
```

This also ensures the sidebar shows the name without requiring a re-login.

---

## 4. Frontend: Layout & Sidebar Changes

### Current State of `apps/web/src/app/(admin)/layout.tsx`

- `navItems` is a static array: `[{ href: '/questions', label: 'Question Bank' }, { href: '/test-configs', label: 'Test Configs' }, { href: '/submissions', label: 'Submissions' }]`
- Uses `api.get('/auth/me')` to get `user: AdminUser | null`
- Bottom-left block shows `user.email`, `user.role` (capitalize), and a sign-out button
- `Toaster` is already mounted (position="top-right")
- No active route highlighting for accounts yet

### Changes Required

**1. Add Accounts nav item (owner-only)**

The `navItems` array is static and cannot conditionally include owner-only items. Options:
- Keep the static array for common items, render the Accounts link separately after the map loop (conditional on `user.role === 'owner'`)
- Or, build navItems dynamically based on `user` after it loads

Recommended approach (minimal diff):
```tsx
{navItems.map(...)}  {/* existing items */}
{user.role === 'owner' && (
  <Link
    href="/accounts"
    className={`flex items-center px-3 py-2 text-sm rounded-md ${
      pathname.startsWith('/accounts')
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    Accounts
  </Link>
)}
```

**2. Sidebar user info block → clickable link to /admin/settings**

Current (lines 57–69):
```tsx
<div className="p-4 border-t border-gray-200 text-xs text-gray-500">
  <div className="font-medium text-gray-700">{user.email}</div>
  <div className="capitalize">{user.role}</div>
  <button onClick={...}>Sign out</button>
</div>
```

New: wrap the name/email/role block in a `<Link href="/settings">`, keep sign-out button separate, show `user.name || user.email` as primary display:
```tsx
<div className="p-4 border-t border-gray-200 text-xs text-gray-500">
  <Link href="/settings" className="block hover:bg-gray-50 rounded -mx-1 px-1 py-1 mb-1">
    <div className="font-medium text-gray-700">{user.name || user.email}</div>
    <div className="text-gray-500">{user.name ? user.email : ''}</div>
    <div className="capitalize text-gray-400">{user.role}</div>
  </Link>
  <button onClick={...}>Sign out</button>
</div>
```

**3. AdminUser type needs `name: string`** (shared type update required — see Section 7)

**4. `GET /auth/me` must return `name`** (backend update — see Section 3) so layout can display it.

---

## 5. Frontend: Accounts Pages

### Three New Page Files

All three follow the same `'use client'` + useState/useEffect pattern as every other admin page. No React Query/SWR. Errors displayed as `<p className="text-sm text-red-600">{error}</p>`.

#### `/admin/accounts/page.tsx` — Accounts List

```
State: accounts[], userRole, loading, error, editingAccount (for inline edit modal or separate page)
Mount: api.get('/auth/me') → setUserRole; api.get('/admin/accounts') → setAccounts
DataTable columns: Name | Email | Role (badge) | Created | Actions (Edit / Delete)
Role badge: owner=blue, reviewer=gray, member=green (use span with colored classes)
Delete: confirm dialog → api.delete('/admin/accounts/:id') → handle 409 (last owner) explicitly
Edit: navigate to edit page OR inline modal (see Claude's Discretion in CONTEXT.md)
```

**DataTable usage** (no pagination needed for small admin list):
```tsx
<DataTable columns={columns} data={accounts} />
```

Columns pattern matches `questions/page.tsx` — `ColumnDef<AccountRow>[]` with `accessorKey` + `cell` renderers.

**Role badge pattern** (new, not in existing code but straightforward):
```tsx
cell: ({ getValue }) => {
  const role = getValue<string>();
  const colors = { owner: 'bg-blue-100 text-blue-700', reviewer: 'bg-gray-100 text-gray-700', member: 'bg-green-100 text-green-700' };
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[role as keyof typeof colors] ?? ''}`}>{role}</span>;
}
```

**Delete with 409 guard**:
```tsx
async function handleDelete(id: string) {
  if (!confirm('Delete this account?')) return;
  try {
    await api.delete(`/admin/accounts/${id}`);
    fetchAccounts();
  } catch (err: any) {
    if (err.response?.status === 409) {
      setError(err.response.data.error);  // e.g. 'Cannot delete the last owner account'
    } else {
      setError('Failed to delete account.');
    }
  }
}
```

#### `/admin/accounts/new/page.tsx` — Create Account Form

```
State: { name, email, role, password }, errors, loading, submitError
Fields: Name (text, required), Email (email, required), Role (select: owner/reviewer/member), Password (password, required, min 8)
Submit: api.post('/admin/accounts', values) → router.push('/accounts')
Validation: inline per field (same pattern as test-configs/new/page.tsx)
```

Pattern matches `test-configs/new/page.tsx` exactly. Form structure with `space-y-5 max-w-lg`.

#### `/admin/settings/page.tsx` — Account Settings

```
State: { name, currentPassword, newPassword }, loading, saving, error, success
Mount: api.get('/auth/me') → prefill name
Two sections on one page:
  1. Display name: input pre-filled with user.name, save button
  2. Change password: current_password + new_password inputs, save button
Both save via api.put('/auth/me', { ... }) — same endpoint accepts both
Success feedback: toast.success('Settings saved') via sonner (already installed)
```

**Key implementation note**: Since both name update and password change go through the same endpoint (`PUT /auth/me`), the settings page can submit them together or separately. Two separate form sections each calling `PUT /auth/me` with just their respective fields works cleanly — the endpoint accepts optional fields.

---

## 6. Frontend: Test Links Page Changes

### Current State (`apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx`)

- State: `links[], userRole, loading, error, generating, generatedUrl, copied`
- `const isOwner = userRole === 'owner'`
- Generate button: `{isOwner && <button onClick={handleGenerate}>Generate New Link</button>}`
- `handleGenerate()` POSTs `{ test_config_id: id }` — no candidate_name
- Columns: Token | State | Created | Started | Submitted | Actions
- `GET /admin/test-links/:testConfigId` SELECT does NOT include `candidate_name` — must update backend

### Changes Required

**1. Add `candidateName` state and input above generate button**

```tsx
const [candidateName, setCandidateName] = useState('');
```

New UI above the existing "Generate New Link" button:
```tsx
{(isOwner || isMember) && (
  <div className="flex gap-2 items-end">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
      <input
        type="text"
        value={candidateName}
        onChange={(e) => setCandidateName(e.target.value)}
        placeholder="Optional"
        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    </div>
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {generating ? 'Generating…' : 'Generate New Link'}
    </button>
  </div>
)}
```

**2. Update `handleGenerate` to include `candidate_name`**

```tsx
async function handleGenerate() {
  setGenerating(true);
  setError('');
  setGeneratedUrl('');
  try {
    const res = await api.post('/admin/test-links', {
      test_config_id: id,
      candidate_name: candidateName || undefined,
    });
    setGeneratedUrl(res.data.url);
    setCandidateName('');  // clear after generate
    fetchLinks();
  } catch {
    setError('Failed to generate link. Please try again.');
  } finally {
    setGenerating(false);
  }
}
```

**3. Change role check from `isOwner` to `isOwner || isMember`**

```tsx
const isOwner = userRole === 'owner';
const isMember = userRole === 'member';
```

The Generate button condition changes from `{isOwner && ...}` to `{(isOwner || isMember) && ...}`. The Revoke button stays `{isOwner && ...}`.

**4. Add Candidate column to the DataTable**

New column (add before or after 'Token'):
```tsx
{
  header: 'Candidate',
  accessorKey: 'candidate_name',
  cell: ({ getValue }) => getValue<string | null>() ?? '—',
},
```

`TestLink` type in shared also needs `candidate_name: string | null` added.

**5. Backend: Update `GET /admin/test-links/:testConfigId` SELECT**

Currently: `SELECT id, token, state, expires_at, started_at, submitted_at, created_at`
Update to: `SELECT id, token, state, expires_at, started_at, submitted_at, created_at, candidate_name`

**6. Backend: Update `POST /admin/test-links` schema + INSERT**

Schema: add `candidate_name: z.string().optional()`
INSERT: `INSERT INTO test_links (test_config_id, token, seed, expires_at, created_by, candidate_name)`

**7. Backend: Relax RBAC on POST /admin/test-links**

Change: `requireRole('owner')` → `requireRole('owner', 'member')`

---

## 7. Shared Types

### `packages/shared/src/types/index.ts`

**`AdminUser` interface** — add `name: string`:
```ts
export interface AdminUser {
  id: string;
  email: string;
  name: string;  // ADD THIS
  role: 'owner' | 'reviewer' | 'member';
}
```

**`TestLink` interface** — add `candidate_name`:
```ts
export interface TestLink {
  id: string;
  test_config_id: string;
  token: string;
  state: 'created' | 'active' | 'submitted' | 'expired';
  expires_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  created_by: string;
  created_at: string;
  candidate_name: string | null;  // ADD THIS
}
```

**New `AdminAccount` interface** for the accounts list (or reuse AdminUser — decision: extend AdminUser with `created_at` and `last_login_at` for the accounts table):
```ts
export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'reviewer' | 'member';
  created_at: string;
  last_login_at: string | null;
}
```

---

## 8. Integration Order & Risk

### Recommended Implementation Order

**Wave 1 — Foundation (no interdependencies)**
1. DB migration (add `name` to `admin_users`) — must run before any account creation or settings save
2. Shared types update (`AdminUser.name`, `TestLink.candidate_name`, new `AdminAccount`)
3. `GET /auth/me` update to return `name` from DB
4. `schema.sql` update (document the `name` column)

**Wave 2 — Backend routes**
5. `PUT /auth/me` — password + name update on auth router
6. New `apps/api/src/routes/accounts.ts` — all 4 CRUD routes
7. Register accounts router in `index.ts`
8. Update `POST /admin/test-links` — schema + INSERT + RBAC
9. Update `GET /admin/test-links/:testConfigId` — add `candidate_name` to SELECT

**Wave 3 — Frontend pages**
10. `apps/web/src/app/(admin)/layout.tsx` — Accounts nav (owner-only) + settings link on user info block + show `user.name || user.email`
11. `apps/web/src/app/(admin)/accounts/page.tsx` — DataTable list + delete
12. `apps/web/src/app/(admin)/accounts/new/page.tsx` — create form
13. `apps/web/src/app/(admin)/settings/page.tsx` — name + password form
14. `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — candidate name input + isMember + Candidate column
15. `apps/web/src/app/(admin)/test-configs/new/page.tsx` — pass_threshold_pct default 70 → 80

### Risks & Watch Points

**Risk 1: `GET /auth/me` change breaks existing callers**
- Currently returns JWT payload directly (`request.user`). Changing to a DB query adds latency and a DB round-trip on every auth check.
- All admin pages call `api.get('/auth/me')` on mount. This is fine — it's intentional.
- **Risk**: If `user.name` is `undefined` (pre-migration DB or old JWT), `user.name || user.email` fallback handles it gracefully. But TypeScript would complain if `AdminUser.name` is non-optional. Consider `name: string` (migration adds `DEFAULT ''`) — empty string is falsy, so `user.name || user.email` shows email until they update their name. This is correct per D-01/Specifics.

**Risk 2: JWT payload doesn't include `name`**
- The JWT still encodes `{ id, email, role }`. After a `PUT /auth/me` name change, the sidebar will reflect the new name because `GET /auth/me` hits the DB. No re-login needed. This is correct — no need to re-sign the JWT.

**Risk 3: `DELETE /admin/accounts/:id` — last owner check race condition**
- If two owners are deleted simultaneously, both could pass the "count > 1" check. For a small team tool, this risk is acceptable (per the deferred section). No distributed lock needed.

**Risk 4: TypeScript compilation after shared type update**
- Any code that constructs `AdminUser` objects (primarily in `auth.ts` return value) needs `name` added. The login route returns `{ id: user.id, email: user.email, role: user.role }` — this will need `name: user.name` added too, or TypeScript will error.

**Risk 5: Accounts page — edit action (Claude's Discretion)**
- The CONTEXT leaves edit form layout to Claude. Recommend a separate `/admin/accounts/:id/edit` page (same pattern as `/questions/:familyId/edit`) rather than inline table row expand — simpler to implement and easier to navigate.

**Risk 6: `PUT /admin/accounts/:id` — dynamic partial UPDATE in postgres.js**
- postgres.js (`db`) does not support dynamic UPDATE column building natively. Must either:
  - Always UPDATE all editable fields (name required even if not changing, role required even if not changing)
  - Or build conditional SQL with multiple separate UPDATE statements
  - Simplest: require both `name` and `role` on every edit (pre-fill the form with current values)

---

## 9. Files Modified

### New Files (CREATE)
- `apps/api/src/routes/accounts.ts` — Account CRUD routes
- `apps/web/src/app/(admin)/accounts/page.tsx` — Accounts list page
- `apps/web/src/app/(admin)/accounts/new/page.tsx` — Create account form
- `apps/web/src/app/(admin)/settings/page.tsx` — Admin settings page

### Modified Files (EDIT)
- `apps/api/src/db/migrate.ts` — Add Phase 7 migration block (name column)
- `apps/api/src/db/schema.sql` — Add `name TEXT NOT NULL DEFAULT ''` to admin_users; add Phase 7 comment
- `apps/api/src/index.ts` — Register `accountRoutes` at `/admin/accounts`
- `apps/api/src/routes/auth.ts` — Add `PUT /auth/me`; update `GET /auth/me` to return name from DB
- `apps/api/src/routes/test-links.ts` — Update POST schema/INSERT + RBAC; update GET SELECT
- `packages/shared/src/types/index.ts` — Add `name` to AdminUser; add `candidate_name` to TestLink; add AdminAccount interface
- `apps/web/src/app/(admin)/layout.tsx` — Conditional Accounts nav; settings link on user block; show name
- `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — Candidate name input/state; isMember check; Candidate column
- `apps/web/src/app/(admin)/test-configs/new/page.tsx` — Change pass_threshold_pct default from 70 to 80

### Total: 4 new files, 9 modified files

---

*Research completed: 2026-05-07*
*Covers requirements: ACCESS-05, ACCESS-06, ACCESS-07, ACCESS-08, TESTS-06, TESTS-07*
