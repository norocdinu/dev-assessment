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
