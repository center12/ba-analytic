# Module: chat
**Purpose**: Provides feature-scoped chat sessions/messages and SSE token streaming for AI responses.

## Scope
- In: chat session CRUD, message history reads, stream orchestration and persistence
- Out: text generation delegated to `AIProviderFactory` providers; auth delegated to global and SSE guards

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `ChatSession` | `id`, `featureId`, `title`, timestamps | Postgres |
| `ChatMessage` | `id`, `sessionId`, `role(USER/ASSISTANT)`, `content`, timestamp | Postgres |

**Relationships**: `Feature (1) -> (N) ChatSession`; `ChatSession (1) -> (N) ChatMessage`.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| POST | `/api/chat/sessions` | body:`featureId`, `title?` | created session (`title` defaults to `New Chat`) | validation/auth errors |
| GET | `/api/chat/sessions/feature/:featureId` | path:`featureId` | session list + message counts | `401/403` |
| GET | `/api/chat/sessions/:sessionId/messages` | path:`sessionId` | ordered message list | `404 Session not found` |
| DELETE | `/api/chat/sessions/:sessionId` | path:`sessionId` | deleted session | `404 Session not found` |
| GET (SSE) | `/api/chat/sessions/:sessionId/stream` | query:`message`, `provider?`, `token` | SSE chunks `{"chunk":"..."}` then `{"done":true}` | `401 token invalid/missing`, `404 session` |

## Core Flows (top 3)
### Start streaming chat response
1. SSE guard validates JWT from `?token=`.
2. Verify session exists; persist incoming user message.
3. Load message history and resolve provider.
4. Stream chunk events as provider yields text.
5. Persist final assistant message and emit done event.

### Session lifecycle
1. Create session with feature ID and optional title.
2. Fetch sessions by feature ordered newest first.
3. Delete session by ID (messages removed by DB cascade).

### Message retrieval
1. Validate session existence.
2. Query messages ordered by `createdAt asc`.
3. Return full transcript for frontend rendering.

## Constraints
- SSE endpoint requires query token due to EventSource header limitations.
- Stream persists messages before and after generation for durable conversation history.
- Missing session IDs throw `NotFoundException`.

## Dependencies
- Depends on: `PrismaService`, `AIProviderFactory` (`AIModule`), `SseJwtAuthGuard` (`AuthModule`)
- Used by: frontend chat sidebar and feature-level conversation workflows
