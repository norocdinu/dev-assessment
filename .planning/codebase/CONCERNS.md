# Concerns

_Generated: 2026-05-07_

---

## Security

### Hardcoded Admin Password
**File**: `apps/api/src/db/seed-admin.ts`

The seed script contains a hardcoded plaintext password:

```ts
const password = 'Admin1234!';
```

It also prints the password to stdout on first run:

```ts
console.log(`Admin created: ${email} / ${password}`);
```

This password (`Admin1234!`) is committed to version control and is the default credential for the `admin@example.com` owner account in every environment where the seed script is run. Any developer with repo access knows the production admin password unless it has been manually changed post-deploy. The password should be sourced from an environment variable (e.g., `ADMIN_INITIAL_PASSWORD`) and the log statement should be removed or redacted.

---

### Admin Auth Guard Is Client-Side Only — No SSR or Middleware Protection
**File**: `apps/web/src/app/(admin)/layout.tsx`

The admin layout is a `'use client'` component that checks authentication by calling `GET /auth/me` inside a `useEffect`:

```ts
useEffect(() => {
  api.get('/auth/me')
    .then((r) => setUser(r.data.user))
    .catch(() => router.push('/login'));
}, [router]);
```

The page renders a spinner until the check resolves, then either shows the admin UI or redirects. This means:

- The admin HTML/JS is always delivered to the browser, regardless of auth state. A non-authenticated user receives all admin page code.
- There is no Next.js `middleware.ts` file at the root to protect `/questions`, `/test-configs`, `/submissions`, etc. at the edge.
- There is no server-side redirect in a Server Component or Server Action.

The API itself is correctly protected (JWT verification on every route), so data cannot be exfiltrated without a valid token. However, the client-side guard creates a flash of the spinner UI for unauthenticated requests and exposes the admin application bundle unnecessarily.

The fix is to add a `middleware.ts` at `apps/web/src/middleware.ts` that checks for a valid session token and redirects to `/login` before the page renders.

---

### JWT Secret Not Validated at Startup
**File**: `apps/api/src/index.ts`

```ts
await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
  ...
});
```

The non-null assertion (`!`) silences TypeScript but does not provide a runtime check. If `JWT_SECRET` is undefined or an empty string, `@fastify/jwt` will silently use it, resulting in insecure tokens. A startup assertion (similar to the `DATABASE_URL` check in `apps/api/src/db/client.ts`) should be added.

---

### Test Link Token Not Validated for Format in Route Parameters
**Files**: `apps/api/src/routes/test-links.ts`, `apps/api/src/routes/candidate.ts`

Route path parameters (`token`, `id`, `linkId`, `familyId`) are used directly in SQL queries without UUID or format validation. For example in `test-links.ts`:

```ts
const { id } = request.params as { id: string };
// id used directly: WHERE id = ${id}
```

The `postgres` tagged-template prevents SQL injection, but there is no check that the value is a well-formed UUID. Arbitrary strings will produce a Postgres error that bubbles up as an unhandled 500 rather than a clean 400. The `submissions.ts` route does have a UUID regex check (`UUID_RE`) for its compare/export query parameters — that pattern should be applied uniformly to path parameters.

---

### Hardcoded Production URL in Source
**File**: `apps/api/src/index.ts`

```ts
'https://dev-assessmentweb-production.up.railway.app',
```

A Railway production URL is hardcoded in the CORS allowed-origins list. This couples the codebase to a specific deployment URL. It should be sourced from an environment variable (e.g., included in the `WEB_URL` logic or a separate `ADDITIONAL_CORS_ORIGIN`).

---

### `ioredis` Dependency Present but Unused
**File**: `apps/api/package.json`

`ioredis` is listed as a production dependency but is not imported anywhere in the codebase. This is dead weight in the Docker image and may indicate planned-but-unimplemented Redis caching or rate-limiting.

---

## Technical Debt

### Migration System Is Fragile
**File**: `apps/api/src/db/migrate.ts`

The migration strategy parses SQL comments as phase delimiters:

```ts
const phase2Start = schema.indexOf('-- Phase 2: Test Links');
const seedStart   = schema.indexOf('-- Seed initial data');
```

This is brittle — renaming or reordering comments in `schema.sql` silently skips migrations without error. There is no checksum, no migration table tracking applied versions, and no rollback capability. A proper migration tool (e.g., `node-pg-migrate`, `Flyway`, or Drizzle migrations) would be safer.

Additionally, the "seed data" block at the bottom of `schema.sql` is re-applied every time the migration script runs (even on an existing DB), relying on `ON CONFLICT (slug) DO NOTHING` to be idempotent. This works for the current seed data but could cause issues if mutable seed rows are ever added.

---

### `as unknown as T` Type Casts on DB Results
**Files**: `apps/api/src/routes/candidate.ts`, `apps/api/src/routes/submissions.ts`, `apps/api/src/routes/questions.ts`, `apps/api/src/middleware/auth.ts`

The `postgres` library returns loosely typed row objects. The codebase casts them with `as unknown as Array<{ ... }>` throughout. This bypasses TypeScript's safety and means a column rename in SQL would not produce a compile error. A typed DB client (Drizzle ORM, Kysely, or `postgres` with generics) or explicit result validation would eliminate these casts.

One instance uses `(request as any)` in `apps/api/src/routes/test-links.ts:31` to access `request.user`, whereas the adjacent code correctly uses the `getAuthUser(request)` helper — inconsistency that should be unified.

---

### No Input Validation on Route Path Parameters
Described under Security above — also a technical debt item. UUID path params should be validated before reaching the DB.

---

### `useDebounce` Hook Is Not Extracted
**File**: `apps/web/src/app/(admin)/questions/page.tsx`

The `useDebounce` hook is defined inline in the questions page file. If search/filter debouncing is needed elsewhere, it will be copy-pasted. It should live in a shared `hooks/` directory.

---

### Missing Next.js Middleware for Route Protection
As noted under Security, there is no `middleware.ts`. This also means the root `page.tsx` redirect (`redirect('/questions')`) will send unauthenticated users to the admin questions page, where they receive the auth spinner rather than being immediately sent to `/login`.

---

### `clearFilters` Uses `setTimeout` to Sequence State Updates
**File**: `apps/web/src/app/(admin)/submissions/page.tsx`

```ts
function clearFilters() {
  setFilterTestConfigId('');
  ...
  setTimeout(() => fetchSubmissions(), 0);
}
```

A `setTimeout(..., 0)` is used to defer a fetch until after React re-renders with cleared filter state. This is a known anti-pattern — the filter values captured in `fetchSubmissions` are stale closures. A `useEffect` dependency on filter state would be cleaner and more reliable.

---

### Test Time Is Hardcoded to 30 Minutes
**File**: `apps/web/src/app/(candidate)/test/[token]/page.tsx`

```ts
const DURATION_MS = 30 * 60 * 1000;
```

The 30-minute test duration is hardcoded in the client. The server also enforces it:

```sql
SELECT (NOW() > started_at + INTERVAL '30 minutes') AS past_deadline
```

If the duration ever needs to be configurable per test config, both the client constant and the SQL interval must be changed in sync. The duration should be stored on `test_configs` and returned in the session response.

---

### Correct Answer Exposed in Candidate Session Response
**File**: `apps/api/src/routes/candidate.ts`

The `/candidate/results/:token` endpoint returns the full answer sheet including `correct_option` for every question, which is intentional (results review). However, the `/candidate/session/:token` response only returns question text and options (not `correct_option`) — the query explicitly excludes it:

```sql
SELECT id, text, option_a, option_b, option_c, option_d, skill_area
FROM questions
```

This is correctly implemented, but a future developer modifying the session query to add columns should be aware that `correct_option` must never be included in the session response.

---

## Performance

### N+1 Query in `/admin/submissions/compare`
**File**: `apps/api/src/routes/submissions.ts`

The compare endpoint issues one DB query per submission ID:

```ts
const results = await Promise.all(ids.map(async (linkId: string) => {
  const [result] = await db`SELECT ... WHERE tl.id = ${linkId}`;
  return result ?? null;
}));
```

For large comparison sets this is an N+1 pattern. A single query with `WHERE tl.id = ANY(${ids}::uuid[])` would be more efficient.

---

### No Pagination on Any List Endpoint
The following endpoints return unbounded result sets:

- `GET /questions` — all questions matching filters
- `GET /admin/submissions` — all submissions matching filters
- `GET /admin/test-links/:testConfigId` — all links for a config

As data grows, these will become slow and memory-intensive. No pagination (`LIMIT`/`OFFSET` or cursor-based) is implemented.

---

### No Rate Limiting
There is no rate limiting on any endpoint. The login endpoint (`POST /auth/login`) is not protected against brute-force attacks. The candidate session endpoint (`GET /candidate/session/:token`) could be enumerated for valid tokens. `@fastify/rate-limit` or a reverse-proxy solution should be applied at minimum to `/auth/login`.

---

## Known Issues / Bugs

### Back-Navigation URL Is Wrong in Submission Detail
**File**: `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`

```tsx
<button onClick={() => router.push(`/admin/submissions/${result.test_config_id}/links`)}>
  ← Back to Test Links
```

The route pushes `/admin/submissions/<testConfigId>/links` — but the actual test links page is at `/test-configs/<id>/links`, not under `/submissions`. This link navigates to a non-existent route.

---

### `recharts` Imported but Not Used
**File**: `apps/web/package.json`

`recharts` is listed as a production dependency but is not imported anywhere in the web app. The submissions stats panel uses only Tailwind CSS bar charts (plain `div` elements with percentage widths). This adds unnecessary bundle weight.

---

## Console Logging

The following files use `console.log` / `console.error` at runtime (these are acceptable in the migration/seed scripts, which are one-shot CLI tools, but worth noting):

- `apps/api/src/db/migrate.ts` — migration progress messages and error reporting.
- `apps/api/src/db/seed-admin.ts` — logs the plaintext password on first run (see Security section above).

No `console.log` debugging statements exist in route handlers or middleware.
