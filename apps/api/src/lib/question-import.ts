// Header-driven CSV import column mapping.
//
// The import endpoint must accept whatever the export endpoint produces. The
// export header is human-readable Title Case and includes a "Type" column,
// while older hand-authored files use snake_case headers with no Type. Mapping
// columns by *name* (instead of fixed position) lets a single importer accept
// both — and tolerate reordered or extra columns.

export type ImportField =
  | 'technology'
  | 'difficulty'
  | 'skill_area'
  | 'text'
  | 'option_a'
  | 'option_b'
  | 'option_c'
  | 'option_d'
  | 'correct_option'
  | 'explanation';

// Fields every import row must supply. "explanation" (and "type") are optional.
export const REQUIRED_IMPORT_FIELDS: ImportField[] = [
  'technology',
  'difficulty',
  'skill_area',
  'text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_option',
];

// Normalize a header cell for matching: lowercase, strip everything but
// alphanumerics. "Skill Area", "skill_area" and "skillArea" all collapse to
// "skillarea".
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Accepted header spellings → canonical field. Both the Title-Case export
// headers and the legacy snake_case headers are covered.
const HEADER_ALIASES: Record<string, ImportField> = {
  technology: 'technology',
  technologyslug: 'technology',
  difficulty: 'difficulty',
  skillarea: 'skill_area',
  questiontext: 'text',
  text: 'text',
  optiona: 'option_a',
  optionb: 'option_b',
  optionc: 'option_c',
  optiond: 'option_d',
  correctoption: 'correct_option',
  explanation: 'explanation',
};

export interface HeaderMap {
  index: Partial<Record<ImportField, number>>;
  missing: ImportField[];
}

// Build a field → column-index map from a header row. Unknown columns (e.g.
// "Type") are ignored. Reports any required fields the header is missing.
export function mapImportHeaders(headerRow: string[]): HeaderMap {
  const index: Partial<Record<ImportField, number>> = {};
  headerRow.forEach((cell, i) => {
    const field = HEADER_ALIASES[norm(cell)];
    if (field && index[field] === undefined) index[field] = i;
  });
  const missing = REQUIRED_IMPORT_FIELDS.filter((f) => index[f] === undefined);
  return { index, missing };
}

// Pull a single field's value out of a data row using the header map. Returns
// '' when the column is absent or the row is short, letting downstream
// validation produce a clear per-row error.
export function fieldValue(
  cols: string[],
  index: Partial<Record<ImportField, number>>,
  field: ImportField,
): string {
  const i = index[field];
  if (i === undefined) return '';
  return cols[i] ?? '';
}
