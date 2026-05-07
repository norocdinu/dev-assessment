---
status: partial
phase: 08-analytics-dashboard-and-submission-deletion
source: [08-VERIFICATION.md]
started: "2026-05-07"
updated: "2026-05-07"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dashboard page renders in browser

expected: Navigate to `/dashboard`; page loads 4 KPI cards (Total Candidates, Pass Rate, Average Score, Weakest Skill Area); loading spinner shows then resolves to data; no console errors
result: [pending]

### 2. Score distribution chart visible

expected: BarChart renders with 6 bars labeled 0-49, 50-59, 60-69, 70-79, 80-89, 90-100; red dashed reference line at y=80% (labeled "Pass threshold")
result: [pending]

### 3. Competency breakdown chart visible

expected: Horizontal BarChart renders with one bar per skill area, x-axis shows 0-100%, bars extend left-to-right; if no submissions exist, shows "No competency data yet" placeholder
result: [pending]

### 4. Delete button role visibility

expected: Log in as owner role → submission detail page shows "Delete Submission" button in top-right alongside PASS/FAIL badge; log in as member or reviewer → button is absent
result: [pending]

### 5. Delete submission flow end-to-end

expected: Owner clicks "Delete Submission" → `window.confirm` dialog appears with text containing "permanently remove this candidate's results" → on confirm: spinner shows ("Deleting…"), `DELETE /admin/submissions/:linkId` called, redirected to `/submissions` list page; deleted submission no longer appears in list
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
