# Multi-Type Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the question bank from single-choice (a/b/c/d) to six deterministic, instantly-auto-graded question types — single_choice, multi_select, true_false, matching, ordering, fill_blank — each able to embed text, code, and image stimulus.

**Architecture:** A unified `questions` row carries a `type` discriminator plus two JSONB blobs: `content` (a shared `prompt: Block[]` stimulus + type-specific fields) and `answer_key` (the correct response). Grading is a single pure function returning a boolean (all-or-nothing), so the existing `correct/total` score math is untouched. Images are stored as `BYTEA` in Postgres and served by an API route. Matching/ordering options are shuffled deterministically at render using the existing per-link seed so the correct order never reaches the candidate.

**Tech Stack:** Fastify 5 + `postgres` (raw SQL), Zod, Vitest (api); Next.js 16 + React 18 + Tailwind (web); `@dev-assessment/shared` workspace for types.

**Spec:** `docs/superpowers/specs/2026-06-17-multi-type-questions-design.md`

---

## File Structure

**Shared (`packages/shared/src/types/`)**
- Modify `index.ts` — add `QuestionType`, `Block`, per-type `content`/`answer_key`/`response` types, `ShuffledItem`, rewrite `Question`/`CandidateQuestion`, update answer-sheet types.

**API (`apps/api/src/`)**
- Create `lib/grade-answer.ts` + `lib/grade-answer.test.ts` — pure grader.
- Create `lib/question-schema.ts` + `lib/question-schema.test.ts` — per-type Zod content/key/response schemas + cross-field validation.
- Modify `lib/rng.ts` + `lib/rng.test.ts` — add `seededShuffle`.
- Create `db/migrations/0005_question_types.sql` — schema migration.
- Create `routes/assets.ts` — upload + serve image assets.
- Modify `routes/questions.ts` — CRUD/list/export/import use the unified model.
- Modify `routes/candidate.ts` — session shuffle + strip key; submit validate + grade per type.
- Modify `routes/submissions.ts` — answer-sheet rows return type/content/key/response.
- Modify `app.ts` — register `assetsRoutes`.

**Web (`apps/web/src/`)**
- Create `components/question/PromptRenderer.tsx` — renders `Block[]`.
- Create `components/question/StimulusBuilder.tsx` — authoring blocks + image upload.
- Create `components/question/editors/*.tsx` — one per-type editor body.
- Rewrite `components/ui/QuestionForm.tsx` — type picker + dispatch.
- Create `components/question/candidate/*.tsx` — one per-type candidate input.
- Modify `app/(candidate)/test/[token]/page.tsx` — dispatch renderer + per-type answer state.
- Modify `app/(candidate)/test/[token]/results/page.tsx` + admin submission detail — type-aware answer sheet.
- Modify `app/(admin)/questions/page.tsx` — Type column + prompt-text preview.

---

## Phase 1 — Shared types (foundation)

### Task 1: Add the type system to `@dev-assessment/shared`

**Files:**
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Replace the `Question` block and add new types**

In `packages/shared/src/types/index.ts`, **delete** the existing `Question`,
`CandidateQuestion`, `LocalSession`, `AnswerSheetRow`, and `AdminAnswerSheetRow`
interfaces, and add the following (keep `Difficulty`, `Technology`, everything
else):

```ts
export type QuestionType =
  | 'single_choice'
  | 'multi_select'
  | 'true_false'
  | 'matching'
  | 'ordering'
  | 'fill_blank';

/** A stimulus block — the shared prompt body for every question type. */
export type Block =
  | { type: 'text'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'image'; assetId: string; alt: string };

/** Authoring-side content (the correct answer lives in answer_key, never here). */
export interface SingleChoiceContent { prompt: Block[]; options: string[] }
export interface MultiSelectContent  { prompt: Block[]; options: string[] }
export interface TrueFalseContent    { prompt: Block[] }
export interface MatchingContent     { prompt: Block[]; left: string[]; right: string[] }
export interface OrderingContent     { prompt: Block[]; items: string[] } // stored in CORRECT order
export interface FillBlankContent    { prompt: Block[] }                  // blanks = `___` markers in text blocks

export type QuestionContent =
  | SingleChoiceContent | MultiSelectContent | TrueFalseContent
  | MatchingContent | OrderingContent | FillBlankContent;

export interface SingleChoiceKey { correctIndex: number }
export interface MultiSelectKey  { correctIndices: number[] }
export interface TrueFalseKey    { correct: boolean }
export interface MatchingKey     { map: Record<string, number> }  // leftIdx -> rightIdx
export interface OrderingKey     { order: number[] }              // canonical correct order = [0,1,2,...]
export interface FillBlankKey    { blanks: { accepted: string[] }[] }

export type AnswerKey =
  | SingleChoiceKey | MultiSelectKey | TrueFalseKey
  | MatchingKey | OrderingKey | FillBlankKey;

export interface SingleChoiceResp { index: number }
export interface MultiSelectResp  { indices: number[] }
export interface TrueFalseResp    { value: boolean }
export interface MatchingResp     { map: Record<string, number> } // leftIdx -> rightIdx
export interface OrderingResp     { order: number[] }             // item original-indices in chosen order
export interface FillBlankResp    { values: string[] }

export type AnswerResponse =
  | SingleChoiceResp | MultiSelectResp | TrueFalseResp
  | MatchingResp | OrderingResp | FillBlankResp;

export interface Question {
  id: string;
  family_id: string;
  version: number;
  technology_id: string;
  technology_name?: string;
  difficulty: Difficulty;
  skill_area: string;
  type: QuestionType;
  content: QuestionContent;
  answer_key: AnswerKey;
  explanation?: string;
  is_active: boolean;
  is_latest: boolean;
  created_by: string;
  created_at: string;
}

/** An option that has been shuffled for display but remembers its original index. */
export interface ShuffledItem { idx: number; text: string }

/** Candidate-safe content: answer_key removed; matching.right & ordering.items shuffled. */
export type CandidateContent =
  | { prompt: Block[]; options: string[] }                 // single_choice / multi_select
  | { prompt: Block[] }                                    // true_false / fill_blank
  | { prompt: Block[]; left: string[]; right: ShuffledItem[] } // matching
  | { prompt: Block[]; items: ShuffledItem[] };            // ordering

export interface CandidateQuestion {
  id: string;
  type: QuestionType;
  skill_area: string;
  content: CandidateContent;
}

export interface CandidateSession {
  started_at: string;
  server_now: string;
  duration_ms: number;
  questions: CandidateQuestion[];
}

export interface LocalSession {
  token: string;
  startedAt: string;
  answers: Record<string, AnswerResponse>;
  currentQuestionIndex: number;
}

export interface AnswerSheetRow {
  type: QuestionType;
  content: QuestionContent;
  answer_key: AnswerKey;
  response: AnswerResponse | null;
  is_correct: boolean;
  skill_area: string;
}

export interface AdminAnswerSheetRow extends AnswerSheetRow {
  family_id: string;
  version: number;
}
```

- [ ] **Step 2: Verify the shared package compiles**

Run: `npm run build --workspace=packages/shared`
Expected: PASS (no type errors). If the package has no `build` script, run
`npx tsc --noEmit -p packages/shared/tsconfig.json`.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(shared): question type system (content/answer_key/response unions)"
```

---

## Phase 2 — Grading core (TDD)

### Task 2: `seededShuffle` helper

**Files:**
- Modify: `apps/api/src/lib/rng.ts`
- Test: `apps/api/src/lib/rng.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/api/src/lib/rng.test.ts`:

```ts
import { seededShuffle } from './rng.js';

describe('seededShuffle', () => {
  const arr = [0, 1, 2, 3, 4, 5];

  it('is deterministic — same seed, same order', () => {
    expect(seededShuffle(arr, 's1')).toEqual(seededShuffle(arr, 's1'));
  });

  it('differs for different seeds (statistically)', () => {
    expect(seededShuffle(arr, 's1')).not.toEqual(seededShuffle(arr, 's2'));
  });

  it('is a permutation — same multiset, same length', () => {
    const out = seededShuffle(arr, 's3');
    expect(out).toHaveLength(arr.length);
    expect([...out].sort((a, b) => a - b)).toEqual(arr);
  });

  it('does not mutate the input', () => {
    const original = [...arr];
    seededShuffle(arr, 's4');
    expect(arr).toEqual(original);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test --workspace=apps/api -- rng`
Expected: FAIL — `seededShuffle is not a function`.

- [ ] **Step 3: Implement**

Append to `apps/api/src/lib/rng.ts`:

```ts
/**
 * Full Fisher-Yates shuffle using a seeded RNG. Same seed + same array always
 * yields the same permutation. Used to present matching/ordering options to the
 * candidate without leaking the stored correct order.
 */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = seedrandom(seed);
  const items = [...arr];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test --workspace=apps/api -- rng`
Expected: PASS (all rng tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/rng.ts apps/api/src/lib/rng.test.ts
git commit -m "feat(api): seededShuffle for deterministic option display order"
```

### Task 3: `gradeAnswer` pure function

**Files:**
- Create: `apps/api/src/lib/grade-answer.ts`
- Test: `apps/api/src/lib/grade-answer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/lib/grade-answer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { gradeAnswer } from './grade-answer.js';

describe('gradeAnswer', () => {
  it('single_choice: correct index → true', () => {
    expect(gradeAnswer('single_choice', { correctIndex: 2 }, { index: 2 })).toBe(true);
  });
  it('single_choice: wrong index → false', () => {
    expect(gradeAnswer('single_choice', { correctIndex: 2 }, { index: 1 })).toBe(false);
  });

  it('multi_select: exact set (order-independent) → true', () => {
    expect(gradeAnswer('multi_select', { correctIndices: [0, 2] }, { indices: [2, 0] })).toBe(true);
  });
  it('multi_select: subset → false', () => {
    expect(gradeAnswer('multi_select', { correctIndices: [0, 2] }, { indices: [0] })).toBe(false);
  });
  it('multi_select: superset → false', () => {
    expect(gradeAnswer('multi_select', { correctIndices: [0, 2] }, { indices: [0, 2, 3] })).toBe(false);
  });

  it('true_false: match → true; mismatch → false', () => {
    expect(gradeAnswer('true_false', { correct: true }, { value: true })).toBe(true);
    expect(gradeAnswer('true_false', { correct: true }, { value: false })).toBe(false);
  });

  it('matching: all pairs correct → true', () => {
    expect(gradeAnswer('matching', { map: { '0': 0, '1': 1 } }, { map: { '0': 0, '1': 1 } })).toBe(true);
  });
  it('matching: one pair wrong → false', () => {
    expect(gradeAnswer('matching', { map: { '0': 0, '1': 1 } }, { map: { '0': 0, '1': 0 } })).toBe(false);
  });
  it('matching: missing assignment → false', () => {
    expect(gradeAnswer('matching', { map: { '0': 0, '1': 1 } }, { map: { '0': 0 } })).toBe(false);
  });

  it('ordering: exact order → true', () => {
    expect(gradeAnswer('ordering', { order: [0, 1, 2] }, { order: [0, 1, 2] })).toBe(true);
  });
  it('ordering: swapped → false', () => {
    expect(gradeAnswer('ordering', { order: [0, 1, 2] }, { order: [0, 2, 1] })).toBe(false);
  });

  it('fill_blank: trims and is case-insensitive → true', () => {
    // leading/trailing whitespace and case are normalized away
    expect(gradeAnswer('fill_blank', { blanks: [{ accepted: ['COUNTROWS'] }] }, { values: ['  countrows '] })).toBe(true);
    // any of the accepted variants matches
    expect(gradeAnswer('fill_blank', { blanks: [{ accepted: ['COUNTROWS', 'COUNTROWS()'] }] }, { values: ['countrows()'] })).toBe(true);
  });
  it('fill_blank: one wrong blank → false', () => {
    const key = { blanks: [{ accepted: ['A'] }, { accepted: ['B'] }] };
    expect(gradeAnswer('fill_blank', key, { values: ['A', 'X'] })).toBe(false);
  });
  it('fill_blank: wrong blank count → false', () => {
    const key = { blanks: [{ accepted: ['A'] }, { accepted: ['B'] }] };
    expect(gradeAnswer('fill_blank', key, { values: ['A'] })).toBe(false);
  });

  it('null response → false for every type', () => {
    expect(gradeAnswer('single_choice', { correctIndex: 0 }, null)).toBe(false);
    expect(gradeAnswer('ordering', { order: [0, 1] }, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test --workspace=apps/api -- grade-answer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/lib/grade-answer.ts`:

```ts
import type {
  QuestionType, AnswerKey, AnswerResponse,
  SingleChoiceKey, MultiSelectKey, TrueFalseKey, MatchingKey, OrderingKey, FillBlankKey,
  SingleChoiceResp, MultiSelectResp, TrueFalseResp, MatchingResp, OrderingResp, FillBlankResp,
} from '@dev-assessment/shared';

const norm = (s: string) => s.trim().toLowerCase();
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');

/**
 * All-or-nothing grader. Returns true only when the response fully matches the
 * answer key. Pure and deterministic — unit-tested per type.
 */
export function gradeAnswer(
  type: QuestionType,
  answerKey: AnswerKey,
  response: AnswerResponse | null,
): boolean {
  if (response == null) return false;

  switch (type) {
    case 'single_choice':
      return (response as SingleChoiceResp).index === (answerKey as SingleChoiceKey).correctIndex;

    case 'multi_select':
      return sameSet((response as MultiSelectResp).indices, (answerKey as MultiSelectKey).correctIndices);

    case 'true_false':
      return (response as TrueFalseResp).value === (answerKey as TrueFalseKey).correct;

    case 'matching': {
      const key = (answerKey as MatchingKey).map;
      const resp = (response as MatchingResp).map;
      const keys = Object.keys(key);
      if (Object.keys(resp).length !== keys.length) return false;
      return keys.every((k) => resp[k] === key[k]);
    }

    case 'ordering': {
      const key = (answerKey as OrderingKey).order;
      const resp = (response as OrderingResp).order;
      return key.length === resp.length && key.every((v, i) => v === resp[i]);
    }

    case 'fill_blank': {
      const blanks = (answerKey as FillBlankKey).blanks;
      const values = (response as FillBlankResp).values;
      if (!Array.isArray(values) || values.length !== blanks.length) return false;
      return blanks.every((b, i) => b.accepted.some((a) => norm(a) === norm(values[i] ?? '')));
    }

    default:
      return false;
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test --workspace=apps/api -- grade-answer`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/grade-answer.ts apps/api/src/lib/grade-answer.test.ts
git commit -m "feat(api): all-or-nothing gradeAnswer for all six question types"
```

---

## Phase 3 — Per-type validation schemas (TDD)

### Task 4: Zod schemas for content / answer_key / response

**Files:**
- Create: `apps/api/src/lib/question-schema.ts`
- Test: `apps/api/src/lib/question-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/lib/question-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateQuestionContent, responseSchemaFor } from './question-schema.js';

const prompt = [{ type: 'text', text: 'Q?' }];

describe('validateQuestionContent', () => {
  it('accepts a valid single_choice', () => {
    const r = validateQuestionContent('single_choice',
      { prompt, options: ['a', 'b'] }, { correctIndex: 1 });
    expect(r.ok).toBe(true);
  });

  it('rejects single_choice correctIndex out of range', () => {
    const r = validateQuestionContent('single_choice',
      { prompt, options: ['a', 'b'] }, { correctIndex: 5 });
    expect(r.ok).toBe(false);
  });

  it('rejects matching with unequal columns', () => {
    const r = validateQuestionContent('matching',
      { prompt, left: ['a', 'b'], right: ['x'] }, { map: { '0': 0, '1': 0 } });
    expect(r.ok).toBe(false);
  });

  it('rejects fill_blank when blank count != marker count', () => {
    const r = validateQuestionContent('fill_blank',
      { prompt: [{ type: 'text', text: 'one ___ two ___' }] },
      { blanks: [{ accepted: ['x'] }] }); // 2 markers, 1 blank
    expect(r.ok).toBe(false);
  });

  it('accepts fill_blank when counts match', () => {
    const r = validateQuestionContent('fill_blank',
      { prompt: [{ type: 'text', text: 'one ___ two ___' }] },
      { blanks: [{ accepted: ['x'] }, { accepted: ['y'] }] });
    expect(r.ok).toBe(true);
  });
});

describe('responseSchemaFor', () => {
  it('accepts a valid ordering response', () => {
    expect(responseSchemaFor('ordering').safeParse({ order: [0, 1, 2] }).success).toBe(true);
  });
  it('rejects a malformed single_choice response', () => {
    expect(responseSchemaFor('single_choice').safeParse({ nope: 1 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test --workspace=apps/api -- question-schema`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/lib/question-schema.ts`:

```ts
import { z } from 'zod';
import type { QuestionType } from '@dev-assessment/shared';

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().min(1) }),
  z.object({ type: z.literal('code'), lang: z.string().min(1), code: z.string().min(1) }),
  z.object({ type: z.literal('image'), assetId: z.string().uuid(), alt: z.string().default('') }),
]);
export const promptSchema = z.array(blockSchema).min(1);

const MARKER = /___/g;
const countMarkers = (prompt: z.infer<typeof promptSchema>) =>
  prompt.reduce((n, b) => n + (b.type === 'text' ? (b.text.match(MARKER)?.length ?? 0) : 0), 0);

// content schemas
const singleContent = z.object({ prompt: promptSchema, options: z.array(z.string().min(1)).min(2) });
const multiContent  = singleContent;
const tfContent     = z.object({ prompt: promptSchema });
const matchContent  = z.object({ prompt: promptSchema, left: z.array(z.string().min(1)).min(2), right: z.array(z.string().min(1)).min(2) });
const orderContent  = z.object({ prompt: promptSchema, items: z.array(z.string().min(1)).min(2) });
const fillContent   = z.object({ prompt: promptSchema });

// answer_key schemas
const singleKey = z.object({ correctIndex: z.number().int().nonnegative() });
const multiKey  = z.object({ correctIndices: z.array(z.number().int().nonnegative()).min(1) });
const tfKey     = z.object({ correct: z.boolean() });
const matchKey  = z.object({ map: z.record(z.string(), z.number().int().nonnegative()) });
const orderKey  = z.object({ order: z.array(z.number().int().nonnegative()).min(2) });
const fillKey   = z.object({ blanks: z.array(z.object({ accepted: z.array(z.string().min(1)).min(1) })).min(1) });

// response schemas (candidate submit)
const responseSchemas: Record<QuestionType, z.ZodTypeAny> = {
  single_choice: z.object({ index: z.number().int().nonnegative() }),
  multi_select:  z.object({ indices: z.array(z.number().int().nonnegative()) }),
  true_false:    z.object({ value: z.boolean() }),
  matching:      z.object({ map: z.record(z.string(), z.number().int().nonnegative()) }),
  ordering:      z.object({ order: z.array(z.number().int().nonnegative()).min(1) }),
  fill_blank:    z.object({ values: z.array(z.string()) }),
};

export function responseSchemaFor(type: QuestionType): z.ZodTypeAny {
  return responseSchemas[type];
}

export type ValidateResult = { ok: true } | { ok: false; error: string };

/**
 * Validates a question's content + answer_key for a given type, including
 * cross-field rules that a plain schema can't express (index ranges, equal
 * matching columns, fill-blank marker/blank parity).
 */
export function validateQuestionContent(
  type: QuestionType,
  content: unknown,
  answerKey: unknown,
): ValidateResult {
  const fail = (error: string): ValidateResult => ({ ok: false, error });

  switch (type) {
    case 'single_choice': {
      const c = singleContent.safeParse(content);
      const k = singleKey.safeParse(answerKey);
      if (!c.success || !k.success) return fail('Invalid single_choice content/answer_key');
      if (k.data.correctIndex >= c.data.options.length) return fail('correctIndex out of range');
      return { ok: true };
    }
    case 'multi_select': {
      const c = multiContent.safeParse(content);
      const k = multiKey.safeParse(answerKey);
      if (!c.success || !k.success) return fail('Invalid multi_select content/answer_key');
      if (k.data.correctIndices.some((i) => i >= c.data.options.length)) return fail('index out of range');
      if (new Set(k.data.correctIndices).size !== k.data.correctIndices.length) return fail('duplicate correct index');
      return { ok: true };
    }
    case 'true_false': {
      if (!tfContent.safeParse(content).success || !tfKey.safeParse(answerKey).success) return fail('Invalid true_false');
      return { ok: true };
    }
    case 'matching': {
      const c = matchContent.safeParse(content);
      const k = matchKey.safeParse(answerKey);
      if (!c.success || !k.success) return fail('Invalid matching content/answer_key');
      if (c.data.left.length !== c.data.right.length) return fail('left and right must have equal length');
      const expectedKeys = c.data.left.map((_, i) => String(i)).sort();
      if (Object.keys(k.data.map).sort().join(',') !== expectedKeys.join(',')) return fail('answer_key must map every left item');
      if (Object.values(k.data.map).some((v) => v >= c.data.right.length)) return fail('right index out of range');
      return { ok: true };
    }
    case 'ordering': {
      const c = orderContent.safeParse(content);
      const k = orderKey.safeParse(answerKey);
      if (!c.success || !k.success) return fail('Invalid ordering content/answer_key');
      const canonical = c.data.items.map((_, i) => i);
      if (k.data.order.length !== canonical.length) return fail('order length mismatch');
      if ([...k.data.order].sort((a, b) => a - b).join(',') !== canonical.join(',')) return fail('order must be a permutation of item indices');
      return { ok: true };
    }
    case 'fill_blank': {
      const c = fillContent.safeParse(content);
      const k = fillKey.safeParse(answerKey);
      if (!c.success || !k.success) return fail('Invalid fill_blank content/answer_key');
      if (countMarkers(c.data.prompt) !== k.data.blanks.length) return fail('blank count must equal ___ marker count');
      return { ok: true };
    }
    default:
      return fail('Unknown question type');
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test --workspace=apps/api -- question-schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/question-schema.ts apps/api/src/lib/question-schema.test.ts
git commit -m "feat(api): per-type Zod validation for question content/answer_key/response"
```

---

## Phase 4 — Database migration

### Task 5: Migration `0005_question_types.sql`

**Files:**
- Create: `apps/api/src/db/migrations/0005_question_types.sql`

- [ ] **Step 1: Write the migration**

Create `apps/api/src/db/migrations/0005_question_types.sql` with the exact SQL
from spec §3.1 (questions columns + backfill + drop legacy; candidate_answers
text→jsonb; question_assets table):

```sql
-- 0005_question_types: unified multi-type question model + image assets

ALTER TABLE questions ADD COLUMN type       TEXT;
ALTER TABLE questions ADD COLUMN content    JSONB;
ALTER TABLE questions ADD COLUMN answer_key JSONB;

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

ALTER TABLE questions ALTER COLUMN type       SET NOT NULL;
ALTER TABLE questions ALTER COLUMN content    SET NOT NULL;
ALTER TABLE questions ALTER COLUMN answer_key SET NOT NULL;
ALTER TABLE questions ADD CONSTRAINT questions_type_chk
  CHECK (type IN ('single_choice','multi_select','true_false','matching','ordering','fill_blank'));

ALTER TABLE questions
  DROP COLUMN text,
  DROP COLUMN option_a, DROP COLUMN option_b,
  DROP COLUMN option_c, DROP COLUMN option_d,
  DROP COLUMN correct_option;

ALTER TABLE candidate_answers ADD COLUMN answer_json JSONB;
UPDATE candidate_answers SET answer_json = jsonb_build_object(
  'index', CASE answer WHEN 'a' THEN 0 WHEN 'b' THEN 1 WHEN 'c' THEN 2 ELSE 3 END
);
ALTER TABLE candidate_answers DROP COLUMN answer;
ALTER TABLE candidate_answers RENAME COLUMN answer_json TO answer;
ALTER TABLE candidate_answers ALTER COLUMN answer SET NOT NULL;

CREATE TABLE question_assets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime       TEXT NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  bytes      BYTEA NOT NULL,
  byte_size  INT NOT NULL CHECK (byte_size > 0 AND byte_size <= 1048576),
  created_by UUID NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Run the migration against the dev DB**

Run: `npm run db:migrate`
Expected: `Applying 0005_question_types.sql…` then `Applied 1 migration(s).`
(The migrate runner applies only not-yet-applied files.)

- [ ] **Step 3: Verify schema by re-seeding is not needed; sanity-check a query**

Run:
```bash
npm run test --workspace=apps/api -- rng grade-answer question-schema
```
Expected: PASS (confirms the API package still compiles against the new shared types so far; no DB hit here).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/migrations/0005_question_types.sql
git commit -m "feat(api): migration 0005 — unified question model + question_assets"
```

> **Note:** If `migrate.ts` tracks applied migrations in a table, re-running is
> idempotent. If a teammate already has data, the backfill covers all existing
> single-choice rows; there is no down-migration (one-way, per spec §9).

---

## Phase 5 — API: image assets

### Task 6: Asset upload + serve routes

**Files:**
- Create: `apps/api/src/routes/assets.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Inspect how routes are registered**

Run: `cat apps/api/src/app.ts`
Note the `register(...)` calls and the prefix style (e.g.
`app.register(questionRoutes, { prefix: '/questions' })`). Match that style below.

- [ ] **Step 2: Create the routes file**

Create `apps/api/src/routes/assets.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_BYTES = 1024 * 1024; // 1 MB

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function assetRoutes(app: FastifyInstance) {
  // POST /assets — multipart image upload (owner only)
  app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: 'No file uploaded' });
    if (!ALLOWED.has(file.mimetype)) {
      return reply.status(415).send({ error: 'Only PNG, JPEG, WEBP, GIF images are allowed' });
    }
    const buf = await file.toBuffer();
    if (buf.length > MAX_BYTES) {
      return reply.status(413).send({ error: 'Image too large. Maximum size is 1MB.' });
    }
    const [row] = await db`
      INSERT INTO question_assets (mime, bytes, byte_size, created_by)
      VALUES (${file.mimetype}, ${buf}, ${buf.length}, ${getAuthUser(request).id})
      RETURNING id
    `;
    return reply.status(201).send({ assetId: row.id });
  });

  // GET /assets/:id — public; images are embedded in candidate prompts
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.status(400).send({ error: 'Invalid asset id' });
    const [row] = await db`SELECT mime, bytes FROM question_assets WHERE id = ${id}`;
    if (!row) return reply.status(404).send({ error: 'Asset not found' });
    reply.header('Content-Type', row.mime);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.send(row.bytes);
  });
}
```

- [ ] **Step 3: Register the routes**

In `apps/api/src/app.ts`, add an import and a `register` call mirroring the
existing ones (use prefix `/assets`):

```ts
import { assetRoutes } from './routes/assets.js';
// ...
await app.register(assetRoutes, { prefix: '/assets' });
```

- [ ] **Step 4: Verify the API builds**

Run: `npm run build --workspace=apps/api`
Expected: PASS (tsc, no errors).

- [ ] **Step 5: Smoke test against the running dev server**

With `npm run dev` running, upload a tiny PNG and fetch it back:
```bash
# create a 1x1 png
printf '\x89PNG\r\n\x1a\n' > /tmp/x.png
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
curl -s -X POST http://localhost:3001/assets -H "Authorization: Bearer $TOKEN" -F file=@/tmp/x.png
```
Expected: `{"assetId":"<uuid>"}`. Then `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3001/assets/<uuid>` → `200 image/png`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/assets.ts apps/api/src/app.ts
git commit -m "feat(api): question image asset upload + serve (Postgres bytea)"
```

---

## Phase 6 — API: questions CRUD on the unified model

### Task 7: Rewrite create/update/list/export/import in `routes/questions.ts`

**Files:**
- Modify: `apps/api/src/routes/questions.ts`

- [ ] **Step 1: Replace the body schemas**

Replace `questionBodySchema` and `questionUpdateSchema` with a type-aware schema.
At the top of the file add:

```ts
import { validateQuestionContent } from '../lib/question-schema.js';
import type { QuestionType } from '@dev-assessment/shared';

const questionBodySchema = z.object({
  technology_id: z.string().uuid(),
  difficulty: z.enum(['junior', 'mid', 'senior']),
  skill_area: z.string().min(1),
  type: z.enum(['single_choice', 'multi_select', 'true_false', 'matching', 'ordering', 'fill_blank']),
  content: z.record(z.string(), z.unknown()),
  answer_key: z.record(z.string(), z.unknown()),
  explanation: z.string().optional(),
});
```

(Delete the old `option_*`/`correct_option`/`text` fields and
`questionUpdateSchema`; updates re-send the full body — see Step 4.)

- [ ] **Step 2: Update the list + export queries to stop referencing dropped columns**

In `GET /` and `GET /export`, change the `search` filter from
`q.text ILIKE ...` to search the prompt text inside JSONB:

```ts
${search ? db`AND q.content->'prompt' @> '[]'::jsonb AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(q.content->'prompt') b
  WHERE b->>'type' = 'text' AND b->>'text' ILIKE ${'%' + search + '%'}
)` : db``}
```

In `GET /export`, replace the CSV builder so it only emits single_choice rows
(spec §7). Replace the `headers`/`dataRows` block with:

```ts
const headers = ['Technology', 'Difficulty', 'Skill Area', 'Type', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Explanation'];
const firstText = (content: any) =>
  (content?.prompt ?? []).find((b: any) => b.type === 'text')?.text ?? '';
const dataRows = (rows as unknown as Array<{
  tech_slug: string; technology_name: string; difficulty: string; skill_area: string;
  type: string; content: any; answer_key: any; explanation: string | null;
}>)
  .filter(q => q.type === 'single_choice')
  .map(q => {
    const opts = q.content?.options ?? [];
    const ci = q.answer_key?.correctIndex ?? 0;
    return [
      esc(q.tech_slug), esc(q.difficulty), esc(q.skill_area), esc('single_choice'),
      esc(firstText(q.content)),
      esc(opts[0] ?? ''), esc(opts[1] ?? ''), esc(opts[2] ?? ''), esc(opts[3] ?? ''),
      esc(['a', 'b', 'c', 'd'][ci] ?? 'a'),
      esc(q.explanation ?? ''),
    ].join(',');
  });
```

- [ ] **Step 3: Rewrite `POST /` to insert the unified model**

Replace the `POST /` handler body with:

```ts
app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
  const body = questionBodySchema.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  const check = validateQuestionContent(body.data.type as QuestionType, body.data.content, body.data.answer_key);
  if (!check.ok) return reply.status(400).send({ error: check.error });

  const familyId = uuidv4();
  const [question] = await db`
    INSERT INTO questions (
      family_id, version, technology_id, difficulty, skill_area,
      type, content, answer_key, explanation, created_by
    ) VALUES (
      ${familyId}, 1, ${body.data.technology_id}, ${body.data.difficulty},
      ${body.data.skill_area}, ${body.data.type}, ${db.json(body.data.content)},
      ${db.json(body.data.answer_key)}, ${body.data.explanation ?? null}, ${getAuthUser(request).id}
    )
    RETURNING *
  `;

  await logAudit({
    adminId: getAuthUser(request).id,
    action: 'question.create',
    entityType: 'question',
    entityId: question.id,
  });

  return reply.status(201).send(question);
});
```

> Note: `postgres` exposes JSON insertion as `db.json(value)` (same helper used
> in `candidate.ts` as `sql.json(...)`). Use `db.json` at the top-level `db`.

- [ ] **Step 4: Rewrite `PUT /:familyId` to version with the new columns**

Replace the merge + insert in `PUT /:familyId`. The body is the full
`questionBodySchema` (not partial). Replace the handler body with:

```ts
app.put('/:familyId', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
  const { familyId } = request.params as { familyId: string };
  const body = questionBodySchema.safeParse(request.body);
  if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

  const check = validateQuestionContent(body.data.type as QuestionType, body.data.content, body.data.answer_key);
  if (!check.ok) return reply.status(400).send({ error: check.error });

  const [current] = await db`
    SELECT version FROM questions WHERE family_id = ${familyId} AND is_latest = TRUE
  `;
  if (!current) return reply.status(404).send({ error: 'Question not found' });

  const [newVersion] = await db.begin(async (sql) => {
    await sql`UPDATE questions SET is_latest = FALSE WHERE family_id = ${familyId} AND is_latest = TRUE`;
    return sql`
      INSERT INTO questions (
        family_id, version, technology_id, difficulty, skill_area,
        type, content, answer_key, explanation, created_by
      ) VALUES (
        ${familyId}, ${current.version + 1}, ${body.data.technology_id}, ${body.data.difficulty},
        ${body.data.skill_area}, ${body.data.type}, ${sql.json(body.data.content)},
        ${sql.json(body.data.answer_key)}, ${body.data.explanation ?? null}, ${getAuthUser(request).id}
      )
      RETURNING *
    `;
  });

  await logAudit({
    adminId: getAuthUser(request).id,
    action: 'question.edit',
    entityType: 'question',
    entityId: newVersion.id,
    detail: { from_version: current.version, to_version: newVersion.version },
  });

  return reply.status(200).send(newVersion);
});
```

- [ ] **Step 5: Update `POST /import` to write single_choice content**

In the import handler, keep CSV parsing and the `rowSchema` (a/b/c/d) as-is, but
change the `INSERT` to build the unified model. Replace the insert inside the
loop with:

```ts
const content = {
  prompt: [{ type: 'text', text: validated.data.text }],
  options: [validated.data.option_a, validated.data.option_b, validated.data.option_c, validated.data.option_d],
};
const answer_key = { correctIndex: { a: 0, b: 1, c: 2, d: 3 }[validated.data.correct_option] };
const familyId = uuidv4();
await db`
  INSERT INTO questions (
    family_id, version, technology_id, difficulty, skill_area,
    type, content, answer_key, explanation, created_by
  ) VALUES (
    ${familyId}, 1, ${validated.data.technology_id}, ${validated.data.difficulty},
    ${validated.data.skill_area}, 'single_choice', ${db.json(content)}, ${db.json(answer_key)},
    ${validated.data.explanation ?? null}, ${getAuthUser(request).id}
  )
`;
imported++;
```

- [ ] **Step 6: Build the API**

Run: `npm run build --workspace=apps/api`
Expected: PASS. Fix any remaining references to `q.text`/`option_*` the compiler
flags.

- [ ] **Step 7: Smoke test create + list against dev server**

```bash
# (reuse $TOKEN from Task 6 step 5)
curl -s -X POST http://localhost:3001/questions -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{
  "technology_id":"<a real tech id>","difficulty":"mid","skill_area":"DAX","type":"ordering",
  "content":{"prompt":[{"type":"text","text":"Order the ETL steps"}],"items":["Extract","Transform","Load"]},
  "answer_key":{"order":[0,1,2]}
}' -w "\nHTTP %{http_code}\n"
```
Get a real tech id via `curl -s http://localhost:3001/technologies -H "Authorization: Bearer $TOKEN"`.
Expected: HTTP 201 with the created row (type=ordering, content/answer_key JSONB).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routes/questions.ts
git commit -m "feat(api): question CRUD/list/export/import on unified multi-type model"
```

---

## Phase 7 — API: candidate session, submit, answer sheets

### Task 8: Candidate session — shuffle + strip answer_key

**Files:**
- Modify: `apps/api/src/routes/candidate.ts`

- [ ] **Step 1: Import the shuffle helper and add a content sanitizer**

At the top of `candidate.ts` add:

```ts
import { seededShuffle } from '../lib/rng.js';
import { gradeAnswer } from '../lib/grade-answer.js';
import { responseSchemaFor } from '../lib/question-schema.js';
import type { QuestionType } from '@dev-assessment/shared';
```

Add a helper near the top of the module (after `DURATION_MS`):

```ts
/**
 * Produce candidate-safe content: drop the answer_key, and for matching/ordering
 * shuffle the order-bearing arrays deterministically (per link seed + question id)
 * so the stored correct order is never revealed. Indices in ShuffledItem.idx are
 * the ORIGINAL indices the candidate submits back.
 */
function toCandidateContent(type: QuestionType, content: any, seed: string, qid: string) {
  if (type === 'matching') {
    const right = content.right.map((text: string, idx: number) => ({ idx, text }));
    return { prompt: content.prompt, left: content.left, right: seededShuffle(right, `${seed}:${qid}`) };
  }
  if (type === 'ordering') {
    const items = content.items.map((text: string, idx: number) => ({ idx, text }));
    return { prompt: content.prompt, items: seededShuffle(items, `${seed}:${qid}`) };
  }
  // single_choice / multi_select keep options as-is; true_false / fill_blank just prompt
  return content;
}
```

- [ ] **Step 2: Update the pool query and the returned question shape**

In `GET /session/:token`, change the pool `SELECT` to fetch the new columns:

```ts
const pool = await db`
  SELECT id, type, content, skill_area
  FROM questions
  WHERE technology_id = ${link.technology_id}
    AND difficulty = ${link.difficulty}
    AND is_active = TRUE
    AND is_latest = TRUE
  ORDER BY id
`;
```

After `const questions = seededSample(pool, link.num_questions, link.seed);`, map
to candidate-safe shape (both the `created` and `active` return branches use this
`questions` variable, so transform once before them):

```ts
const safeQuestions = (questions as unknown as Array<{ id: string; type: QuestionType; content: any; skill_area: string }>)
  .map((q) => ({
    id: q.id,
    type: q.type,
    skill_area: q.skill_area,
    content: toCandidateContent(q.type, q.content, link.seed, q.id),
  }));
```

Replace `questions` with `safeQuestions` in both `reply.status(200).send({ ... })`
calls.

- [ ] **Step 3: Build**

Run: `npm run build --workspace=apps/api`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/candidate.ts
git commit -m "feat(api): candidate session serves type-aware, shuffled, key-stripped questions"
```

### Task 9: Candidate submit — per-type validation + grading

**Files:**
- Modify: `apps/api/src/routes/candidate.ts`

- [ ] **Step 1: Replace the submit schema**

Replace `submitSchema` with a loose shape (per-question validation happens after
we know each question's type):

```ts
const submitSchema = z.object({
  answers: z.record(z.string().uuid(), z.unknown()),
});
```

- [ ] **Step 2: Validate each response against its question's type**

In `POST /submit/:token`, after the existing valid-IDs check and before the
transaction, fetch the types and validate responses. Replace the per-id loop that
only checked `validIds` with one that also fetches type + answer_key:

```ts
const typeRows = await db`
  SELECT id, type, answer_key
  FROM questions
  WHERE id = ANY(${Object.keys(body.data.answers)}::uuid[])
`;
const qmeta = new Map<string, { type: QuestionType; answer_key: any }>(
  (typeRows as unknown as Array<{ id: string; type: QuestionType; answer_key: any }>)
    .map((r) => [r.id, { type: r.type, answer_key: r.answer_key }])
);

for (const [qid, resp] of Object.entries(body.data.answers)) {
  if (!validIds.has(qid)) return reply.status(400).send({ error: `Invalid question ID: ${qid}` });
  const meta = qmeta.get(qid);
  if (!meta) return reply.status(400).send({ error: `Unknown question ID: ${qid}` });
  if (!responseSchemaFor(meta.type).safeParse(resp).success) {
    return reply.status(400).send({ error: `Malformed answer for question ${qid}` });
  }
}
```

- [ ] **Step 3: Store JSONB answers and grade with `gradeAnswer`**

Inside the transaction, change the answer upsert to write JSONB:

```ts
for (const [questionId, answer] of Object.entries(body.data.answers)) {
  await sql`
    INSERT INTO candidate_answers (link_id, question_id, answer)
    VALUES (${link.id}, ${questionId}, ${sql.json(answer as object)})
    ON CONFLICT (link_id, question_id)
    DO UPDATE SET answer = EXCLUDED.answer, submitted_at = NOW()
  `;
}
```

Replace the grading `SELECT` + correctness computation. Fetch type/answer_key and
grade per row:

```ts
const rows = await sql`
  SELECT ca.question_id, ca.answer AS response, q.type, q.answer_key, q.skill_area
  FROM candidate_answers ca
  JOIN questions q ON q.id = ca.question_id
  WHERE ca.link_id = ${link.id}
`;

const graded = (rows as unknown as Array<{ response: any; type: QuestionType; answer_key: any; skill_area: string }>)
  .map((r) => ({ skill_area: r.skill_area, correct: gradeAnswer(r.type, r.answer_key, r.response) }));

const totalQuestions = graded.length;
const correctCount = graded.filter((g) => g.correct).length;
scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
pass = scorePct >= link.pass_threshold_pct;

const skillMap = new Map<string, { correct: number; total: number }>();
for (const g of graded) {
  const entry = skillMap.get(g.skill_area) ?? { correct: 0, total: 0 };
  entry.total += 1;
  if (g.correct) entry.correct += 1;
  skillMap.set(g.skill_area, entry);
}
const skillAreaScores = Object.fromEntries(
  [...skillMap.entries()].map(([skill_area, { correct, total }]) => [
    skill_area, { correct, total, pct: Math.round((correct / total) * 100) },
  ])
);
```

(The `time_taken_seconds` calc and the `submission_results` insert below stay
exactly as they are.)

- [ ] **Step 4: Build**

Run: `npm run build --workspace=apps/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/candidate.ts
git commit -m "feat(api): grade candidate submissions per type with gradeAnswer"
```

### Task 10: Answer sheets (candidate results + admin detail)

**Files:**
- Modify: `apps/api/src/routes/candidate.ts` (GET /results/:token)
- Modify: `apps/api/src/routes/submissions.ts` (GET /:linkId)

- [ ] **Step 1: Candidate results answer sheet**

In `candidate.ts` `GET /results/:token`, replace the `answerSheet` query with the
type-aware shape:

```ts
const answerSheet = await db`
  SELECT
    q.type,
    q.content,
    q.answer_key,
    ca.answer AS response,
    q.skill_area
  FROM candidate_answers ca
  JOIN questions q ON q.id = ca.question_id
  WHERE ca.link_id = ${link.id}
  ORDER BY q.skill_area, q.id
`;
```

Then compute `is_correct` in JS before sending (import `gradeAnswer` is already
added in Task 9). Map rows:

```ts
const sheet = (answerSheet as unknown as Array<{ type: QuestionType; content: any; answer_key: any; response: any; skill_area: string }>)
  .map((r) => ({ ...r, is_correct: gradeAnswer(r.type, r.answer_key, r.response) }));
```

Send `answer_sheet: sheet`.

- [ ] **Step 2: Admin submission detail answer sheet**

In `submissions.ts` `GET /:linkId`, replace the `answerSheet` query the same way,
adding `q.family_id, q.version`, and import `gradeAnswer`:

```ts
import { gradeAnswer } from '../lib/grade-answer.js';
import type { QuestionType } from '@dev-assessment/shared';
// ...
const answerSheet = await db`
  SELECT q.family_id, q.version, q.type, q.content, q.answer_key,
         ca.answer AS response, q.skill_area
  FROM candidate_answers ca
  JOIN questions q ON q.id = ca.question_id
  WHERE ca.link_id = ${linkId}
  ORDER BY q.skill_area, q.id
`;
const sheet = (answerSheet as unknown as Array<{ family_id: string; version: number; type: QuestionType; content: any; answer_key: any; response: any; skill_area: string }>)
  .map((r) => ({ ...r, is_correct: gradeAnswer(r.type, r.answer_key, r.response) }));
```

Send `answer_sheet: sheet`.

- [ ] **Step 3: Build + run all API tests**

Run: `npm run build --workspace=apps/api && npm run test --workspace=apps/api`
Expected: build PASS; all tests PASS (rng, grade-answer, question-schema, plus any
existing question-query/slug tests).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/candidate.ts apps/api/src/routes/submissions.ts
git commit -m "feat(api): type-aware answer sheets for candidate + admin"
```

---

## Phase 8 — Web: shared prompt renderer

### Task 11: `PromptRenderer`

**Files:**
- Create: `apps/web/src/components/question/PromptRenderer.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import type { Block } from '@dev-assessment/shared';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Renders a question stimulus (text / code / image blocks) top-to-bottom. */
export function PromptRenderer({ prompt }: { prompt: Block[] }) {
  return (
    <div className="space-y-3">
      {prompt.map((b, i) => {
        if (b.type === 'text') {
          return <p key={i} className="text-sm text-foreground whitespace-pre-wrap">{b.text}</p>;
        }
        if (b.type === 'code') {
          return (
            <pre key={i} className="text-xs bg-muted/20 border border-border rounded-md p-3 overflow-x-auto">
              <code data-lang={b.lang}>{b.code}</code>
            </pre>
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={`${apiBase}/assets/${b.assetId}`} alt={b.alt}
               className="max-w-full rounded-md border border-border" />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify the web app type-checks**

Run: `npm run build --workspace=apps/web`
(If `build` is heavy, `npx tsc --noEmit -p apps/web/tsconfig.json` is enough.)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/question/PromptRenderer.tsx
git commit -m "feat(web): PromptRenderer for text/code/image stimulus blocks"
```

---

## Phase 9 — Web: admin authoring

> Frontend has no component-test harness, so these tasks verify via `tsc`/build
> and manual checks in the running dev app (`npm run dev`, login admin /
> `admin@example.com` / `Admin1234!`).

### Task 12: `StimulusBuilder` (blocks + image upload)

**Files:**
- Create: `apps/web/src/components/question/StimulusBuilder.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import type { Block } from '@dev-assessment/shared';
import { api } from '@/lib/api';

export function StimulusBuilder({ value, onChange }: { value: Block[]; onChange: (b: Block[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const update = (i: number, b: Block) => onChange(value.map((x, j) => (j === i ? b : x)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = (b: Block) => onChange([...value, b]);

  async function uploadImage(file: File) {
    setUploading(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/assets', fd);
      add({ type: 'image', assetId: r.data.assetId, alt: file.name });
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Upload failed');
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-3 border border-border rounded-md p-3">
      <div className="text-sm font-medium text-foreground/80">Question stimulus</div>
      {value.map((b, i) => (
        <div key={i} className="flex gap-2 items-start">
          {b.type === 'text' && (
            <textarea rows={2} value={b.text} onChange={(e) => update(i, { type: 'text', text: e.target.value })}
              placeholder="Text (use ___ for fill-in-the-blank gaps)"
              className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          )}
          {b.type === 'code' && (
            <div className="flex-1 space-y-1">
              <input value={b.lang} onChange={(e) => update(i, { ...b, lang: e.target.value })}
                placeholder="language (e.g. sql, dax)" className="w-40 px-2 py-1 border border-border rounded text-xs" />
              <textarea rows={4} value={b.code} onChange={(e) => update(i, { ...b, code: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-xs font-mono" />
            </div>
          )}
          {b.type === 'image' && (
            <div className="flex-1 text-xs text-muted">Image: {b.alt} ({b.assetId.slice(0, 8)}…)</div>
          )}
          <button type="button" onClick={() => remove(i)} className="text-xs text-red-600 hover:underline">remove</button>
        </div>
      ))}
      <div className="flex gap-2 text-xs">
        <button type="button" onClick={() => add({ type: 'text', text: '' })} className="px-2 py-1 border border-border rounded">+ Text</button>
        <button type="button" onClick={() => add({ type: 'code', lang: '', code: '' })} className="px-2 py-1 border border-border rounded">+ Code</button>
        <label className="px-2 py-1 border border-border rounded cursor-pointer">
          {uploading ? 'Uploading…' : '+ Image'}
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </label>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/question/StimulusBuilder.tsx
git commit -m "feat(web): StimulusBuilder — text/code/image blocks with upload"
```

### Task 13: Per-type editor bodies

**Files:**
- Create: `apps/web/src/components/question/editors/types.ts`
- Create: `apps/web/src/components/question/editors/SingleChoiceEditor.tsx`
- Create: `apps/web/src/components/question/editors/MultiSelectEditor.tsx`
- Create: `apps/web/src/components/question/editors/TrueFalseEditor.tsx`
- Create: `apps/web/src/components/question/editors/MatchingEditor.tsx`
- Create: `apps/web/src/components/question/editors/OrderingEditor.tsx`
- Create: `apps/web/src/components/question/editors/FillBlankEditor.tsx`

- [ ] **Step 1: Shared editor prop type**

Create `apps/web/src/components/question/editors/types.ts`:

```ts
import type { QuestionContent, AnswerKey } from '@dev-assessment/shared';

export interface EditorProps {
  content: QuestionContent;
  answerKey: AnswerKey;
  onChange: (content: QuestionContent, answerKey: AnswerKey) => void;
}
```

- [ ] **Step 2: SingleChoiceEditor**

`SingleChoiceEditor.tsx` — options list + a "correct" radio:

```tsx
'use client';
import type { EditorProps } from './types';
import type { SingleChoiceContent, SingleChoiceKey } from '@dev-assessment/shared';

export function SingleChoiceEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as SingleChoiceContent;
  const k = answerKey as SingleChoiceKey;
  const setOpt = (i: number, v: string) =>
    onChange({ ...c, options: c.options.map((o, j) => (j === i ? v : o)) }, k);
  const add = () => onChange({ ...c, options: [...c.options, ''] }, k);
  const remove = (i: number) =>
    onChange({ ...c, options: c.options.filter((_, j) => j !== i) },
             { correctIndex: k.correctIndex > i ? k.correctIndex - 1 : k.correctIndex });
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="sc-correct" checked={k.correctIndex === i}
            onChange={() => onChange(c, { correctIndex: i })} />
          <input value={o} onChange={(e) => setOpt(i, e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" placeholder={`Option ${i + 1}`} />
          {c.options.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Option</button>
    </div>
  );
}
```

- [ ] **Step 3: MultiSelectEditor**

Same as SingleChoice but checkboxes toggling membership in `correctIndices`:

```tsx
'use client';
import type { EditorProps } from './types';
import type { MultiSelectContent, MultiSelectKey } from '@dev-assessment/shared';

export function MultiSelectEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as MultiSelectContent;
  const k = answerKey as MultiSelectKey;
  const toggle = (i: number) => {
    const has = k.correctIndices.includes(i);
    onChange(c, { correctIndices: has ? k.correctIndices.filter((x) => x !== i) : [...k.correctIndices, i] });
  };
  const setOpt = (i: number, v: string) => onChange({ ...c, options: c.options.map((o, j) => (j === i ? v : o)) }, k);
  const add = () => onChange({ ...c, options: [...c.options, ''] }, k);
  const remove = (i: number) => onChange(
    { ...c, options: c.options.filter((_, j) => j !== i) },
    { correctIndices: k.correctIndices.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) },
  );
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="checkbox" checked={k.correctIndices.includes(i)} onChange={() => toggle(i)} />
          <input value={o} onChange={(e) => setOpt(i, e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" placeholder={`Option ${i + 1}`} />
          {c.options.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Option</button>
    </div>
  );
}
```

- [ ] **Step 4: TrueFalseEditor**

```tsx
'use client';
import type { EditorProps } from './types';
import type { TrueFalseKey } from '@dev-assessment/shared';

export function TrueFalseEditor({ content, answerKey, onChange }: EditorProps) {
  const k = answerKey as TrueFalseKey;
  return (
    <div className="flex gap-4">
      {[true, false].map((v) => (
        <label key={String(v)} className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="radio" name="tf" checked={k.correct === v} onChange={() => onChange(content, { correct: v })} />
          {v ? 'True' : 'False'}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: MatchingEditor**

Left/right rows; correct pairing is left[i] ↔ right[i] (answer_key.map = i→i):

```tsx
'use client';
import type { EditorProps } from './types';
import type { MatchingContent } from '@dev-assessment/shared';

export function MatchingEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as MatchingContent;
  const sync = (left: string[], right: string[]) => {
    const map: Record<string, number> = {};
    left.forEach((_, i) => { map[String(i)] = i; });
    onChange({ ...c, left, right }, { map });
  };
  const setLeft = (i: number, v: string) => sync(c.left.map((x, j) => (j === i ? v : x)), c.right);
  const setRight = (i: number, v: string) => sync(c.left, c.right.map((x, j) => (j === i ? v : x)));
  const add = () => sync([...c.left, ''], [...c.right, '']);
  const remove = (i: number) => sync(c.left.filter((_, j) => j !== i), c.right.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Each row is a correct pair; the right column is shuffled for candidates.</p>
      {c.left.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={l} onChange={(e) => setLeft(i, e.target.value)} placeholder={`Left ${i + 1}`}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          <span className="text-muted">↔</span>
          <input value={c.right[i] ?? ''} onChange={(e) => setRight(i, e.target.value)} placeholder={`Right ${i + 1}`}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          {c.left.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Pair</button>
    </div>
  );
}
```

- [ ] **Step 6: OrderingEditor**

Items entered in correct order (answer_key.order = [0,1,2,…]):

```tsx
'use client';
import type { EditorProps } from './types';
import type { OrderingContent } from '@dev-assessment/shared';

export function OrderingEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as OrderingContent;
  const sync = (items: string[]) => onChange({ ...c, items }, { order: items.map((_, i) => i) });
  const setItem = (i: number, v: string) => sync(c.items.map((x, j) => (j === i ? v : x)));
  const add = () => sync([...c.items, '']);
  const remove = (i: number) => sync(c.items.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Enter items in the CORRECT order; candidates see them shuffled.</p>
      {c.items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted w-5">{i + 1}.</span>
          <input value={it} onChange={(e) => setItem(i, e.target.value)} placeholder={`Item ${i + 1}`}
            className="flex-1 px-3 py-2 border border-border rounded-md text-sm" />
          {c.items.length > 2 && <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">×</button>}
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs px-2 py-1 border border-border rounded">+ Item</button>
    </div>
  );
}
```

- [ ] **Step 7: FillBlankEditor**

Blanks derived from `___` markers in the stimulus text; one accepted-answers row
per marker:

```tsx
'use client';
import { useEffect } from 'react';
import type { EditorProps } from './types';
import type { FillBlankContent, FillBlankKey, Block } from '@dev-assessment/shared';

const countMarkers = (prompt: Block[]) =>
  prompt.reduce((n, b) => n + (b.type === 'text' ? (b.text.match(/___/g)?.length ?? 0) : 0), 0);

export function FillBlankEditor({ content, answerKey, onChange }: EditorProps) {
  const c = content as FillBlankContent;
  const k = answerKey as FillBlankKey;
  const markerCount = countMarkers(c.prompt);

  // keep blanks array length in sync with marker count
  useEffect(() => {
    if (k.blanks.length !== markerCount) {
      const blanks = Array.from({ length: markerCount }, (_, i) => k.blanks[i] ?? { accepted: [''] });
      onChange(c, { blanks });
    }
  }, [markerCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAccepted = (i: number, csv: string) =>
    onChange(c, { blanks: k.blanks.map((b, j) => (j === i ? { accepted: csv.split(',').map((s) => s.trim()).filter(Boolean) } : b)) });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Add <code>___</code> markers in the stimulus text above. {markerCount} blank(s) detected.</p>
      {k.blanks.map((b, i) => (
        <div key={i}>
          <label className="block text-xs text-foreground/70 mb-1">Blank {i + 1} — accepted answers (comma-separated)</label>
          <input value={b.accepted.join(', ')} onChange={(e) => setAccepted(i, e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm" placeholder="COUNTROWS, COUNTROWS()" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/question/editors
git commit -m "feat(web): per-type question editor bodies"
```

### Task 14: Rewrite `QuestionForm` with a type picker + dispatch

**Files:**
- Modify: `apps/web/src/components/ui/QuestionForm.tsx`
- Modify: `apps/web/src/app/(admin)/questions/new/page.tsx`
- Modify: `apps/web/src/app/(admin)/questions/[familyId]/edit/page.tsx`

- [ ] **Step 1: Define per-type empty defaults + rewrite QuestionForm**

Replace the entire `QuestionForm.tsx` with a version whose value is
`{ technology_id, difficulty, skill_area, type, content, answer_key, explanation }`
and which renders the shared meta fields + `StimulusBuilder` (bound to
`content.prompt`) + the dispatched per-type editor. Full file:

```tsx
'use client';

import { useState } from 'react';
import type { Technology, QuestionType, QuestionContent, AnswerKey, Block } from '@dev-assessment/shared';
import { StimulusBuilder } from '@/components/question/StimulusBuilder';
import { SingleChoiceEditor } from '@/components/question/editors/SingleChoiceEditor';
import { MultiSelectEditor } from '@/components/question/editors/MultiSelectEditor';
import { TrueFalseEditor } from '@/components/question/editors/TrueFalseEditor';
import { MatchingEditor } from '@/components/question/editors/MatchingEditor';
import { OrderingEditor } from '@/components/question/editors/OrderingEditor';
import { FillBlankEditor } from '@/components/question/editors/FillBlankEditor';

export interface QuestionFormValues {
  technology_id: string;
  difficulty: string;
  skill_area: string;
  type: QuestionType;
  content: QuestionContent;
  answer_key: AnswerKey;
  explanation: string;
}

interface Props {
  initialValues?: Partial<QuestionFormValues>;
  onSubmit: (data: QuestionFormValues) => void;
  isLoading: boolean;
  technologies: Technology[];
  currentVersion?: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single choice', multi_select: 'Multiple select', true_false: 'True / False',
  matching: 'Matching', ordering: 'Ordering', fill_blank: 'Fill in the blank',
};

function emptyFor(type: QuestionType): { content: QuestionContent; answer_key: AnswerKey } {
  const prompt: Block[] = [{ type: 'text', text: '' }];
  switch (type) {
    case 'single_choice': return { content: { prompt, options: ['', ''] }, answer_key: { correctIndex: 0 } };
    case 'multi_select':  return { content: { prompt, options: ['', ''] }, answer_key: { correctIndices: [] } };
    case 'true_false':    return { content: { prompt }, answer_key: { correct: true } };
    case 'matching':      return { content: { prompt, left: ['', ''], right: ['', ''] }, answer_key: { map: { '0': 0, '1': 1 } } };
    case 'ordering':      return { content: { prompt, items: ['', ''] }, answer_key: { order: [0, 1] } };
    case 'fill_blank':    return { content: { prompt }, answer_key: { blanks: [] } };
  }
}

const EDITORS = {
  single_choice: SingleChoiceEditor, multi_select: MultiSelectEditor, true_false: TrueFalseEditor,
  matching: MatchingEditor, ordering: OrderingEditor, fill_blank: FillBlankEditor,
} as const;

export function QuestionForm({ initialValues, onSubmit, isLoading, technologies, currentVersion }: Props) {
  const initialType = (initialValues?.type ?? 'single_choice') as QuestionType;
  const seed = initialValues?.content && initialValues?.answer_key
    ? { content: initialValues.content, answer_key: initialValues.answer_key }
    : emptyFor(initialType);

  const [values, setValues] = useState<QuestionFormValues>({
    technology_id: initialValues?.technology_id ?? '',
    difficulty: initialValues?.difficulty ?? 'mid',
    skill_area: initialValues?.skill_area ?? '',
    type: initialType,
    content: seed.content,
    answer_key: seed.answer_key,
    explanation: initialValues?.explanation ?? '',
  });
  const [error, setError] = useState('');

  const Editor = EDITORS[values.type];

  function changeType(type: QuestionType) {
    const fresh = emptyFor(type);
    // preserve the prompt the author already wrote
    setValues((v) => ({ ...v, type, content: { ...fresh.content, prompt: v.content.prompt }, answer_key: fresh.answer_key }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.technology_id || !values.skill_area) { setError('Technology and skill area are required'); return; }
    if (!values.content.prompt.some((b) => b.type !== 'text' || b.text.trim())) { setError('Add some question stimulus'); return; }
    setError('');
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {currentVersion && (
        <p className="text-sm text-[var(--brand)] bg-[rgb(var(--brand-rgb))]/10 px-3 py-2 rounded">
          Editing v{currentVersion} — saving will create v{currentVersion + 1}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Technology</label>
          <select value={values.technology_id} onChange={(e) => setValues((v) => ({ ...v, technology_id: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md text-sm">
            <option value="">Select...</option>
            {technologies.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Difficulty</label>
          <select value={values.difficulty} onChange={(e) => setValues((v) => ({ ...v, difficulty: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md text-sm">
            <option value="junior">Junior</option><option value="mid">Mid</option><option value="senior">Senior</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Skill Area</label>
          <input value={values.skill_area} onChange={(e) => setValues((v) => ({ ...v, skill_area: e.target.value }))}
            placeholder="e.g. DAX" className="w-full px-3 py-2 border border-border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
          <select value={values.type} onChange={(e) => changeType(e.target.value as QuestionType)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm">
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      <StimulusBuilder value={values.content.prompt} onChange={(prompt) => setValues((v) => ({ ...v, content: { ...v.content, prompt } }))} />

      <div className="border border-border rounded-md p-3">
        <div className="text-sm font-medium text-foreground/80 mb-2">Answer — {TYPE_LABELS[values.type]}</div>
        <Editor content={values.content} answerKey={values.answer_key}
          onChange={(content, answer_key) => setValues((v) => ({ ...v, content, answer_key }))} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">Explanation (optional)</label>
        <textarea rows={2} value={values.explanation} onChange={(e) => setValues((v) => ({ ...v, explanation: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-md text-sm" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isLoading}
        className="px-6 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md hover:bg-[var(--brand)]/90 disabled:opacity-50">
        {isLoading ? 'Saving…' : 'Save Question'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Fix the `new` and `edit` pages to the new value type**

In `questions/new/page.tsx`, change the `handleSubmit` signature to
`(data: QuestionFormValues)` (import the type) — the `api.post('/questions', data)`
body already matches the new shape. In `questions/[familyId]/edit/page.tsx`, ensure
it passes `initialValues` including `type`, `content`, `answer_key` from the loaded
question, and `PUT`s the full `QuestionFormValues`.

```ts
import type { QuestionFormValues } from '@/components/ui/QuestionForm';
// new/page.tsx
async function handleSubmit(data: QuestionFormValues) { /* api.post('/questions', data) ... */ }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS. Resolve any leftover references to `QuestionForm`'s old value shape.

- [ ] **Step 4: Manual check in the running app**

With `npm run dev` up: go to `/questions/new`, pick each type, build a prompt with a
code block and an image, fill the answer editor, Save. Confirm it appears in the
list and re-opening Edit repopulates correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/QuestionForm.tsx "apps/web/src/app/(admin)/questions/new/page.tsx" "apps/web/src/app/(admin)/questions/[familyId]/edit/page.tsx"
git commit -m "feat(web): type-aware QuestionForm with stimulus builder + per-type editors"
```

---

## Phase 10 — Web: candidate experience

### Task 15: Per-type candidate inputs

**Files:**
- Create: `apps/web/src/components/question/candidate/types.ts`
- Create: `apps/web/src/components/question/candidate/SingleChoiceInput.tsx`
- Create: `apps/web/src/components/question/candidate/MultiSelectInput.tsx`
- Create: `apps/web/src/components/question/candidate/TrueFalseInput.tsx`
- Create: `apps/web/src/components/question/candidate/MatchingInput.tsx`
- Create: `apps/web/src/components/question/candidate/OrderingInput.tsx`
- Create: `apps/web/src/components/question/candidate/FillBlankInput.tsx`
- Create: `apps/web/src/components/question/candidate/CandidateQuestionView.tsx`

- [ ] **Step 1: Shared candidate input prop type**

`candidate/types.ts`:

```ts
import type { CandidateContent, AnswerResponse } from '@dev-assessment/shared';

export interface CandidateInputProps {
  content: CandidateContent;
  value: AnswerResponse | undefined;
  onChange: (r: AnswerResponse) => void;
}
```

- [ ] **Step 2: SingleChoiceInput / MultiSelectInput / TrueFalseInput**

```tsx
// SingleChoiceInput.tsx
'use client';
import type { CandidateInputProps } from './types';
import type { SingleChoiceResp } from '@dev-assessment/shared';
export function SingleChoiceInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { options: string[] };
  const v = value as SingleChoiceResp | undefined;
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <label key={i} className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-3 py-2">
          <input type="radio" name="ans" checked={v?.index === i} onChange={() => onChange({ index: i })} />{o}
        </label>
      ))}
    </div>
  );
}
```

```tsx
// MultiSelectInput.tsx
'use client';
import type { CandidateInputProps } from './types';
import type { MultiSelectResp } from '@dev-assessment/shared';
export function MultiSelectInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { options: string[] };
  const v = (value as MultiSelectResp | undefined)?.indices ?? [];
  const toggle = (i: number) => onChange({ indices: v.includes(i) ? v.filter((x) => x !== i) : [...v, i] });
  return (
    <div className="space-y-2">
      {c.options.map((o, i) => (
        <label key={i} className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-3 py-2">
          <input type="checkbox" checked={v.includes(i)} onChange={() => toggle(i)} />{o}
        </label>
      ))}
    </div>
  );
}
```

```tsx
// TrueFalseInput.tsx
'use client';
import type { CandidateInputProps } from './types';
import type { TrueFalseResp } from '@dev-assessment/shared';
export function TrueFalseInput({ value, onChange }: CandidateInputProps) {
  const v = value as TrueFalseResp | undefined;
  return (
    <div className="flex gap-3">
      {[true, false].map((b) => (
        <label key={String(b)} className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-4 py-2">
          <input type="radio" name="tf" checked={v?.value === b} onChange={() => onChange({ value: b })} />{b ? 'True' : 'False'}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: MatchingInput (per-left dropdown of shuffled rights)**

```tsx
'use client';
import type { CandidateInputProps } from './types';
import type { MatchingResp, ShuffledItem } from '@dev-assessment/shared';
export function MatchingInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { left: string[]; right: ShuffledItem[] };
  const map = (value as MatchingResp | undefined)?.map ?? {};
  const set = (li: number, ri: number) => onChange({ map: { ...map, [String(li)]: ri } });
  return (
    <div className="space-y-2">
      {c.left.map((l, li) => (
        <div key={li} className="flex items-center gap-2">
          <span className="flex-1 text-sm">{l}</span>
          <select value={map[String(li)] ?? ''} onChange={(e) => set(li, Number(e.target.value))}
            className="px-2 py-1 border border-border rounded text-sm">
            <option value="">Select…</option>
            {c.right.map((r) => <option key={r.idx} value={r.idx}>{r.text}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: OrderingInput (up/down reorder of shuffled items)**

Uses simple move-up/move-down buttons (no drag lib dependency). The submitted
`order` is the sequence of original `idx` values.

```tsx
'use client';
import { useState, useEffect } from 'react';
import type { CandidateInputProps } from './types';
import type { OrderingResp, ShuffledItem } from '@dev-assessment/shared';
export function OrderingInput({ content, value, onChange }: CandidateInputProps) {
  const c = content as { items: ShuffledItem[] };
  // local arrangement of ShuffledItem; initialise from the shuffled display order
  const [arr, setArr] = useState<ShuffledItem[]>(c.items);
  useEffect(() => {
    const order = (value as OrderingResp | undefined)?.order;
    if (order) setArr(order.map((idx) => c.items.find((it) => it.idx === idx)!).filter(Boolean));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (next: ShuffledItem[]) => { setArr(next); onChange({ order: next.map((it) => it.idx) }); };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= arr.length) return;
    const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; commit(next);
  };
  return (
    <div className="space-y-2">
      {arr.map((it, i) => (
        <div key={it.idx} className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
          <span className="text-xs text-muted w-5">{i + 1}.</span>
          <span className="flex-1 text-sm">{it.text}</span>
          <button type="button" onClick={() => move(i, -1)} className="text-xs px-1">▲</button>
          <button type="button" onClick={() => move(i, 1)} className="text-xs px-1">▼</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: FillBlankInput (inputs rendered inline at each `___`)**

```tsx
'use client';
import type { CandidateInputProps } from './types';
import type { FillBlankResp, Block } from '@dev-assessment/shared';

export function FillBlankInput({ content, value, onChange }: CandidateInputProps) {
  const prompt = (content as { prompt: Block[] }).prompt;
  const values = (value as FillBlankResp | undefined)?.values ?? [];
  // flatten text blocks, splitting on ___, to render inline inputs in order
  let blankIdx = -1;
  const setVal = (i: number, v: string) => {
    const next = [...values];
    while (next.length <= i) next.push('');
    next[i] = v; onChange({ values: next });
  };
  return (
    <div className="text-sm leading-8">
      {prompt.filter((b) => b.type === 'text').map((b, bi) => {
        const parts = (b as { text: string }).text.split('___');
        return (
          <span key={bi}>
            {parts.map((p, pi) => (
              <span key={pi}>
                {p}
                {pi < parts.length - 1 && (() => { blankIdx++; const i = blankIdx; return (
                  <input value={values[i] ?? ''} onChange={(e) => setVal(i, e.target.value)}
                    className="inline-block mx-1 px-2 py-0.5 border-b-2 border-border focus:border-[var(--brand)] outline-none text-sm" />
                ); })()}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: CandidateQuestionView — prompt + dispatch**

```tsx
'use client';
import type { CandidateQuestion, AnswerResponse, Block } from '@dev-assessment/shared';
import { PromptRenderer } from '../PromptRenderer';
import { SingleChoiceInput } from './SingleChoiceInput';
import { MultiSelectInput } from './MultiSelectInput';
import { TrueFalseInput } from './TrueFalseInput';
import { MatchingInput } from './MatchingInput';
import { OrderingInput } from './OrderingInput';
import { FillBlankInput } from './FillBlankInput';
import type { CandidateInputProps } from './types';

const INPUTS: Record<CandidateQuestion['type'], (p: CandidateInputProps) => JSX.Element> = {
  single_choice: SingleChoiceInput, multi_select: MultiSelectInput, true_false: TrueFalseInput,
  matching: MatchingInput, ordering: OrderingInput, fill_blank: FillBlankInput,
};

export function CandidateQuestionView({ question, value, onChange }: {
  question: CandidateQuestion; value: AnswerResponse | undefined; onChange: (r: AnswerResponse) => void;
}) {
  const Input = INPUTS[question.type];
  const prompt = (question.content as { prompt: Block[] }).prompt;

  // fill_blank renders its OWN inline inputs over the prompt's text blocks, so we
  // must not render those text blocks again via PromptRenderer (it would duplicate
  // the text). Show only the non-text blocks (code/image) above the input.
  if (question.type === 'fill_blank') {
    const nonText = prompt.filter((b) => b.type !== 'text');
    return (
      <div className="space-y-4">
        {nonText.length > 0 && <PromptRenderer prompt={nonText} />}
        <Input content={question.content} value={value} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PromptRenderer prompt={prompt} />
      <Input content={question.content} value={value} onChange={onChange} />
    </div>
  );
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/question/candidate
git commit -m "feat(web): per-type candidate inputs + CandidateQuestionView"
```

### Task 16: Wire `CandidateQuestionView` into the test page

**Files:**
- Modify: `apps/web/src/app/(candidate)/test/[token]/page.tsx`

- [ ] **Step 1: Read the current page**

Run: `cat "apps/web/src/app/(candidate)/test/[token]/page.tsx"`
Identify (a) where a question's options are currently rendered (the a/b/c/d radio
block) and (b) the local answers state shape `Record<string, 'a'|'b'|'c'|'d'>`.

- [ ] **Step 2: Change the answers state type**

Change the answers state from `Record<string, 'a'|'b'|'c'|'d'>` to
`Record<string, AnswerResponse>` (import `AnswerResponse`, `CandidateQuestion`).
Update the localStorage persistence type (`LocalSession.answers` already matches).

- [ ] **Step 3: Replace the option-rendering block**

Replace the inline a/b/c/d radio markup with:

```tsx
<CandidateQuestionView
  question={current as CandidateQuestion}
  value={answers[current.id]}
  onChange={(r) => setAnswers((a) => ({ ...a, [current.id]: r }))}
/>
```

(`current` is the currently displayed question object from the session.) Import
`CandidateQuestionView` from `@/components/question/candidate/CandidateQuestionView`.

- [ ] **Step 4: Update the "answered?" indicator**

Any logic that checked `answers[id] !== undefined` still works. If progress relies
on truthiness of a letter, ensure it now checks `answers[id] != null`.

- [ ] **Step 5: Submit payload**

The submit call posts `{ answers }`. The shape is now
`Record<string, AnswerResponse>`, which the API (Task 9) expects. No change beyond
the state type.

- [ ] **Step 6: Type-check + manual run**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS. Then with `npm run dev`, create a test link covering a tech that
has each new type, open the candidate URL, answer each type, submit. Confirm the
Pass/Fail screen appears and the score is sensible.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/src/app/(candidate)/test/[token]/page.tsx"
git commit -m "feat(web): candidate test page renders all question types"
```

---

## Phase 11 — Web: results, answer sheet, question list

### Task 17: Type-aware answer-sheet display

**Files:**
- Create: `apps/web/src/components/question/AnswerSheetItem.tsx`
- Modify: `apps/web/src/app/(candidate)/test/[token]/results/page.tsx`
- Modify: `apps/web/src/app/(admin)/submissions/[linkId]/page.tsx` (admin submission detail)

- [ ] **Step 1: Find the admin answer-sheet renderer**

Run: `grep -rln "answer_sheet\|option_a\|correct_option" apps/web/src`
The answer-sheet renderers are `app/(candidate)/test/[token]/results/page.tsx` and
`app/(admin)/submissions/[linkId]/page.tsx`; both must move off `option_*`.

- [ ] **Step 2: Create `AnswerSheetItem`**

Render, per row: the prompt (via `PromptRenderer`), a compact rendering of the
candidate's response vs. the correct answer, and a ✓/✗ from `is_correct`.

```tsx
'use client';
import type { AnswerSheetRow, Block } from '@dev-assessment/shared';
import { PromptRenderer } from './PromptRenderer';

function describe(row: AnswerSheetRow): { yours: string; correct: string } {
  const c = row.content as any; const k = row.answer_key as any; const r = row.response as any;
  switch (row.type) {
    case 'single_choice': return { yours: c.options?.[r?.index] ?? '—', correct: c.options?.[k.correctIndex] ?? '' };
    case 'multi_select': return {
      yours: (r?.indices ?? []).map((i: number) => c.options[i]).join(', ') || '—',
      correct: (k.correctIndices ?? []).map((i: number) => c.options[i]).join(', '),
    };
    case 'true_false': return { yours: r ? String(r.value) : '—', correct: String(k.correct) };
    case 'matching': return {
      yours: c.left.map((l: string, i: number) => `${l}→${c.right[r?.map?.[i]] ?? '?'}`).join('; '),
      correct: c.left.map((l: string, i: number) => `${l}→${c.right[k.map[i]]}`).join('; '),
    };
    case 'ordering': return {
      yours: (r?.order ?? []).map((i: number) => c.items[i]).join(' → ') || '—',
      correct: k.order.map((i: number) => c.items[i]).join(' → '),
    };
    case 'fill_blank': return {
      yours: (r?.values ?? []).join(' | ') || '—',
      correct: k.blanks.map((b: any) => b.accepted[0]).join(' | '),
    };
  }
}

export function AnswerSheetItem({ row }: { row: AnswerSheetRow }) {
  const { yours, correct } = describe(row);
  const prompt = (row.content as { prompt: Block[] }).prompt;
  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{row.type.replace('_', ' ')} · {row.skill_area}</span>
        <span className={row.is_correct ? 'text-green-600' : 'text-red-600'}>{row.is_correct ? '✓ Correct' : '✗ Incorrect'}</span>
      </div>
      <PromptRenderer prompt={prompt} />
      <p className="text-sm"><span className="text-muted">Your answer:</span> {yours}</p>
      {!row.is_correct && <p className="text-sm"><span className="text-muted">Correct:</span> {correct}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Use it in both results pages**

In the candidate results page and the admin submission-detail page, replace the
existing per-row markup with `{answer_sheet.map((row, i) => <AnswerSheetItem key={i} row={row} />)}`.
Remove references to `option_a..d`/`correct_option`/`candidate_answer`.

- [ ] **Step 4: Type-check + manual**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS. Manually open a submitted result (candidate + admin) and confirm
each type renders correct vs. given answers.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/question/AnswerSheetItem.tsx "apps/web/src/app/(candidate)/test/[token]/results/page.tsx" <admin detail page path>
git commit -m "feat(web): type-aware answer sheet rendering"
```

### Task 18: Question list — Type column + prompt preview

**Files:**
- Modify: `apps/web/src/app/(admin)/questions/page.tsx`

- [ ] **Step 1: Add a derived preview + Type column**

Where the list renders each question's `text`, replace with a helper that reads the
first text block of `content.prompt`:

```ts
const promptPreview = (q: Question) =>
  (q.content?.prompt ?? []).find((b) => b.type === 'text')?.text ?? '(no text)';
```

Add a **Type** column to the table header and each row (`q.type.replace('_',' ')`),
and use `promptPreview(q)` wherever `q.text` was shown.

- [ ] **Step 2: Type-check + manual**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS. Confirm the list shows a Type column and readable previews for all
types.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(admin)/questions/page.tsx"
git commit -m "feat(web): question list shows Type column + prompt preview"
```

---

## Phase 12 — Verification & release

### Task 19: Full build + test sweep

- [ ] **Step 1: API tests + build**

Run: `npm run test --workspace=apps/api && npm run build --workspace=apps/api`
Expected: all tests PASS; build PASS.

- [ ] **Step 2: Web build**

Run: `npm run build --workspace=apps/web`
Expected: PASS (no type errors, no `option_*` references remain).

- [ ] **Step 3: End-to-end manual pass (running app)**

With `npm run dev`: as admin, author one question of **each** of the six types
(include an image and a code block in at least one prompt). Create a test config +
link for that technology/difficulty. Open the candidate link, answer all, submit.
Verify: Pass/Fail screen, score matches your answers, and both candidate and admin
answer sheets render correctly per type.

- [ ] **Step 4: Commit any fixes, then bump the version**

Per the project's versioning (README + git tag — see memory), update the README
version line to **v1.5** and note multi-type questions. Commit:

```bash
git add README.md
git commit -m "docs: document v1.5 — multi-type questions"
```

### Task 20: Self-review against the spec

- [ ] **Step 1:** Re-read `docs/superpowers/specs/2026-06-17-multi-type-questions-design.md`
  §3–§8 and confirm every item maps to a completed task. Note any gaps and address
  them before declaring done.
- [ ] **Step 2:** Use `superpowers:requesting-code-review` (or `/code-review`) on the
  branch diff before merging.

---

## Notes for the implementer

- **JSON insertion:** `postgres` uses `sql.json(value)` / `db.json(value)` to bind a
  JS object to a `JSONB` column (already used in `candidate.ts`). Reads come back as
  parsed objects — no `JSON.parse` needed.
- **Indices are canonical everywhere server-side.** The only place "display order"
  exists is the candidate UI; `ShuffledItem.idx` carries the original index, and the
  candidate submits original indices, so the grader never un-shuffles.
- **No down-migration.** `0005` is one-way (spec §9). The dev Neon DB is the first to
  run it; deploy is build-verify-then-push-to-Render.
- **Deferred (NOT in scope):** hotspot, drag-to-zone, gap-match, numeric, partial
  credit, code sandbox, reviewer workflow. The `type` enum + JSONB model leave room
  for them later.
```
