# Feature: Dev-Task

## Purpose
- Display step-5 generated developer prompts grouped by API, Frontend, and Testing categories.

---

## User Flow
1. Open Developer Tasks panel for current feature.
2. Expand category and task cards to inspect prompts.
3. Copy prompt text or delete obsolete tasks.

---

## Screens
### DeveloperTaskPanel
- Elements:
  - Collapsible panel header with total count
  - Category sections (4A/4B/4C)
  - Per-task card with expand, copy, and delete controls

---

## Components
- `DeveloperTaskPanel` — query-backed grouped task panel.
- `TaskCard` — expandable prompt card with copy/delete actions.

---

## API
### GET `/dev-tasks/feature/:featureId` — list tasks
### DELETE `/dev-tasks/:id` — remove task

---

## UX States
- Empty: component returns `null` when no tasks exist.
- Success: delete shows success toast and refreshes query.
- Error: delete failure shows destructive toast.

---

## Dependencies
- Query key: `['dev-tasks', featureId]`
- API: `api.devTasks.list`, `api.devTasks.remove`
- Shared: `toast`
