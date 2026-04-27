# Phase 2: Test Experience — Research

## Summary

Phase 2 transforms the already-complete admin foundation into a live candidate experience: a token-bearing link opens a zero-auth portal, draws a seeded question set, runs a 30-minute countdown enforced on both client and server, and survives page refreshes through localStorage recovery. The phase introduces two new database tables (`test_links`, `candidate_answers`), a set of public-facing API routes with no admin auth, and a new Next.js route group isolated from the `(admin)` layout. The trickiest engineering problems are the dual-enforcement timer (client countdown derived from server-provided `started_at`, server hard-cutoff on submission), idempotent auto-submit race handling, and ensuring the seeded question selection is stable across any number of link reopens.

---

## Domain Analysis

### What this phase must deliver technically

1. **Link generation** — Admin clicks "Generate Link" on a test config; server mints a cryptographically random token, stores a row in `test_links`, returns the URL. The URL carries the token; the seed is derived server-side from `(test_config_id, token)` using the existing `rng.ts`.

2. **Link validation** — Every candidate request checks: link exists, is not expired, and is in a valid state (`created` or `active`). Expired or submitted links return a clear terminal page.

3. **Candidate session without login** — The token in the URL is the session credential. `started_at` is recorded server-side when the candidate first loads questions; it is the canonical source of truth for elapsed time.

4. **Seeded question delivery** — At session start, `deriveSeed(testConfigId, token)` is computed server-side; `seededSample(pool, numQuestions, seed)` selects questions. The same token always yields the same question IDs in the same order — guaranteed by `rng.ts` determinism already verified by 6 unit tests.

5. **Timer** — Client calculates `remainingMs = 1800000 - (Date.now() - serverStartedAt)` on every render tick. Server independently enforces: `submitted_at` must be ≤ `started_at + 1800s`; any submission after that deadline is rejected with 410 Gone.

6. **Auto-submit** — A `setInterval` fires every second; when `remainingMs ≤ 0` it triggers submit. This must be idempotent: if manual submit and auto-submit race, only the first one wins.

7. **Page-refresh recovery** — On link open, check `localStorage` for `{token, startedAt, answers}`. If present and token matches, reconcile with server `GET /candidate/session/:token` to confirm `started_at` and absorb any server-side state.

8. **Submission** — `POST /candidate/submit/:token` with answer map; server grades (Phase 3) or stores raw for now; transitions link state to `submitted`.

---

## Architecture Decisions

### Link Generation & State Machine

**Token format**: 32 bytes from `crypto.randomBytes(32).toString('hex')` — 64 hex chars, 256 bits of entropy. URL: `https://<host>/test/<token>`. Token is not predictable, not reusable, not guessable.

**State machine for `test_links`**:

```
created → active → submitted
             ↓
           expired  (enforced lazily on access when NOW() > expires_at AND state = 'active')
```

- `created`: link minted by admin, never opened by a candidate.
- `active`: candidate opened the link and `started_at` was set (first question load).
- `submitted`: candidate submitted answers (manual or auto).
- `expired`: checked lazily — if `NOW() > expires_at` and state is still `created` or `active` without submission, the link is treated as expired. No cron needed for v1; state is evaluated on every candidate request.

**Expiry semantics**: Two kinds of expiry must not be confused:
- **Link expiry** (`expires_at`): admin-set date after which the link cannot be opened at all (TESTS-03). A `created` link past `expires_at` shows "This link has expired."
- **Test deadline** (`started_at + 1800s`): once a candidate starts, they have exactly 30 minutes regardless of link expiry. Both are enforced server-side.

**Token in URL vs body**: Token lives in the URL path (`/test/:token`), never in a cookie or auth header. The candidate portal is fully public. No session cookie is issued.

---

### Database Schema Additions

#### `test_links` table

```sql
CREATE TABLE test_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_config_id UUID NOT NULL REFERENCES test_configs(id),
  token          TEXT NOT NULL UNIQUE,               -- 64-char hex, URL-safe
  seed           TEXT NOT NULL,                      -- deriveSeed(testConfigId, token) pre-computed
  expires_at     TIMESTAMPTZ,                        -- NULL = no link expiry
  state          TEXT NOT NULL DEFAULT 'created'
                   CHECK (state IN ('created', 'active', 'submitted', 'expired')),
  started_at     TIMESTAMPTZ,                        -- set on first candidate question load
  submitted_at   TIMESTAMPTZ,                        -- set on submission
  created_by     UUID NOT NULL REFERENCES admin_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_links_token ON test_links (token);
CREATE INDEX idx_test_links_config ON test_links (test_config_id);
```

**Why pre-compute seed**: `deriveSeed` is cheap (one SHA-256), but pre-storing it avoids recomputing and makes the `GET /candidate/session/:token` response self-contained. It also makes it easy to verify determinism in tests.

#### `candidate_answers` table

```sql
CREATE TABLE candidate_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id     UUID NOT NULL REFERENCES test_links(id),
  question_id UUID NOT NULL REFERENCES questions(id),  -- specific version at submission time
  answer      TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id, question_id)   -- one answer per question per submission
);

CREATE INDEX idx_candidate_answers_link ON candidate_answers (link_id);
```

**Why `UNIQUE (link_id, question_id)`**: Idempotency — upsert on conflict means duplicate submit calls are safe. Phase 3 grading reads this table directly.

**`question_id` stores the specific question row ID** (not `family_id`) — this preserves the exact version that was shown, which is critical for Phase 3 result display (QBANK-04 requirement: past submissions remain linked to the version active at submission time).

---

### Session Management (No Auth)

The token in the URL is the candidate's only credential. The flow:

1. Candidate opens `/test/:token` (Next.js page).
2. Page calls `GET /candidate/session/:token`.
3. Server validates link state and expiry. If `state = 'created'`, server sets `started_at = NOW()`, transitions state to `active`, returns `{started_at, questions: [...]}`. If `state = 'active'`, returns existing `{started_at, questions: [...]}`.
4. Client stores `{token, started_at: serverStartedAt, answers: {}}` in `localStorage` under key `da_session_<token>`.
5. On page refresh/reopen: client reads localStorage, calls `GET /candidate/session/:token` again, compares `started_at` from server with cached value. Server value is canonical; localStorage `answers` are the draft state.

**What localStorage stores**:
```ts
interface LocalSession {
  token: string;
  startedAt: string;   // ISO timestamp from server
  answers: Record<string, 'a' | 'b' | 'c' | 'd'>;  // questionId → answer
  currentQuestionIndex: number;
}
```

**What server stores**: only `started_at` and `state` in `test_links`. Draft answers are NOT persisted server-side until final submission. This keeps the submission model simple and avoids a draft-save endpoint.

**Security consideration**: The server must re-derive or re-load the question set from the stored `seed` on every `GET /candidate/session/:token` call — it must not trust any question list sent from the client.

---

### Timer Architecture

**Problem**: Client clocks drift. A candidate who sets their system clock forward would get more time. The server's `started_at` must be the reference.

**Solution**:
1. `GET /candidate/session/:token` returns `started_at` as an ISO timestamp.
2. Client computes `serverStartedAt = new Date(started_at).getTime()`.
3. Every second: `remainingMs = 1800000 - (Date.now() - serverStartedAt)`.
4. Display: `Math.max(0, remainingMs)` formatted as `MM:SS`.

**Clock skew mitigation**: On session load, compute `clockOffset = serverNow - Date.now()` if the server also returns a `server_now` field. Then: `remainingMs = 1800000 - ((Date.now() + clockOffset) - serverStartedAt)`. This handles moderate skew (seconds, not minutes). For v1, include `server_now` in the session response.

**Visual urgency states**:
- `remainingMs > 300000` (>5 min): green
- `300000 >= remainingMs > 60000` (1–5 min): yellow/amber
- `remainingMs <= 60000` (≤60s): red + pulse animation

**Server-side hard cutoff**: On `POST /candidate/submit/:token`:
```sql
SELECT started_at + INTERVAL '30 minutes' AS deadline FROM test_links WHERE token = $1
```
If `NOW() > deadline`, return `410 Gone` with `{error: 'Test time has expired'}`. No answers are stored.

---

### Auto-Submit on Expiry

**Timer implementation**: Use `setInterval` in a React `useEffect` (not Web Workers for v1 — the portal is a single focused page; background tab behavior is acceptable to let expire naturally).

```ts
useEffect(() => {
  const interval = setInterval(() => {
    const remaining = 1800000 - (Date.now() - serverStartedAtMs + clockOffset);
    if (remaining <= 0) {
      clearInterval(interval);
      handleSubmit({ autoSubmit: true });
    }
  }, 1000);
  return () => clearInterval(interval);
}, [serverStartedAtMs]);
```

**Race condition between auto-submit and manual submit**:
- Use a `submitting` ref (not state, to avoid stale closures): `const submittingRef = useRef(false)`.
- `handleSubmit` checks and sets atomically:
  ```ts
  if (submittingRef.current) return;
  submittingRef.current = true;
  ```
- Server also enforces idempotency: `test_links.state = 'submitted'` check before processing. If already submitted, return `409 Conflict` with the existing result (or `200` with a "already submitted" flag).

**Tab hidden scenario**: `visibilitychange` API — when tab becomes visible again, recalculate remaining time immediately. If already past deadline, trigger auto-submit on tab-focus. The server hard cutoff is the real guarantee; the client timer is UX only.

**What happens if browser closes before auto-submit fires**: The server does not auto-submit on behalf of the client. The link remains `active` state with no submission. For v1 this is acceptable — the requirement is that the server *rejects* late answers (ASSESS-02 says "server-side hard cutoff"), not that it auto-grades abandoned sessions. Phase 4 admin dashboard will show these as "started but not submitted."

---

### Page-Refresh Recovery

**Flow on page load**:
```
1. Read localStorage key da_session_<token>
2. Call GET /candidate/session/:token
3. If server returns state = 'submitted' → redirect to /test/:token/results (Phase 3)
4. If server returns state = 'expired' or link expired → show expired page
5. If server returns {started_at, questions} → reconcile:
   - Use server started_at as canonical (overwrite localStorage if different)
   - Merge localStorage answers into UI state (these are the candidate's draft)
   - Resume timer from (1800000 - elapsed)
6. If NO localStorage entry but server state = 'active' → candidate resumed on new device/browser
   - Show questions with empty answers, timer resumes from server started_at
```

**Draft answers in localStorage are not authoritative** — they are convenience UX. If localStorage is cleared between refresh and submission, the candidate loses in-progress answers (acceptable for v1; the requirement only specifies that the *timer* resumes correctly, ASSESS-05).

**Reconciliation edge case**: If `started_at` from server differs from localStorage (e.g., server was reset), always trust server. Clear localStorage and reinitialize.

---

### Seeded Question Selection

**Existing `rng.ts` integration**:

The seed is pre-computed at link generation time:
```ts
// In POST /admin/test-links (link generation)
import { deriveSeed, seededSample } from '../lib/rng.js';
const token = crypto.randomBytes(32).toString('hex');
const seed = deriveSeed(testConfigId, token);
// Store seed in test_links.seed
```

At session start (first `GET /candidate/session/:token`):
```ts
// Fetch all active+latest questions for the config's technology+difficulty
const pool = await db`
  SELECT id, text, option_a, option_b, option_c, option_d, skill_area
  FROM questions
  WHERE technology_id = ${config.technology_id}
    AND difficulty = ${config.difficulty}
    AND is_active = TRUE AND is_latest = TRUE
`;
const selected = seededSample(pool, config.num_questions, link.seed);
```

**Critical**: Questions are fetched from DB ordered by `id` (or another stable column) before passing to `seededSample`, so the pool order is deterministic regardless of insertion order. Without a stable sort, the same seed could select different questions if the DB returns rows in a different order on different calls.

```sql
SELECT id, ... FROM questions
WHERE ... ORDER BY id  -- stable sort is essential for determinism
```

**Correct_option must NOT be sent to the client** — the candidate portal receives `{id, text, option_a, option_b, option_c, option_d, skill_area}` only. `correct_option` and `explanation` are withheld until Phase 3 results.

---

### Answer Submission

**Payload design**:
```ts
POST /candidate/submit/:token
Body: {
  answers: {
    [questionId: string]: 'a' | 'b' | 'c' | 'd'
  }
}
```

**Server-side submission handler**:
1. Load link by token — must exist and state must be `active`.
2. Check deadline: `NOW() > started_at + INTERVAL '30 minutes'` → 410 Gone.
3. Validate `answers` — each key must be a UUID that appears in the seeded question set for this link (re-derive from stored seed). Unknown question IDs are rejected.
4. In a transaction:
   - `INSERT INTO candidate_answers (link_id, question_id, answer) ... ON CONFLICT (link_id, question_id) DO UPDATE SET answer = EXCLUDED.answer`
   - `UPDATE test_links SET state = 'submitted', submitted_at = NOW() WHERE id = $linkId AND state = 'active'`
   - If UPDATE affects 0 rows (race: already submitted), skip answer insert and return 409.
5. Return `{ok: true, submitted_at}`. Phase 3 will add the grading response here.

**Idempotency**: The `UNIQUE (link_id, question_id)` constraint on `candidate_answers` plus the `ON CONFLICT DO UPDATE` upsert ensures double-submission of answers is safe at the DB level. The state transition check (`state = 'active'`) prevents a second full submission from being processed.

**Partial answers**: Candidates who have not answered all questions can still submit. Missing questions simply have no row in `candidate_answers`. Phase 3 grades these as incorrect.

---

### Candidate Portal Flow

**Next.js route group**: A new `(candidate)` route group, completely separate from `(admin)`. No auth guard, no sidebar, minimal chrome.

**Routes**:
```
/test/[token]                   → Main test page (question display + timer)
/test/[token]/expired           → Link expired or submitted terminal page
```

**Page lifecycle (Client Component)**:
1. On mount: read localStorage, call `GET /candidate/session/:token`.
2. Show loading spinner while fetching.
3. If error states (expired/submitted/not-found): render terminal message.
4. Else: render test UI.

**Test UI layout**:
```
┌─────────────────────────────────────┐
│  [Timer: 28:43]   [Progress: 3/20]  │
├─────────────────────────────────────┤
│  Question 3 of 20                   │
│                                     │
│  Question text here...              │
│                                     │
│  ○ A) Option text                   │
│  ● B) Option text     ← selected    │
│  ○ C) Option text                   │
│  ○ D) Option text                   │
│                                     │
│  [← Prev]    [Next →]               │
├─────────────────────────────────────┤
│  [Submit Test]  (shows # unanswered)│
└─────────────────────────────────────┘
```

**Navigation**: Question index stored in component state and localStorage. Candidate can jump to any question; answered questions show a filled indicator in a question nav strip.

**Submit confirmation**: If not all questions answered, show a modal: "You have X unanswered questions. Submit anyway?" with Cancel/Submit buttons.

**Post-submit**: Show a thank-you/completion screen ("Your test has been submitted. Results coming soon."). Phase 3 will replace this with the results view.

**New layout file needed**: `apps/web/src/app/(candidate)/layout.tsx` — minimal layout, no sidebar, no admin auth check.

---

## API Endpoints Needed

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/admin/test-links` | Admin JWT (owner) | Generate a new link for a test config. Body: `{test_config_id, expires_at?}`. Returns `{token, url, expires_at}`. |
| `GET` | `/admin/test-links/:testConfigId` | Admin JWT | List all links for a test config (token, state, created_at, expires_at, started_at, submitted_at). |
| `DELETE` | `/admin/test-links/:id` | Admin JWT (owner) | Revoke a link (transition state → `expired`). |
| `GET` | `/candidate/session/:token` | None (public) | Validate link, start session if first open, return `{started_at, server_now, questions: [...]}`. Questions omit `correct_option`. |
| `POST` | `/candidate/submit/:token` | None (public) | Submit answers. Body: `{answers: {[questionId]: letter}}`. Returns `{ok, submitted_at}` or error. |

**Admin link generation** is on a different prefix from candidate routes — this allows CORS configuration to differ (admin routes already have `withCredentials`, candidate routes can be fully public).

---

## File Plan

### New API files

| File | Purpose |
|------|---------|
| `apps/api/src/routes/test-links.ts` | Admin routes: `POST /admin/test-links`, `GET /admin/test-links/:testConfigId`, `DELETE /admin/test-links/:id` |
| `apps/api/src/routes/candidate.ts` | Public candidate routes: `GET /candidate/session/:token`, `POST /candidate/submit/:token` |

### Modified API files

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Register `testLinkRoutes` under `/admin/test-links` and `candidateRoutes` under `/candidate` |
| `apps/api/src/db/schema.sql` | Add `test_links` and `candidate_answers` tables |
| `apps/api/src/db/migrate.ts` | Must handle additive migration (check if tables exist before CREATE) |

### New frontend files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(candidate)/layout.tsx` | Minimal layout: no admin nav, no auth guard |
| `apps/web/src/app/(candidate)/test/[token]/page.tsx` | Main candidate test page — session load, timer, question display, submit |
| `apps/web/src/app/(candidate)/test/[token]/expired/page.tsx` | Terminal page for expired/submitted/invalid links |
| `apps/web/src/components/candidate/Timer.tsx` | Countdown timer component with green/yellow/red states |
| `apps/web/src/components/candidate/QuestionCard.tsx` | Single question display with MCQ radio options |
| `apps/web/src/components/candidate/QuestionNav.tsx` | Question index strip showing answered/current/unanswered state |
| `apps/web/src/components/candidate/SubmitModal.tsx` | Confirmation modal for early/partial submission |
| `apps/web/src/hooks/useTestSession.ts` | Custom hook encapsulating session load, localStorage sync, timer, submit logic |

### Modified frontend files

| File | Change |
|------|--------|
| `apps/web/src/app/(admin)/test-configs/page.tsx` | Wire "Generate Link" button to `POST /admin/test-links`, show generated URL in modal |
| `packages/shared/src/types/index.ts` | Add `TestLink`, `CandidateSession`, `CandidateQuestion` types |

### New DB migration file (optional pattern)

| File | Purpose |
|------|---------|
| `apps/api/src/db/schema-v2.sql` | Additive DDL for Phase 2 tables, run after Phase 1 schema check |

---

## Key Risks & Pitfalls

### 1. Pool ordering non-determinism
**Risk**: If `seededSample` receives questions in a different order on different DB calls, the same seed produces a different selection.
**Mitigation**: Always `ORDER BY id` (or `ORDER BY created_at, id`) in the question pool query before passing to `seededSample`. This must be enforced in the route, not assumed from DB defaults.

### 2. Client clock skew
**Risk**: A candidate with a system clock several minutes fast gets less test time.
**Mitigation**: Include `server_now` in the session response. Client computes `clockOffset = serverNow - Date.now()` and applies it. Document that this only mitigates honest drift, not adversarial manipulation — the server cutoff is the real enforcement.

### 3. Auto-submit vs manual submit race
**Risk**: Both fire at the same instant; two concurrent `POST /candidate/submit/:token` calls; one could fail with a constraint error or the transaction could deadlock.
**Mitigation**: Client-side `submittingRef` ref prevents double-fire. Server-side: the state transition `UPDATE ... WHERE state = 'active'` is atomic — the second call sees 0 rows updated and returns 409. No deadlock possible since both calls do the same UPDATE on the same row.

### 4. Migration strategy for existing DB
**Risk**: Phase 1 migration is idempotent but only handles the Phase 1 schema. The `migrate.ts` checks for `admin_users` to decide if migration is needed — it won't add Phase 2 tables.
**Mitigation**: Extend `migrate.ts` to run additive checks: `IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_links') THEN ...`. Or introduce a `schema_migrations` table for proper versioning. For v1, simple `CREATE TABLE IF NOT EXISTS` guards are sufficient.

### 5. Questions pool too small
**Risk**: `seededSample` with `count >= pool.length` returns the entire pool (already handled in `rng.ts`). But if the pool is empty, `seededSample` returns `[]` and the candidate gets no questions.
**Mitigation**: `GET /candidate/session/:token` must validate that the sampled question count matches `test_config.num_questions`. If not, return a 503 with a message that the test is not ready (admin should add questions). This was partially addressed in Phase 1 (pool size warning on config create) but must be enforced at session time too.

### 6. Link reuse / replay
**Risk**: A candidate could share their link URL; multiple people take the same test.
**Risk level**: Acceptable for v1 — the system is designed for live interview settings where the admin is present. True proctoring is v2.
**Note**: The state machine already limits the link to one active session (`started_at` is set on first open); a second person opening the link mid-test resumes the same session with the same timer — functionally they'd be "helping" the first candidate, not getting a fresh test.

### 7. localStorage unavailable (private browsing)
**Risk**: Some private browsing modes throw on `localStorage` writes.
**Mitigation**: Wrap all `localStorage` calls in try/catch. If localStorage is unavailable, the test still works — it just won't survive a page refresh (answers are lost, timer resets from server `started_at`). This is acceptable for v1.

### 8. CORS for candidate routes
**Risk**: Candidate routes are public — `withCredentials` is not needed. If CORS is misconfigured to require credentials on public routes, candidate browsers may block the request.
**Mitigation**: Candidate routes (`/candidate/*`) should allow all origins or the specific frontend origin without `credentials: true`. Admin routes keep the existing restrictive CORS. This may require route-level CORS override in Fastify.

---

## Validation Architecture

### Test scenarios that must pass (maps to Phase 2 success criteria)

| # | Scenario | How to verify |
|---|----------|---------------|
| 1 | Candidate opens link and sees first question within 3 seconds | Manual test: generate link, open in browser, measure time to question render |
| 2 | Timer counts down live; turns red at 60 seconds | Visual test: open test, observe timer color transitions |
| 3 | Candidate refreshes page mid-test and resumes with correct remaining time | Manual: answer a few questions, note timer, refresh, confirm timer continues from same point (±2s acceptable) |
| 4 | Timer reaches 0:00 → auto-submits → no further answers possible | Manual: use a test config with a 1-minute duration (requires a `duration_minutes` field, or test with mocked time) — OR set system clock forward and verify server rejects |
| 5 | Two different links for same test config show different question sets | API test: generate two links, call `GET /candidate/session/:tokenA` and `GET /candidate/session/:tokenB`, compare `questions[].id` arrays |
| 6 | Same link opened twice shows identical question set | API test: call `GET /candidate/session/:token` twice, compare `questions[].id` arrays — must be identical |
| 7 | Expired link shows clear message | Set `expires_at` to past timestamp, open link, verify terminal page rendered |
| 8 | Server rejects answers submitted after deadline | Set `started_at` to 31 minutes ago in DB, call `POST /candidate/submit/:token`, expect 410 |
| 9 | Partial submission (not all questions answered) succeeds | Submit with `answers` missing some question IDs, verify 200 and rows inserted for only provided answers |
| 10 | Correct_option not leaked to candidate | Inspect `GET /candidate/session/:token` response, verify `correct_option` field absent |

### Unit tests to add

- `rng.ts`: already fully tested — no new tests needed.
- `candidate.ts` route: integration tests for session start, idempotent re-open, deadline enforcement, answer validation.
- Timer component: unit test that `remainingMs` calculation with clock offset produces expected values.

---

## RESEARCH COMPLETE
