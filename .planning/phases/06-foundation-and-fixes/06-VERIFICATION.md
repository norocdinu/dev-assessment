---
phase: 6
status: passed
verified_at: 2026-05-07
---

# Phase 6 Verification

## Must-Haves

### 06-01: DB Schema + Shared Types

| Check | Status | Evidence |
|-------|--------|----------|
| `admin_users.role` CHECK constraint accepts `'member'` | ✓ | `schema.sql` line 9: `CHECK (role IN ('owner', 'reviewer', 'member'))` |
| `test_links` table has a `candidate_name TEXT` column (nullable) | ✓ | `schema.sql` line 88: `candidate_name TEXT,` (no NOT NULL) |
| `packages/shared/src/types/index.ts` `AdminUser.role` is `'owner' \| 'reviewer' \| 'member'` | ✓ | `types/index.ts` line 47: `role: 'owner' \| 'reviewer' \| 'member';` — old narrower type absent |
| `migrate.ts` Phase 6 block detects and applies role constraint change on existing DBs | ✓ | `migrate.ts` lines 75–91: `information_schema.check_constraints` query + DROP/ADD CONSTRAINT |
| `migrate.ts` Phase 6 block detects and applies `candidate_name` column on existing DBs | ✓ | `migrate.ts` lines 93–108: `information_schema.columns` query + `ALTER TABLE test_links ADD COLUMN candidate_name TEXT` |
| `schema.sql` CREATE TABLE statements reflect final desired schema for fresh-DB installs | ✓ | Both changes present in CREATE TABLE blocks; Phase 6 comment block appended at end |

### 06-02: CSV Round-Trip Fix

| Check | Status | Evidence |
|-------|--------|----------|
| `GET /questions/export` emits `tech_slug` in column 1 (not display name) | ✓ | `questions.ts` line 82: `t.slug AS tech_slug`; line 111: `esc(q.tech_slug)` as first mapped column |
| `GET /questions/export` emits 10 columns including `Explanation` as column 10 | ✓ | `questions.ts` line 97: headers array has 10 entries ending with `'Explanation'`; line 120: `esc(q.explanation ?? '')` as 10th mapped value |
| `parseCsvLine` is replaced by `parseCsvText` (full-file multiline-safe parser) | ✓ | `questions.ts` line 428: `function parseCsvText(text: string): string[][]` present; `parseCsvLine` not found anywhere in file |
| Import uses `parseCsvText` via `allRows` (not line-split approach) | ✓ | `questions.ts` line 349: `const allRows = parseCsvText(text)`; line 350: `allRows.length < 2` guard; line 377: `const cols = allRows[i]` |
| Import maps tech slug column 1 to `technology_id` via `techMap` lookup | ✓ | `questions.ts` line 385: `const technology_id = techMap.get(techSlug)` where `techSlug` is `cols[0]` |
| TypeScript compiles without errors (`cd apps/api && npx tsc --noEmit`) | ✓ | Exit code 0, no output |

## Success Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| A CSV exported from the question bank imports back cleanly with 0 row errors | human_needed | Export now uses `tech_slug` (not display name), parser handles quoted multiline fields — code path is correct. Requires a running DB + real question data to confirm end-to-end. |
| `INSERT INTO admin_users (..., role) VALUES (..., 'member')` succeeds without constraint violation | human_needed | `schema.sql` and `migrate.ts` both encode the updated constraint. Requires a running DB to execute the INSERT. |
| `candidate_name` column exists in `test_links` and accepts a text value | human_needed | Present in `schema.sql` and `migrate.ts` ALTER TABLE. Requires a running DB to verify column presence and INSERT. |
| `AdminUser.role` type in shared package includes `'member'` without TypeScript errors | ✓ | `types/index.ts` line 47 confirmed; `npx tsc --noEmit` passes with exit code 0. |

## Human Verification Required

1. **CSV round-trip (FIX-01 end-to-end):** With a running DB and at least one question record:
   - Call `GET /admin/questions/export` with an owner token — download the CSV.
   - Verify column 1 contains a slug value (e.g. `power-bi`) not a display name.
   - Verify column 10 header is `Explanation`.
   - Call `POST /admin/questions/import` with the downloaded file — response should be `{ imported: N, errors: [] }`.
   - Repeat with a question whose text or options contain embedded newlines or double-quotes.

2. **`admin_users.role` constraint accepts `'member'`:**
   ```sql
   INSERT INTO admin_users (email, password_hash, role) VALUES ('member-test@example.com', 'hash', 'member');
   ```
   Should succeed. Also confirm the old values `'owner'` and `'reviewer'` still work.

3. **`candidate_name` column on `test_links`:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'test_links' AND column_name = 'candidate_name';
   -- Should return 1 row.
   INSERT INTO test_links (..., candidate_name) VALUES (..., 'Alice Smith');
   -- Should succeed.
   ```

4. **Migration idempotency:** Run `npx tsx src/db/migrate.ts` twice on an existing DB. Second run should log "already includes member — skipping" and "already present — skipping" for Phase 6 steps.

## Gaps Found

None. All code-level must-haves pass. No provably broken items found from code inspection.

## Summary

All six 06-01 must-haves and all five 06-02 must-haves are satisfied by the committed code. TypeScript compiles cleanly with exit code 0. The only remaining items require a live PostgreSQL instance to exercise the DB runtime paths (constraint enforcement, column presence, end-to-end CSV round-trip). These are marked `human_needed` and are not blockers for Phase 7 development to proceed — the schema, migration, and route logic are all correct at the code level.
