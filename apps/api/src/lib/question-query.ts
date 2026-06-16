import { z } from 'zod';

// Accepts the literal "all" or a 1..100 integer; defaults to 25.
export const pageSizeSchema = z
  .union([z.literal('all'), z.coerce.number().int().min(1).max(100)])
  .default(25);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Parse a comma-separated family_id list for scoped export. Returns null when absent.
export function parseExportIds(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  for (const id of ids) {
    if (!UUID_RE.test(id)) throw new Error(`Invalid family_id: ${id}`);
  }
  return ids;
}
