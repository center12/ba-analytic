# Feature: Feature Analysis

## Purpose
- Display AI-generated test cases for a feature with priority badges, status management, and step-by-step details.

---

## User Flow
1. Embedded in `FeatureDetailPage` (or standalone); loads test cases by `featureId`.
2. Each test case row shows status icon, title, priority badge, and status label.
3. Click chevron to expand a test case and view preconditions, numbered steps, and AI metadata.
4. Approve a test case via inline button; delete via trash icon.

---

## Screens
### FeatureAnalysisDashboard
- Elements:
  - Count header ("N Test Cases")
  - Collapsible test case rows with priority color badges (`HIGH`/`MEDIUM`/`LOW`)
  - Status icons: `DRAFT` (clock), `APPROVED` (green check), `DEPRECATED` (red X)
  - Approve button (hidden when already APPROVED), delete button
  - Expanded view: preconditions, action/expected-result step list, AI provider/model metadata

---

## Components
- `FeatureAnalysisDashboard` — full test-case list with expand/approve/delete

---

## State
### Local:
- `expanded` — Set of expanded test case IDs

---

## Types
- `FeatureAnalysis` — `{ id, featureId, title, description?, preconditions?, priority: HIGH|MEDIUM|LOW, status: DRAFT|APPROVED|DEPRECATED, steps: [{action, expectedResult}][], aiProvider, modelVersion }`

---

## API
### GET `/feature-analysis/feature/:featureId` — load test cases on mount (query key: `['feature-analysis', featureId]`)
### PUT `/feature-analysis/:id` — update status field (Approve action)
### DELETE `/feature-analysis/:id` — delete test case

---

## UX States
- Loading: shows "Loading test cases..." text
- Empty: centered prompt to upload BA doc and generate
- Error: mutations fail silently (no explicit error toast in this component)
- Success: query invalidated after approve/delete

---

## Dependencies
- API: `api.featureAnalysis`
- Store: none
