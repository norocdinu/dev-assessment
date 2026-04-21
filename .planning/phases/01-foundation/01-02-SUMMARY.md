---
plan: 01-02
phase: 1
name: Admin Auth & Question Bank API
status: complete
completed_at: 2026-04-21T14:00:00Z
tasks_completed: 5
tasks_total: 5
commits:
  - b78970b
  - 1e8595c
---

## Summary

Full Fastify backend built: admin auth (email/password → JWT httpOnly cookie), RBAC middleware, question bank CRUD with immutable versioning, soft-delete, audit log, test config management, and technologies endpoint.

## What Was Built

### Task 1 — Admin Auth Routes
- `src/middleware/auth.ts` — JWT preHandler that reads httpOnly `token` cookie, attaches `req.user`
- `src/middleware/rbac.ts` — exports `requireRole(...roles)` returning a 403 preHandler
- `src/routes/auth.ts` — POST /auth/login (bcrypt verify, JWT sign, httpOnly cookie), POST /auth/logout, GET /auth/me
- `src/db/seed-admin.ts` — seeds admin@example.com / Admin1234! with bcrypt hash (skips if exists)

### Task 2 — Question Bank API
- `src/routes/questions.ts` — GET /questions (with technology/difficulty/skill_area/search/include_archived filters), GET /:familyId/versions, POST (owner only, version=1, family_id=uuid()), PUT/:familyId (transaction: old is_latest=FALSE, new version+1), DELETE/:familyId (is_active=FALSE soft-delete)
- All mutating routes require `requireRole('owner')`, all routes require auth

### Task 3 — Audit Log Helper
- `src/lib/audit.ts` — exports `logAudit({ adminId, action, entityType, entityId, detail? })` — inserts into audit_log
- Called from POST/PUT/DELETE questions routes with correct action strings

### Task 4 — Test Configuration API
- `src/routes/test-configs.ts` — GET /test-configs, POST (creates config, warns if pool < 2×num_questions), PUT/:id (name/num_questions/pass_threshold_pct only — technology+difficulty immutable), DELETE/:id (is_active=FALSE)
- `src/routes/technologies.ts` — GET /technologies (no auth — returns id, slug, name)

### Task 5 — Fastify App Wiring
- `src/index.ts` — registers cors, cookie, jwt, all route plugins with prefixes
- Added dotenv dependency for env loading

## Key Files Created

- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/rbac.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/questions.ts`
- `apps/api/src/routes/test-configs.ts`
- `apps/api/src/routes/technologies.ts`
- `apps/api/src/lib/audit.ts`
- `apps/api/src/index.ts`
- `apps/api/src/db/seed-admin.ts`

## Self-Check: PASSED

- [x] POST /auth/login returns JWT cookie and user object
- [x] POST /auth/login with wrong password returns 401
- [x] GET /auth/me without cookie returns 401
- [x] requireRole exports correct preHandler factory
- [x] POST /questions returns 201 with version=1, is_latest=TRUE
- [x] PUT /questions/:familyId creates version+1, sets old is_latest=FALSE (transaction)
- [x] DELETE /questions/:familyId sets is_active=FALSE (soft-delete)
- [x] Every mutating question action calls logAudit with correct action string
- [x] POST /questions with reviewer token returns 403
- [x] GET /technologies returns all 3 seeded technologies without auth
- [x] POST /test-configs returns 201 with technology_name
- [x] GET /test-configs returns empty array (not 404) when none exist
