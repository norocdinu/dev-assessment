# Testing

_Generated: 2026-05-07_

---

## Test Framework

**Vitest** is the only test framework in use. It is configured in `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

The root `package.json` runs tests via:

```
npm run test --workspaces --if-present
```

This delegates to each workspace's own `test` script. Only `apps/api` defines a `test` script (`vitest run`). The `apps/web` package lists `vitest` as a dependency but has **no test script and no test files**.

---

## Test File Locations

There is exactly **one test file** in the entire project:

- `apps/api/src/lib/rng.test.ts`

No other test files exist in `apps/api`, `apps/web`, or `packages/shared`.

---

## What Is Tested

### `apps/api/src/lib/rng.test.ts`

Tests the two pure utility functions in `apps/api/src/lib/rng.ts`:

**`deriveSeed(testConfigId, linkToken)`**
- Determinism: same inputs always produce the same output.
- Sensitivity: output differs for different tokens; output differs for different test config IDs.
- Output format: returns a 64-character lowercase hex string (SHA-256 digest).

**`seededSample(pool, count, seed)`**
- Returns the requested count of items.
- Determinism: same seed always produces the same selection and order.
- Sensitivity: different seeds produce different results.
- No duplicates in the result set.
- Handles the edge case where `count >= pool.length` (returns all items).
- Does not mutate the input pool array.

All tests use `describe` / `it` / `expect` from Vitest with no mocking — these are pure function tests with no I/O.

---

## Test Structure

```ts
import { describe, it, expect } from 'vitest';
import { deriveSeed, seededSample } from './rng.js';

describe('deriveSeed', () => {
  it('is deterministic — same inputs, same output', () => { ... });
  it('differs for different tokens', () => { ... });
  // ...
});

describe('seededSample', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('returns the correct count', () => { ... });
  // ...
});
```

No setup/teardown hooks (`beforeEach`, `afterEach`, `beforeAll`, `afterAll`) are used. No test fixtures or factories.

---

## Mocking Approach

No mocking is used anywhere in the test suite. The single test file tests pure functions that have no side effects, no database access, and no HTTP calls. No Vitest mock utilities (`vi.mock`, `vi.fn`, `vi.spyOn`) are used.

---

## How to Run Tests

```bash
# From the repo root
npm test

# Or directly from the API workspace
cd apps/api
npx vitest run

# Watch mode
npx vitest
```

The API's `package.json` `test` script is `vitest run` (single pass, not watch).

---

## Coverage Gaps

The test coverage of the codebase is minimal. The following areas have **zero test coverage**:

### API Routes (Fastify)
- `apps/api/src/routes/auth.ts` — login, logout, `/me` endpoints
- `apps/api/src/routes/questions.ts` — CRUD, version history, CSV import
- `apps/api/src/routes/test-configs.ts` — CRUD for test configurations
- `apps/api/src/routes/test-links.ts` — link generation, listing, revocation
- `apps/api/src/routes/candidate.ts` — session load, submission, results (the most complex logic in the app: seeded sampling, grading, transaction, deadline enforcement)
- `apps/api/src/routes/submissions.ts` — list, detail, export, compare
- `apps/api/src/routes/stats.ts` — aggregate statistics

### API Middleware
- `apps/api/src/middleware/auth.ts` — JWT verification
- `apps/api/src/middleware/rbac.ts` — role-based access control

### API Library
- `apps/api/src/lib/audit.ts` — audit log insertion

### Database Layer
- `apps/api/src/db/client.ts` — connection pool
- `apps/api/src/db/migrate.ts` — migration logic

### Entire Web App (`apps/web`)
- No tests exist for any page, component, hook, or utility in the Next.js app.
- Notably untested: the `Timer` component (time formatting, colour transitions), `QuestionCard`, `SubmitModal`, `DataTable`, `QuestionForm`, and all admin/candidate page logic.

### Shared Package
- `packages/shared/src/types/index.ts` — type-only file, not directly testable, but no runtime validation exists either.

### Missing Integration / End-to-End Tests
- No integration tests for the Fastify server.
- No end-to-end tests (e.g., Playwright, Cypress) for the full user flow.
- No database migration tests.
- No contract tests between the API and the web client.
