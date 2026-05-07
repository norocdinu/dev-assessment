# Pitfalls Research — v1.1

> Grounded in the actual v1.0 codebase. Every pitfall references a real file or pattern found in the code.

---

## RBAC Extension Pitfalls

### Pitfall: Incomplete `requireRole` coverage when adding 'member'

**Risk:** The new `member` role gets a JWT and can reach endpoints that currently have no
`requireRole` guard at all — because those endpoints were written assuming only `owner` and
`reviewer` existed and therefore didn't bother restricting. In this codebase
`GET /admin/submissions` (`submissions.ts` line 115), `GET /admin/stats/:testConfigId`
(`stats.ts` line 12), and `GET /test-configs` (`test-configs.ts` line 23) use only
`authMiddleware` with no role check. If `member` should be read-only, this is fine; if
`member` must be excluded from certain views, these unguarded routes are holes.

**Prevention:** Before adding the new role, produce an exhaustive list of every
`preHandler: [authMiddleware]` call that has *no* companion `requireRole`. Decide
explicitly for each whether a `member` may reach it. Guard or annotate every one.
Create a lint rule or grep test that fails the build if `authMiddleware` appears without
a co-located comment like `// any-role-ok`.

---

### Pitfall: DB CHECK constraint blocks INSERT for the new role

**Risk:** The `admin_users` table has `CHECK (role IN ('owner', 'reviewer'))` (schema.sql
line 9). Inserting a user with `role = 'member'` will throw a PostgreSQL constraint
violation. Because the migrate runner only applies additive SQL (Phase 2, Phase 3) and has
no ALTER TABLE path for this column, there is no migration that widens the constraint.
The app code change alone — adding `'member'` to `requireRole` calls — does nothing until
the DB is migrated.

**Prevention:** Write a Phase 5 migration that runs
`ALTER TABLE admin_users DROP CONSTRAINT <name>; ALTER TABLE admin_users ADD CONSTRAINT ...
CHECK (role IN ('owner', 'reviewer', 'member'));` — or if the constraint is unnamed,
use `ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (...) NOT VALID`
then validate. Wire it into the migrate.ts phase-detection pattern already used for Phase 2
and Phase 3 (check for table/column existence before applying).

---

### Pitfall: JWT tokens issued before the role change remain valid

**Risk:** An existing `owner` or `reviewer` with an active 8-hour JWT (configured via
`JWT_EXPIRES_IN`, auth.ts line 35) would still carry their old role claim after a
role change. If an owner is demoted to `member`, their in-flight token still passes
`requireRole('owner')`. There is no token revocation mechanism — no token blacklist,
no version counter in the DB, no short-lived refresh cycle.

**Prevention:** For v1.1 the pragmatic fix is to keep JWT TTL at 8 h and document that
role changes take up to 8 h to propagate, and require the affected user to log out
manually. If same-session demotion is a real risk, add a `token_version` integer to
`admin_users` and include it in the JWT payload; `authMiddleware` then queries the DB
to compare versions and rejects stale tokens. This is a single indexed lookup and avoids
a full Redis blocklist.

---

### Pitfall: Frontend role checks diverge from backend role checks

**Risk:** The frontend derives `isOwner` by calling `GET /auth/me` and comparing
`user.role === 'owner'` (questions/page.tsx line 207, test-configs/page.tsx line 41).
If the new `member` role is added to the DB and backend but the frontend only checks for
`'owner'`, member users will see all action buttons (Edit, Delete, Import) even though
the API will 403 them. Conversely, if frontend checks are widened to include `'member'`
before backend is updated, members appear to have power they can't actually exercise.

**Prevention:** Derive permitted-action sets from a single authoritative source. Define a
helper `canEdit(role)` / `canDelete(role)` in the shared package (`packages/shared/src`)
and import it in both the API middleware and the Next.js pages. Any future role change
then has one place to update. In the interim, update the `AdminUser` type
(`shared/types/index.ts` line 47) to include `'member'` as a valid literal so TypeScript
flags any `=== 'owner'` exhaustiveness gaps.

---

## Charts in Next.js 14 Pitfalls

### Pitfall: Charting library crashes during SSR

**Risk:** Recharts, Chart.js, and ECharts all reference `window`, `document`, or
`ResizeObserver` at module load time. In Next.js 14 App Router, Server Components render
on the server — any chart component imported directly into a Server Component or a page
that is not marked `'use client'` will throw a `ReferenceError: window is not defined`
at build time or on first server render.

**Prevention:** Wrap every chart component in `dynamic(() => import('./MyChart'),
{ ssr: false })`. Put all chart components in a dedicated file with `'use client'` at
the top, then `dynamic`-import that file from the parent page. The existing submissions
page (`submissions/page.tsx` line 1) already uses `'use client'` — any new analytics
page must follow the same pattern. Do not assume `'use client'` alone is sufficient;
`ssr: false` is still required for library code that runs outside the component
lifecycle.

---

### Pitfall: Chart re-instantiates on every navigation

**Risk:** Next.js App Router keeps the layout mounted but re-renders child pages on
route changes. A chart component that builds its dataset inside `useEffect` with a
wide dependency array (or no `useMemo`) will destroy and rebuild the canvas context on
every visit to the analytics page. This causes a visible flicker and can trigger
Recharts' internal ResizeObserver to fire multiple times, producing console warnings or
duplicate animation runs.

**Prevention:** Memoize derived chart data with `useMemo` keyed on the raw API response,
not on transient UI state. The existing stats panel on `submissions/page.tsx` (lines
229–232) already uses `useMemo` for `maxBucket` — apply the same pattern to any
`<BarChart>` or `<LineChart>` data arrays. If the chart data is fetched on mount, keep
the fetch result in state and only recompute derived series when that state changes.

---

### Pitfall: Missing loading boundary causes layout shift around charts

**Risk:** Charts typically have a defined height (e.g. `height={300}` on a Recharts
`<ResponsiveContainer>`). While data loads, if nothing reserves that space, the page
collapses and then jumps when the chart mounts — this is a Cumulative Layout Shift
problem. The current stats panel avoids this by showing a text placeholder; a full
chart implementation must do the same.

**Prevention:** Render a fixed-height skeleton `<div>` with the same dimensions as the
chart while `statsLoading` is true. Do not conditionally render the chart's wrapping
`<div>` — always render the container, just swap its contents.

---

## Analytics Query Pitfalls

### Pitfall: Per-skill breakdown computed in application code over many rows

**Risk:** The current `stats.ts` route returns aggregated score buckets in a single SQL
query. The v1.1 analytics dashboard will need per-skill-area breakdowns across many
submissions. The naive approach — fetch all `submission_results` rows and iterate over
`skill_area_scores` JSONB in TypeScript — becomes an N-row scan in application memory
and sends potentially megabytes of JSONB to the API process. With 500 submissions of 20
questions each, this is 10,000 JSONB objects unpacked in Node.

**Prevention:** Use PostgreSQL's `jsonb_each` to aggregate skill scores server-side:

```sql
SELECT
  skill->>'area'          AS skill_area,
  AVG((skill->>'pct')::int) AS avg_pct
FROM submission_results sr
JOIN test_links tl ON tl.id = sr.link_id,
LATERAL jsonb_each(sr.skill_area_scores) AS kv(key, skill)
WHERE tl.test_config_id = $1
GROUP BY skill_area
ORDER BY skill_area;
```

Return only the aggregated rows to the client. This is consistent with the existing
pattern in `stats.ts` that does all aggregation in SQL.

---

### Pitfall: Missing index on `test_links.test_config_id` for GROUP BY queries

**Risk:** The analytics queries all filter by `tl.test_config_id`. The index
`idx_test_links_config ON test_links (test_config_id)` exists (schema.sql line 92) but
`submission_results` has only an index on `link_id` (schema.sql line 115). A query that
joins `submission_results` → `test_links` and groups by `test_config_id` will use a
nested-loop or hash join. As submission counts grow, this scan covers all
`submission_results` rows to filter by config.

**Prevention:** The join path `submission_results.link_id → test_links.id →
test_links.test_config_id` is already indexed on both sides (`idx_submission_results_link`
and `idx_test_links_config`). Verify with `EXPLAIN ANALYZE` before shipping. If per-skill
JSONB aggregation is added, also run `EXPLAIN` on the `jsonb_each` lateral join query —
JSONB key scanning has no index support and always does a row-level scan.

---

### Pitfall: Returning raw `skill_area_scores` JSONB to the client for client-side aggregation

**Risk:** Each `submission_results` row stores a JSONB map of skill areas to
`{correct, total, pct}`. If the analytics page fetches a paginated list of submissions
and then aggregates skill scores in the browser (summing correct/total per skill across
rows), it only aggregates the current page — the other pages are missing. The UI will
show incorrect cross-submission skill averages.

**Prevention:** Aggregate server-side as described above. Never compute cross-submission
statistics from a paginated client-side dataset. The compare feature
(`/admin/submissions/compare`) correctly fetches individual records for comparison; the
analytics dashboard is a different use case that requires a dedicated aggregation
endpoint.

---

## Deletion Cascade Pitfalls

### Pitfall: Deleting a submission leaves the compare URL functional but broken

**Risk:** The compare page (`compare/page.tsx`) reads UUIDs from the query string and
calls `GET /admin/submissions/compare?ids=...`. The compare route
(`submissions.ts` lines 70–112) returns a 404 if any `link_id` is missing. A user who
bookmarks or shares a compare URL and then one of those submissions is deleted will get
a generic "Failed to load comparison data" error with no explanation. The URL itself
still looks valid.

**Prevention:** The compare endpoint already returns the index of the missing submission
(`ids[missingIndex]`). Surface that detail in the error UI — "One or more submissions in
this comparison have been deleted." When deleting a submission, consider whether to
invalidate or redirect known compare URLs, or at minimum document that deletion breaks
existing compare links.

---

### Pitfall: Missing confirmation UX leads to accidental deletion

**Risk:** The existing soft-delete for test configs uses `confirm(...)` (test-configs/
page.tsx line 37). For submission deletion, the consequence is permanent and audit-visible
(unlike soft-delete). A bare `confirm()` dialog is dismissible by accident (Enter key,
click anywhere on modal background in some browsers). There is no undo.

**Prevention:** Implement a dedicated modal that requires typing the word "delete" or
clicking a high-contrast destructive button after a deliberate hover. The codebase
already uses `sonner` for toasts — show an undo-within-N-seconds toast pattern only if
the deletion is soft (state change); for hard deletes show a modal with an explicit
confirmation step. Ensure the delete action is `owner`-only on both the backend
(requires `requireRole('owner')`) and hidden from the UI for `reviewer`/`member` roles.

---

### Pitfall: Deletion does not invalidate the cached stats

**Risk:** The `GET /admin/stats/:testConfigId` endpoint recomputes KPIs from live rows
on every request — there is no explicit cache. However, a soft approach that marks
`test_links.state` without deleting rows would produce inconsistent counts if state is
filtered. For hard deletion of a `submission_results` row + its `test_links` row, the
stats endpoint recalculates correctly because the rows are gone. The pitfall arises if
deletion is implemented as a soft flag (`is_deleted`) added to `submission_results`
without updating the stats query to filter on it.

**Prevention:** If soft-delete is chosen (add `deleted_at TIMESTAMPTZ` to
`submission_results`), every query in `stats.ts` and `submissions.ts` must add
`AND sr.deleted_at IS NULL`. The safest approach for v1.1 is hard deletion with
cascade: `DELETE FROM submission_results WHERE link_id = $1` (which cascades via FK to
`test_links` after unlinking candidate_answers), so stats always reflect live data.
Write an integration test that: inserts a submission, checks stats, deletes it, checks
stats again — asserting the count decremented.

---

## CSV Round-Trip Pitfalls

### Pitfall: Export column order does not match import parser column order

**Risk:** The questions exporter (`questions.ts` lines 97–118) produces columns in this
order: `Technology, Difficulty, Skill Area, Question Text, Option A–D, Correct Option`.
The importer (`questions.ts` lines 375–381) parses columns by positional index and
expects: `technology_slug, difficulty, skill_area, text, option_a–d, correct_option,
explanation`. The exported "Technology" column contains the technology *name*
(e.g. "Power BI") while the importer expects the technology *slug* (e.g. "power-bi").
A round-trip export → import will fail on every row with "Unknown technology slug:
'Power BI'".

**Prevention:** Change the exporter to write `technology_slug` instead of
`technology_name` in the first column — joining to `technologies.slug` instead of
`technologies.name`. Add an integration test that exports a known question set and
re-imports the exact CSV bytes, asserting zero errors and correct row count.

---

### Pitfall: Multiline field values break the line-splitting step

**Risk:** The importer splits the CSV into lines with `text.split('\n')` (questions.ts
line 346). If any question text, option, or explanation contains a newline — which is
valid inside a quoted CSV field — the splitter breaks that field across multiple lines,
causing the `parseCsvLine` parser to see truncated rows. The custom `parseCsvLine`
correctly handles quoted fields *within a line* but never sees the continuation because
the line was already split before parsing.

**Prevention:** Replace the `split('\n')` pre-split with a proper streaming CSV tokenizer
that is newline-aware within quotes, or use a library like `csv-parse` (synchronous
`parse()` with `relax_column_count: false`). The export currently uses `\r\n` as a row
separator; make the importer split on `\r\n` first, then `\n` as a fallback, to handle
both. Add a test case with a question whose `text` field contains a literal newline.

---

### Pitfall: Excel BOM partially handled — only at file start, not after re-encoding

**Risk:** The importer strips a leading BOM with `.replace(/^﻿/, '')` (questions.ts
line 344). This handles the common case of an Excel-generated UTF-8 BOM at byte 0. It
does not handle: (a) UTF-16 LE BOM (`\xFF\xFE`) — the file would be read as garbled
text since `buffer.toString('utf-8')` is hardcoded; (b) a BOM that appears after
`Content-Type` sniffing changes the encoding mid-stream (rare but possible if a user
re-saves the file in a different editor).

**Prevention:** Detect the BOM before calling `toString`: if `buf[0] === 0xEF &&
buf[1] === 0xBB && buf[2] === 0xBF`, slice off 3 bytes and decode as UTF-8. If
`buf[0] === 0xFF && buf[1] === 0xFE`, decode as UTF-16 LE. For v1.1 scope, at minimum
document that only UTF-8 CSVs are supported and improve the error message when
non-UTF-8 bytes are detected (check for replacement characters `�` after decode).

---

### Pitfall: Import inserts each row in its own transaction, partial success on bulk upload

**Risk:** The importer loops over rows and calls `await db\`INSERT ...\`` per row
(questions.ts lines 401–418). Each insert succeeds or fails independently — there is no
wrapping transaction. A 100-row CSV with a bad row 50 will import 49 rows, report an
error for row 50, then continue importing rows 51–100. The caller receives
`{ imported: 99, errors: [{row: 50, ...}] }`. The DB is left in a state where 99 of
100 intended rows exist.

**Prevention:** Decide on atomicity policy upfront. Option A (all-or-nothing): wrap the
entire import loop in `db.begin(async sql => { ... })` and throw on first error, rolling
back the whole batch. Option B (current partial-success): keep as-is but add a
`dryRun` query parameter that validates all rows without inserting, allowing the client
to preview errors before committing. For v1.1, Option B is lower risk. Add a header to
the API response indicating partial success so the frontend toast shows
"Imported 99/100 rows — 1 error" rather than just the counts.
