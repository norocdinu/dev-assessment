import seedrandom from 'seedrandom';
import crypto from 'crypto';

/**
 * Derives a deterministic seed from a test config ID and a link token.
 * Same inputs always produce the same seed — ensures the same link shows
 * the same questions regardless of when it is accessed.
 */
export function deriveSeed(testConfigId: string, linkToken: string): string {
  return crypto
    .createHash('sha256')
    .update(`${testConfigId}:${linkToken}`)
    .digest('hex');
}

/**
 * Fisher-Yates shuffle using a seeded RNG.
 * Selects `count` items from `pool` deterministically.
 * Same seed + same pool always returns the same selection in the same order.
 */
export function seededSample<T>(pool: T[], count: number, seed: string): T[] {
  if (count >= pool.length) return [...pool];
  const rng = seedrandom(seed);
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, count);
}
