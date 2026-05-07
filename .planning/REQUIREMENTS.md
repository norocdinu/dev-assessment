# Requirements — Dev Assessment Platform v1.1

**Defined:** 2026-05-07
**Core Value:** A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

## v1.1 Requirements

### Bug Fixes (FIX)

- [x] **FIX-01**: Admin can import a CSV file that was previously exported from the question bank without any row errors (round-trip fix)

### Test Config UX (TESTS)

- [ ] **TESTS-06**: Test link creation form labels the name field as "Candidate Name" and stores the value with the link
- [ ] **TESTS-07**: Test link creation form defaults pass threshold to 80%

### Analytics Dashboard (DASH)

- [ ] **DASH-06**: Dashboard shows a KPI summary strip: total candidates, overall pass rate, average score, weakest skill area
- [ ] **DASH-07**: Dashboard shows a recent candidates list (last 10 submissions: candidate name, test config, score, pass/fail, date)
- [ ] **DASH-08**: Dashboard shows a score distribution chart (bar chart bucketed by 10% bands, with pass threshold reference line)
- [ ] **DASH-09**: Dashboard shows a competency breakdown chart (horizontal bar: average score % per skill-area tag)

### Submission Management (SUB)

- [ ] **SUB-01**: Owner can permanently delete a submission from the submission detail page (confirmation required; cascades to answers and cached results)

### Account & Access (ACCESS)

- [ ] **ACCESS-05**: Any admin can open an account settings page and change their own password (requires entering current password)
- [ ] **ACCESS-06**: Owner can view a list of all admin accounts and create, edit, and delete accounts from a dedicated page
- [ ] **ACCESS-07**: System prevents deletion of the last remaining owner account and returns a clear error
- [ ] **ACCESS-08**: New "Member" role can generate test links and view/export results; cannot add, edit, or delete questions; cannot manage test configs, accounts, or delete submissions

---

## v2 (Deferred)

- PDF export of individual candidate results
- AI-assisted question generation
- Question effectiveness analytics (difficulty index, discrimination index)
- Candidate email notifications
- Webhook / ATS integration
- Adaptive difficulty (CAT-style)

---

## Out of Scope — v1.1

| Feature | Reason |
|---------|--------|
| Email-based invites for new accounts | Requires email infra; owner creates accounts directly for now |
| Radar/spider charts | Harder to read than horizontal bar for this use case |
| Time-series trend charts | Too little data at current scale; deferred |
| Bulk submission deletion | Risky without recycle bin; single-delete confirmation is sufficient |
| Avatar / timezone / 2FA in account settings | Adds complexity; name + password change covers real need |
| Email display name changes | Owner manages emails at creation; edits out of scope for v1.1 |
| Soft-delete for submissions | Would require updating every stats/list query; hard-delete is simpler |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 6 | Complete |
| TESTS-06 | Phase 7 | Pending |
| TESTS-07 | Phase 7 | Pending |
| DASH-06 | Phase 8 | Pending |
| DASH-07 | Phase 8 | Pending |
| DASH-08 | Phase 8 | Pending |
| DASH-09 | Phase 8 | Pending |
| SUB-01 | Phase 8 | Pending |
| ACCESS-05 | Phase 7 | Pending |
| ACCESS-06 | Phase 7 | Pending |
| ACCESS-07 | Phase 7 | Pending |
| ACCESS-08 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-07*
*Last updated: 2026-05-07 after initial definition*
