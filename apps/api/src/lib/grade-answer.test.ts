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
