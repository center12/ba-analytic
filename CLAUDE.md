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
pnpm db:migrate       # Run prisma migrate dev
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

### Backend (`apps/api`)

NestJS modules, each self-contained with controller/service/module files:

| Module | Responsibility |
|---|---|
| `ProjectModule` | CRUD for `Project` and `Feature`; file uploads (BA docs, screenshots) via `MulterModule` with memory storage |
| `StorageModule` | `IStorageProvider` interface + `LocalStorageAdapter` (saves to `./uploads/`). Swap for S3 by implementing the interface and rebinding `STORAGE_PROVIDER` token |
| `AIModule` | `AIProvider` abstract class + `AIProviderFactory`. Concrete providers: `GeminiProvider`, `ClaudeProvider`, `OpenAIProvider`, all using **Vercel AI SDK** (`ai`, `@ai-sdk/*`) |
| `ChatModule` | `ChatSession` + `ChatMessage` CRUD; SSE streaming via NestJS `@Sse()` decorator |
| `TestCaseModule` | Queries stored files via `IStorageProvider`, calls `AIProviderFactory`, persists results as `TestCase` records |

**`PrismaService`** is declared as a provider in each module that needs it (no global `PrismaModule`).

**AI Provider selection**: reads `AI_PROVIDER` env var (`gemini` | `claude` | `openai`), or accepts a `?provider=` query param at runtime. Context caching: Gemini uses a no-op (native `CachedContent` API not yet wired); Claude uses inline `cache_control` on message content via Vercel AI SDK `experimental_providerMetadata`.

**SSE chat flow**: `GET /api/chat/sessions/:id/stream?message=<text>&provider=<name>` — persists user message → streams AI response token-by-token → persists completed assistant message on stream close.

### Frontend (`apps/web`)

| File | Role |
|---|---|
| `src/lib/api.ts` | All typed `fetch` wrappers + shared TS interfaces mirroring Prisma models |
| `src/store/index.ts` | Zustand store — selected project/feature/session, active AI provider |
| `src/pages/FeatureDetailPage.tsx` | Main workspace: header (upload + generate), `TestCaseDashboard` (left), `ChatSidebar` (right, 384px fixed) |
| `src/components/ChatSidebar.tsx` | Manages `EventSource` lifecycle for SSE; streams chunks into local state until `done` event |

Data fetching uses **TanStack Query** (`useQuery`/`useMutation`) with query keys `['projects']`, `['features', projectId]`, `['test-cases', featureId]`, `['chat-sessions', featureId]`, `['chat-messages', sessionId]`.

UI components follow **Shadcn/UI** conventions (`components.json` configured). Add new components with `npx shadcn@latest add <component>` from inside `apps/web`.

### Prisma Schema Key Relationships

```
Project → Feature (cascade delete)
Feature → BADocument (1:1, unique), Screenshot (1:many), TestCase (1:many), ChatSession (1:many)
ChatSession → ChatMessage (1:many, cascade delete)
```

`TestCase.steps` is stored as `Json` (array of `{action, expectedResult}`). Enums: `TestCasePriority` (HIGH/MEDIUM/LOW), `TestCaseStatus` (DRAFT/APPROVED/DEPRECATED), `ChatMessageRole` (USER/ASSISTANT).

## Environment

Copy `.env.example` to `apps/api/.env`. Required fields:

- `DATABASE_URL` — PostgreSQL connection string
- At least one of: `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `AI_PROVIDER` — default provider (`gemini` | `claude` | `openai`)
- `AI_MODEL` — model name (e.g. `gemini-2.0-flash`, `claude-sonnet-4-6`, `gpt-4o`)
