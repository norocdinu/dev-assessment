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
