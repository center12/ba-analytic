# BA Analytic

An AI-powered platform that transforms Business Analyst documents into test cases, developer tasks, and implementation prompts — ready to paste into any AI coding assistant.

## What It Does

Upload a BA specification document (PDF, Word, or plain text), optionally attach design screenshots, then click **Generate**. The platform runs a 4-layer AI pipeline that produces:

- **Extracted Requirements** — domain features, business rules, acceptance criteria
- **Extracted Behaviors** — actors, user actions, behavioral rules
- **Test Scenarios** — categorized scenarios (happy path, edge cases, errors, boundary, security)
- **Test Cases** — fully written test cases with steps and expected results, persisted to the database
- **Developer Tasks** — three ready-to-copy implementation prompts: API, Frontend, and Testing

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
│           │   ├── ai/             # Provider selector
│           │   ├── chat/           # Chat sidebar (SSE)
│           │   ├── dev-task/       # Developer task panel
│           │   ├── feature/        # Feature detail page + pipeline panels
│           │   ├── project/        # Project list + detail pages
│           │   └── test-case/      # Test case dashboard
│           ├── components/ui/      # Shared Shadcn/UI primitives
│           ├── hooks/
│           ├── lib/api.ts          # Typed fetch wrappers
│           └── store/              # Zustand global state
└── docker-compose.yml
```

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
```

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

## AI Pipeline

The pipeline runs when you click **Generate** on a feature with an uploaded BA document.

```
BA Document
    │
    ├─── Layer 1A: Domain Extraction ─────────────────────┐
    │                                                      ├─▶ Layer 2: Scenario Planning
    └─── Layer 1B: Behavior Extraction ───────────────────┘        │
                                                                    ▼
                                                           Layer 3: Test Case Generation
                                                                    │
                                                                    ▼
                                                           Layer 4: Dev Prompt Generation
                                                           ┌────────┬──────────┬─────────┐
                                                           4A API  4B Frontend 4C Testing
```

Layers 1A and 1B run in parallel. Each layer's output is saved to the database immediately so the UI can show partial results.

**Supported providers**: Gemini (`gemini-2.0-flash`), Claude (`claude-sonnet-4-6`), OpenAI (`gpt-4o`). The active provider is selectable in the UI at runtime.

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/ai/providers` | List available providers (those with API keys configured) |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id/features` | List features in a project |
| POST | `/api/projects/:id/features` | Create a feature |
| POST | `/api/projects/features/:id/upload/ba-document` | Upload BA document |
| POST | `/api/projects/features/:id/upload/screenshot` | Upload screenshot |
| GET | `/api/test-cases/feature/:id` | List test cases for a feature |
| POST | `/api/test-cases/feature/:id/generate` | Run the AI pipeline |
| GET | `/api/dev-tasks/feature/:id` | List developer tasks for a feature |
| DELETE | `/api/dev-tasks/:id` | Delete a developer task |
| POST | `/api/chat/sessions` | Create a chat session |
| GET | `/api/chat/sessions/feature/:id` | List sessions for a feature |
| GET | `/api/chat/sessions/:id/stream` | SSE stream — send message + stream response |

## Adding a New AI Provider

1. Create `apps/api/src/modules/ai/providers/myprovider.provider.ts` extending `AIProvider`
2. Implement all abstract methods: `extractRequirements`, `extractBehaviors`, `planTestScenarios`, `generateTestCasesFromScenarios`, `generateDevPrompt`, `chat`
3. Register the provider in `AIProviderFactory` and add the API key mapping

## Extending Storage

The `IStorageProvider` interface (`modules/storage/storage.interface.ts`) defines `save`, `getSignedUrl`, and `delete`. Swap `LocalStorageAdapter` for an S3 implementation by implementing the interface and rebinding the `STORAGE_PROVIDER` injection token in `StorageModule`.

## Future Integrations

- **Jira sync** — `DeveloperTask` records are designed to map 1:1 to Jira tickets. A sync adapter can POST tasks to Jira and write back the ticket ID.
- **S3 storage** — replace `LocalStorageAdapter` with an S3 adapter for production file storage.
- **Context caching** — Gemini's `CachedContent` API is not yet wired; Claude's `cache_control` is active on all pipeline calls.
