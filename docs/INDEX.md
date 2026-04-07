# Documentation Index
_Last updated: 2026-04-07_

## Frontend Features (`apps/web/src/features/`)
| Feature | Doc | Purpose |
|---------|-----|---------|
| auth | [docs/features/auth.md](features/auth.md) | Login/logout and JWT token management |
| user | [docs/features/user.md](features/user.md) | Admin interface for creating and listing users |
| project | [docs/features/project.md](features/project.md) | CRUD for projects/features and per-project AI pipeline config |
| feature | [docs/features/feature.md](features/feature.md) | Feature detail view with BA doc/screenshot upload and 5-step AI pipeline wizard |
| test-case | [docs/features/test-case.md](features/test-case.md) | Display and manage AI-generated test cases |
| chat | [docs/features/chat.md](features/chat.md) | SSE streaming AI chat sidebar scoped to a feature |
| dev-task | [docs/features/dev-task.md](features/dev-task.md) | Developer task prompts grouped by API/Frontend/Testing |
| ai | [docs/features/ai.md](features/ai.md) | Global AI provider and model selector |

## Backend Modules (`apps/api/src/modules/`)
| Module | Doc | Purpose |
|--------|-----|---------|
| auth | [docs/modules/auth.md](modules/auth.md) | JWT authentication, password hashing, admin seeding |
| user | [docs/modules/user.md](modules/user.md) | Create and list application users |
| project | [docs/modules/project.md](modules/project.md) | CRUD for projects/features, file uploads, pipeline config |
| storage | [docs/modules/storage.md](modules/storage.md) | Swappable file storage abstraction (local disk by default) |
| ai | [docs/modules/ai.md](modules/ai.md) | AI provider registry and abstract pipeline interface |
| chat | [docs/modules/chat.md](modules/chat.md) | Chat sessions and SSE streaming AI responses |
| test-case | [docs/modules/test-case.md](modules/test-case.md) | 4-layer AI pipeline to generate and persist test cases |
| dev-task | [docs/modules/dev-task.md](modules/dev-task.md) | CRUD for pipeline step-4 developer task records |

## Usage
Reference these docs instead of source code to reduce token usage:
```
Read docs/features/chat.md, then add a "mark as read" button to ChatSidebar.
```
