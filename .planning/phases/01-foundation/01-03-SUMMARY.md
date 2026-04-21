---
plan: 01-03
phase: 1
name: Admin Frontend — Auth, Question Bank CMS, Test Config UI
status: complete
completed_at: 2026-04-21T14:30:00Z
tasks_completed: 5
tasks_total: 5
commits:
  - da81b58
  - 8fe5d9f
  - 9dab1ad
  - 221cd19
  - b56c1cd
---

## Summary

Admin frontend built end-to-end: Tailwind setup, authenticated route guard, login page, question bank list with filters and version history modal, question create/edit forms with per-field validation, and test configuration list/create UI.

## What Was Built

### Task 1 — Tailwind + API Client
- `tailwind.config.ts` with `content: ['./src/**/*.{ts,tsx}']`
- `postcss.config.js` with tailwindcss + autoprefixer
- `src/app/globals.css` with @tailwind directives
- `src/lib/api.ts` — Axios instance with `baseURL` + `withCredentials: true`

### Task 2 — Login Page & Auth Guard
- `src/app/(admin)/layout.tsx` — Server Component: reads `token` cookie, redirects to /login if missing or invalid, renders sidebar nav with Question Bank / Test Configs links and user email/role footer
- `src/app/(admin)/login/page.tsx` — Client Component: email+password form, calls POST /auth/login, redirects to /questions on success, shows "Invalid email or password" inline on failure

### Task 3 — Question Bank List
- `src/components/ui/DataTable.tsx` — generic TanStack React Table wrapper, striped rows, hover state, sticky header
- `src/app/(admin)/questions/page.tsx` — filter bar (Technology dropdown, Difficulty dropdown, Skill Area text, Search text, Show Archived toggle), 300ms debounce on text inputs, DataTable with columns incl. truncated text, version, status, Edit/History/Archive action buttons (Edit/Archive owner-only), version history inline modal

### Task 4 — Question Create/Edit Forms
- `src/components/ui/QuestionForm.tsx` — all fields (Technology select, Difficulty select, Skill Area input, Question Text textarea, Options A-D inputs, Correct Answer radio, Explanation textarea), per-field required validation, loading spinner on submit, version badge in edit mode
- `src/app/(admin)/questions/new/page.tsx` — calls POST /questions, redirects to /questions on success
- `src/app/(admin)/questions/[familyId]/edit/page.tsx` — loads latest version via GET /questions/:familyId/versions, pre-fills form, calls PUT /questions/:familyId, shows "Editing vN — saving will create vN+1" badge

### Task 5 — Test Configuration UI
- `src/app/(admin)/test-configs/page.tsx` — DataTable with Name/Technology/Difficulty/# Questions/Pass%/Created/Actions; Delete with confirm dialog (owner only); Generate Link button disabled with "Coming in Phase 2" state
- `src/app/(admin)/test-configs/new/page.tsx` — form with all required fields, validation, pool size warning display, redirects on success

## Key Files Created

- `apps/web/tailwind.config.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/app/(admin)/layout.tsx`
- `apps/web/src/app/(admin)/login/page.tsx`
- `apps/web/src/app/(admin)/questions/page.tsx`
- `apps/web/src/components/ui/DataTable.tsx`
- `apps/web/src/components/ui/QuestionForm.tsx`
- `apps/web/src/app/(admin)/questions/new/page.tsx`
- `apps/web/src/app/(admin)/questions/[familyId]/edit/page.tsx`
- `apps/web/src/app/(admin)/test-configs/page.tsx`
- `apps/web/src/app/(admin)/test-configs/new/page.tsx`

## Self-Check: PASSED

- [x] tailwind.config.ts has content pointing to ./src/**/*.{ts,tsx}
- [x] globals.css contains @tailwind base
- [x] api.ts exports api with withCredentials: true
- [x] Layout redirects to /login when no token cookie
- [x] Login page shows inline error on bad credentials (no page reload)
- [x] Sidebar shows logged-in admin email
- [x] Question list filters by technology/difficulty/skill_area/search
- [x] Archive button not visible for reviewer role
- [x] History modal lists all versions
- [x] New Question button not visible for reviewer role
- [x] QuestionForm validates all required fields with per-field errors
- [x] Edit form pre-fills with current values and shows version badge
- [x] Test config list shows empty table (not 404)
- [x] Generate Link shows disabled "Coming in Phase 2" state
- [x] Delete triggers confirm dialog before API call
