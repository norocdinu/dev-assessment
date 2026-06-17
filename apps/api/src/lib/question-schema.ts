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
