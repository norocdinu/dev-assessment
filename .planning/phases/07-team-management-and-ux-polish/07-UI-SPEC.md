# Phase 7: UI Design Contract — Team Management & UX Polish

## UI-SPEC COMPLETE

**Phase:** 7 — Team Management & UX Polish
**Status:** Approved
**Date:** 2026-05-07

---

## Design System Reference

All Phase 7 pages follow the established admin page conventions:

**Page structure:** `'use client'` + useState/useEffect, no React Query/SWR, inline error handling. All pages live under `apps/web/src/app/(admin)/`.

**Layout container:** `<div className="p-6">` — all admin pages use 24px padding.

**Page heading:** `<h2 className="text-lg font-semibold text-gray-900 mb-6">` — used in test-configs/new and links pages.

**Form container:** `<form className="space-y-5 max-w-lg">` — matches new test config form exactly.

**Label:** `<label className="block text-sm font-medium text-gray-700 mb-1">`

**Text input:** `<input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">`

**Select:** `<select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">`

**CTA (primary) button:** `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50`

**CTA (form submit) button:** `px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50` — note `px-6` and `font-medium` for form submit buttons.

**Secondary/outline button:** `px-4 py-1.5 text-gray-600 text-sm border border-gray-300 rounded-md hover:bg-gray-50`

**Destructive action button (inline):** `text-red-600 hover:underline text-xs` — used for row-level delete/revoke.

**Navigation action (inline):** `text-blue-600 hover:underline text-xs` — used for row-level view/edit links.

**Error display (field-level):** `<p className="text-xs text-red-600 mt-1">{error}</p>`

**Error display (form-level):** `<p className="text-sm text-red-600 mb-4">{error}</p>`

**Loading state:** `<p className="text-sm text-gray-400">Loading…</p>`

**Success feedback:** `toast.success('...')` via sonner (Toaster already mounted in layout.tsx at position="top-right"). Used for async save actions (not form-submission navigations).

**DataTable:** `<DataTable columns={columns} data={data} />` from `@/components/ui/DataTable`. No pagination needed for the accounts list (small admin team).

**Role badge pattern** (new in Phase 7, consistent with Pass/Fail badge in submissions page):
```
owner:    bg-blue-100 text-blue-700
reviewer: bg-gray-100 text-gray-700
member:   bg-green-100 text-green-700
```
Badge container: `<span className="px-2 py-0.5 text-xs rounded-full font-medium {colorClass}">{role}</span>` — matches the Pass/Fail badge pattern from submissions/page.tsx exactly.

**Active nav link:** `bg-blue-50 text-blue-700 font-medium` — matches existing layout.tsx nav item active state.

**Inactive nav link:** `text-gray-700 hover:bg-gray-100` — matches existing layout.tsx.

---

## Screen 1: /admin/accounts — Accounts List

### Layout

Standard admin page layout: `<div className="p-6">`. Page header row (flex, space-between) containing the page title and a "Create Account" CTA button. Error message below header (conditionally rendered). DataTable fills the remaining width.

```
[p-6 container]
  [flex justify-between items-center mb-6]
    <h2> Accounts </h2>
    <button> Create Account </button>
  [error row — conditional]
  [DataTable — full width]
```

### Components

**DataTable columns** (`ColumnDef<AdminAccount>[]`):

| Column | accessorKey | Width hint | Notes |
|--------|-------------|------------|-------|
| Name | `name` | auto | Plain text; show `—` if empty string |
| Email | `email` | auto | Plain text |
| Role | `role` | narrow | Role badge (see Design System Reference) |
| Created | `created_at` | narrow | `toLocaleDateString()` — same as links table |
| Actions | — (id: 'actions') | narrow | Two inline buttons: Edit, Delete |

**Actions cell:**
- "Edit" — `text-blue-600 hover:underline text-xs` — navigates to `/accounts/:id/edit` (separate edit page, not inline expand — see Interactions)
- "Delete" — `text-red-600 hover:underline text-xs` — triggers confirmation before calling DELETE API

No column for `last_login_at` in the initial implementation — the data is available from the API but not surfaced in the table to keep the view clean.

### States

- **Loading:** `<p className="text-sm text-gray-400">Loading…</p>` in place of the DataTable.
- **Empty:** DataTable renders its own empty row — no custom empty state component needed. The DataTable's empty cell shows: "No accounts found." (centered, `text-gray-400` — consistent with submissions table empty state: `px-4 py-8 text-center text-gray-400`).
- **Error (page load):** `<p className="text-sm text-red-600 mb-4">{error}</p>` above the DataTable.
- **Error (delete — 409 last owner):** Same error paragraph pattern; message text set from API response: `"Cannot delete the last owner account"`.
- **Error (delete — generic):** `"Failed to delete account."` shown in the same error paragraph.

### Interactions

**"Create Account" button:** Navigates to `/accounts/new` via `router.push('/accounts/new')`.

**"Edit" action:** Navigates to `/accounts/:id/edit` via `router.push(`/accounts/${id}/edit`)`. A separate edit page is used (not inline row expand) because it is simpler to implement and consistent with the existing edit-page pattern used elsewhere in the codebase. Pre-fill form with current account values.

**"Delete" action:**
1. Browser `confirm()` dialog: `"Delete this account? This action cannot be undone."`
2. If confirmed: call `DELETE /admin/accounts/:id`
3. On success: refresh accounts list (re-fetch).
4. On 409: set error to the API's `error` field (last-owner guard message).
5. On other error: set error to `"Failed to delete account."`

**Page-level access:** This page is only reachable by owners (D-04). The layout hides the nav item for non-owners; additionally the API returns 403 for non-owners. No client-side role guard is required on the page itself — layout already gates navigation, API gates data.

### Copy

| Element | Text |
|---------|------|
| Page title | "Accounts" |
| Create button | "Create Account" |
| Edit action | "Edit" |
| Delete action | "Delete" |
| Confirm dialog | "Delete this account? This action cannot be undone." |
| Empty table | "No accounts found." |
| Loading | "Loading…" |
| Delete 409 error | (from API) "Cannot delete the last owner account" |
| Delete generic error | "Failed to delete account." |
| Load error | "Failed to load accounts." |

---

## Screen 2: /admin/accounts/new — Create Account

### Layout

Standard admin page layout: `<div className="p-6">`. Page heading. Conditional error paragraph. Form with `space-y-5 max-w-lg` — identical container to test-configs/new/page.tsx.

```
[p-6 container]
  <h2> Create Account </h2>
  [submitError paragraph — conditional]
  <form space-y-5 max-w-lg>
    [Name field]
    [Email field]
    [Role select]
    [Password field]
    [Submit button]
  </form>
```

### Fields

| Field | Type | Required | Validation | Placeholder |
|-------|------|----------|------------|-------------|
| Name | text | yes | non-empty (`min(1)`) | "e.g. Jane Smith" |
| Email | email | yes | valid email format | "jane@company.com" |
| Role | select | yes | one of: owner / reviewer / member | — (select element) |
| Password | password | yes | minimum 8 characters | "Min. 8 characters" |

**Role select options** (in this order): Owner, Reviewer, Member. Default selected: no selection (placeholder "Select role…" as empty value option).

**Field-level error display:** `<p className="text-xs text-red-600 mt-1">{errors.fieldName}</p>` — shown below each field when present. Cleared on input change (matches test-configs/new pattern).

**Form-level error display:** `<p className="text-sm text-red-600 mb-4">{submitError}</p>` above the form — shown when API call fails.

**Password field note:** Use `autoComplete="new-password"` on the password input to prevent browser autofill of the admin's own credentials (see Threat Model).

### Submit Behavior

**Button state:** Disabled + `opacity-50` during submission (`loading` state). Label changes: "Create Account" → "Creating…".

**On success:** `router.push('/accounts')` — returns to the accounts list. No toast needed (the list page shows the new account immediately).

**On error (API):** Set `submitError` to `"Failed to create account."` or the API error message if available; stay on the form.

**On validation failure:** Set per-field errors; no API call made.

### Copy

| Element | Text |
|---------|------|
| Page title | "Create Account" |
| Name label | "Name" |
| Email label | "Email" |
| Role label | "Role" |
| Role placeholder option | "Select role…" |
| Password label | "Initial Password" |
| Password placeholder | "Min. 8 characters" |
| Submit button (idle) | "Create Account" |
| Submit button (loading) | "Creating…" |
| Submit error | "Failed to create account." |
| Name validation error | "Required" |
| Email validation error | "Required" / "Invalid email" |
| Role validation error | "Required" |
| Password validation error | "Required" / "Must be at least 8 characters" |

---

## Screen 3: /admin/settings — Account Settings

### Layout

Standard admin page layout: `<div className="p-6">`. Page heading. Two visually separated sections on one page, stacked vertically with `space-y-8` between them. Each section has its own heading, form fields, save button, and independent feedback. Outer container uses `max-w-lg` to match form pages.

```
[p-6 container]
  <h2> Account Settings </h2>
  [max-w-lg]
    [Section: Display Name]
      <h3> Display Name </h3>
      [Name input — pre-filled]
      [Email input — read-only]
      <button> Save Name </button>
      [feedback — toast on success; inline error on failure]

    [divider: border-t border-gray-200 my-8]

    [Section: Change Password]
      <h3> Change Password </h3>
      [Current Password input]
      [New Password input]
      [Confirm New Password input]
      <button> Update Password </button>
      [feedback — toast on success; inline error on failure]
```

### Name Section

**Name field:** Text input, pre-filled with `user.name` from `GET /auth/me`. `autoComplete="name"`.

**Email field:** Text input, `readOnly`, value from `user.email`. Styled with `bg-gray-50 cursor-not-allowed text-gray-500` to visually communicate non-editability. Label includes a note: "(cannot be changed)".

**Save button (idle):** "Save Name"
**Save button (loading):** "Saving…"

**API call:** `PUT /auth/me` with `{ name, current_password: '' }` — the endpoint requires `current_password` but name-only update should be refactored or a separate mechanism used. Per RESEARCH.md D-11, `PUT /auth/me` requires `current_password`. Therefore the name section must also collect the current password OR the implementation updates the endpoint to not require `current_password` for name-only updates. Resolution: require `current_password` as part of the name-save form (add a "Confirm with current password" field beneath the name field in the name section). This keeps the endpoint contract clean and adds a confirmation step for identity changes.

**Updated Name Section fields:**

| Field | Type | Notes |
|-------|------|-------|
| Name | text | Pre-filled, editable |
| Email | text | Read-only, `bg-gray-50 cursor-not-allowed` |
| Current Password (confirm) | password | Required to save name change; `autoComplete="current-password"` |

**Success feedback:** `toast.success('Name updated.')` — sonner toast, top-right.
**Error feedback:** Inline `<p className="text-sm text-red-600 mt-2">{nameError}</p>` below the save button.

### Change Password Section

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Current Password | password | yes | `autoComplete="current-password"` |
| New Password | password | yes | min 8 chars; `autoComplete="new-password"` |
| Confirm New Password | password | yes | must match New Password; client-side only |

**Client-side validation:** New Password and Confirm New Password must match before the API call is made. If they do not match, show inline error on Confirm field: "Passwords do not match."

**API call:** `PUT /auth/me` with `{ current_password, new_password }` (no `name` field).

**Success feedback:** `toast.success('Password updated.')` — clears all three password fields on success.
**Error feedback (wrong current password):** API returns 401 — show inline error: "Current password is incorrect."
**Error feedback (generic):** Inline error: "Failed to update password. Please try again."

**Save button (idle):** "Update Password"
**Save button (loading):** "Updating…"

**Section headings:** `<h3 className="text-sm font-semibold text-gray-900 mb-4">` — consistent with the sub-section heading style implied by the form pages.

### Copy

| Element | Text |
|---------|------|
| Page title | "Account Settings" |
| Name section heading | "Display Name" |
| Name label | "Name" |
| Email label | "Email" |
| Email note (inline) | "(read-only)" |
| Name confirm label | "Current Password (to confirm)" |
| Name save button (idle) | "Save Name" |
| Name save button (loading) | "Saving…" |
| Name success toast | "Name updated." |
| Name error | "Failed to update name." |
| Password section heading | "Change Password" |
| Current password label | "Current Password" |
| New password label | "New Password" |
| Confirm password label | "Confirm New Password" |
| Password mismatch error | "Passwords do not match." |
| Wrong password error | "Current password is incorrect." |
| Password save button (idle) | "Update Password" |
| Password save button (loading) | "Updating…" |
| Password success toast | "Password updated." |
| Password generic error | "Failed to update password. Please try again." |

---

## Screen 4: Sidebar Changes

### Accounts Nav Item

**Position:** Rendered after the existing three nav items (Question Bank, Test Configs, Submissions). It is NOT inserted into the static `navItems` array. Instead, it is rendered conditionally immediately after the `navItems.map(...)` block, inside the `<nav>` element.

**Rendering condition:** `user.role === 'owner'` — evaluated after `user` loads. During loading (user is null), the item is not rendered (spinner shown instead, per existing layout behavior).

**Active state:** Uses `pathname.startsWith('/accounts')` — same pattern as all other nav items.

**Label:** "Accounts"

**No icon.** The existing nav items use text-only links with no icons. Phase 7 adds no icons to maintain visual consistency.

**Tailwind classes:** Identical to existing nav items:
- Active: `flex items-center px-3 py-2 text-sm rounded-md bg-blue-50 text-blue-700 font-medium`
- Inactive: `flex items-center px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100`

### User Info Block

**Current state (layout.tsx lines 57–69):** A `div` containing: email display, role display, sign-out button.

**New state:** The name/email/role information is wrapped in a `<Link href="/settings">` that makes the entire info block clickable. The sign-out button remains outside the link (to avoid nested interactive elements and to ensure sign-out is always available separately).

**Name display:** `user.name || user.email` — if name is an empty string (the default for the seeded owner account before they update their name), the email is shown as the primary display. Once name is set, name takes precedence.

**Secondary line:** When `user.name` is non-empty, show `user.email` as a secondary line in smaller/lighter text. When `user.name` is empty (showing email as primary), omit the secondary line.

**Role display:** Capitalized role text below the name/email, unchanged from current behavior.

**Link styling:** `block hover:bg-gray-50 rounded -mx-1 px-1 py-1 mb-1` — subtle hover state on the link block; negative horizontal margin to extend hover area to edge of the sidebar padding. Matches the spirit of the existing nav hover states.

**Visual structure of the new user block:**
```
[p-4 border-t border-gray-200 text-xs text-gray-500]
  <Link href="/settings" class="block hover:bg-gray-50 rounded -mx-1 px-1 py-1 mb-1">
    <div class="font-medium text-gray-700">{user.name || user.email}</div>
    {user.name && <div class="text-gray-500">{user.email}</div>}
    <div class="capitalize text-gray-400">{user.role}</div>
  </Link>
  <button onClick={signOut} class="text-gray-400 hover:text-gray-600 underline">
    Sign out
  </button>
```

**Sign-out button:** Unchanged from current — same `mt-2 text-gray-400 hover:text-gray-600 underline` styling, same `localStorage.removeItem('auth_token'); window.location.href = '/login'` behavior. The `mt-2` applies to the button directly (it no longer needs it from the link wrapping the block — adjust to `mt-1` or leave as-is depending on visual spacing).

---

## Screen 5: Test Configs — Links Page

### Candidate Name Field

**Placement:** Above the "Generate New Link" button. The generate section becomes a small compound form: Candidate Name input on the left, Generate button on the right, aligned at the bottom (flex row, `items-end`, `gap-2`).

**Before (current):**
```
[flex justify-between items-center mb-4]
  <h2>Test Links</h2>
  {isOwner && <button>Generate New Link</button>}
```

**After:**
```
[flex justify-between items-center mb-4]
  <h2>Test Links</h2>
  {(isOwner || isMember) && (
    [flex gap-2 items-end]
      [div]
        <label>Candidate Name</label>
        <input type="text" placeholder="Optional" value={candidateName} />
      [/div]
      <button disabled={generating}>
        {generating ? 'Generating…' : 'Generate New Link'}
      </button>
    [/div]
  )}
```

**Label:** "Candidate Name" (locked by D-09).

**Placeholder:** "Optional" — communicates the field is not required (locked as optional by D-10).

**Input width:** Does not use `w-full` — natural width in the flex row. Use `w-48` or `w-44` to keep it compact in the header bar. Exact value is implementer's choice as long as it fits the header row without wrapping on a standard 1280px viewport.

**Input styling:** `px-3 py-2 border border-gray-300 rounded-md text-sm` — consistent with other admin inputs.

**candidateName state:** Cleared to `''` after a successful link generation (so the field resets for the next candidate without manual clearing).

### Generate Button

**Visibility:** Changed from `{isOwner && ...}` to `{(isOwner || isMember) && ...}` (D-06). No visual difference between owner and member — both see the identical button style.

**Revoke button:** Remains `{isOwner && ...}` — member cannot revoke links.

**Button Tailwind:** `px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50` — unchanged from current generate button.

### Table Update

**New "Candidate" column:**
- **Header:** "Candidate"
- **accessorKey:** `candidate_name`
- **Position:** First data column — before "Token". The Candidate column appears first because it is the most user-facing field (who is this link for?) and makes scanning the table more intuitive.
- **Null display:** `—` (em dash) when `candidate_name` is null. Pre-Phase-7 links will have null; newly generated links will have the entered name or null if left empty.
- **Cell renderer:** `({ getValue }) => getValue<string | null>() ?? '—'`

**Updated column order:** Candidate | Token | State | Created | Started | Submitted | Actions

### RBAC Display

**isMember variable:** Add alongside existing `isOwner`: `const isMember = userRole === 'member';`

**Generate section:** `{(isOwner || isMember) && <generate section>}` — visible to both.

**Revoke action (in Actions column):** Remains `{isOwner && ...}` — no change to revoke visibility.

**"View result" action:** No change — available regardless of role when state is 'submitted'.

---

## Screen 6: Test Configs — New Page

### Pass Threshold

**Change:** Initial state value `pass_threshold_pct: 70` changes to `pass_threshold_pct: 80` (D-08).

No visual change. The "Pass Threshold %" input label, placeholder, validation, and styling are unchanged. The field simply initialises to 80 instead of 70. The input is still editable — 80 is a default, not a constraint.

**File:** `apps/web/src/app/(admin)/test-configs/new/page.tsx` — one-line change in `useState` initial value.

---

## Screen 7: /admin/accounts/:id/edit — Edit Account

### Layout

Standard admin page layout: `<div className="p-6">`. Page heading. Conditional error paragraphs (fetch error, submit error). Form with `space-y-5 max-w-lg` — identical container to Screen 2 (Create Account).

```
[p-6 container]
  <h2> Edit Account </h2>
  [fetchError paragraph — conditional, replaces form when present]
  [loading paragraph — conditional, shown while fetching account data]
  [submitError paragraph — conditional, above form]
  <form space-y-5 max-w-lg>
    [Name field — pre-filled, editable]
    [Email field — read-only]
    [Role select — pre-filled, editable]
    [Submit button]
  </form>
```

### Fields

| Field | Type | Required | Pre-filled | Editable | Notes |
|-------|------|----------|------------|----------|-------|
| Name | text | yes | `account.name` | yes | Non-empty validation (`min(1)`) |
| Email | email | — | `account.email` | no | `readOnly`; styled `bg-gray-50 cursor-not-allowed text-gray-500`; owner manages email at creation only (D-02/D-03) |
| Role | select | yes | `account.role` | yes | Options: Owner / Reviewer / Member |

**No password field.** Password management is handled via `/settings` for the user's own account. There is no password-reset-for-others feature in Phase 7.

**Email field note:** The read-only email follows the same visual pattern as the Settings page name section — `bg-gray-50 cursor-not-allowed text-gray-500` — communicating non-editability consistently across the app.

**Role select options** (in this order): Owner, Reviewer, Member. Pre-selected to the account's current role on load.

**Field-level error display:** `<p className="text-xs text-red-600 mt-1">{errors.fieldName}</p>` — shown below each field when present. Cleared on input change (matches create page pattern).

**Form-level error display:** `<p className="text-sm text-red-600 mb-4">{submitError}</p>` above the form — shown when the PUT API call fails.

### States

| State | Trigger | UI |
|-------|---------|-----|
| Loading (fetch) | On mount, while `GET /admin/accounts/:id` is in flight | `<p className="text-sm text-gray-400">Loading…</p>` in place of the form |
| Fetch error | `GET /admin/accounts/:id` fails or returns 404 | `<p className="text-sm text-red-600">{fetchError}</p>` in place of the form; no form rendered |
| Ready | Fetch succeeds | Form rendered with pre-filled values |
| Submit loading | PUT in flight | Submit button disabled + `opacity-50`, label changes to "Saving…" |
| Submit error | PUT returns non-2xx | `submitError` set; inline error paragraph above form; form remains editable |
| Field validation error | Client-side validation fails on submit | Per-field error messages shown; no API call made |

### Interactions

**On mount:** Fetch `GET /admin/accounts/:id` to retrieve the account's current `name`, `email`, and `role`. Populate form fields with the response. If the fetch fails (network error, 404, 403), set `fetchError` and display the error in place of the form.

**On submit:**
1. Client-side validate: Name must be non-empty; Role must be one of `owner`, `reviewer`, `member`.
2. If validation passes: call `PUT /admin/accounts/:id` with `{ name, role }`. Email is not sent — it is read-only and excluded from the payload.
3. On success (`2xx`): `router.push('/accounts')` — return to the accounts list.
4. On error: set `submitError` to the API error message if available, else the generic fallback; stay on the form.

**On success navigation:** No toast needed — the list page will reflect the updated values immediately on re-fetch.

**Back navigation:** No explicit "Cancel" button is specified (consistent with the create page). The user may use the browser back button or the sidebar nav to leave without saving.

### Copy

| Element | Text |
|---------|------|
| Page title | "Edit Account" |
| Name label | "Name" |
| Email label | "Email" |
| Email note (implicit, via read-only styling) | — (no additional label note needed; `bg-gray-50` communicates non-editability) |
| Role label | "Role" |
| Submit button (idle) | "Save Changes" |
| Submit button (loading) | "Saving…" |
| Loading state | "Loading…" |
| Fetch error | "Failed to load account." |
| Submit error | "Failed to save changes." |
| Name validation error | "Required" |
| Role validation error | "Required" |

---

## Threat Model

**Password field autocomplete attributes:**
- Create Account form: password input must use `autoComplete="new-password"` to prevent the browser from filling in the admin's own saved credentials. Without this, browsers may autofill the admin's own password into the "Initial Password" field for the new account.
- Settings page, Change Password section: Current Password uses `autoComplete="current-password"`; New Password uses `autoComplete="new-password"`. This enables browsers to offer to update saved passwords for the admin's own account.
- Settings page, Name section's password confirm field: use `autoComplete="current-password"`.

**Initial password visibility:** The Create Account form shows the initial password in a standard password input (dots). The password is not shown in plaintext after form submission. The owner communicates the initial password to the new user out-of-band (per D-02). No "show password" toggle is specified — the owner types it themselves and knows what they typed. No copy-to-clipboard for the password (would not add security value here).

**Role display — member cannot see owner-only controls:**
- The Accounts nav item is conditionally rendered with `user.role === 'owner'` in layout.tsx. Members and Reviewers receive no nav link.
- The "Create Account" button on `/admin/accounts` is gated by the API (403 for non-owners); the page itself is owner-only. If a Member navigates directly to `/admin/accounts`, the API call returns 403 — the page should show an error state. Add a check: if `userRole` is loaded and is not `'owner'`, redirect to `/questions`.
- Question Bank edit/archive/delete buttons: hidden for Members using `const isOwner = userRole === 'owner'` (D-05) — existing pattern, Phase 7 enforces it.
- Test config create/edit/delete: remain owner-only. Member can view the test configs list and navigate to the Links sub-page (D-06), but Create/Edit/Delete buttons use `{isOwner && ...}` guards.

**DELETE /admin/accounts/:id — last owner protection:** The API enforces the 409 guard server-side (count of owner accounts before delete). The UI must surface the error message clearly (not a generic "delete failed") so the owner understands why deletion was prevented. The confirm dialog text does not mention this constraint — it would be confusing to include it in the pre-confirmation step. The error surfaces after the failed API call.

**Session and auth:** No changes to auth token handling in Phase 7. The existing `localStorage.removeItem('auth_token')` sign-out pattern is unchanged. New pages follow the same `api.get('/auth/me')` on mount pattern — unauthorized responses (401) are caught and redirect to `/login`.

---

*Phase: 07-team-management-and-ux-polish*
*UI contract written: 2026-05-07*
*Covers requirements: ACCESS-05, ACCESS-06, ACCESS-07, ACCESS-08, TESTS-06, TESTS-07*
