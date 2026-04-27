# Phase 3 Research — Grading & Results

**Researched:** 2026-04-27
**Based on:** Full codebase review of Phase 1 + Phase 2 implementation

---

## 1. Grading Engine Design

### Where to Insert Grading

Grading must be inserted into `apps/api/src/routes/candidate.ts` inside `POST /submit/:token`. The current transaction (lines 137–159) commits candidate answers and updates `test_links.state = 'submitted'` atomically. The `submittedAt` value is returned from the `RETURNING submitted_at` clause.

**Recommended approach:** Run grading immediately after `db.begin()` commits (outside the transaction, so we don't block a DB lock on a CPU operation), but before returning the 200 response. This keeps grading synchronous on the same request and the result row is persisted before the frontend redirects.

```
await db.begin(...)           // 1. Commit answers + state transition (existing)
→ compute grades in JS        // 2. Grade in-memory with fetched correct_option data
→ INSERT submission_results   // 3. Persist pre-computed result to new table
→ return 200                  // 4. Respond to frontend
```

### Grading SQL — Fetching Answers + Correct Options

After the transaction, fetch all answers with their correct option in a single JOIN:

```sql
SELECT
  ca.question_id,
  ca.answer          AS candidate_answer,
  q.correct_option,
  q.skill_area,
  q.family_id,
  q.version,
  q.text             AS question_text,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d
FROM candidate_answers ca
JOIN questions q ON q.id = ca.question_id
WHERE ca.link_id = ${link.id}
```

`candidate_answers.question_id` is a FK to `questions.id` (a specific immutable version UUID), so this JOIN always returns the exact version at submission time — no version ambiguity.

### In-Memory Grading Logic (TypeScript)

```typescript
// After fetching answers with correct_option:
const rows = await db`SELECT ca.question_id, ca.answer AS candidate_answer,
  q.correct_option, q.skill_area, q.family_id, q.version,
  q.text AS question_text, q.option_a, q.option_b, q.option_c, q.option_d
  FROM candidate_answers ca JOIN questions q ON q.id = ca.question_id
  WHERE ca.link_id = ${link.id}`;

const totalQuestions = rows.length;
const correctCount = rows.filter(r => r.candidate_answer === r.correct_option).length;
const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

// Skill area breakdown
const skillMap = new Map<string, { correct: number; total: number }>();
for (const r of rows) {
  const entry = skillMap.get(r.skill_area) ?? { correct: 0, total: 0 };
  entry.total += 1;
  if (r.candidate_answer === r.correct_option) entry.correct += 1;
  skillMap.set(r.skill_area, entry);
}
const skillAreaScores = Object.fromEntries(
  [...skillMap.entries()].map(([skill_area, { correct, total }]) => [
    skill_area,
    { correct, total, pct: Math.round((correct / total) * 100) }
  ])
);
```

### Pass/Fail Determination

The pass threshold is stored in `test_configs.pass_threshold_pct`. It must be fetched alongside the link query at the start of the submit route. Currently the submit handler does NOT include `pass_threshold_pct` in its SELECT — this must be added:

```sql
-- Existing query in POST /submit/:token needs tc.pass_threshold_pct added:
SELECT tl.id, tl.state, tl.seed, tl.started_at,
       tc.technology_id, tc.difficulty, tc.num_questions,
       tc.pass_threshold_pct   -- ADD THIS
FROM test_links tl
JOIN test_configs tc ON tc.id = tl.test_config_id
WHERE tl.token = ${token}
```

Then: `const pass = scorePct >= link.pass_threshold_pct;`

### Time Taken Calculation

`time_taken_seconds` = seconds elapsed from `test_links.started_at` to `test_links.submitted_at`.

The `submitted_at` is returned from the transaction's `RETURNING` clause as `submittedAt`. The `link.started_at` is already fetched at the top of the route.

```typescript
const timeTakenSeconds = Math.round(
  (new Date(submittedAt!).getTime() - new Date(link.started_at).getTime()) / 1000
);
```

### Idempotency Concern

If `db.begin()` commits but the INSERT into `submission_results` fails (e.g., DB connection drop), the submission is recorded but has no result row. On retry, `POST /submit` returns 409 because the state is already `submitted`. The candidate is redirected to `/test/:token/results`, which calls `GET /candidate/results/:token`. If no row exists, the API should return 404 and the results page should show a graceful fallback ("Results not yet available — please try again shortly").

To handle late grading recovery, the `GET /candidate/results/:token` endpoint can be designed to detect this state (link is submitted but no result row) and return a 202 with a `pending: true` flag, allowing the frontend to poll or retry. However, since grading is synchronous and in the same request, this edge case is very rare. A simpler approach: 404 from results endpoint → results page shows "Results unavailable" with a retry button.

Alternatively, the INSERT into `submission_results` can be done inside the `db.begin` transaction itself (after the answers upsert), making it truly atomic. This is the safest design and avoids any orphaned submissions.

**Decision:** Include `submission_results` INSERT inside the same `db.begin` transaction block, after the `UPDATE test_links` returning `submitted_at`. This requires computing grades inside the transaction. The transaction work is lightweight (one SELECT with a JOIN, arithmetic, one INSERT), so this is acceptable.

---

## 2. Database Schema: submission_results

### DDL to Add to schema.sql

Add after the Phase 2 candidate_answers block:

```sql
-- Phase 3: Submission Results
CREATE TABLE IF NOT EXISTS submission_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id             UUID NOT NULL REFERENCES test_links(id),
  score_pct           INT  NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  pass                BOOLEAN NOT NULL,
  skill_area_scores   JSONB NOT NULL DEFAULT '{}',
  time_taken_seconds  INT NOT NULL CHECK (time_taken_seconds >= 0),
  graded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id)
);
CREATE INDEX IF NOT EXISTS idx_submission_results_link ON submission_results (link_id);
```

**Column notes:**
- `link_id` has a `UNIQUE` constraint — enforces exactly one result per test link
- `skill_area_scores` is JSONB with shape: `{ "DAX": { "correct": 3, "total": 4, "pct": 75 }, ... }`
- `pass` is a boolean computed at grading time from `score_pct >= pass_threshold_pct`
- `graded_at` defaults to NOW() — useful for Phase 4 analytics / audit
- No `candidate_name` column (Phase 3 scope); Phase 4 may extend this
- FK to `test_links(id)` — when a link is deleted, results are cascade-blocked (no ON DELETE CASCADE needed; links should not be hard-deleted)

### Full INSERT statement

```sql
INSERT INTO submission_results (link_id, score_pct, pass, skill_area_scores, time_taken_seconds)
VALUES (${link.id}, ${scorePct}, ${pass}, ${JSON.stringify(skillAreaScores)}, ${timeTakenSeconds})
```

---

## 3. API Endpoints

### 3a. GET /candidate/results/:token (public, no auth)

**Purpose:** Returns the pre-computed result for the candidate results page.

**Route file:** `apps/api/src/routes/candidate.ts` (add to existing `candidateRoutes` function)

**Handler logic:**
1. Fetch link by token: `SELECT id, state, submitted_at FROM test_links WHERE token = $token`
2. If not found → 404 `{ error: 'Link not found' }`
3. If state !== 'submitted' → 404 `{ error: 'Results not available' }` (test not yet submitted)
4. JOIN submission_results + test_configs for pass_threshold_pct, + test_links for timing info
5. If no submission_results row → 404 `{ error: 'Results not yet available' }` (rare race condition)
6. Fetch answer sheet: JOIN candidate_answers + questions for full question data
7. Return combined result object

**SQL for result summary:**
```sql
SELECT
  sr.score_pct,
  sr.pass,
  sr.skill_area_scores,
  sr.time_taken_seconds,
  sr.graded_at,
  tl.submitted_at,
  tc.pass_threshold_pct,
  tc.name AS test_name,
  t.name  AS technology_name,
  tc.difficulty
FROM submission_results sr
JOIN test_links tl      ON tl.id = sr.link_id
JOIN test_configs tc    ON tc.id = tl.test_config_id
JOIN technologies t     ON t.id  = tc.technology_id
WHERE tl.token = ${token}
```

**SQL for answer sheet:**
```sql
SELECT
  q.text             AS question_text,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.correct_option,
  q.skill_area,
  ca.answer          AS candidate_answer,
  (ca.answer = q.correct_option) AS is_correct
FROM candidate_answers ca
JOIN questions q ON q.id = ca.question_id
WHERE ca.link_id = ${link.id}
ORDER BY q.skill_area, q.id
```

**Response shape:**
```json
{
  "score_pct": 75,
  "pass": true,
  "pass_threshold_pct": 70,
  "time_taken_seconds": 1124,
  "submitted_at": "2026-04-27T14:23:01Z",
  "test_name": "Power BI – Senior",
  "technology_name": "Power BI",
  "difficulty": "senior",
  "skill_area_scores": {
    "DAX": { "correct": 3, "total": 4, "pct": 75 },
    "Data Modelling": { "correct": 5, "total": 5, "pct": 100 }
  },
  "answer_sheet": [
    {
      "question_text": "...",
      "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...",
      "correct_option": "b",
      "candidate_answer": "b",
      "is_correct": true,
      "skill_area": "DAX"
    }
  ]
}
```

### 3b. GET /admin/submissions/:linkId (auth-guarded, both roles)

**Purpose:** Returns the full result for admin submission detail view — same data as candidate endpoint, plus question version info (`family_id`, `version`).

**Route file:** New file `apps/api/src/routes/submissions.ts` (following the pattern of test-links.ts)

**Handler logic:**
1. Auth guard: `preHandler: [authMiddleware]` (both owner and reviewer)
2. Fetch `link_id` from params (UUID)
3. JOIN submission_results, test_links, test_configs, technologies
4. If not found → 404
5. Fetch answer sheet with version info (add `q.family_id`, `q.version` to the JOIN)
6. Return

**SQL for answer sheet (admin, with version info):**
```sql
SELECT
  q.family_id,
  q.version,
  q.text             AS question_text,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.correct_option,
  q.skill_area,
  ca.answer          AS candidate_answer,
  (ca.answer = q.correct_option) AS is_correct
FROM candidate_answers ca
JOIN questions q ON q.id = ca.question_id
WHERE ca.link_id = ${linkId}
ORDER BY q.skill_area, q.id
```

**Response shape:** Same as candidate endpoint but `answer_sheet` rows additionally include `family_id` and `version`.

---

## 4. Candidate Results Page

### Route: `/test/[token]/results/page.tsx`

**File path:** `apps/web/src/app/(candidate)/test/[token]/results/page.tsx`

This sits inside the `(candidate)` route group, which has a passthrough layout (`CandidateLayout` returns `<>{children}</>`). No sidebar. No auth guard.

### Component Type: Client Component (`'use client'`)

All existing candidate pages use `'use client'` with `useState` + `useEffect` for data fetching (no auth, native `fetch`). The admin layout.tsx is the only server component in the project for auth purposes. The results page is candidate-facing and public — follow the same client component pattern.

**Data fetching:** Use native `fetch` (not `api` axios instance), consistent with the test page:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const res = await fetch(`${API_URL}/candidate/results/${token}`);
```

### Loading States

- Initial load: show the standard spinner: `<div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />`
- Token not found / not submitted: show error card (similar to expired page layout — white card, centered)
- Results not yet available (rare 404 after submit): show error card with retry button

### Race Condition Handling

When the submit handler redirects to `/test/:token/results`, the result may not yet be written if there's a DB delay. However, since grading is synchronous inside the same transaction, by the time the 200 response is received and the redirect happens, the result row already exists. This is not a real concern in practice.

If the user navigates directly to the results URL before submitting (or if results are somehow missing), the API returns 404. The results page should handle:
- `404` → "Results not available. If you have not yet submitted, return to the test page."
- `non-ok` → generic error message

### Page Layout (no sidebar, candidate-facing)

```
┌─────────────────────────────────────────────────────┐
│  Dev Assessment                                     │  ← simple header
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │  Summary Card                               │   │
│  │  Score: 75%  [PASS] (green badge)           │   │
│  │  Time taken: 18 min 44 sec                  │   │
│  │  Submitted: Apr 27, 2026                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Skill Breakdown                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ DAX          3 / 4    75%                   │  │
│  │ Data Model   5 / 5   100%                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Answer Sheet                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │ Q  │ Question │ Your Answer │ Correct │ ✓/✗  │  │
│  │ 1  │ ...text  │ Option B   │ Option B │  ✓   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Pass/Fail badge:** `pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'` — matching the green/red timer urgency pattern from Phase 2 Timer component.

**DataTable for answer sheet:** The existing `DataTable` component from `@/components/ui/DataTable` can be reused — it uses TanStack Table and supports any column definition. However, the candidate results page is NOT an admin page, so importing from the same shared `DataTable` is fine as long as the component doesn't pull in admin-only deps (it doesn't — it only uses `@tanstack/react-table`).

---

## 5. Admin Submission Detail Page

### Route: `/admin/submissions/[linkId]/page.tsx`

**File path:** `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx`

This sits inside the `(admin)` route group, which means the `AdminLayout` (sidebar + auth guard server component) wraps it automatically. No additional auth setup needed in the page itself.

### Component Type: Client Component (`'use client'`)

All admin pages in this project are `'use client'` with `useState` + `useEffect` + `api` axios instance. Follow this exact same pattern. Do NOT make this a server component — the admin layout is already the server component handling auth.

### Data Fetching

Use the `api` axios instance from `@/lib/api` (which sets `withCredentials: true` for cookie auth):
```typescript
const res = await api.get(`/admin/submissions/${linkId}`);
```

### Page Structure

```typescript
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { api } from '@/lib/api';
import type { SubmissionResult } from '@dev-assessment/shared';

export default function SubmissionDetailPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/submissions/${linkId}`)
      .then(r => setResult(r.data))
      .catch(() => setError('Failed to load submission.'))
      .finally(() => setLoading(false));
  }, [linkId]);
  // ...
}
```

### Answer Sheet Table Columns (admin view, extra version info)

The admin answer sheet table adds two columns vs. the candidate view:
- `family_id` (truncated UUID, links to question family)
- `version` (question version at submission time)

Use `DataTable` with inline `ColumnDef<AnswerSheetRow>[]` — identical pattern to the links page and questions page.

### Navigation: Back Link

Include a "← Back to Test Links" button that navigates to `/test-configs/:testConfigId/links`. The `linkId` is a test_links UUID; the API response should include `test_config_id` so the back link can be constructed. Add `test_config_id` to the admin submissions endpoint response.

---

## 6. Existing Code Changes

### 6a. `apps/api/src/routes/candidate.ts` — POST /submit/:token

**Change 1: Add `tc.pass_threshold_pct` to the initial link SELECT query (line 84–90):**
```typescript
// FROM:
SELECT tl.id, tl.state, tl.seed, tl.started_at,
       tc.technology_id, tc.difficulty, tc.num_questions

// TO:
SELECT tl.id, tl.state, tl.seed, tl.started_at,
       tc.technology_id, tc.difficulty, tc.num_questions,
       tc.pass_threshold_pct
```

**Change 2: Inside `db.begin()` block (after line 158, after the `UPDATE test_links` RETURNING), add grading logic:**

Within the existing `db.begin(async (sql) => { ... })` block:
1. After the `UPDATE test_links RETURNING submitted_at` succeeds, fetch all answers with correct options using `sql` (same transaction connection)
2. Compute `scorePct`, `pass`, `skillAreaScores`, `timeTakenSeconds` in TypeScript
3. INSERT into `submission_results`

**Change 3: Return value (line 165):**
```typescript
// FROM:
return reply.status(200).send({ ok: true, submitted_at: submittedAt });

// TO:
return reply.status(200).send({ ok: true, submitted_at: submittedAt, score_pct: scorePct, pass });
```
The extra fields are optional — the frontend only needs `ok: true` to trigger redirect, but returning them costs nothing and may be useful.

### 6b. `apps/api/src/routes/candidate.ts` — GET /session/:token

**Change: 409 response does NOT need to change at the API level.** The frontend handles the redirect.

### 6c. `apps/web/src/app/(candidate)/test/[token]/page.tsx` — doSubmit function (line 62–63)

```typescript
// FROM:
router.push(`/test/${token}/expired?state=submitted`);

// TO:
router.push(`/test/${token}/results`);
```

This change is needed in TWO places in `doSubmit`:
- Line 63: after `res.ok` (successful submit)
- Line 70: after `res.status === 409` (already submitted — treat as success per D-09)

### 6d. `apps/web/src/app/(candidate)/test/[token]/page.tsx` — loadSession function (line 121)

```typescript
// FROM (line 121):
if (res.status === 409) {
  router.push(`/test/${token}/expired?state=submitted`);
  return;
}

// TO (per D-03):
if (res.status === 409) {
  router.push(`/test/${token}/results`);
  return;
}
```

### 6e. `apps/web/src/app/(admin)/test-configs/[id]/links/page.tsx` — Add "View result" column

In the `columns` array, add a new action button for submitted links. Currently the Actions column (inside `isOwner` conditional) only shows "Revoke" for non-submitted links. Phase 3 adds "View result" visible to ALL roles (both owner and reviewer) for submitted links.

**Change:** Add a new column or extend the Actions column to always render (not just for owners), and add a "View result" button for submitted links:

```typescript
// New column or modify existing Actions column:
{
  header: 'Actions',
  cell: ({ row }: { row: { original: TestLink } }) => (
    <div className="flex gap-2">
      {row.original.state === 'submitted' && (
        <button
          onClick={() => router.push(`/admin/submissions/${row.original.id}`)}
          className="text-blue-600 hover:underline text-xs"
        >
          View result
        </button>
      )}
      {isOwner && row.original.state !== 'submitted' && row.original.state !== 'expired' && (
        <button
          onClick={() => handleRevoke(row.original.id)}
          className="text-red-600 hover:underline text-xs"
        >
          Revoke
        </button>
      )}
    </div>
  ),
} as ColumnDef<TestLink>
```

This column should be present unconditionally (not gated by `isOwner`), since Reviewer role also needs to see the "View result" button. The import of `useRouter` needs to be added to this file.

### 6f. `apps/api/src/index.ts` — Register new routes

Two new registrations:
1. Candidate results endpoint: add to the existing `candidateApp` sub-app (already registered with `/candidate` prefix) — no new registration needed since it goes into `candidateRoutes`.
2. Admin submissions endpoint: register new route file with `prefix: '/admin/submissions'`.

### 6g. `apps/web/src/app/(admin)/layout.tsx` — Add sidebar link

Add "Submissions" nav link (optional for Phase 3; Phase 4 will build the full dashboard, but a placeholder link is useful):
```tsx
<Link href="/admin/submissions" ...>Submissions</Link>
```
Note: This is optional for Phase 3 since Phase 4 will build the dashboard. The detail page is accessible via the links page "View result" button without a sidebar link.

---

## 7. Shared Types

Add to `packages/shared/src/types/index.ts`:

```typescript
export interface SkillAreaScore {
  correct: number;
  total: number;
  pct: number;
}

export interface AnswerSheetRow {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  candidate_answer: 'a' | 'b' | 'c' | 'd';
  is_correct: boolean;
  skill_area: string;
}

export interface AdminAnswerSheetRow extends AnswerSheetRow {
  family_id: string;
  version: number;
}

export interface SubmissionResult {
  link_id: string;
  test_config_id: string;       // for back-navigation in admin view
  score_pct: number;
  pass: boolean;
  pass_threshold_pct: number;
  time_taken_seconds: number;
  submitted_at: string;
  graded_at: string;
  test_name: string;
  technology_name: string;
  difficulty: Difficulty;
  skill_area_scores: Record<string, SkillAreaScore>;
  answer_sheet: AnswerSheetRow[];  // candidate view
}

export interface AdminSubmissionResult extends SubmissionResult {
  answer_sheet: AdminAnswerSheetRow[];  // admin view — overrides with extra version fields
}
```

**Note on JSONB:** postgres.js automatically parses JSONB columns to JS objects, so `skill_area_scores` from the DB query will already be a parsed object. No `JSON.parse()` needed on the server side. The INSERT does need `JSON.stringify()` because postgres.js requires string for JSONB parameters.

---

## 8. Migration Strategy

### Pattern from migrate.ts

The existing `migrate.ts` uses a section-marker approach:
1. Check if Phase 1 tables exist (by `admin_users` table)
2. Check if Phase 2 tables exist (by `test_links` table)
3. Extracts Phase 2 SQL using `schema.indexOf('-- Phase 2: Test Links')` as the marker

### Phase 3 Migration Addition

**In `schema.sql`:** Add Phase 3 DDL block after the Phase 2 candidate_answers block, using the same comment marker convention:

```sql
-- Phase 3: Submission Results
CREATE TABLE IF NOT EXISTS submission_results (
  ...
);
CREATE INDEX IF NOT EXISTS idx_submission_results_link ON submission_results (link_id);
```

**In `migrate.ts`:** Add a Phase 3 check after the Phase 2 block (lines 28–49), using the same pattern:

```typescript
const [{ exists: phase3Exists }] = await db`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'submission_results'
  ) AS exists
`;

if (!phase3Exists) {
  console.log('Running Phase 3 migration...');
  const phase3Start = schema.indexOf('-- Phase 3: Submission Results');
  if (phase3Start !== -1) {
    const seedStart = schema.indexOf('-- Seed initial data');
    const phase3Sql = schema.substring(
      phase3Start,
      seedStart !== -1 ? seedStart : undefined
    );
    await db.unsafe(phase3Sql);
    console.log('Phase 3 migration complete');
  }
} else {
  console.log('Phase 3 schema already present — skipping DDL');
}
```

**Key:** The Phase 3 DDL in `schema.sql` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, making it safe to run on a fresh DB (where the full schema is applied in one shot via `db.unsafe(schema)`) OR incrementally.

---

## 9. Route Registration

### New candidate results route (no new registration needed)

Add `GET /candidate/results/:token` handler inside the existing `candidateRoutes` function in `apps/api/src/routes/candidate.ts`. The function is already registered at `/candidate` prefix in `index.ts`. The new route path within the function is `/results/:token`.

**Full path:** `GET /candidate/results/:token`

### New admin submissions route (new file + registration)

Create `apps/api/src/routes/submissions.ts` following the same pattern as `test-links.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

export async function submissionRoutes(app: FastifyInstance) {
  // GET /admin/submissions/:linkId
  app.get('/:linkId', { preHandler: [authMiddleware] }, async (request, reply) => {
    // ... handler
  });
}
```

**In `apps/api/src/index.ts`:** Add two lines:

```typescript
// Add import at top:
import { submissionRoutes } from './routes/submissions.js';

// Add registration after testLinkRoutes:
await app.register(submissionRoutes, { prefix: '/admin/submissions' });
```

**CORS note:** The `/admin/submissions` route is admin-only (cookie auth, axios with `withCredentials: true`). It does NOT need to be inside the `candidateApp` sub-app that has the explicit `Access-Control-Allow-Origin` headers. The global CORS config at the top of `index.ts` (`fastifyCors` with `origin: WEB_URL, credentials: true`) already covers admin routes, consistent with how `testLinkRoutes` and `questionRoutes` are registered.

---

## 10. Edge Cases & Risk Areas

### Race Condition: Results Page Before Grading

**Scenario:** Candidate submits → POST /submit returns 200 → redirect to `/test/:token/results` → GET /candidate/results/:token → 404 (if grading somehow failed).

**Mitigation:** Since grading runs inside `db.begin()`, if it fails the whole transaction rolls back (no `submitted` state, no answer rows). The candidate gets an error response and stays on the test page with the retry button (existing error handling in `doSubmit`). There is no window where `state = 'submitted'` exists without a result row.

**Remaining edge case:** If the INSERT into `submission_results` inside the transaction throws a unique constraint violation (duplicate submission attempt), the `ON CONFLICT` on `candidate_answers` handles the answers, but `submission_results` has a `UNIQUE (link_id)` constraint. The `UPDATE test_links SET state = 'submitted' WHERE state = 'active'` already prevents double-grading: if the link is already submitted, the UPDATE returns 0 rows → `alreadySubmitted = true` → early return before grading. So the unique constraint is never violated in practice.

### 409 on Session Load

Per D-03: when `GET /candidate/session/:token` returns 409, `page.tsx` redirects to `/test/:token/results`. **Currently (Phase 2)** it redirects to `expired?state=submitted`. This change is in the existing candidate page — correct per the specification.

The API-side 409 response at line 35–37 of `candidate.ts` does NOT need to change. Only the frontend redirect target changes.

### Admin Detail Page: linkId is a UUID

The admin submissions route uses `linkId` as a path param (UUID, from `test_links.id`). This is different from the test configs page which uses the test config's UUID. The "View result" button in the links page correctly passes `row.original.id` which is `test_links.id`. No confusion needed, but the planner should confirm the URL structure is `/admin/submissions/:linkId` where `:linkId` = `test_links.id`.

### skill_area_scores JSONB: postgres.js INSERT

When inserting JSONB with postgres.js tagged template literals, the parameter must be passed as a stringified JSON string OR as a JS object via `db.json()`. postgres.js v3 supports passing JS objects directly for JSONB columns when using the `${}` interpolation — but to be safe and match what's already used in the codebase, use:

```typescript
import { db } from '../db/client.js';
// Use explicit cast or postgres.js json helper:
await sql`
  INSERT INTO submission_results (link_id, score_pct, pass, skill_area_scores, time_taken_seconds)
  VALUES (${link.id}, ${scorePct}, ${pass}, ${sql.json(skillAreaScores)}, ${timeTakenSeconds})
`;
```

Check if `sql.json()` is available in the postgres.js version used. If not, `JSON.stringify(skillAreaScores)` with explicit `::jsonb` cast works: `${JSON.stringify(skillAreaScores)}::jsonb` in the template literal — but tagged templates don't support inline casts this way. Use `sql.json()` or verify the db client version.

**Safer fallback:** In postgres.js, JSONB parameters can be passed as raw objects and the library handles serialization. Test with a simple INSERT during development.

### Deleted/Archived Questions

`candidate_answers.question_id` references `questions.id`. Questions can be archived (`is_active = false`) but NOT hard-deleted (no DELETE in the codebase — only `is_active = false`). The grading JOIN `JOIN questions q ON q.id = ca.question_id` always succeeds because the specific version UUID is immutable once created. No risk of missing rows.

### Pass Threshold Edge Case

`pass_threshold_pct` is stored in `test_configs`. If the threshold is exactly 70 and the candidate scores exactly 70, `pass = (70 >= 70) = true`. This is correct — "at or above threshold" semantics.

### Time Formatting on Frontend

`time_taken_seconds` is an integer. The candidate results page must format it as "Xm Ys" or "X min Y sec". Example utility:
```typescript
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
```

### Missing `useRouter` Import in links/page.tsx

The links page currently imports `useParams` but NOT `useRouter`. Adding the "View result" button that calls `router.push(...)` requires adding `useRouter` to the imports.

### Admin Submissions Route vs Candidate Route: No Auth Confusion

`GET /candidate/results/:token` — NO auth, public. Must stay in the `candidateApp` sub-app (or at minimum NOT behind `authMiddleware`).

`GET /admin/submissions/:linkId` — REQUIRES `authMiddleware`. Must be registered outside the `candidateApp` sub-app, as a top-level registration.

These are completely separate routes at different paths and must not be conflated.

---

## RESEARCH COMPLETE

**Summary:** Phase 3 requires three groups of changes: (1) grading engine — synchronous MCQ scoring with skill breakdowns, wired inside the existing `db.begin()` transaction in `candidate.ts`, persisting to a new `submission_results` table; (2) two new API endpoints (public candidate results, auth-guarded admin detail), plus minimal changes to the existing submit route and session handler redirects; (3) two new frontend pages following established patterns (client component, `useState`/`useEffect`, DataTable for answer sheet), plus targeted modifications to the links page (add "View result" button) and the test page (change two redirect targets from `expired?state=submitted` to `/results`). The migration follows the existing Phase 2 incremental pattern using comment markers in schema.sql.
