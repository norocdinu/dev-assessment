import { describe, it, expect } from 'vitest';
import { mapImportHeaders, fieldValue, REQUIRED_IMPORT_FIELDS } from './question-import.js';

describe('mapImportHeaders', () => {
  it('maps the Title-Case export header (with a Type column) by name', () => {
    const header = [
      'Technology', 'Difficulty', 'Skill Area', 'Type', 'Question Text',
      'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Explanation',
    ];
    const { index, missing } = mapImportHeaders(header);
    expect(missing).toEqual([]);
    // "Type" at position 3 must be ignored, so Question Text resolves to 4 (not 3).
    expect(index.text).toBe(4);
    expect(index.technology).toBe(0);
    expect(index.skill_area).toBe(2);
    expect(index.option_a).toBe(5);
    expect(index.correct_option).toBe(9);
    expect(index.explanation).toBe(10);
  });

  it('maps the legacy snake_case header with no Type column', () => {
    const header = [
      'technology_slug', 'difficulty', 'skill_area', 'text',
      'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation',
    ];
    const { index, missing } = mapImportHeaders(header);
    expect(missing).toEqual([]);
    expect(index.technology).toBe(0);
    expect(index.text).toBe(3);
    expect(index.correct_option).toBe(8);
  });

  it('tolerates reordered columns', () => {
    const header = ['Question Text', 'Technology', 'Correct Option', 'Difficulty',
      'Skill Area', 'Option A', 'Option B', 'Option C', 'Option D'];
    const { index, missing } = mapImportHeaders(header);
    expect(missing).toEqual([]);
    expect(index.text).toBe(0);
    expect(index.technology).toBe(1);
    expect(index.correct_option).toBe(2);
  });

  it('reports missing required fields and treats explanation as optional', () => {
    const header = ['Technology', 'Difficulty', 'Skill Area', 'Question Text',
      'Option A', 'Option B', 'Option C', 'Option D'];
    const { missing } = mapImportHeaders(header);
    expect(missing).toEqual(['correct_option']);
    expect(REQUIRED_IMPORT_FIELDS).not.toContain('explanation');
  });
});

describe('fieldValue', () => {
  const header = [
    'Technology', 'Difficulty', 'Skill Area', 'Type', 'Question Text',
    'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Explanation',
  ];
  const { index } = mapImportHeaders(header);

  it('pulls the value at the mapped column', () => {
    const row = ['power-bi', 'senior', 'DAX', 'single_choice', 'What does SUM do?',
      'a', 'b', 'c', 'd', 'b', 'because'];
    expect(fieldValue(row, index, 'technology')).toBe('power-bi');
    expect(fieldValue(row, index, 'text')).toBe('What does SUM do?');
    expect(fieldValue(row, index, 'correct_option')).toBe('b');
    expect(fieldValue(row, index, 'explanation')).toBe('because');
  });

  it('returns empty string for a short row or absent column', () => {
    expect(fieldValue(['power-bi'], index, 'text')).toBe('');
    expect(fieldValue([], index, 'technology')).toBe('');
  });
});
