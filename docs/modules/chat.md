# Module: chat
**Purpose**: Manages chat sessions and messages per feature, streaming AI responses via SSE.

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/chat/sessions` | `createSession` | Create a new chat session for a feature |
| GET | `/api/chat/sessions/feature/:featureId` | `findSessions` | List sessions for a feature |
| GET | `/api/chat/sessions/:sessionId/messages` | `findMessages` | Get all messages for a session |
| DELETE | `/api/chat/sessions/:sessionId` | `deleteSession` | Delete a session and its messages |
| GET (SSE) | `/api/chat/sessions/:sessionId/stream` | `stream` | Stream AI response; `?message=&provider=&token=` |

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `createSession` | `(dto: CreateSessionDto) => Promise<ChatSession>` | Creates session with default title `'New Chat'` |
| `findSessionsByFeature` | `(featureId: string) => Promise<ChatSession[]>` | Ordered by `createdAt desc` |
| `findMessages` | `(sessionId: string) => Promise<ChatMessage[]>` | Ordered by `createdAt asc` |
| `deleteSession` | `(sessionId: string) => Promise<ChatSession>` | 404 if missing |
| `streamChat` | `(sessionId, userContent, providerName?) => Observable<MessageEvent>` | Persists user msg → streams chunks → persists assistant msg |

## DTOs
| Class | Fields |
|-------|--------|
| `CreateSessionDto` | `featureId: string`, `title?: string` |
| `SendMessageDto` | `content: string`, `provider?: string` |

## NestJS Dependencies
- Imports: `AIModule` (for `AIProviderFactory`), `PrismaService`
- Guards: `JwtAuthGuard` (global); `SseJwtAuthGuard` on the `/stream` route (reads `?token=`)
