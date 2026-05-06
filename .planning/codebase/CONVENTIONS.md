# Code Conventions

_Generated: 2026-05-07_

---

## Project Structure

The project is an npm workspaces monorepo with three packages:

- `apps/api` — Fastify REST API (Node.js, TypeScript ESM)
- `apps/web` — Next.js 16 frontend (React, TypeScript)
- `packages/shared` — Shared TypeScript types consumed by both apps

Shared types are imported as `@dev-assessment/shared` and live entirely in `packages/shared/src/types/index.ts`. There is no shared business logic — only type declarations.

---

## TypeScript

- **Strict mode is on** in all packages (`"strict": true` in `tsconfig.base.json` and both app tsconfigs).
- **Target**: ES2022 for the API; ESNext for the web (bundler resolution).
- **Module system**: The API uses `"type": "module"` (ESM) with `.js` extensions on all imports (e.g., `import { db } from './client.js'`). The web uses Next.js bundler resolution with `@/*` path alias pointing to `./src/*`.
- **Type casting**: The API uses `as unknown as T` in several places when reading raw Postgres query results — a recurring pattern because `postgres` returns loosely typed row objects. A `(request as any)` escape also appears in `apps/api/src/routes/test-links.ts:31` where `request.user` is accessed before the JWT middleware has typed it.
- **No generated types**: Database rows are not typed via Prisma, Drizzle, or a code-gen step. All row shapes are cast or typed manually.

---

## Naming Conventions

### Files & Modules
- Route files are named after the resource they own: `auth.ts`, `questions.ts`, `test-configs.ts`, `test-links.ts`, `candidate.ts`, `submissions.ts`, `stats.ts`, `technologies.ts`.
- Middleware files are grouped under `apps/api/src/middleware/`.
- Database utilities live under `apps/api/src/db/` (`client.ts`, `migrate.ts`, `seed-admin.ts`, `schema.sql`).
- Utility/library files live under `apps/api/src/lib/` (`rng.ts`, `audit.ts`).

### Identifiers
- **Variables and function parameters**: `camelCase`.
- **Database column names and API JSON keys**: `snake_case` — used consistently across SQL, API responses, and shared types.
- **React components**: `PascalCase` (e.g., `QuestionCard`, `DataTable`, `Timer`).
- **Route handler exports**: Named async functions, e.g., `export async function questionRoutes(app: FastifyInstance)`.
- **Zod schemas**: Named with `Schema` suffix, e.g., `loginSchema`, `questionBodySchema`, `createSchema`.

### Route Groups (Next.js)
- `(admin)` — layout-wrapped admin pages behind the auth check.
- `(candidate)` — layout-wrapped candidate test pages (layout is a passthrough; no auth needed).

---

## API Design Patterns

- All routes are registered as Fastify plugins with a `prefix`, collected in `apps/api/src/index.ts`.
- `preHandler` arrays apply middleware in order: `[authMiddleware, requireRole('owner')]` for write operations, `authMiddleware` alone for read operations.
- Candidate endpoints (`/candidate/*`) require no auth — they are token-gated at the business-logic level.
- Input validation is always done with Zod's `safeParse`, returning a `400` with `{ error: ... }` on failure.
- Successful creation returns HTTP 201; successful updates and deletes return the updated resource or `{ ok: true }`.
- 404 is returned when a record is not found; 409 for conflict (already submitted); 410 for expired/dead state.

---

## Error Handling

### API (Fastify)
- All route handlers use Zod `safeParse` for request validation. On failure: `reply.status(400).send({ error: body.error.flatten() })` or `reply.status(400).send({ error: 'Invalid ...' })`.
- Auth failures return `{ error: 'Unauthorized' }` (401) from `authMiddleware`; RBAC failures return `{ error: 'Forbidden' }` (403) from `requireRole`.
- No global Fastify error handler is registered — unhandled exceptions fall through to Fastify's built-in handler.
- Database errors in the CSV import loop are caught per-row and collected into an `errors` array without aborting the whole import.
- The migration script calls `process.exit(1)` on failure; the seed script does the same.
- The `catch` block in `authMiddleware` suppresses the thrown error detail (uses bare `catch {}`), leaking no JWT internals to clients.

### Web (React/Next.js)
- API calls from admin pages use the `api` axios instance (`apps/web/src/lib/api.ts`), which has a response interceptor that redirects to `/login` on any 401.
- Candidate pages use raw `fetch` (not axios) to call the API, since no auth token is needed.
- Error states are stored as `const [error, setError] = useState('')` and rendered inline.
- Most catch blocks in admin pages are bare `catch {}` (swallow silently) or set a string error message. No error boundary components exist.

---

## React / Next.js Patterns

- **All admin pages and candidate test pages are `'use client'` components.** There are no Server Components or Server Actions performing data fetching.
- State is managed exclusively with `useState` and `useEffect`; no external state library (Redux, Zustand, Jotai, etc.).
- Data is fetched on mount with `useEffect` calling the `api` singleton.
- The `useDebounce` hook is defined inline in `apps/web/src/app/(admin)/questions/page.tsx` (not extracted to a shared hook).
- Tailwind CSS is used for all styling. No CSS modules or styled-components. Class names follow a consistent gray-50/200/300 neutral palette with blue-600 as the primary action colour.
- `@tanstack/react-table` is used for sortable/filterable tables in admin pages (`DataTable` component wraps it generically; `SubmissionsPage` uses it directly with custom sorting state).
- Modals are implemented as inline conditional renders with fixed-position overlays (no portal, no modal library).

---

## Database Access

- `postgres` (the `postgres` npm package, not `pg`) is used with tagged-template SQL: `db\`SELECT ...\``.
- All query parameters are interpolated as template-literal slots — no raw string concatenation in queries.
- Conditional query fragments use `db\`\`` (empty fragment) vs `db\`AND col = ${val}\`` pattern to compose dynamic WHERE clauses safely.
- Transactions use `db.begin(async (sql) => { ... })`.
- The connection pool is configured at `max: 10`, `idle_timeout: 30` in `apps/api/src/db/client.ts`.

---

## Authentication Flow

- Admin users authenticate via POST `/auth/login`, which returns a JWT.
- The JWT is stored in `localStorage` as `auth_token` and attached as a `Bearer` token by the axios request interceptor.
- The API validates JWTs via `@fastify/jwt` using `request.jwtVerify()` in `authMiddleware`.
- The `requireRole(...roles)` RBAC middleware runs after `authMiddleware` and checks `user.role` against the allowed list.
- The two roles in use are `'owner'` (full write access) and `'reviewer'` (read-only).

---

## Soft Deletes

- Questions and test configs use `is_active = FALSE` for soft-deletion. Active queries always filter `WHERE is_active = TRUE`.
- Test links use a `state` column with an enum (`created`, `active`, `submitted`, `expired`) managed via state-machine transitions.

---

## File Organisation Summary

```
apps/api/src/
  db/           — client, migrate, seed-admin, schema.sql
  lib/          — rng (seeded question selection), audit (audit log helper)
  middleware/   — auth (JWT verify), rbac (role check)
  routes/       — one file per resource domain
  index.ts      — Fastify app bootstrap and plugin registration

apps/web/src/
  app/
    (admin)/    — layout + admin route group pages
    (candidate)/— layout + candidate test route group pages
    login/      — public login page
    layout.tsx  — root layout (metadata, html/body)
    page.tsx    — root redirect to /questions
  components/
    candidate/  — Timer, QuestionCard, QuestionNav, SubmitModal
    ui/         — DataTable, QuestionForm (reusable generic components)
  lib/
    api.ts      — axios instance with auth interceptors

packages/shared/src/types/index.ts — all shared TypeScript interfaces
```
