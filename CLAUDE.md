# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start everything (API + Web)
pnpm dev

# Individual apps
pnpm dev:api          # NestJS on :3000
pnpm dev:web          # Vite on :5173

# Database
docker-compose up -d  # Start PostgreSQL
pnpm db:migrate       # Run prisma migrate dev (interactive — use --name flag to skip prompt)
pnpm db:studio        # Open Prisma Studio

# Build
pnpm build:api
pnpm build:web

# Inside apps/api only
pnpm --filter api prisma:generate   # Regenerate Prisma client after schema changes
```

All API routes are prefixed with `/api`. The Vite dev server proxies `/api` → `http://localhost:3000`.

## Architecture

This is a **pnpm monorepo** with two apps:

- `apps/api` — NestJS backend
- `apps/web` — Vite + React frontend

### Backend (`apps/api/src/modules/`)

All NestJS modules live under `src/modules/`. Each is self-contained with controller/service/module files.

| Module | Responsibility |
|---|---|
| `project` | CRUD for `Project` and `Feature`; file uploads (BA docs, screenshots) via `MulterModule` with memory storage |
| `storage` | `IStorageProvider` interface + `LocalStorageAdapter` (saves to `./uploads/`). Swap for S3 by implementing the interface and rebinding `STORAGE_PROVIDER` token |
| `ai` | `AIProvider` abstract class + `AIProviderFactory`. Concrete providers: `GeminiProvider`, `ClaudeProvider`, `OpenAIProvider`, all using **Vercel AI SDK** (`ai`, `@ai-sdk/*`) |
| `chat` | `ChatSession` + `ChatMessage` CRUD; SSE streaming via NestJS `@Sse()` decorator |
| `test-case` | `PipelineService` orchestrates the 4-layer AI pipeline; persists `TestCase` records |
| `dev-task` | CRUD for `DeveloperTask` records created by the pipeline |

**`PrismaService`** is declared as a provider in each module that needs it (no global `PrismaModule`).

**AI Provider selection**: reads `AI_PROVIDER` env var (`gemini` | `claude` | `openai`), or accepts a `?provider=` query param at runtime. Claude uses inline `cache_control` on all calls via `experimental_providerMetadata`.

**SSE chat flow**: `GET /api/chat/sessions/:id/stream?message=<text>&provider=<name>` — persists user message → streams AI response token-by-token → persists completed assistant message on stream close.

### 4-Layer AI Pipeline (`modules/test-case/pipeline.service.ts`)

Triggered by `POST /api/test-cases/feature/:id/generate`. Runs in sequence:

| Layer | Step | Output |
|---|---|---|
| 1A | Domain Extraction | `ExtractedRequirements` (features, rules, criteria, entities) |
| 1B | Behavior Extraction | `ExtractedBehaviors` (actors, actions, rules) — runs in parallel with 1A |
| 2 | Scenario Planning | `TestScenario[]` (happy path, edge cases, errors, boundary, security) |
| 3 | Test Case Generation | `TestCase[]` persisted to DB |
| 4 | Dev Prompt Generation | `DevPrompt { api, frontend, testing }` → saved to Feature + 3 `DeveloperTask` records |

Each re-run deletes existing `DeveloperTask` records for the feature before creating fresh ones.

### Frontend (`apps/web/src/`)

Feature-based structure:

| Folder | Contents |
|---|---|
| `features/project/` | `ProjectsPage`, `ProjectDetailPage` |
| `features/feature/` | `FeatureDetailPage`, `PipelinePanel`, `DevPromptPanel` |
| `features/test-case/` | `TestCaseDashboard` |
| `features/chat/` | `ChatSidebar` |
| `features/ai/` | `ModelSelector` (provider selector) |
| `features/dev-task/` | `DeveloperTaskPanel` |
| `components/ui/` | Shared Shadcn/UI primitives |
| `lib/api.ts` | All typed `fetch` wrappers + shared TS interfaces |
| `store/index.ts` | Zustand — active AI provider |
| `hooks/use-toast.ts` | Toast notifications |

Data fetching uses **TanStack Query** with query keys:
- `['projects']`, `['features', projectId]`
- `['test-cases', featureId]`, `['dev-tasks', featureId]`
- `['chat-sessions', featureId]`, `['chat-messages', sessionId]`

UI components follow **Shadcn/UI** conventions. Add new components with `npx shadcn@latest add <component>` from inside `apps/web`.

### Prisma Schema Key Relationships

```
Project → Feature (cascade delete)
Feature → BADocument (1:1), Screenshot (1:many), TestCase (1:many),
          ChatSession (1:many), DeveloperTask (1:many, cascade delete)
ChatSession → ChatMessage (1:many, cascade delete)
```

Enums: `TestCasePriority` (HIGH/MEDIUM/LOW), `TestCaseStatus` (DRAFT/APPROVED/DEPRECATED), `ChatMessageRole` (USER/ASSISTANT), `DevTaskCategory` (API/FRONTEND/TESTING).

`TestCase.steps` is stored as `Json` (array of `{action, expectedResult}`).

## Environment

Copy `.env.example` to `apps/api/.env`. Required fields:

- `DATABASE_URL` — PostgreSQL connection string
- At least one of: `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `AI_PROVIDER` — default provider (`gemini` | `claude` | `openai`)
- `AI_MODEL` — model name (e.g. `gemini-2.0-flash`, `claude-sonnet-4-6`, `gpt-4o`)
