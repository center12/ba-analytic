# Feature: test-case
**Purpose**: Displays, manages, and approves AI-generated test cases for a feature.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `TestCaseDashboard.tsx` | `TestCaseDashboard` | Expandable list of test cases with status/priority badges, approve and delete actions |

## TanStack Query Keys
- `['test-cases', featureId]`

## Dependencies
- **API calls**: `api.testCases.list`, `api.testCases.update`, `api.testCases.delete`
