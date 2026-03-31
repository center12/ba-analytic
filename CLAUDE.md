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

#### Required API module layout (prompt-safe)

For all backend modules under `apps/api/src/modules/*`, use:

```
<module-name>/
  constants/                 # module constants
  helpers/                   # pure helper utilities
  dto/                       # DTO classes
  <module-name>.controller.ts
  <module-name>.service.ts
  <module-name>.module.ts
```

API naming convention uses **kebab-case**:
- `constants/<domain>.constants.ts` (example: `constants/test-case.constants.ts`)
- `helpers/<domain>.helpers.ts` (example: `helpers/pipeline.helpers.ts`)
- DTOs: `create-*.dto.ts`, `update-*.dto.ts`

Avoid generic root-level names like `constants.ts` or `utils.ts` for new code; prefer domain-scoped filenames in `constants/` and `helpers/`.

| Module | Responsibility |
|---|---|
| `auth` | JWT login (`POST /auth/login`), `JwtAuthGuard` (global — all routes protected by default), `@Public()` decorator to opt out, `AdminSeeder` (creates admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars at startup), `SseJwtAuthGuard` (validates JWT from `?token=` query param for SSE routes) |
| `user` | `GET /users` + `POST /users` — create and list users (no password hash in responses). Imports `AuthModule` to access `AuthService.hashPassword`. |
| `project` | CRUD for `Project` and `Feature`; file uploads via `MulterModule` (memory storage). BA document upload restricted to `.md` only (enforced in `FileInterceptor` options on the controller and as a guard in the service). Screenshots accept any image type. |
| `storage` | `IStorageProvider` interface + `LocalStorageAdapter` (saves to `./uploads/`). Swap for S3 by implementing the interface and rebinding `STORAGE_PROVIDER` token |
| `ai` | `AIProvider` abstract class + `AIProviderFactory`. Concrete providers: `GeminiProvider`, `ClaudeProvider`, `OpenAIProvider`, all using **Vercel AI SDK** (`ai`, `@ai-sdk/*`) |
| `chat` | `ChatSession` + `ChatMessage` CRUD; SSE streaming via NestJS `@Sse()` decorator. The SSE route uses `SseJwtAuthGuard` (reads token from `?token=` query param). |
| `test-case` | `PipelineService` orchestrates the 4-layer AI pipeline; persists `TestCase` records |
| `dev-task` | CRUD for `DeveloperTask` records created by the pipeline |

**`PrismaService`** is declared as a provider in each module that needs it (no global `PrismaModule`).

**Auth flow**: `JwtAuthGuard` is registered globally in `main.ts`. All routes require a valid Bearer token unless decorated with `@Public()`. The only public route is `POST /api/auth/login`. `AdminSeeder` (via `OnApplicationBootstrap`) creates the admin account from env vars if it doesn't exist.

**AI Provider selection**: reads `AI_PROVIDER` env var (`gemini` | `claude` | `openai`), or accepts a `?provider=` query param at runtime. Claude uses inline `cache_control` on all calls via `experimental_providerMetadata`.

**SSE chat flow**: `GET /api/chat/sessions/:id/stream?message=<text>&provider=<name>&token=<jwt>` — token passed as query param because `EventSource` doesn't support custom headers. Persists user message → streams AI response token-by-token → persists completed assistant message on stream close.

### 4-Layer AI Pipeline (`modules/test-case/pipeline.service.ts`)

Triggered by `POST /api/test-cases/feature/:id/generate`. Runs in sequence:

| Layer | Step | Output |
|---|---|---|
| 1A | Domain Extraction | `ExtractedRequirements` (features, rules, criteria, entities) |
| 1B | Behavior Extraction | `ExtractedBehaviors` (actors, actions, rules) — runs in parallel with 1A |
| 2 | Scenario Planning | `TestScenario[]` (happy path, edge cases, errors, boundary, security) |
| 3 | Test Case Generation | `TestCase[]` persisted to DB |
| 4 | Dev Prompt Generation | `DevPrompt { api: DevTaskItem[], frontend: DevTaskItem[], testing: DevTaskItem[] }` → saved to Feature + N `DeveloperTask` records (1 per sub-task; count scales with scenario complexity) |

Each re-run deletes existing `DeveloperTask` records for the feature before creating fresh ones.

### Frontend (`apps/web/src/`)

Feature-based structure:

| Folder | Contents |
|---|---|
| `features/auth/` | `LoginPage`, `LoginForm`; helpers (`getStoredToken`, `setStoredToken`, `decodeTokenPayload`); `auth.types.ts` |
| `features/user/` | `UserManagementPage`, `CreateUserForm`, `UserList` |
| `features/project/` | `ProjectsPage`, `ProjectDetailPage` |
| `features/feature/` | `FeatureDetailPage`, `PipelinePanel`, `DevPromptPanel`, `PipelineWizard` |
| `features/feature/components/` | Feature-scoped components — `BADocFormatGuide` |
| `features/test-case/` | `TestCaseDashboard` |
| `features/chat/` | `ChatSidebar` |
| `features/ai/` | `ModelSelector` (provider selector) |
| `features/dev-task/` | `DeveloperTaskPanel` |
| `components/ui/` | Shared Shadcn/UI primitives |
| `components/ProtectedRoute.tsx` | Redirects unauthenticated users to `/login` |
| `lib/api.ts` | All typed `fetch` wrappers + shared TS interfaces. Injects `Authorization: Bearer` header from `localStorage` on every request. 401 responses clear token and redirect to `/login`. |
| `store/index.ts` | Zustand — active AI provider, selected project/feature |
| `store/auth.store.ts` | Zustand — auth state (`user`, `token`, `isAuthenticated`, `login`, `logout`). Hydrated from `localStorage` on module init. |
| `hooks/use-toast.ts` | Toast notifications |

#### Required feature folder layout (prompt-safe)

For all frontend features under `apps/web/src/features/*`, always use this structure:

```
<feature>/
  components/   # all .tsx components
  helpers/      # helper utilities only
  constants/    # constants only
  types/        # type definitions only
```

File naming convention for shared feature files:
- `<domain>.constants.ts` (e.g. `pipeline-wizard.constants.ts`)
- `<domain>.helpers.ts` (e.g. `pipeline-wizard.helpers.ts`)
- `<domain>.types.ts` (e.g. `pipeline-wizard.types.ts`)

When generating code from prompts, do not mix helpers/constants/types into component files unless there is a strong reason.

Data fetching uses **TanStack Query** with query keys:
- `['projects']`, `['features', projectId]`
- `['test-cases', featureId]`, `['dev-tasks', featureId]`
- `['chat-sessions', featureId]`, `['chat-messages', sessionId]`
- `['users']`

UI components follow **Shadcn/UI** conventions. Add new components with `npx shadcn@latest add <component>` from inside `apps/web`.

### Prisma Schema Key Relationships

```
User (standalone — no relations to other models currently)
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
- `JWT_SECRET` — secret used to sign/verify JWTs (use a long random string in production)
- `ADMIN_USERNAME` — username for the seeded admin account
- `ADMIN_PASSWORD` — password for the seeded admin account (min 6 characters)
