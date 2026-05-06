# Roadmap — Dev Assessment Platform

**5 phases** | **24 requirements mapped** | All v1 requirements covered ✓

---

## Phase 1 — Foundation ✓ (2026-04-21)

**Goal**: Admins can log in, manage a question bank, and configure tests. No candidate-facing features yet.

**Requirements**: QBANK-01, QBANK-02, QBANK-04, QBANK-05, ACCESS-01, ACCESS-02, ACCESS-03, ACCESS-04, TESTS-01

**Deliverables**:
- Database schema: questions (versioned), question_categories, tests, admin_users, audit_log
- Admin auth: email/password login, JWT sessions, Owner + Reviewer roles
- Question bank CMS: create/edit/archive MCQ questions with tech tag, difficulty, skill-area tag
- Question search + filter UI (by technology, difficulty, skill area)
- Test configuration UI: create test (technology, level, # questions, pass threshold)
- Seeded RNG library with unit tests (same seed → same shuffle, every time)

**Success criteria**:
1. Admin can log in and land on the question bank
2. Admin can create a Power BI / Junior question with 4 options and a correct answer marked
3. Admin can edit a question and see the previous version preserved in history
4. Admin can create a test config for "Power BI – Senior – 20 questions – 70% pass"
5. Admin with Reviewer role cannot reach the question edit screen

---

## Phase 2 — Test Experience ✓ (2026-04-27)

**Goal**: A candidate receives a link, takes a 30-minute timed MCQ test, and submits. Nothing breaks.

**Requirements**: ASSESS-01, ASSESS-02, ASSESS-03, ASSESS-04, ASSESS-05, ASSESS-06, TESTS-02, TESTS-03, TESTS-04, TESTS-05

**Deliverables**:
- Shareable link generator: creates link with embedded seed (hash of test_id + token)
- Link expiry enforcement (server-side)
- Candidate portal: zero-friction entry, question display, MCQ answer input
- 30-min countdown timer: client-side UI (green/yellow/red) + server-side hard cutoff
- Auto-submit on timer expiry; server rejects answers received after deadline
- Page-refresh recovery: localStorage stores started_at + answers; resumes on reload
- Seeded question selection: same link → same questions every time

**Success criteria**:
1. Candidate opens link and sees first question within 3 seconds (no login prompt)
2. Timer counts down live; turns red at 60 seconds
3. Candidate refreshes page mid-test and resumes with correct remaining time
4. Timer reaches 0:00 → test auto-submits → candidate cannot answer further
5. Two different links for same test config show different question sets (different seeds)
6. Same link opened twice shows identical question set (same seed)

---

## Phase 3 — Grading & Results ✓ (2026-04-28)

**Goal**: Submissions are auto-graded instantly. Candidates see their score and breakdown. Admins see the full answer sheet.

**Requirements**: GRADE-01, GRADE-02, GRADE-03, GRADE-04

**Deliverables**:
- Auto-grading engine: MCQ exact-match, runs synchronously on submission (queue for future scale)
- Results cache: pre-computed score + category breakdown stored after grading
- Candidate results page: total score, pass/fail verdict, time taken, skill-area breakdown, full answer sheet
- Admin submission detail view: all fields of candidate results, plus question version info

**Success criteria**:
1. Submission is graded within 2 seconds of receipt
2. Candidate results page loads showing overall score, pass/fail, and time taken
3. Skill-area breakdown shows a score for each tagged topic (e.g., "DAX: 3/4 — 75%")
4. Answer sheet shows every question: candidate answer, correct answer, ✓ or ✗
5. Admin can view the same result detail from the dashboard

---

## Phase 4 — Admin Dashboard & Export ✓ (2026-04-28)

**Goal**: Admins can monitor all submissions, compare candidates, see aggregate stats, and export data.

**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, QBANK-03

**Deliverables**:
- Submissions list: filterable by test, date range, seniority; sortable by score
- Side-by-side candidate comparison: scores, skill breakdowns, time taken
- Aggregate stats per test: average score, pass rate, score distribution chart
- CSV export of all submissions for a test
- Bulk question import from CSV with per-row error reporting

**Success criteria**:
1. Admin opens dashboard and sees all submissions sorted by score descending
2. Admin filters by "Power BI – Senior" and sees only matching submissions
3. Admin selects two candidates and compares their skill breakdowns side-by-side
4. Dashboard shows average score and pass rate across all submissions for a test
5. Admin exports results to CSV; file opens correctly in Excel with all columns
6. Admin uploads a CSV of 50 questions; valid rows import, invalid rows listed with error reason

---

## Phase 5 — Improvements to the Existing App

**Goal**: improvements to the existing app

**Depends on**: Phase 4

**Plans**:
- Wave 1: 05-01 — Shared types + API (pagination, export, bulk-archive, hard-delete)
- Wave 2: 05-02 — Frontend infrastructure (sidebar active state, sonner, DataTable pagination)
- Wave 3 (parallel): 05-03 — Questions page (export, checkboxes, bulk actions, delete, pagination)
- Wave 3 (parallel): 05-04 — Submissions page (pagination)

---

## Milestone: v1.0 — Shipped

All 24 v1 requirements covered. Platform supports multiple technologies, 3 seniority levels, automatic grading, and a full admin comparison dashboard.
