---
plan: 01-01
phase: 1
name: Project Scaffolding & Database Schema
status: complete
completed_at: 2026-04-21T13:38:33Z
tasks_completed: 3
tasks_total: 3
commits:
  - 3f47763
  - df7a76a
  - 152ae1d
---

## Summary

Monorepo scaffolded, PostgreSQL schema defined, and seeded RNG library built with full test coverage.

## What Was Built

### Task 1 — Monorepo Initialized
- Root `package.json` with npm workspaces (`apps/*`, `packages/*`)
- `apps/web/` — Next.js 14 App Router scaffold (package.json, tsconfig.json, next.config.ts, globals.css)
- `apps/api/` — Fastify + TypeScript scaffold (package.json, tsconfig.json)
- `packages/shared/` — Shared TypeScript types (Question, TestConfig, AdminUser, Technology, Difficulty)
- `.env.example` with all required env vars
- `tsconfig.base.json` shared compiler options

### Task 2 — PostgreSQL Schema
- `apps/api/src/db/schema.sql` — 5 tables: `admin_users`, `technologies`, `questions`, `test_configs`, `audit_log`
- `questions` table has `family_id`, `version`, `is_latest`, `is_active` for immutable versioning
- `correct_option CHECK IN ('a','b','c','d')`
- Indexes on questions (active/latest), family_id, skill_area; on audit_log (entity, admin)
- Seed: 3 technologies (power-bi, sfmc, data-engineering) with `ON CONFLICT DO NOTHING`
- `apps/api/src/db/client.ts` — singleton postgres client from DATABASE_URL
- `apps/api/src/db/migrate.ts` — idempotent migration runner

### Task 3 — Seeded RNG Library
- `apps/api/src/lib/rng.ts` — exports `deriveSeed` (SHA-256 hash of testConfigId:linkToken) and `seededSample` (Fisher-Yates with seedrandom)
- `apps/api/src/lib/rng.test.ts` — 6 unit tests: determinism, uniqueness, immutability, count, cross-seed variance
- `apps/api/vitest.config.ts` — vitest config for node environment

## Key Files Created

- `package.json` (root workspace)
- `apps/api/src/db/schema.sql`
- `apps/api/src/db/client.ts`
- `apps/api/src/db/migrate.ts`
- `apps/api/src/lib/rng.ts`
- `apps/api/src/lib/rng.test.ts`
- `packages/shared/src/types/index.ts`

## Self-Check: PASSED

- [x] Root package.json has `"workspaces": ["apps/*", "packages/*"]`
- [x] apps/web/package.json contains `"next": "14.2.5"`
- [x] apps/api/package.json contains fastify, postgres, seedrandom
- [x] .env.example contains DATABASE_URL and JWT_SECRET
- [x] schema.sql has all 5 tables with correct columns and constraints
- [x] questions table has family_id, version, is_latest, is_active
- [x] correct_option CHECK constraint present
- [x] rng.ts exports deriveSeed and seededSample
- [x] rng.test.ts has 6 test cases
- [x] seededSample is deterministic with same seed
