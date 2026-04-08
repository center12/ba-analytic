# Feature: Project

## Purpose
- Manage projects and project-scoped features, including per-step AI pipeline defaults.

---

## User Flow
1. View all projects, create/delete projects, or navigate into one project.
2. Inside project detail, create/delete features and open a feature detail page.
3. Configure pipeline step overrides (provider/model) and save project defaults.

---

## Screens
### ProjectsPage
- Elements:
  - Project list with feature counts
  - New project form toggle
  - User management and logout actions

### ProjectDetailPage
- Elements:
  - Project metadata header
  - Features list and create form
  - `PipelineConfigEditor` in collapsible section

---

## Components
- `ProjectsPage` — top-level project CRUD list and auth shortcuts.
- `ProjectDetailPage` — feature CRUD within one project.
- `PipelineConfigEditor` — edit/save per-step provider-model overrides.

---

## API
### GET `/projects` / POST `/projects` / DELETE `/projects/:id`
### GET `/projects/:id`
### GET `/projects/:projectId/features` / POST `/projects/:projectId/features`
### DELETE `/projects/features/:featureId`
### GET `/projects/:projectId/pipeline-config`
### PUT `/projects/:projectId/pipeline-config`
### DELETE `/projects/:projectId/pipeline-config/:step`
### GET `/ai/providers`

---

## Dependencies
- Query keys: `['projects']`, `['projects', projectId]`, `['features', projectId]`, `['ai-providers']`, `['project-pipeline-config', projectId]`
- API: `api.projects`, `api.features`, `api.ai.getProviders`
- Store: `useAuthStore` (`user`, `logout`)
