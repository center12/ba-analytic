# Feature: project
**Purpose**: CRUD management of projects and their features, plus per-project AI pipeline configuration.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `ProjectsPage.tsx` | `ProjectsPage` | Lists all projects with create/delete actions and logout |
| `ProjectDetailPage.tsx` | `ProjectDetailPage` | Shows project features list with create/delete and pipeline config |

## Components
| File | Purpose |
|------|---------|
| `components/PipelineConfigEditor.tsx` | Per-step AI provider/model overrides for the 4-layer pipeline |

## TanStack Query Keys
- `['projects']`
- `['projects', projectId]`
- `['features', projectId]`
- `['ai-providers']`
- `['project-pipeline-config', projectId]`

## Dependencies
- **API calls**: `api.projects.list`, `api.projects.create`, `api.projects.delete`, `api.projects.get`, `api.projects.getPipelineConfig`, `api.projects.upsertPipelineConfig`, `api.projects.deletePipelineConfigStep`, `api.features.list`, `api.features.create`, `api.features.delete`, `api.ai.getProviders`
- **State**: `useAuthStore` — `user`, `logout`
