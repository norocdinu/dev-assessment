import { describe, it, expect } from 'vitest';
import { pageSizeSchema, parseExportIds } from './question-query.js';

describe('pageSizeSchema', () => {
  it('defaults to 25 when missing', () => {
    expect(pageSizeSchema.parse(undefined)).toBe(25);
  });
  it('coerces numeric strings within range', () => {
    expect(pageSizeSchema.parse('50')).toBe(50);
  });
  it('accepts the literal "all"', () => {
    expect(pageSizeSchema.parse('all')).toBe('all');
  });
  it('rejects values over 100', () => {
    expect(() => pageSizeSchema.parse('500')).toThrow();
  });
});

describe('parseExportIds', () => {
  it('returns null for undefined/empty', () => {
    expect(parseExportIds(undefined)).toBeNull();
    expect(parseExportIds('')).toBeNull();
  });
  it('splits a comma-separated list of uuids', () => {
    const a = '11111111-1111-1111-1111-111111111111';
    const b = '22222222-2222-2222-2222-222222222222';
    expect(parseExportIds(`${a},${b}`)).toEqual([a, b]);
  });
  it('throws on a non-uuid entry', () => {
    expect(() => parseExportIds('not-a-uuid')).toThrow();
  });
});
