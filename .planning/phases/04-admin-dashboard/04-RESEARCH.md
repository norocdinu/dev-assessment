# Phase 4: Admin Dashboard & Export — Research

**Phase:** 4 — Admin Dashboard & Export
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, QBANK-03
**Status:** RESEARCH COMPLETE

---

## Validation Architecture

### What requires validation in this phase?
- **Submissions list filters** (DASH-01): Filter params (testConfigId, dateFrom, dateTo, difficulty) must be validated server-side before SQL injection into query — use `zod` schema matching existing question route pattern.
- **CSV export** (DASH-05): `testConfigId` query param must be a valid UUID; missing param returns 400.
- **CSV import** (QBANK-03): Per-row validation — each row checked against question field rules; partial import (valid rows in, invalid rows reported) is the spec.
- **Comparison** (DASH-03): Link IDs passed as query params (`?ids=a,b`) must be validated UUIDs that exist and have `submission_results`.

---

## 1. TanStack Table — Sorting & Filtering Extensions

**Current DataTable** (`apps/web/src/components/ui/DataTable.tsx`):
- Uses only `getCoreRowModel()` — no sorting, no filtering wired
- Accepts generic `columns: ColumnDef<T>[]` and `data: T[]`

**To add sorting + filtering, extend the component or use TanStack hooks at the page level:**

```tsx
// Page-level approach (preferred — keeps DataTable generic)
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

const [sorting, setSorting] = useState<SortingState>([{ id: 'submitted_at', desc: true }]);
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  state: { sorting, columnFilters },
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  enableSortingRemoval: false,
});
```

**Decision:** For the submissions page, do sorting and filtering **client-side** (v1 data volumes are small — CONTEXT.md D-02 confirms this). Fetch all submissions for a test config once, then TanStack handles sort/filter in-browser. This avoids server roundtrip complexity.

**Sortable click handler in column header:**
```tsx
header: ({ column }) => (
  <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
    Score % {column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : '↕'}
  </button>
),
```

**Column filter:** `column.setFilterValue(value)` triggers `getFilteredRowModel`. For the "test config" filter and "difficulty" filter, call this on the correct column accessor.

**Existing `@tanstack/react-table` version:** `^8.19.3` — `getSortedRowModel` and `getFilteredRowModel` are built-in, no additional install needed.

---

## 2. API Endpoints Needed

### 2a. `GET /admin/submissions` — Submissions List (DASH-01)

New route in `apps/api/src/routes/submissions.ts`:

```typescript
// Query params: testConfigId (optional), dateFrom, dateTo, difficulty
const listQuerySchema = z.object({
  testConfigId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),       // ISO date string
  dateTo: z.string().optional(),
  difficulty: z.enum(['junior','mid','senior']).optional(),
});
```

**SQL joins required:**
```sql
SELECT
  sr.score_pct,
  sr.pass,
  sr.time_taken_seconds,
  sr.graded_at,
  tl.id          AS link_id,
  tl.submitted_at,
  tl.test_config_id,
  tc.name        AS test_name,
  tc.difficulty,
  tc.pass_threshold_pct,
  t.name         AS technology_name
FROM submission_results sr
JOIN test_links    tl ON tl.id = sr.link_id
JOIN test_configs  tc ON tc.id = tl.test_config_id
JOIN technologies  t  ON t.id  = tc.technology_id
WHERE ($testConfigId IS NULL OR tl.test_config_id = $testConfigId)
  AND ($dateFrom IS NULL OR tl.submitted_at >= $dateFrom::timestamptz)
  AND ($dateTo   IS NULL OR tl.submitted_at <= $dateTo::timestamptz)
  AND ($difficulty IS NULL OR tc.difficulty = $difficulty)
ORDER BY tl.submitted_at DESC
```

**Response shape:**
```json
[{
  "link_id": "uuid",
  "test_name": "Power BI – Senior",
  "technology_name": "Power BI",
  "difficulty": "senior",
  "score_pct": 85,
  "pass": true,
  "time_taken_seconds": 1432,
  "submitted_at": "2026-04-28T10:00:00Z",
  "test_config_id": "uuid"
}]
```

### 2b. `GET /admin/submissions/export` — CSV Export (DASH-05)

**Route:** `GET /admin/submissions/export?testConfigId=<uuid>` (testConfigId required for export)

**CSV generation — no library needed.** Use manual string building:
```typescript
const headers = ['Test Name','Technology','Difficulty','Score %','Pass/Fail','Time (seconds)','Submitted At'];
const rows = submissions.map(s => [
  s.test_name,
  s.technology_name,
  s.difficulty,
  s.score_pct,
  s.pass ? 'Pass' : 'Fail',
  s.time_taken_seconds,
  s.submitted_at,
].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
const csv = [headers.join(','), ...rows].join('\r\n');
```

**Response headers:**
```typescript
reply.header('Content-Type', 'text/csv');
reply.header('Content-Disposition', `attachment; filename="submissions-${testConfigId}.csv"`);
return reply.send(csv);
```

**Frontend trigger:** `<a href="${API_URL}/admin/submissions/export?testConfigId=X" download>Export CSV</a>` — but since we need the auth cookie, must use `api.get('/admin/submissions/export?...')` with `responseType: 'blob'` and create object URL:
```typescript
const res = await api.get(`/admin/submissions/export?testConfigId=${id}`, { responseType: 'blob' });
const url = URL.createObjectURL(res.data);
const a = document.createElement('a');
a.href = url; a.download = 'submissions.csv'; a.click();
URL.revokeObjectURL(url);
```

### 2c. `GET /admin/stats/:testConfigId` — Aggregate Stats (DASH-04)

**SQL:**
```sql
SELECT
  COUNT(*)                                            AS total_submissions,
  ROUND(AVG(sr.score_pct))                           AS avg_score_pct,
  ROUND(COUNT(*) FILTER(WHERE sr.pass) * 100.0
        / NULLIF(COUNT(*),0))                         AS pass_rate_pct,
  -- Distribution buckets: 0-10, 11-20, ..., 91-100
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 0  AND 10)  AS bucket_0_10,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 11 AND 20)  AS bucket_11_20,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 21 AND 30)  AS bucket_21_30,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 31 AND 40)  AS bucket_31_40,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 41 AND 50)  AS bucket_41_50,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 51 AND 60)  AS bucket_51_60,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 61 AND 70)  AS bucket_61_70,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 71 AND 80)  AS bucket_71_80,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 81 AND 90)  AS bucket_81_90,
  COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 91 AND 100) AS bucket_91_100
FROM submission_results sr
JOIN test_links tl ON tl.id = sr.link_id
WHERE tl.test_config_id = $testConfigId
```

Can be embedded as a sub-route in the test-configs route or a new `/admin/stats` route. New route is cleaner.

### 2d. `GET /admin/submissions/compare` — Candidate Comparison (DASH-03)

**Query:** `?ids=linkId1,linkId2[,linkId3]`

Returns full submission details (same shape as existing `GET /admin/submissions/:linkId`) for each ID in parallel. Can reuse the existing per-ID query in a loop:

```typescript
const ids = (request.query as { ids: string }).ids.split(',').filter(Boolean);
// validate: each id is UUID, max 4 comparisons
const results = await Promise.all(ids.map(id => fetchSubmission(id, db)));
return results;
```

Or reuse the existing `:linkId` endpoint directly from the frontend by calling it once per selected candidate.

**Frontend approach (simpler):** `/admin/compare?ids=a,b` page fetches `GET /admin/submissions/:id` for each ID separately — no new backend route needed. Two parallel `api.get()` calls.

### 2e. `POST /admin/questions/import` — Bulk CSV Import (QBANK-03)

**Requires `@fastify/multipart` plugin** — NOT currently installed. Must add:
```bash
pnpm add @fastify/multipart --filter api
```

**Register in `apps/api/src/index.ts`:**
```typescript
import fastifyMultipart from '@fastify/multipart';
await app.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024 } });
```

**CSV parsing — no library needed** for v1. Manual parsing of uploaded file buffer:
```typescript
const data = await request.file();
const buffer = await data.toBuffer();
const text = buffer.toString('utf-8');
const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
const [header, ...rows] = lines;
// Parse each row: split on comma, handle quoted fields
```

**Expected CSV columns:**
```
technology_slug,difficulty,skill_area,text,option_a,option_b,option_c,option_d,correct_option,explanation
```

**Per-row validation:** Use the existing `questionBodySchema` (zod) with `technology_slug` lookup to resolve `technology_id`. Insert valid rows, collect errors for invalid ones.

**Response:**
```json
{
  "imported": 45,
  "errors": [
    { "row": 3, "reason": "Invalid difficulty: 'expert'" },
    { "row": 12, "reason": "Unknown technology: 'rust'" }
  ]
}
```

---

## 3. CSS-Only Score Distribution Chart

Per CONTEXT.md and project preference (no chart library dependency):

```tsx
// Horizontal bar chart — pure Tailwind
const BUCKETS = [
  { label: '0–10', key: 'bucket_0_10' },
  { label: '11–20', key: 'bucket_11_20' },
  // ...
  { label: '91–100', key: 'bucket_91_100' },
];
const maxCount = Math.max(...BUCKETS.map(b => stats[b.key] ?? 0), 1);

BUCKETS.map(({ label, key }) => {
  const count = stats[key] ?? 0;
  const pct = Math.round((count / maxCount) * 100);
  return (
    <div key={key} className="flex items-center gap-2 text-xs">
      <span className="w-12 text-right text-gray-500">{label}</span>
      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
        <div className="h-full bg-blue-500 rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-gray-600">{count}</span>
    </div>
  );
})
```

---

## 4. Candidate Comparison UI (DASH-03)

**Selection mechanism** (CONTEXT.md: Claude's discretion):
- Add a checkbox column to the submissions DataTable (leftmost column)
- Track `selectedIds: Set<string>` in `useState`
- "Compare selected" button appears when `selectedIds.size >= 2` (max 4)
- Navigate to `/admin/compare?ids=a,b,c`

**Compare page layout** (side-by-side):
```
| Field            | Candidate A | Candidate B |
|------------------|-------------|-------------|
| Score %          | 85%         | 62%         |
| Pass/Fail        | ✓ Pass      | ✗ Fail      |
| Time taken       | 23:52       | 28:41       |
| DAX              | 4/4 — 100%  | 2/4 — 50%   |
| Data Modeling    | 3/4 — 75%   | 3/4 — 75%   |
```

**Implementation:** Static table with fixed first column (field name), one column per candidate. Each cell reads from `results[n].skill_area_scores`. No need for TanStack Table here — a plain `<table>` is cleaner.

---

## 5. Route Registration Pattern

**Submissions route already registered** at `/admin/submissions` prefix. Add new handlers in the same `submissionRoutes` function:
- `app.get('/')` — list (DASH-01)
- `app.get('/export')` — CSV (DASH-05)
- `app.get('/compare')` — comparison data (DASH-03, optional — can also do multi-fetch from frontend)

**Note:** Express/Fastify route specificity — `GET /export` must be registered BEFORE `GET /:linkId` or Fastify will try to match `export` as a linkId param. Current `/:linkId` is the only route — add exact routes first.

**Stats route:** New file `apps/api/src/routes/stats.ts`, registered at `/admin/stats` prefix in `index.ts`.

**Questions import route:** Add `app.post('/import', { preHandler: [authMiddleware, requireRole('owner')] }, ...)` in `questionRoutes` — owner-only, multipart body.

---

## 6. Sidebar Navigation Update

`apps/web/src/app/(admin)/layout.tsx` is a **Server Component** — add a `<Link href="/submissions">Submissions</Link>` entry after "Test Configs":

```tsx
<Link
  href="/submissions"
  className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
>
  Submissions
</Link>
```

---

## 7. No Schema Changes Required

Phase 4 is pure read + export. All data already exists in:
- `submission_results` (score, pass, skill_area_scores, time_taken_seconds)
- `test_links` (submitted_at, test_config_id, state)
- `test_configs` (name, difficulty, pass_threshold_pct)
- `technologies` (name)
- `questions`, `candidate_answers` (for comparison detail)

The only new DB operation is `INSERT INTO questions` (bulk import) which uses the existing `questions` table schema.

**No `npx prisma db push` / migration needed** — no DDL changes.

---

## 8. Key Risks & Pitfalls

1. **Route ordering bug:** Fastify matches routes in registration order. `GET /export` would match `/:linkId` with `linkId = 'export'`. Register `/export`, `/compare` as literal routes BEFORE `/:linkId`.

2. **multipart plugin not installed:** `@fastify/multipart` must be added; without it, `request.file()` does not exist and the import endpoint will crash.

3. **CSV quoting:** Fields with commas or quotes must be double-quoted. Use the `"${v.replace(/"/g, '""')}"` pattern — do not use naive `.split(',')` for parsing (breaks on commas within fields). For v1 with known column structure and internal data, simple parsing is fine if we document the limitation.

4. **Auth cookie for file download:** Browser `<a download>` bypasses axios credentials. Must use `responseType: 'blob'` + object URL approach described in section 2b.

5. **Comparison URL max length:** If IDs are UUIDs (36 chars each), 4 candidates = 144 chars for the `ids` param — well under URL limits.

6. **TanStack filter on nested data:** `skill_area_scores` is a JSON object. TanStack's `getFilteredRowModel` works on flat accessors. Don't try to filter on skill_area_scores — filter on `difficulty`, `test_config_id`, and `submitted_at` range only (flat string/number fields).

---

## ## RESEARCH COMPLETE

All technical approaches verified against existing codebase. Planner can proceed.

**Critical pre-work for planner:**
- Read `apps/api/src/routes/submissions.ts` — understand existing `/:linkId` route to avoid conflicts
- Read `apps/web/src/components/ui/DataTable.tsx` — extend, do NOT duplicate
- Read `apps/web/src/app/(admin)/layout.tsx` — add "Submissions" nav link here
- `@fastify/multipart` must be installed before implementing QBANK-03
