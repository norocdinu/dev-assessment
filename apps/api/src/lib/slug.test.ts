import { describe, it, expect } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Power BI')).toBe('power-bi');
  });
  it('strips non-alphanumerics and collapses separators', () => {
    expect(slugify('Salesforce  Marketing_Cloud!!')).toBe('salesforce-marketing-cloud');
  });
  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Data Engineering--  ')).toBe('data-engineering');
  });
  it('returns empty string for all-symbol input', () => {
    expect(slugify('@#$%')).toBe('');
  });
});
