# Feature: Test-Case

## Purpose
- Display and manage generated test cases, including approve and delete operations.

---

## User Flow
1. Open test case dashboard from feature pipeline step 3.
2. Review generated test cases and expand details/steps.
3. Approve or delete individual test cases.

---

## Screens
### TestCaseDashboard
- Elements:
  - Count header and expandable test case cards
  - Status icon + priority badge
  - Approve and delete actions

---

## Components
- `TestCaseDashboard` — query-backed test case list with expandable details and mutations.

---

## API
### GET `/test-cases/feature/:featureId` — list test cases
### PUT `/test-cases/:id` — update status
### DELETE `/test-cases/:id` — delete case

---

## UX States
- Loading: shows loading message.
- Empty: shows guidance to upload BA doc and generate.
- Success: mutations invalidate list query.

---

## Dependencies
- Query key: `['test-cases', featureId]`
- API: `api.testCases.list`, `api.testCases.update`, `api.testCases.delete`
