# BA Analytic

An AI-powered platform that transforms Business Analyst documents into test cases, developer tasks, and implementation prompts — ready to paste into any AI coding assistant.

## What It Does

Upload a BA specification document as a **Markdown (`.md`) file**, optionally attach design screenshots, then click **Generate**. The platform runs a 4-layer AI pipeline that produces:

- **Extracted Requirements** — domain features, business rules, acceptance criteria
- **Extracted Behaviors** — actors, user actions, behavioral rules
- **Test Scenarios** — categorized scenarios (happy path, edge cases, errors, boundary, security)
- **Test Cases** — fully written test cases with steps and expected results, persisted to the database
- **Development Plan** — workflow steps, backend architecture (entities, API routes, folder structure), frontend architecture, and a testing plan; each section can be generated independently
- **Developer Tasks** — focused implementation prompts split into sub-tasks per category (API, Frontend, Testing); number of sub-tasks scales with feature complexity

An AI chat sidebar lets you ask questions about the feature in the context of all uploaded documents.

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
│   ├── api/                        # NestJS backend (:3000)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/           # JWT auth — login, guard, admin seeder
│   │       │   ├── user/           # User CRUD
│   │       │   ├── ai/             # AI providers + factory
│   │       │   ├── chat/           # Chat sessions + SSE streaming
│   │       │   ├── dev-task/       # Developer task CRUD
│   │       │   ├── project/        # Project + Feature CRUD + file uploads
│   │       │   ├── storage/        # Storage interface + local adapter
│   │       │   └── test-case/      # Pipeline orchestration + test case CRUD
│   │       ├── app.module.ts
│   │       ├── main.ts
│   │       └── prisma.service.ts
│   └── web/                        # Vite + React frontend (:5173)
│       └── src/
│           ├── features/
│           │   ├── auth/           # Login page + auth helpers/types
│           │   ├── user/           # User management page
│           │   ├── ai/             # Provider selector
│           │   ├── chat/           # Chat sidebar (SSE)
│           │   ├── dev-task/       # Developer task panel
│           │   ├── feature/        # Feature detail page + pipeline panels
│           │   │   └── components/ # Feature-scoped components (BADocFormatGuide, …)
│           │   ├── project/        # Project list + detail pages
│           │   └── test-case/      # Test case dashboard
│           ├── components/
│           │   ├── ui/             # Shared Shadcn/UI primitives
│           │   └── ProtectedRoute.tsx
│           ├── hooks/
│           ├── lib/api.ts          # Typed fetch wrappers
│           └── store/              # Zustand global state (app + auth)
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
- `constants/<domain>.constants.ts` (example: `constants/test-case.constants.ts`)
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

Copy `.env.example` (repo root) to `apps/api/.env` and fill in your values:

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
AI_PROVIDER=gemini

# Model to use per provider (optional — falls back to the defaults below)
GEMINI_MODEL=gemini-2.0-flash
CLAUDE_MODEL=claude-sonnet-4-6
OPENAI_MODEL=gpt-4o

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

The web app is at [http://localhost:5173](http://localhost:5173). All `/api` requests are proxied to the NestJS server on `:3000`.

## BA Document Format

BA documents must be uploaded as **Markdown (`.md`) files**. Binary formats (PDF, DOCX) are not supported — the pipeline reads the document as plain text and chunks it section-by-section for the AI.

A **Format Guide** button is available in the UI next to the upload button. It provides:
- A downloadable Markdown template (`ba-document-template.md`)
- A copy-ready AI conversion prompt for converting existing documents via ChatGPT/Claude

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

The pipeline chunks large documents at `##` section boundaries so no heading is ever separated from its content. Screenshots can still be uploaded separately for additional visual context.

## AI Pipeline

The pipeline runs when you click **Generate** on a feature with an uploaded BA document.

```
BA Document
    │
    ├─── Step 1A: Domain Extraction ──────────────────────┐
    │                                                      ├─▶ Step 2: Scenario Planning
    └─── Step 1B: Behavior Extraction ────────────────────┘        │
                                                                    ▼
                                                           Step 3: Test Case Generation
                                                                    │
                                                                    ▼
                                                           Step 4: Development Plan
                                                           ┌──────────────┬──────────┬─────────┐
                                                           4A Workflow+   4B         4C
                                                              Backend     Frontend   Testing
                                                                    │
                                                                    ▼
                                                           Step 5: Dev Prompt Generation
                                                           ┌────────┬──────────┬─────────┐
                                                           API     Frontend   Testing
```

Steps 1A and 1B run in parallel. Each step's output is saved to the database immediately so the UI can show partial results.

**Step 4 sections are individually regenerable** — each section (Workflow+Backend, Frontend, Testing) has its own generate button in the UI and can be re-run independently. Frontend requires Workflow+Backend first; Testing requires both.

**Supported providers**: Gemini (`gemini-2.0-flash`), Claude (`claude-sonnet-4-6`), OpenAI (`gpt-4o`). The active provider is selectable in the UI at runtime.

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
| GET | `/api/ai/providers` | required | List available providers |
| GET | `/api/projects` | required | List all projects |
| POST | `/api/projects` | required | Create a project |
| GET | `/api/projects/:id/features` | required | List features in a project |
| POST | `/api/projects/:id/features` | required | Create a feature |
| POST | `/api/projects/features/:id/upload/ba-document` | required | Upload BA document |
| POST | `/api/projects/features/:id/upload/screenshot` | required | Upload screenshot |
| GET | `/api/test-cases/feature/:id` | required | List test cases for a feature |
| POST | `/api/test-cases/feature/:id/generate` | required | Run the full AI pipeline |
| POST | `/api/test-cases/feature/:id/run-step/:step` | required | Run a single pipeline step (1–5) |
| POST | `/api/test-cases/feature/:id/run-step-4-section/:section` | required | Generate one Step 4 section (`workflow-backend` / `frontend` / `testing`) |
| GET | `/api/dev-tasks/feature/:id` | required | List developer tasks for a feature |
| DELETE | `/api/dev-tasks/:id` | required | Delete a developer task |
| POST | `/api/chat/sessions` | required | Create a chat session |
| GET | `/api/chat/sessions/feature/:id` | required | List sessions for a feature |
| GET | `/api/chat/sessions/:id/stream` | `?token=` | SSE stream — send message + stream response |

## Adding a New AI Provider

1. Create `apps/api/src/modules/ai/providers/myprovider.provider.ts` extending `AIProvider`
2. Implement all abstract methods: `extractRequirements`, `extractBehaviors`, `planTestScenarios`, `generateTestCasesFromScenarios`, `generateDevPlanWorkflowBackend`, `generateDevPlanFrontend`, `generateDevPlanTesting`, `generateDevPrompt`, `chat`
3. Register the provider in `AIProviderFactory` and add the API key mapping

## Extending Storage

The `IStorageProvider` interface (`modules/storage/storage.interface.ts`) defines `save`, `getSignedUrl`, and `delete`. Swap `LocalStorageAdapter` for an S3 implementation by implementing the interface and rebinding the `STORAGE_PROVIDER` injection token in `StorageModule`.

## Future Integrations

- **Jira sync** — `DeveloperTask` records are designed to map 1:1 to Jira tickets. A sync adapter can POST tasks to Jira and write back the ticket ID.
- **S3 storage** — replace `LocalStorageAdapter` with an S3 adapter for production file storage.
- **Context caching** — Gemini's `CachedContent` API is not yet wired; Claude's `cache_control` is active on all pipeline calls.
