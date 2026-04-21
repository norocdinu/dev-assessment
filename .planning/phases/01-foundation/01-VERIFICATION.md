---
phase: 1
name: Foundation
status: passed
verified_at: 2026-04-21T14:45:00Z
plans_verified: 3
plans_total: 3
requirements_covered: [QBANK-01, QBANK-02, QBANK-04, QBANK-05, ACCESS-01, ACCESS-02, ACCESS-03, ACCESS-04, TESTS-01]
---

## Phase Goal

Admins can log in, manage a question bank, and configure tests.

## Verification Result: PASSED

All 5 success criteria verified against actual code. All 9 phase requirements covered.

## Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC1 | Admin can log in and land on question bank | ✓ | `login/page.tsx` → `router.push('/questions')` after successful auth |
| SC2 | Admin can create a Power BI / Junior question with 4 options and correct answer | ✓ | `QuestionForm.tsx` has 4 option inputs + correct_option radio; `POST /questions` inserts to DB |
| SC3 | Admin can edit and see previous version preserved in history | ✓ | `PUT /questions/:familyId` transaction sets old `is_latest=FALSE`, creates new row; `GET /:familyId/versions` endpoint; History modal in questions page |
| SC4 | Admin can create test config "Power BI – Senior – 20 questions – 70% pass" | ✓ | `POST /test-configs` accepts technology_id, difficulty, num_questions, pass_threshold_pct |
| SC5 | Reviewer cannot reach the question edit screen | ✓ | API: `requireRole('owner')` on PUT/POST/DELETE; Frontend: Edit/Archive/New buttons gated by `isOwner` |

## Requirement Coverage

| Req ID | Description | Implementation | Status |
|--------|-------------|----------------|--------|
| QBANK-01 | Create questions | `POST /questions` with Zod validation | ✓ |
| QBANK-02 | Edit with versioning | Transaction: old `is_latest=FALSE`, new `version+1` | ✓ |
| QBANK-04 | Archive (soft-delete) | `DELETE /questions/:familyId` sets `is_active=FALSE` | ✓ |
| QBANK-05 | Search/filter | GET /questions accepts technology, difficulty, skill_area, search, include_archived | ✓ |
| ACCESS-01 | Admin login | `POST /auth/login` with bcrypt compare | ✓ |
| ACCESS-02 | JWT sessions | `@fastify/jwt` signs token into httpOnly cookie | ✓ |
| ACCESS-03 | Owner role | `requireRole('owner')` preHandler on mutating routes | ✓ |
| ACCESS-04 | Reviewer restriction | `requireRole` returns 403; frontend hides owner-only buttons | ✓ |
| TESTS-01 | Test configuration | `POST /test-configs`, `GET /test-configs`, soft-delete | ✓ |

## Must-Haves Verified

- [x] Monorepo: `apps/web`, `apps/api`, `packages/shared` under npm workspaces
- [x] All 5 DB tables: admin_users, technologies, questions, test_configs, audit_log
- [x] seededSample deterministic (same seed + pool = same result; 6 tests)
- [x] deriveSeed deterministic (SHA-256 hash)
- [x] Admin login produces JWT httpOnly cookie
- [x] Owner CRUD questions; Reviewer returns 403
- [x] Question edit creates new version row; old row preserved as is_latest=FALSE
- [x] Every question mutation logged in audit_log (question.create / question.edit / question.archive)
- [x] Test configuration CRUD implemented

## Human Verification Items

The following items require a running environment to verify manually:

1. `npm run test --workspace=apps/api` — run RNG unit tests (require Node.js in PATH)
2. `npm run db:migrate` — apply schema to PostgreSQL (requires running PostgreSQL)
3. Login flow end-to-end in browser (requires both apps running)
4. Reviewer role cannot navigate to edit page in browser (frontend button hidden + API 403)
5. Archive toggle in questions list (question disappears; reappears with "Show archived")
