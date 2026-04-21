import { describe, it, expect } from 'vitest';
import { deriveSeed, seededSample } from './rng.js';

describe('deriveSeed', () => {
  it('is deterministic — same inputs, same output', () => {
    const a = deriveSeed('test-1', 'token-abc');
    const b = deriveSeed('test-1', 'token-abc');
    expect(a).toBe(b);
  });

  it('differs for different tokens', () => {
    expect(deriveSeed('test-1', 'token-abc')).not.toBe(deriveSeed('test-1', 'token-xyz'));
  });

  it('differs for different test config IDs', () => {
    expect(deriveSeed('test-1', 'token-abc')).not.toBe(deriveSeed('test-2', 'token-abc'));
  });

  it('returns a non-empty hex string', () => {
    const seed = deriveSeed('test-1', 'token-abc');
    expect(seed).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('seededSample', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('returns the correct count', () => {
    expect(seededSample(pool, 4, 'seed-a')).toHaveLength(4);
  });

  it('is deterministic — same seed, same selection and order', () => {
    const a = seededSample(pool, 4, 'seed-a');
    const b = seededSample(pool, 4, 'seed-a');
    expect(a).toEqual(b);
  });

  it('differs for different seeds', () => {
    const a = seededSample(pool, 4, 'seed-a');
    const b = seededSample(pool, 4, 'seed-b');
    expect(a).not.toEqual(b);
  });

  it('never returns duplicates', () => {
    const result = seededSample(pool, 7, 'seed-c');
    expect(new Set(result).size).toBe(7);
  });

  it('returns all items when count >= pool size', () => {
    expect(seededSample(pool, 20, 'seed-x')).toHaveLength(10);
  });

  it('returns a copy — does not mutate the original pool', () => {
    const original = [...pool];
    seededSample(pool, 5, 'seed-mut');
    expect(pool).toEqual(original);
  });
});
