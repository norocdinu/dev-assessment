# Requirements — Dev Assessment Platform

## v1 Requirements

### Assessment Delivery (ASSESS)

- [ ] **ASSESS-01**: Candidate can open a pre-configured link and start a timed MCQ test immediately (no login, no signup)
- [ ] **ASSESS-02**: Test runs for exactly 30 minutes; timer is enforced server-side and auto-submits on expiry
- [ ] **ASSESS-03**: Candidate can see a live countdown timer with visual urgency cues (green → yellow → red)
- [ ] **ASSESS-04**: Candidate can navigate between questions, change answers, and submit early before timer expires
- [ ] **ASSESS-05**: If candidate refreshes or reopens the link mid-test, the test resumes with remaining time intact
- [ ] **ASSESS-06**: Questions are randomly drawn from the pool for the configured technology and seniority level, using a seeded algorithm so the same link always shows the same questions

### Question Bank (QBANK)

- [ ] **QBANK-01**: Admin can create, edit, and delete MCQ questions with: question text, 4 answer options, correct answer, skill-area tag, difficulty level (Junior/Mid/Senior), and technology tag
- [ ] **QBANK-02**: Admin can search and filter questions by technology, difficulty, and skill area
- [ ] **QBANK-03**: Admin can bulk-import questions from a CSV file with error reporting per row
- [ ] **QBANK-04**: Edited questions create a new version; past submissions remain linked to the version that was active at submission time
- [ ] **QBANK-05**: Admin can soft-delete (archive) questions; archived questions are excluded from new tests but visible for audit

### Test Configuration (TESTS)

- [ ] **TESTS-01**: Admin can create a test configuration specifying: technology, seniority level, number of questions to draw, pass/fail threshold (%)
- [ ] **TESTS-02**: Admin can generate a shareable link for a test configuration; the link encodes a seed so question selection is deterministic
- [ ] **TESTS-03**: Admin can set an expiry date on a link; expired links show a clear message to candidates
- [ ] **TESTS-04**: Platform supports any technology (Power BI, SFMC, Data Engineering, etc.) — technology is a configurable tag, not hardcoded
- [ ] **TESTS-05**: Platform supports Junior, Mid, and Senior seniority levels per technology; new levels can be added without code changes

### Auto-Grading & Results (GRADE)

- [ ] **GRADE-01**: System auto-grades MCQ submissions immediately on receipt; no manual grading required for v1
- [ ] **GRADE-02**: Candidate can view their results after submitting: total score (%), pass/fail verdict, and time taken
- [ ] **GRADE-03**: Candidate results show a skill-area breakdown: score per tagged topic (e.g., "DAX: 70%, Data Modelling: 90%")
- [ ] **GRADE-04**: Candidate results show the full answer sheet: each question, the candidate's answer, the correct answer, and whether it was correct

### Admin Dashboard (DASH)

- [ ] **DASH-01**: Admin can view a list of all submissions for a test, sortable and filterable by score, date, and seniority level
- [ ] **DASH-02**: Admin can drill into any submission to see the full result detail (score, breakdown, answer sheet)
- [ ] **DASH-03**: Admin can compare multiple candidates side-by-side: scores, skill breakdowns, time taken
- [ ] **DASH-04**: Dashboard shows aggregate statistics per test: average score, pass rate, score distribution
- [ ] **DASH-05**: Admin can export submission results to CSV

### Access & Admin (ACCESS)

- [ ] **ACCESS-01**: Admin users log in with email + password; candidates never need an account
- [ ] **ACCESS-02**: Multiple admins can manage the question bank and view results
- [ ] **ACCESS-03**: Admin roles: Owner (full access) and Reviewer (view results only, no question editing)
- [ ] **ACCESS-04**: All question create/edit/delete actions are logged with admin identity and timestamp

---

## v2 (Deferred)

- PDF export of individual candidate results
- AI-assisted question generation
- Question effectiveness analytics (difficulty index, discrimination index per question)
- Candidate email notifications
- Webhook / ATS integration
- Adaptive difficulty (CAT-style)
- Proctoring / browser lockdown
- Single sign-on (SSO)

---

## Out of Scope

- Open-ended / coding / essay questions — MCQ only for v1; auto-grading of free text adds significant complexity
- Candidate login/accounts — links are self-contained; no value add for live interview setting
- Video proctoring — test is administered live with interviewer present
- Mobile native app — responsive web covers the use case
- Real-time collaboration on question editing — adds CRDT/OT complexity for negligible gain

---

## Traceability

| Phase | Requirements Covered |
|-------|----------------------|
| Phase 1 — Foundation | QBANK-01..05, ACCESS-01..04, TESTS-01 |
| Phase 2 — Test Experience | ASSESS-01..06, TESTS-02..05 |
| Phase 3 — Grading & Results | GRADE-01..04 |
| Phase 4 — Admin Dashboard | DASH-01..05, QBANK-03 |
