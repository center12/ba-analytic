# Feature: dev-task
**Purpose**: Displays pipeline-generated developer task prompts grouped by category (API/Frontend/Testing).

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `DeveloperTaskPanel.tsx` | `DeveloperTaskPanel` | Collapsible panel grouping dev tasks by category with copy-prompt and delete per task |

## TanStack Query Keys
- `['dev-tasks', featureId]`

## Dependencies
- **API calls**: `api.devTasks.list`, `api.devTasks.remove`
