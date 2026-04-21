# Research Summary — Dev Assessment Platform

## Stack

**Go-to 2025 stack:**
- **Frontend**: React 18 + Next.js 14 + TypeScript
- **Backend**: Node.js (Express/Fastify) + TypeScript
- **Database**: PostgreSQL (primary) + Redis (sessions, cache, rate limiting)
- **Grading queue**: Bull (Redis-backed) for async auto-grading
- **Dashboard charts**: Recharts or Apache ECharts + TanStack Table

Key library picks:
- `seedrandom` — deterministic seeded RNG for reproducible question selection
- `date-fns` — timer/timestamp utilities
- `jsPDF` + `XLSX` — export results to PDF/CSV

**Confidence: 92%**

---

## Table Stakes Features

Must have or users leave:
- Shareable pre-configured links (no candidate login)
- Auto-grading with instant results
- Score + pass/fail verdict
- Skill-area breakdown (score per topic)
- Full answer sheet (candidate answer vs correct answer)
- Question randomisation (shuffle per candidate)
- 30-min timer with auto-submit
- Question bank CRUD + tagging + search
- Multi-admin with roles + audit trail
- Bulk question import (CSV/JSON)
- Cross-candidate comparison dashboard
- Export results (PDF / CSV)

---

## Architecture Decisions

**Seeded RNG** (critical): Use `hash(test_id + link_token)` as seed → same link always yields same question set. No need to persist the selection. Use `crypto.getRandomValues()` or `seedrandom`, never `Math.random()`.

**Hybrid timer**: Client-side countdown for UX, server-side hard cutoff for enforcement. Server stores `started_at`; any submission received after `started_at + 1800s` is rejected. Use Web Worker so tab-switch doesn't pause timer.

**Denormalised results cache**: After grading, pre-compute and store category breakdowns in a `results_cache` table. Dashboard reads cache — no expensive real-time aggregation.

**Question versioning**: Questions are immutable once submitted against. Edits create new versions. Past submissions link to the version that was live at submission time.

**No candidate auth**: Candidate identity = hashed email/name + submission ID. Zero friction — click link, start test.

---

## Watch Out For

1. **Client-only timer** — trivially bypassed via DevTools. Server must enforce hard cutoff.
2. **`Math.random()` without seeding** — non-deterministic; same link shows different questions on refresh.
3. **In-place question edits** — breaks historical results. Always version.
4. **Race conditions on submit** — use idempotency keys + `UNIQUE (test_id, submission_id)` DB constraint.
5. **One-use vs reusable links** — decide upfront: reusable links with seeded RNG are simpler to manage for live interviews; single-use tokens add security but complexity.
6. **Pool exhaustion** — maintain ≥3× more questions than the test draws, per level.
7. **N+1 queries on dashboard** — pre-aggregate into results_cache; never query per-submission in a loop.

---

## Build Order (Critical Path)

1. DB schema + migrations
2. Seeded RNG library + tests
3. Admin auth + question bank CMS
4. Test config + sharelink generation
5. Candidate portal (timer, MCQ UI, submission)
6. Auto-grading engine + results cache
7. Results views (candidate + admin)
8. Admin comparison dashboard + analytics
9. Bulk import, PDF export, polish
