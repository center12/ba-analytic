# BA Analytic

An AI-powered platform that transforms Business Analyst documents into test cases, developer tasks, and implementation prompts — ready to paste into any AI coding assistant.

## What It Does

Write or paste a BA specification as **Markdown content** directly in the feature editor, optionally attach design screenshots, then click **Generate**. The platform runs a 5-step AI pipeline that produces:

- **Layer 1 — Requirements & Behaviors** — 4-sublayer extraction: system/business rules (SSR), user stories (with IDs and AC references), rule-to-story traceability map, and a quality validation score
- **Step 2 — Test Scenarios** — categorized scenarios (happy path, edge cases, errors, boundary, security) with requirement references
- **Step 3 — Test Cases** — fully written test cases with preconditions, numbered steps, and expected results, persisted to the database
- **Step 4 — Development Plan** — workflow steps, backend architecture (entities, API routes, folder structure, query design), frontend architecture, and a testing plan; each section can be generated independently
- **Step 5 — Developer Tasks** — focused implementation prompts split by category (API, Frontend, Testing); number of sub-tasks scales with feature complexity

An AI chat sidebar lets you ask questions about the feature in the context of all pipeline outputs. A per-project **Pipeline AI Configuration** panel lets you set different AI providers and models per pipeline step.

**Document versioning**: each feature has a **Publish** button that snapshots the content, bumps a version counter (DRAFT → PUBLISHED), records an AI-generated changelog diff, and automatically re-runs Step 1. For SSR features, publishing triggers an **SSR Sync** check: extracted sub-features that are affected by the content change are flagged as OUT_OF_SYNC. The UI presents a resolution dialog where each conflicted sub-feature can be individually updated (re-derived from the new SSR content), kept as-is (marked DIVERGED), or deleted.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Vite + React + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| AI | Vercel AI SDK — Gemini, Claude, OpenAI |
| Monorepo | pnpm workspaces |
| UI | Shadcn/UI + Tailwind CSS |
| State | TanStack Query + Zustand |

## Project Structure

```
ba-analytic/
├── apps/
│   ├── api/                            # NestJS backend (:3000)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/               # JWT auth — login, guard, admin seeder
│   │       │   ├── user/               # User CRUD
│   │       │   ├── ai/                 # AI providers + factory + shared pipeline types
│   │       │   ├── chat/               # Chat sessions + SSE streaming
│   │       │   ├── dev-task/           # Developer task CRUD
│   │       │   ├── feature-analysis/   # Pipeline orchestration + test case CRUD
│   │       │   ├── feedback/           # User feedback submissions
│   │       │   ├── project/            # Project + Feature CRUD + screenshot uploads
│   │       │   └── storage/            # Storage interface + local adapter
│   │       ├── app.module.ts
│   │       ├── main.ts
│   │       └── prisma.service.ts
│   └── web/                            # Vite + React frontend (:5173)
│       └── src/
│           ├── features/
│           │   ├── auth/               # Login page + auth helpers/types
│           │   ├── user/               # User management page
│           │   ├── ai/                 # Provider/model selector
│           │   ├── chat/               # Chat sidebar (SSE)
│           │   ├── dev-task/           # Developer task panel
│           │   ├── feature/            # Feature detail page + 5-step pipeline wizard
│           │   ├── feature-analysis/   # Test case list with priority/status management
│           │   ├── feedback/           # User feedback dialog and list page
│           │   ├── project/            # Project list + detail pages + feature content editor
│           │   └── test-case/          # Test case dashboard
│           ├── components/
│           │   ├── ui/                 # Shared Shadcn/UI primitives
│           │   └── ProtectedRoute.tsx
│           ├── hooks/
│           ├── lib/api.ts              # Typed fetch wrappers
│           └── store/                  # Zustand global state (app + auth)
└── docker-compose.yml
```

## Frontend Feature Folder Convention

When creating or refactoring code with AI prompts, keep **all feature folders** consistent:

```
apps/web/src/features/<feature-name>/
├── components/   # all .tsx UI components
├── helpers/      # pure helper functions / mappers / transforms
├── constants/    # static config values and UI constants
├── types/        # feature-local TypeScript types
└── *.tsx         # feature entry/container pages (optional)
```

Naming convention for shared files:
- `constants/<domain>.constants.ts` (example: `constants/pipeline-wizard.constants.ts`)
- `helpers/<domain>.helpers.ts` (example: `helpers/pipeline-wizard.helpers.ts`)
- `types/<domain>.types.ts` (example: `types/pipeline-wizard.types.ts`)

Use this pattern for every new feature to keep prompt-driven code generation predictable and maintainable.

## API Module Folder Convention

When creating or refactoring backend modules with AI prompts, keep API modules consistent:

```
apps/api/src/modules/<module-name>/
├── constants/    # module constants
├── helpers/      # pure helper functions
├── dto/          # request/response DTOs
├── <module-name>.controller.ts
├── <module-name>.service.ts
└── <module-name>.module.ts
```

Naming convention (API uses kebab-case):
- `constants/<domain>.constants.ts` (example: `constants/feature-analysis.constants.ts`)
- `helpers/<domain>.helpers.ts` (example: `helpers/pipeline.helpers.ts`)
- DTOs: `create-*.dto.ts`, `update-*.dto.ts`
- Keep controller/service/module filenames in kebab-case to match route/module names.

## Getting Started

### Prerequisites

- Node.js ≥ 22
- pnpm ≥ 9
- Docker (for PostgreSQL)
- At least one AI provider API key

### 1. Clone and install

```bash
git clone <repo-url>
cd ba-analytic
pnpm install
```

### 2. Configure environment

Copy the example files and adjust values as needed:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

`apps/api/.env` contains the NestJS backend settings:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ba_analytic"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ba_analytic

# AI Providers (set the key for whichever provider you use)
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Default AI provider: gemini | claude | openai
AI_PROVIDER=openai

# Model to use per provider (optional — falls back to provider defaults)
GEMINI_MODEL=gemini-2.0-flash
CLAUDE_MODEL=claude-sonnet-4-6
OPENAI_MODEL=gpt-4.1-mini

# Storage
UPLOAD_DIR=./uploads

# App
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Auth
JWT_SECRET=change-me-to-a-long-random-secret-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
```

`apps/web/.env` contains the Vite frontend settings:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_PORT=5173
```

For Docker or Nginx-based deployments, set `VITE_API_BASE_URL=/api` before building the web image so browser requests stay on the same origin and are forwarded by Nginx.

The admin account is created automatically on first startup if no user with that username exists. Change the credentials before deploying.

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Start development servers

```bash
pnpm dev
```

The web app is at [http://localhost:5173](http://localhost:5173). In local development, the frontend calls the API URL from `apps/web/.env`, which defaults to `http://localhost:3000/api`.

## Feature Types

Two feature types are supported, each with an auto-generated code:

| Type | Code prefix | Purpose |
|---|---|---|
| `FEATURE` | `FEA-001`, `FEA-002`, … | A single user-facing capability |
| `SSR` | `SSR-001`, `SSR-002`, … | A System Requirements Specification document covering multiple sub-features |

SSR features get an **Extract Sub-Features** button on the project page. Clicking it sends the SSR content to the AI, which returns a list of sub-features that can then be confirmed and created as individual `FEATURE` records.

## Document Versioning & SSR Sync

### Publishing a Feature

Each feature starts in **DRAFT** status. Clicking **Publish** in the content editor:

1. Snapshots the current content and bumps `publishedVersion`
2. Sets `contentStatus = PUBLISHED`
3. Creates a `FeatureChangelog` entry; an AI diff summary is generated asynchronously and written back to the entry
4. Triggers **Step 1** (Layer 1 extraction) asynchronously if the content changed

Editing the content of a PUBLISHED feature resets its status back to DRAFT until it is published again.

### SSR Sync Resolution

When an **SSR** feature is published with changed content, the platform compares the old and new user stories extracted by Step 1. Extracted `FEATURE` records that trace to modified, added, or removed stories are marked **OUT_OF_SYNC**. A sync warning dialog appears on the project page with three resolution options per conflicted feature:

| Action | Result |
|---|---|
| **Update** | Re-derives the feature content from the parent SSR's current Layer-1 output → `IN_SYNC` |
| **Keep** | Preserves the feature's current content, marks it `DIVERGED` (won't be flagged again) |
| **Remove** | Permanently deletes the extracted feature |

## BA Document Format

Feature content is written as **Markdown** directly in the inline editor on the project detail page. The editor provides template buttons (SSR and FEATURE templates) and a copy-ready AI conversion prompt if you need to convert an existing document.

### Recommended structure

```markdown
# Feature Name

## Overview        — short description
## Actors          — Markdown table: Actor | Role
## User Stories    — bullet list with IDs: US-01, US-02, …
## Functional Requirements  — FR-01, FR-02, …
## Business Rules  — BR-01, BR-02, …
## Acceptance Criteria      — table: ID | Given | When | Then
## Data Entities   — ### sub-section per entity with field table
## User Flows / Actions     — numbered steps
## Validation Rules         — VR-01, VR-02, …
## Out of Scope
## Assumptions & Dependencies
```

The pipeline chunks large documents (`> 40 000 chars`) at section boundaries so no heading is ever separated from its content. Screenshots can be uploaded alongside content for additional visual context.

## AI Pipeline

The pipeline runs when you click **Generate** on a feature.

```
Feature Content
    │
    └─── Step 1 — Layer 1 Extraction (4 sublayers, sequential)
              1A: SSR & Business Rules Extraction
              1B: User Story Extraction
              1C: Rule-to-Story Traceability Mapping
              1D: Quality Validation
                        │
                        ▼
              Step 2: Scenario Planning
                        │
                        ▼
              Step 3: Test Case Generation
                        │
                        ▼
              Step 4: Development Plan
         ┌────────────────┬────────────┬──────────────┐
         4A Workflow +    4B           4C Backend      4C Frontend
            Backend       Frontend     Testing         Testing
                        │
                        ▼
              Step 5: Dev Prompt Generation
         ┌──────────┬──────────────┬─────────┐
         Backend    Frontend       Testing
```

Each step persists its output to the database immediately. **Individual steps and sub-sections can be re-run independently** via the pipeline wizard UI:

- Step 1 sub-sections: `ssr-stories`, `mapping`, `validation`
- Step 4 sub-sections: `workflow-backend` → `frontend` → `testing-backend` / `testing-frontend`
- Step 5 sub-sections: `backend` / `api`, `frontend`, `testing`

A **Manual Edit flow** is available for every step: copy the step's AI prompt, refine the output in an external tool, then paste the JSON back via the Manual panel to save it without re-running the AI.

**Per-project pipeline config**: Each project can override the AI provider and model for each step independently. Runtime `?provider=` and `?model=` query params take highest precedence.

**Supported providers and models:**
- Gemini: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-pro`, `gemini-1.5-flash`
- Claude: `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`, `claude-3-5-sonnet-20241022`
- OpenAI: `gpt-5`, `gpt-5-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`, `o1`, `o3`

## Authentication

All API routes (except `POST /api/auth/login`) require a Bearer token:

```
Authorization: Bearer <token>
```

Login to obtain a token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"changeme123"}'
# → { "accessToken": "..." }
```

Tokens expire after **7 days**. The frontend stores the token in `localStorage` and automatically includes it on every request. On token expiry the user is redirected to `/login`.

The SSE chat stream (`/api/chat/sessions/:id/stream`) passes the token as a query param (`?token=<jwt>`) because the browser `EventSource` API does not support custom headers.

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, returns `accessToken` |
| GET | `/api/users` | required | List all users |
| POST | `/api/users` | required | Create a user |
| GET | `/api/ai/providers` | required | List available providers with model lists |
| GET | `/api/projects` | required | List all projects |
| POST | `/api/projects` | required | Create a project |
| GET | `/api/projects/:id` | required | Get project with features |
| PUT | `/api/projects/:id` | required | Update project overview |
| DELETE | `/api/projects/:id` | required | Delete project (cascade) |
| GET | `/api/projects/:id/features` | required | List features in a project |
| POST | `/api/projects/:id/features` | required | Create a feature (`name`, `description`, `featureType`) |
| GET | `/api/projects/features/:id` | required | Get feature detail |
| PUT | `/api/projects/features/:id` | required | Update feature content / name / relatedFeatureIds |
| DELETE | `/api/projects/features/:id` | required | Delete feature |
| POST | `/api/projects/features/:id/upload/screenshot` | required | Upload screenshot |
| POST | `/api/projects/features/:id/publish` | required | Publish feature (snapshot, bump version, trigger Step 1) |
| GET | `/api/projects/features/:id/changelog` | required | Get version history with AI-generated diffs |
| GET | `/api/projects/:id/pipeline-config` | required | Get per-step AI config |
| PUT | `/api/projects/:id/pipeline-config` | required | Upsert per-step AI config |
| DELETE | `/api/projects/:id/pipeline-config/:step` | required | Remove step config override |
| GET | `/api/feature-analysis/feature/:id` | required | List test cases for a feature |
| POST | `/api/feature-analysis/feature/:id/generate` | required | Run the full AI pipeline |
| POST | `/api/feature-analysis/feature/:id/resume` | required | Resume a failed pipeline run |
| POST | `/api/feature-analysis/feature/:id/run-step/:step` | required | Run a single pipeline step (1–5) |
| POST | `/api/feature-analysis/feature/:id/run-step-1-section/:sublayer` | required | Run one Step 1 sublayer (`ssr-stories` / `mapping` / `validation`) |
| POST | `/api/feature-analysis/feature/:id/run-step-4-section/:section` | required | Run one Step 4 section (`workflow-backend` / `frontend` / `testing-backend` / `testing-frontend`) |
| POST | `/api/feature-analysis/feature/:id/run-step-5-section/:section` | required | Run one Step 5 section (`backend` / `api` / `frontend` / `testing`) |
| POST | `/api/feature-analysis/feature/:id/resume-step1` | required | Resume a failed Step 1 from the failed chunk |
| GET | `/api/feature-analysis/feature/:id/step-prompt/:step` | required | Get the AI prompt for a step (for manual flow) |
| PATCH | `/api/feature-analysis/feature/:id/step-results` | required | Save user-edited step output without re-running AI |
| POST | `/api/feature-analysis/feature/:id/extract-sub-features` | required | AI-extract sub-features from an SSR document |
| GET | `/api/feature-analysis/ssr/:ssrId/sync-warnings` | required | List OUT_OF_SYNC extracted features for an SSR |
| GET | `/api/feature-analysis/feature/:id/sync-status` | required | Get current sync state for an extracted feature |
| POST | `/api/feature-analysis/feature/:id/sync/update` | required | Re-sync from parent SSR (→ IN_SYNC) |
| POST | `/api/feature-analysis/feature/:id/sync/keep` | required | Keep current content, mark DIVERGED |
| DELETE | `/api/feature-analysis/feature/:id/sync/remove` | required | Delete extracted feature |
| PUT | `/api/feature-analysis/:id` | required | Update a test case (e.g. change status) |
| DELETE | `/api/feature-analysis/:id` | required | Delete a test case |
| GET | `/api/dev-tasks/feature/:id` | required | List developer tasks for a feature |
| DELETE | `/api/dev-tasks/:id` | required | Delete a developer task |
| POST | `/api/chat/sessions` | required | Create a chat session |
| GET | `/api/chat/sessions/feature/:id` | required | List sessions for a feature |
| GET | `/api/chat/sessions/:id/stream` | `?token=` | SSE stream — send message + stream response |
| POST | `/api/feedback` | required | Submit user feedback |
| GET | `/api/feedback` | required | List all feedback submissions |

## Adding a New AI Provider

1. Create `apps/api/src/modules/ai/providers/myprovider.provider.ts` extending `AIProvider`
2. Implement all abstract methods defined in `ai-provider.abstract.ts` (extraction, scenario planning, test case generation, dev plan sections, dev prompt sections, chat)
3. Register the provider in `ai.module.ts` and `AIProviderFactory`
4. Add the API key env var mapping in `AIController`'s `KEY_MAP` and `SUPPORTED_MODELS` in `ai.constants.ts`

## Extending Storage

The `IStorageProvider` interface (`modules/storage/storage.interface.ts`) defines `upload`, `getUrl`, and `delete`. Swap `LocalStorageAdapter` for an S3 implementation by implementing the interface and rebinding the `STORAGE_PROVIDER` injection token in `StorageModule`.

## Future Integrations

- **Jira sync** — `DeveloperTask` records are designed to map 1:1 to Jira tickets. A sync adapter can POST tasks to Jira and write back the ticket ID.
- **S3 storage** — replace `LocalStorageAdapter` with an S3 adapter for production file storage.
- **Context caching** — Gemini's `CachedContent` API is not yet wired; Claude's `cache_control` is active on all pipeline calls via `experimental_providerMetadata`.
