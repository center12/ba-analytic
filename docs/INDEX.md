# Documentation Index
_Last updated: 2026-04-15_
## Frontend Features (`apps/web/src/features/`)
| Feature | Doc | Purpose |
|---------|-----|---------|
| auth | [docs/features/auth.md](features/auth.md) | Login/logout and JWT token management |
| user | [docs/features/user.md](features/user.md) | Admin interface for creating and listing users |
| project | [docs/features/project.md](features/project.md) | Project workspace for overview docs, feature editing, SSR extraction, and pipeline defaults |
| feature | [docs/features/feature.md](features/feature.md) | Feature detail page for running the 5-step AI pipeline, reviewing outputs, and accessing developer tasks |
| feature-analysis | [docs/features/feature-analysis.md](features/feature-analysis.md) | Test case list with priority/status management and step-by-step detail view (embedded in FeatureDetailPage) |
| test-case | [docs/features/test-case.md](features/test-case.md) | Display and manage AI-generated test cases |
| chat | [docs/features/chat.md](features/chat.md) | SSE streaming AI chat sidebar scoped to a feature |
| dev-task | [docs/features/dev-task.md](features/dev-task.md) | Developer task prompts grouped by API/Frontend/Testing |
| ai | [docs/features/ai.md](features/ai.md) | Global AI provider and model selector |
| feedback | [docs/features/feedback.md](features/feedback.md) | Submit and view app-wide user feedback with optional file attachments |

## Backend Modules (`apps/api/src/modules/`)
| Module | Doc | Purpose |
|--------|-----|---------|
| auth | [docs/modules/auth.md](modules/auth.md) | JWT auth, route guards, and admin bootstrap seeding |
| user | [docs/modules/user.md](modules/user.md) | User creation/listing with safe response projection |
| project | [docs/modules/project.md](modules/project.md) | Project/feature CRUD, uploads, and pipeline step config |
| storage | [docs/modules/storage.md](modules/storage.md) | Pluggable storage provider contract with local adapter |
| ai | [docs/modules/ai.md](modules/ai.md) | Provider discovery and factory for model-backed operations |
| chat | [docs/modules/chat.md](modules/chat.md) | Feature chat sessions/messages with SSE AI streaming |
| feature-analysis | [docs/modules/feature-analysis.md](modules/feature-analysis.md) | Multi-step AI pipeline and test/dev output persistence |
| dev-task | [docs/modules/dev-task.md](modules/dev-task.md) | Read/delete API for pipeline-generated developer tasks |
| feedback | [docs/modules/feedback.md](modules/feedback.md) | App-wide user feedback submissions with optional file attachments |

## Usage
Reference these docs instead of source code to reduce token usage:
```
Read docs/features/chat.md, then add a "mark as read" button to ChatSidebar.
```
