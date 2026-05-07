# Requirements — Dev Assessment Platform v1.2

**Defined:** 2026-05-07
**Core Value:** A candidate receives a link and gets a fair, repeatable, automatically-graded test — every time, for any technology, at any seniority level.

## v1.2 Requirements

### Candidate Experience (CAND)

- [ ] **CAND-01**: Candidate test page uses a modern, mobile-first design that conveys quality and trust as the company's first touchpoint with candidates
- [ ] **CAND-02**: Candidate test page supports dark mode (respects OS `prefers-color-scheme`)
- [ ] **CAND-03**: Candidate test page shows a progress indicator (current question / total) throughout the test
- [ ] **CAND-04**: Candidate sees an explicit submission confirmation step and a clear results/thank-you screen after submitting

### Theming (THEME)

- [ ] **THEME-01**: Admin app has a dark/light mode toggle that persists the user's preference across sessions

### UI Polish (UI)

- [ ] **UI-01**: Admin app uses a consistent type scale, spacing system, and accent colour palette throughout all pages
- [x] **UI-02**: All data tables and card panels show skeleton placeholders while data is loading — Validated in Phase 11: UX Pattern Library
- [x] **UI-03**: All pages with no data display a friendly empty state with a message and suggested next action — Validated in Phase 11: UX Pattern Library
- [x] **UI-04**: All success and error feedback uses sonner toast notifications (no `window.alert` or `window.confirm` for non-destructive actions) — Validated in Phase 11: UX Pattern Library

### Reporting (RPT)

- [ ] **RPT-01**: Owner or reviewer can download a PDF of a candidate's full submission results
- [ ] **RPT-02**: Dashboard stats and charts can be filtered by test configuration
- [ ] **RPT-03**: Dashboard stats and charts can be filtered by date range (last 7 / 30 / 90 days or custom)

### Responsive (RESP)

- [ ] **RESP-01**: Admin panel layout is functional and navigable on tablet-sized screens (≥768px)

---

## Deferred (Future)

- AI-assisted question generation
- Question effectiveness analytics (difficulty index, discrimination index)
- Candidate email notifications
- Webhook / ATS integration
- Adaptive difficulty (CAT-style)
- Radar/spider charts for competency breakdown

---

## Out of Scope — v1.2

| Feature | Reason |
|---------|--------|
| Native mobile app | Responsive web covers the candidate use case ✓ |
| Admin full mobile optimisation | Admin is a desktop/tablet tool; mobile is a non-priority ✓ |
| Custom theme/white-labelling | Single company use case; one brand is sufficient |
| Real-time chart updates (WebSocket) | Polling or manual refresh sufficient at current scale |
| Bulk PDF export | Single-candidate PDF covers the hiring review workflow |
| Scheduled/email report delivery | Out of scope; download on demand is sufficient |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAND-01 | Phase 9 | Pending |
| CAND-02 | Phase 9 | Pending |
| CAND-03 | Phase 9 | Pending |
| CAND-04 | Phase 9 | Pending |
| THEME-01 | Phase 10 | Pending |
| UI-01 | Phase 10 | Pending |
| RESP-01 | Phase 10 | Pending |
| UI-02 | Phase 11 | Pending |
| UI-03 | Phase 11 | Pending |
| UI-04 | Phase 11 | Pending |
| RPT-01 | Phase 12 | Pending |
| RPT-02 | Phase 12 | Pending |
| RPT-03 | Phase 12 | Pending |

**Coverage:**
- v1.2 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-07*
*Last updated: 2026-05-07 — initial definition*
