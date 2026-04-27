# Phase 2: Test Experience - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin generates shareable links for test configs. Candidates open a link, take a 30-minute timed MCQ test, and submit. Nothing else — grading and results are Phase 3, dashboard is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Admin Link Generation UX
- **D-01:** "Generate Link" button on `/test-configs` navigates to a dedicated link management page (`/test-configs/:id/links`) — not a modal overlay
- **D-02:** The link management page shows all links for that test config: token (truncated), state, created_at, started_at, submitted_at
- **D-03:** Page has a "Generate New Link" button that POSTs to `/admin/test-links` and shows the new URL inline (success state on the same page with a copyable input)
- **D-04:** Each link row has a "Revoke" action (DELETE /admin/test-links/:id) for owner role

### Link Expiry
- **D-05:** No expiry date picker — `expires_at` is always NULL when generating links. Links expire naturally when the test is submitted (state → `submitted`). The `expires_at` DB column exists but is not used in Phase 2.
- **D-06:** Link lifecycle is entirely state-machine driven: `created → active → submitted`

### Candidate Error Recovery
- **D-07:** If submit fails with a network error (not 410 deadline, not 409 already-submitted): show an inline error message — "Submission failed. Check your connection and try again." — with a retry button that re-fires the same submit with existing localStorage answers
- **D-08:** 410 (deadline exceeded) → show /test/:token/expired with "Time's up" state (already in UI-SPEC)
- **D-09:** 409 (already submitted race) → treat as success, redirect to /test/:token/expired with "submitted" state

### Claude's Discretion
- Loading skeleton vs spinner design (UI-SPEC specifies spinner — follow that)
- Exact copy text for the link management page (follow copywriting contract from UI-SPEC for candidate-facing; admin pages use direct imperative style matching Phase 1)
- Retry delay strategy on network error (immediate retry is fine for v1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Research & Design
- `.planning/phases/02-test-experience/02-RESEARCH.md` — Full technical architecture: DB schema (test_links, candidate_answers), API endpoints, timer design, seeded question selection, submission idempotency, page-refresh recovery
- `.planning/phases/02-test-experience/02-UI-SPEC.md` — All candidate-facing component contracts: Timer, QuestionCard, QuestionNav, SubmitModal, navigation buttons, terminal pages, copywriting contract, accessibility contracts

### Project Foundation
- `.planning/REQUIREMENTS.md` — Phase 2 requirement IDs: ASSESS-01..06, TESTS-02..05
- `.planning/ROADMAP.md` — Phase 2 deliverables and success criteria
- `.planning/phases/01-foundation/01-03-SUMMARY.md` — Phase 1 frontend patterns (Tailwind classes, component style, layout)

### Existing Code Patterns
- `apps/web/src/app/(admin)/layout.tsx` — Admin layout pattern (sidebar + main, auth guard, Server Component)
- `apps/web/src/app/(admin)/test-configs/page.tsx` — Pattern for 'use client' pages: useState/useEffect data fetching, DataTable usage, CTA buttons
- `apps/api/src/routes/test-configs.ts` — Fastify route pattern: Zod validation, authMiddleware, requireRole, postgres.js sql template

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/ui/DataTable.tsx` — TanStack Table wrapper; use this for the admin link list table (same pattern as test-configs and questions pages)
- `apps/web/src/lib/api.ts` — Axios instance with `withCredentials: true`; use for all admin API calls. Candidate routes are public — use native `fetch` or a separate axios instance without `withCredentials`
- `apps/web/src/app/(admin)/layout.tsx` — Wrap the link management page in this layout (it's an admin page)

### Established Patterns
- All admin pages are `'use client'` with `useState`/`useEffect` for data fetching — no dedicated hooks directory, fetching is inline
- Loading state: simple `<p className="text-sm text-gray-400">Loading…</p>` or spinner div
- Error handling: `try/finally` with `setLoading(false)` — no toast library, errors shown inline
- CTA buttons: `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700`
- Destructive actions: `text-red-600 hover:underline text-xs` (matches Delete on questions/configs)
- No existing modal component — the link management page approach avoids needing one on the admin side; SubmitModal is candidate-only (per UI-SPEC)

### Integration Points
- `apps/web/src/app/(admin)/test-configs/page.tsx` — "Generate Link" button needs to change from `disabled` placeholder to a `router.push('/test-configs/${id}/links')` navigation
- `apps/api/src/index.ts` — Must register `testLinkRoutes` under `/admin/test-links` and `candidateRoutes` under `/candidate`
- `apps/api/src/db/schema.sql` / `migrate.ts` — Must add `test_links` and `candidate_answers` tables with `CREATE TABLE IF NOT EXISTS` guards
- `packages/shared/src/types/index.ts` — Add `TestLink`, `CandidateSession`, `CandidateQuestion` types

</code_context>

<specifics>
## Specific Ideas

- Link expiry is intentionally not admin-configurable in Phase 2 — "expires after the test is taken" is the user's mental model. No date picker, no duration input.
- The link management page (`/test-configs/:id/links`) is an admin page — it lives in `(admin)` route group and uses the sidebar layout.
- After generating a new link, display the URL in a copyable `<input readOnly>` with a "Copy" button directly on the link management page (no separate modal).

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within Phase 2 scope

</deferred>

---

*Phase: 02-test-experience*
*Context gathered: 2026-04-27*
