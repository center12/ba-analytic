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
| `project` | CRUD for `Project` and `Feature`; feature publish flow (DRAFT→PUBLISHED with `FeatureChangelog`); file uploads via `MulterModule` (memory storage). Screenshots accept any image type. Imports `FeatureAnalysisModule` for publish side-effects (AI changelog diff, Step 1 re-run, OUT_OF_SYNC detection). |
| `storage` | `IStorageProvider` interface + `LocalStorageAdapter` (saves to `./uploads/`). Swap for S3 by implementing the interface and rebinding `STORAGE_PROVIDER` token |
| `ai` | `AIProvider` abstract class + `AIProviderFactory`. Concrete providers: `GeminiProvider`, `ClaudeProvider`, `OpenAIProvider`, all using **Vercel AI SDK** (`ai`, `@ai-sdk/*`) |
| `chat` | `ChatSession` + `ChatMessage` CRUD; SSE streaming via NestJS `@Sse()` decorator. The SSE route uses `SseJwtAuthGuard` (reads token from `?token=` query param). |
| `feature-analysis` | Full 5-step AI pipeline orchestration (`PipelineOrchestratorService`, `PipelineStepRunnerService`); `FeatureAnalysis` CRUD; SSR sub-feature sync lifecycle (`FeatureSyncService`, `ChangeDetectionService`); AI document changelog diff (`DocumentVersionService`). Exports `ChangeDetectionService`, `FeatureSyncService`, `DocumentVersionService`, `PipelineStepRunnerService` for use by `ProjectModule`. |
| `dev-task` | CRUD for `DeveloperTask` records created by the pipeline |
| `feedback` | User feedback submissions with optional file attachments (`POST /feedback`, `GET /feedback`) |

**`PrismaService`** is declared as a provider in each module that needs it (no global `PrismaModule`).

**Auth flow**: `JwtAuthGuard` is registered globally in `main.ts`. All routes require a valid Bearer token unless decorated with `@Public()`. The only public route is `POST /api/auth/login`. `AdminSeeder` (via `OnApplicationBootstrap`) creates the admin account from env vars if it doesn't exist.

**AI Provider selection**: reads `AI_PROVIDER` env var (`gemini` | `claude` | `openai`), or accepts a `?provider=` query param at runtime. Claude uses inline `cache_control` on all calls via `experimental_providerMetadata`.

**SSE chat flow**: `GET /api/chat/sessions/:id/stream?message=<text>&provider=<name>&token=<jwt>` — token passed as query param because `EventSource` doesn't support custom headers. Persists user message → streams AI response token-by-token → persists completed assistant message on stream close.

### 5-Step AI Pipeline (`modules/feature-analysis/pipeline/`)

Triggered by `POST /api/feature-analysis/feature/:id/generate`. Orchestrated by `PipelineOrchestratorService`; each step run by `PipelineStepRunnerService`. Runs in sequence:

| Step | Name | Output |
|---|---|---|
| 1 | Layer 1 Extraction (4 sublayers) | 1A: `SSRData` (FR/BR/SYS/VR rules); 1B: `UserStories[]` (with IDs, AC refs); 1C: `Mapping` (rule-to-story traceability); 1D: `ValidationResult` (score + issues) |
| 2 | Scenario Planning | `TestScenario[]` (happy path, edge cases, errors, boundary, security) |
| 3 | Test Case Generation | `FeatureAnalysis[]` persisted to DB |
| 4 | Development Plan | `DevPlan { workflow, backend, frontend, testing }` — staged sub-runs: 4A workflow+backend, 4B frontend, 4C backend testing, 4C frontend testing |
| 5 | Dev Prompt Generation | `DevPrompt { api: DevTaskItem[], frontend: DevTaskItem[], testing: DevTaskItem[] }` → saved to Feature + N `DeveloperTask` records |

**Step 1 sub-sections** — callable individually via `POST /api/feature-analysis/feature/:id/run-step-1-section/:sublayer`:
- `ssr-stories` — re-runs sublayers 1A+1B (SSR data + user stories) from scratch
- `mapping` — re-runs sublayer 1C (traceability mapping); requires 1A+1B output
- `validation` — re-runs sublayer 1D (quality validation); requires 1A+1B+1C output

**Step 4 sub-sections** — callable individually via `POST /api/feature-analysis/feature/:id/run-step-4-section/:section`:
- `workflow-backend` — generates `WorkflowStep[]` + `BackendPlan`; no prerequisites beyond Step 2
- `frontend` — generates `FrontendPlan`; requires `workflow-backend` first
- `testing-backend` — generates backend testing plan; requires backend output
- `testing-frontend` — generates frontend testing plan; requires backend + frontend outputs
- `testing` — convenience wrapper: runs `testing-backend` then `testing-frontend`

**Step 5 sub-sections** — callable individually via `POST /api/feature-analysis/feature/:id/run-step-5-section/:section`:
- `backend` / `api` (alias) — generates backend/API dev prompts
- `frontend` — generates frontend dev prompts
- `testing` — generates testing dev prompts

Each re-run of Step 5 deletes existing `DeveloperTask` records for the feature before creating fresh ones.

**Resume**: `POST /api/feature-analysis/feature/:id/resume` resumes from the failed step when `pipelineStatus = FAILED`. Step 1 can also be resumed mid-chunk via `POST /api/feature-analysis/feature/:id/resume-step1`.

**SSR sync**: After Step 1 re-runs on an SSR feature, `FeatureSyncService.markAffectedOutOfSync` compares old vs new user stories and marks only affected extracted FEATURE records as `OUT_OF_SYNC`. The frontend then calls `GET /api/feature-analysis/ssr/:ssrId/sync-warnings` and lets the user resolve each via `sync/update` (→ IN_SYNC), `sync/keep` (→ DIVERGED), or `sync/remove` (delete).

### Frontend (`apps/web/src/`)

Feature-based structure:

| Folder | Contents |
|---|---|
| `features/auth/` | `LoginPage`, `LoginForm`; helpers (`getStoredToken`, `setStoredToken`, `decodeTokenPayload`); `auth.types.ts` |
| `features/user/` | `UserManagementPage`, `CreateUserForm`, `UserList` |
| `features/project/` | `ProjectsPage`, `ProjectDetailPage`, `FeatureContentEditor` (Publish + changelog), `SSRExtractModal`, `SSRSyncWarningDialog`, `FeatureChangelogPanel`, `PipelineConfigEditor`, `ProjectOverview`; hooks: `use-feature-sync.ts` |
| `features/feature/` | `FeatureDetailPage`, `PipelineWizard` (Steps 1–5), `DevPlanPanel`, `DevPromptPanel`, `ManualPanel`, `EditableList`, step sub-panels |
| `features/feature-analysis/` | Test case list with priority/status management embedded in `FeatureDetailPage` |
| `features/chat/` | `ChatSidebar` with SSE streaming |
| `features/ai/` | `ModelSelector` (provider + model selector) |
| `features/dev-task/` | `DeveloperTaskPanel` |
| `features/feedback/` | `AppFeedbackDialog`, feedback list page |
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
- `['projects']`, `['projects', projectId]`, `['features', projectId]`, `['features', featureId]`
- `['feature-analysis', featureId]`, `['dev-tasks', featureId]`
- `['feature-changelog', featureId]`
- `['ssr-sync-warnings', ssrId]`, `['feature-sync-status', featureId]`
- `['chat-sessions', featureId]`, `['chat-messages', sessionId]`
- `['ai-providers']`, `['project-pipeline-config', projectId]`
- `['users']`

UI components follow **Shadcn/UI** conventions. Add new components with `npx shadcn@latest add <component>` from inside `apps/web`.

### Prisma Schema Key Relationships

```
User (standalone — no relations to other models currently)
Project → Feature (cascade delete)
         → ProjectPipelineConfig (1:many)
Feature → Screenshot (1:many)
        → FeatureChangelog (1:many) — publish version history
        → FeatureAnalysis (1:many) — generated test cases
        → ChatSession (1:many, cascade delete)
        → DeveloperTask (1:many, cascade delete)
Feature (SSR) → Feature (FEATURE, via extractedFromSSRId) — SSR sub-feature extraction
ChatSession → ChatMessage (1:many, cascade delete)
```

Key Feature fields: `content`, `contentStatus` (DRAFT/PUBLISHED), `publishedVersion`, `publishedContent`, `featureType` (FEATURE/SSR), `code` (FEA-001 / SSR-001), `syncStatus` (IN_SYNC/OUT_OF_SYNC/DIVERGED), `layer1SSR`, `layer1Stories`, `layer1Mapping`, `layer1Validation`, `pipelineStatus`, `pipelineStep`.

Enums: `FeatureAnalysisPriority` (HIGH/MEDIUM/LOW), `FeatureAnalysisStatus` (DRAFT/APPROVED/DEPRECATED), `ChatMessageRole` (USER/ASSISTANT), `DevTaskCategory` (API/FRONTEND/TESTING), `FeatureType` (FEATURE/SSR).

`FeatureAnalysis.steps` is stored as `Json` (array of `{action, expectedResult}`).

## Environment

Copy `.env.example` to `apps/api/.env`. Required fields:

- `DATABASE_URL` — PostgreSQL connection string
- At least one of: `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `AI_PROVIDER` — default provider (`gemini` | `claude` | `openai`)
- `AI_MODEL` — model name (e.g. `gemini-2.0-flash`, `claude-sonnet-4-6`, `gpt-4o`)
- `JWT_SECRET` — secret used to sign/verify JWTs (use a long random string in production)
- `ADMIN_USERNAME` — username for the seeded admin account
- `ADMIN_PASSWORD` — password for the seeded admin account (min 6 characters)
