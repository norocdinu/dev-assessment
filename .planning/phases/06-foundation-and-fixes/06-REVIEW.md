---
phase: 6
status: has_issues
depth: standard
files_reviewed: 4
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
reviewed_at: 2026-05-07
---

# Code Review — Phase 6: Foundation & Fixes

## Summary

The Phase 6 changes are largely correct and well-structured, but a missing `candidate_name` field in the `TestLink` shared type creates a silent type gap that will surface as runtime surprises in any consumer of that interface. The migration also has a narrow atomicity risk when updating the role CHECK constraint.

## Findings

### CR-001 (critical): TestLink interface missing candidate_name field

**File:** `packages/shared/src/types/index.ts:50`

**Issue:** The `TestLink` interface does not include the `candidate_name: string | null` field that was added to the `test_links` table in this phase. Any code that receives a DB row typed as `TestLink` (admin list views, link detail endpoints, result pages) will have no type-safe access to `candidate_name` — TypeScript will silently drop it and callers will get `undefined` at runtime when they expect a value or null.

**Fix:** Add `candidate_name: string | null;` to the `TestLink` interface:

```ts
export interface TestLink {
  id: string;
  test_config_id: string;
  token: string;
  state: 'created' | 'active' | 'submitted' | 'expired';
  expires_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  created_by: string;
  created_at: string;
  candidate_name: string | null;
}
```

---

### CR-002 (warning): Non-atomic role constraint migration — window of lost constraint

**File:** `apps/api/src/db/migrate.ts:86`

**Issue:** The Phase 6 migration drops the existing role CHECK constraint and then re-adds it in two separate statements with no wrapping transaction:

```ts
await db`ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check`;
await db`ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'reviewer', 'member'))`;
```

If the process crashes, the connection is lost, or any error occurs between these two statements, `admin_users.role` will have no CHECK constraint at all. Any value could be inserted into `role` until the migration is re-run, bypassing the role guard entirely.

**Fix:** Wrap both statements in a transaction:

```ts
await db.begin(async sql => {
  await sql`ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check`;
  await sql`ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'reviewer', 'member'))`;
});
```

---

### CR-003 (warning): check_clause LIKE detection may be fragile across PostgreSQL versions

**File:** `apps/api/src/db/migrate.ts:75`

**Issue:** The Phase 6 migration checks whether the role constraint already allows `'member'` by querying:

```sql
check_clause LIKE '%member%'
```

PostgreSQL stores the normalised form of CHECK constraints in `information_schema.check_constraints`, not the literal source text as written. Depending on the PostgreSQL version and settings, the stored clause may be `(role = ANY (ARRAY['owner'::text, 'reviewer'::text, 'member'::text]))` or similar. While the word `member` still appears in that form (making the LIKE match succeed), future PostgreSQL versions could use a different normal form. A more robust check would query the constraint by name and attempt to drop-and-recreate unconditionally inside a transaction, relying on `DROP CONSTRAINT IF EXISTS` for idempotency rather than the LIKE test.

**Fix:** Either verify the exact stored form on the target PG version and document it, or simplify to always run the drop+add inside a transaction (DROP IF EXISTS makes it safe to re-run):

```ts
// Always safe: DROP IF EXISTS + ADD in one transaction
await db.begin(async sql => {
  await sql`ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check`;
  await sql`ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'reviewer', 'member'))`;
});
console.log('Phase 6a: role constraint ensured');
```

This eliminates the detection query entirely and removes the fragility.

---

### CR-004 (warning): parseCsvText trims all cell values, silently mutating question content

**File:** `apps/api/src/routes/questions.ts:451,459`

**Issue:** `parseCsvText` calls `.trim()` on every cell value unconditionally (both in the comma-separator path and in the newline path). This means any question text, option text, or explanation that legitimately starts or ends with a space will have that whitespace stripped without warning. For free-text question content authored outside the system (e.g., code-block-style option text like `"  return x;"`) this is a silent data mutation on import. More practically, it also strips any padding that spreadsheet tools add around commas, which is usually the intent — but the right approach is to only trim unquoted cells.

**Fix:** Preserve the trimming for unquoted cells (where whitespace around the comma is formatting noise) but skip trimming for quoted cells where the content was deliberately bounded by quotes. Track whether the current cell was quoted:

```ts
let cellWasQuoted = false;

// When toggling inQuotes from false→true, mark the cell as quoted
// When pushing to row, push cell.trim() only if !cellWasQuoted
```

As a lower-risk minimal fix, at least document the behavior with a comment so future maintainers know it is intentional.

---

### CR-005 (info): schema.sql Phase 6 comment could mislead on fresh-install behaviour

**File:** `apps/api/src/db/schema.sql:125`

**Issue:** The comment at the end of `schema.sql` reads:

```sql
-- Phase 6: Member role + candidate_name
-- Applied via ALTER TABLE on existing DBs (see migrate.ts)
-- Included here as documentation of final schema intent
```

This is accurate, but a reader might interpret "Applied via ALTER TABLE" to mean the schema.sql does NOT include these changes for fresh installs. In fact, line 9 already has `CHECK (role IN ('owner', 'reviewer', 'member'))` and line 88 already has `candidate_name TEXT` in the `CREATE TABLE IF NOT EXISTS test_links` block, so fresh installs do get the Phase 6 schema. The comment is misleading because it implies schema.sql is not the source of truth for these columns on fresh databases.

**Fix:** Clarify the comment:

```sql
-- Phase 6: Member role + candidate_name
-- Already reflected above (line 9, line 88).
-- On existing DBs the ALTER TABLE path in migrate.ts applies these incrementally.
```

---

## Clean Files

No files are fully clean in this phase; all four files have at least one finding. The `types/index.ts` finding (CR-001) is the most impactful as it creates a silent type hole across the shared contract.
