# Multi-Type Questions — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming) → ready for implementation plan
**Scope tier:** Tier 1 — richer stimulus + deterministic, instant-auto-graded interaction types

## 1. Goal

Today a question is plain `text` + four options (`option_a..d`) + one `correct_option`.
This release expands questions along two independent dimensions:

- **Stimulus** — a question prompt can mix rich text, syntax-highlighted **code**
  snippets, and **images** (screenshots).
- **Interaction** — beyond single-choice, support **multi-select**, **true/false**,
  **matching** (relate two columns), **ordering** (drag-to-arrange), and
  **fill-in-the-blank**.

All six types grade **deterministically and instantly** — no reviewer workflow, no
code sandbox. The schema is designed so heavier tiers (code-by-execution, manual
grading) can be added later without a rewrite.

## 2. Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Types in this release | single_choice, multi_select, true_false, matching, ordering, fill_blank |
| Stimulus | text + code + image blocks, on **every** type |
| Grading | **All-or-nothing** per question (boolean) — keeps current `correct/total` math unchanged |
| Image storage | **Postgres `BYTEA`** via existing `@fastify/multipart`; served by an API route; swappable later |
| Existing a/b/c/d questions | **Migrate** into the unified model (`type='single_choice'`); drop `option_*`/`correct_option` |
| Options/answer-key storage | **JSONB blob** per question (not normalized tables) |
| Stimulus storage | **Structured block array**, not embedded markdown |
| Fill-blank | **Markers in the prompt text** (`___`), one accepted-list per blank |
| CSV bulk import | **single_choice only** for now (rich types are UI-authored) |
| Versioning | `family_id`/`version` untouched — editing creates a new version as today |

## 3. Data model

### 3.1 Migration `0005_question_types.sql`

```sql
-- questions: add unified model columns
ALTER TABLE questions ADD COLUMN type       TEXT;
ALTER TABLE questions ADD COLUMN content    JSONB;
ALTER TABLE questions ADD COLUMN answer_key JSONB;

-- backfill existing rows as single_choice
UPDATE questions SET
  type = 'single_choice',
  content = jsonb_build_object(
    'prompt',  jsonb_build_array(jsonb_build_object('type','text','text', text)),
    'options', jsonb_build_array(option_a, option_b, option_c, option_d)
  ),
  answer_key = jsonb_build_object(
    'correctIndex',
    CASE correct_option WHEN 'a' THEN 0 WHEN 'b' THEN 1 WHEN 'c' THEN 2 ELSE 3 END
  );

-- enforce after backfill
ALTER TABLE questions ALTER COLUMN type       SET NOT NULL;
ALTER TABLE questions ALTER COLUMN content    SET NOT NULL;
ALTER TABLE questions ALTER COLUMN answer_key SET NOT NULL;
ALTER TABLE questions ADD CONSTRAINT questions_type_chk
  CHECK (type IN ('single_choice','multi_select','true_false','matching','ordering','fill_blank'));

-- retire legacy columns
ALTER TABLE questions
  DROP COLUMN text,
  DROP COLUMN option_a, DROP COLUMN option_b,
  DROP COLUMN option_c, DROP COLUMN option_d,
  DROP COLUMN correct_option;

-- candidate_answers: richer per-type payload
-- existing 'a'..'d' values converted to single_choice index payload
ALTER TABLE candidate_answers ADD COLUMN answer_json JSONB;
UPDATE candidate_answers SET answer_json = jsonb_build_object(
  'index', CASE answer WHEN 'a' THEN 0 WHEN 'b' THEN 1 WHEN 'c' THEN 2 ELSE 3 END
);  -- single_choice response payload shape { index }, see §3.3
ALTER TABLE candidate_answers DROP COLUMN answer;
ALTER TABLE candidate_answers RENAME COLUMN answer_json TO answer;
ALTER TABLE candidate_answers ALTER COLUMN answer SET NOT NULL;

-- image storage
CREATE TABLE question_assets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime       TEXT NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  bytes      BYTEA NOT NULL,
  byte_size  INT NOT NULL CHECK (byte_size > 0 AND byte_size <= 1048576), -- 1 MB cap
  created_by UUID NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> The existing `idx_questions_active`/`_skill` indexes reference columns that
> survive (`technology_id`, `difficulty`, `is_active`, `is_latest`, `skill_area`),
> so they are unaffected. `text` is dropped, so `idx_questions_skill` stays valid.

### 3.2 Stimulus blocks (shared by all types)

```ts
type Block =
  | { type: 'text';  text: string }
  | { type: 'code';  lang: string; code: string }
  | { type: 'image'; assetId: string; alt: string };
```

`content.prompt: Block[]` replaces the old flat `text`. Rendered top-to-bottom.

### 3.3 Per-type `content` / `answer_key` / candidate `answer`

All `content` objects include `prompt: Block[]`. The table shows the **extra**
fields.

| type | `content` extra | `answer_key` | candidate `answer` |
|---|---|---|---|
| `single_choice` | `options: string[]` (≥2) | `{ correctIndex: number }` | `{ index: number }` |
| `multi_select` | `options: string[]` (≥2) | `{ correctIndices: number[] }` | `{ indices: number[] }` |
| `true_false` | — | `{ correct: boolean }` | `{ value: boolean }` |
| `matching` | `left: string[]`, `right: string[]` (equal len ≥2) | `{ map: Record<string, number> }` (leftIdx→rightIdx) | `{ map: Record<string, number> }` |
| `ordering` | `items: string[]` (≥2, **stored in correct order**) | `{ order: number[] }` (canonical = `[0,1,2,…]`) | `{ order: number[] }` (item indices in candidate order) |
| `fill_blank` | (blanks are `___` markers in prompt text blocks) | `{ blanks: { accepted: string[] }[] }` | `{ values: string[] }` |

Concrete examples:

```jsonc
// matching
content   = { prompt:[{type:'text',text:'Match the DAX function to its purpose'}],
              left:  ['COUNTROWS','RELATED','SUMX'],
              right: ['Row count','Fetch from related table','Iterate + sum'] }
answer_key = { map: { "0":0, "1":1, "2":2 } }

// ordering (items stored correct; shuffled at render)
content   = { prompt:[{type:'text',text:'Order the ETL steps'}],
              items: ['Extract','Transform','Load'] }
answer_key = { order: [0,1,2] }

// fill_blank
content   = { prompt:[{type:'text',text:'Use ___ to count table rows in DAX.'}] }
answer_key = { blanks: [ { accepted: ['COUNTROWS','COUNTROWS()'] } ] }
```

### 3.4 Render-time shuffling (anti-leak)

For `matching` (right column) and `ordering` (items), the canonical order in
`content` is the **correct** order. The candidate must not see it. The candidate
session endpoint shuffles these arrays **deterministically** using the existing
per-link `seed` (reuse `seededSample`/seeded RNG in `lib/rng.ts`), and returns a
`displayOrder` index map alongside so the client can submit answers in canonical
index terms. The grader always works in canonical indices.

## 4. Grading

A single pure module `apps/api/src/lib/grade-answer.ts`:

```ts
export function gradeAnswer(
  type: QuestionType,
  answerKey: AnswerKey,   // discriminated union
  response: AnswerResponse | null
): boolean
```

- All-or-nothing: returns `true` only if the response fully matches.
- `multi_select`: selected set must equal correct set (order-independent).
- `matching`: every left→right assignment matches.
- `ordering`: submitted order equals canonical `order`.
- `fill_blank`: each blank's trimmed, case-insensitive value ∈ its `accepted` list;
  count must match.
- Missing/`null` response → `false`.

Because grading stays boolean, the existing logic in `candidate.ts` is unchanged
except the comparison line: `correctCount`, `score_pct = correct/total`, and the
`skill_area_scores` rollup all stay identical. **No scoring-math or UI changes to
Pass/Fail.**

## 5. API changes

### 5.1 Candidate
- `GET /candidate/session/:token` — per question returns `{ id, type, content (answer_key stripped), skill_area, displayOrder? }` instead of `option_a..d`.
- `POST /candidate/submit/:token` — `answers: Record<questionId, AnswerResponse>`,
  validated by a **discriminated Zod union** keyed on each question's stored `type`
  (look up types server-side; never trust client-declared type).

### 5.2 Admin questions
- Create/Update accept `{ type, content, answer_key, technology_id, difficulty, skill_area, explanation }`.
- Per-type Zod validation of `content`+`answer_key` (e.g. `correctIndex` within
  `options` range; `matching` left/right equal length; fill_blank blank count
  equals `___` marker count).
- `POST /admin/questions/assets` — multipart upload, ≤1 MB, returns `{ assetId }`.
- `GET /assets/:id` — public, serves bytes with correct `Content-Type` and
  long-lived cache header. (Assets are not secret; they're embedded in candidate
  prompts.)

### 5.3 Answer sheets
- Candidate `GET /candidate/results/:token` and admin `GET /admin/submissions/:linkId`
  answer-sheet rows return `{ type, content, answer_key, response, is_correct, skill_area }`
  instead of `option_*`/`correct_option`. CSV submission export (score-level) is
  **unchanged** (it never referenced options).

## 6. Frontend

### 6.1 Shared
- `packages/shared` gains the `QuestionType`, `Block`, per-type `content`/`answer_key`/
  `response` types, and a **discriminated `Question` union**. `CandidateQuestion`
  loses `option_a..d`, gains `type` + `content`.

### 6.2 Admin question editor
- A **type picker**; selecting a type swaps in that type's form.
- A shared **stimulus builder**: add/reorder text, code (with language), and image
  blocks; image block = upload (calls assets endpoint, stores returned `assetId`).
- Per-type editors: options list + correct radio (single) / checkboxes (multi);
  T/F toggle; left/right pair rows (matching); sortable list (ordering); prompt with
  `___` markers + accepted-answers-per-blank (fill_blank).
- Client mirrors server Zod validation for instant feedback.

### 6.3 Candidate test UI
- A **renderer dispatch** on `type`: radio group, checkbox group, T/F, matching
  (per-left dropdown of right options, or drag), ordering (drag-sortable list),
  fill-blank (inline inputs at each `___`).
- A shared **prompt renderer** for `Block[]` (text, highlighted code, `<img>` from
  `/assets/:id`).
- Local session answer storage (`LocalSession.answers`) becomes
  `Record<questionId, AnswerResponse>`.

### 6.4 Results / answer sheet
- Type-aware display of correct vs. candidate answer for each type.

### 6.5 Question list
- New **Type** column. Text preview derives from the first `text` block of `prompt`.

## 7. Scope cuts (YAGNI)

- **CSV import: single_choice only.** Existing import maps CSV columns into the
  new single_choice `content`/`answer_key`. Rich types are UI-authored. (Export of
  the question bank, if any, likewise covers single_choice fields.)
- No partial credit, no reviewer workflow, no code sandbox, no normalized option
  tables, no markdown stimulus.
- Hotspot, drag-to-zone, gap-match, numeric (the deferred Tier-1 types) are **not**
  in this release but the `type` enum + JSONB model accommodate them later.

## 8. Testing

- **Unit** (`grade-answer.test.ts`): every type — exact-correct → true; one-element-
  wrong (wrong index / missing match / swapped order / one bad blank / superset &
  subset for multi-select) → false; null response → false.
- **Validators** (`question-schema.test.ts`): per-type content/answer_key Zod —
  out-of-range index, unequal matching columns, blank-count mismatch, etc.
- **Submit path:** one test per type through `POST /candidate/submit` asserting the
  graded `score_pct`.
- Existing `question-query`, `rng`, `slug` tests must stay green.

## 9. Migration / rollout notes

- Single forward migration `0005`; the candidate `seed` column already exists
  (used by `seededSample`), reused for shuffle.
- Deploy is build-verify-then-push-to-Render (no local prod DB); the Neon dev DB
  exercises the migration first.
- Backward-incompatible API shape (`option_*` removed) is acceptable: candidate
  sessions are short-lived and there is no public API contract beyond this app.
