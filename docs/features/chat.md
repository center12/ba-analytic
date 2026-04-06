# Feature: chat
**Purpose**: Sidebar AI chat interface scoped to a feature, with SSE streaming and session management.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `ChatSidebar.tsx` | `ChatSidebar` | Full sidebar with session tabs, message history, streaming output, and text input |

## TanStack Query Keys
- `['chat-sessions', featureId]`
- `['chat-messages', sessionId]`

## Dependencies
- **API calls**: `api.chat.listSessions`, `api.chat.createSession`, `api.chat.listMessages`, `api.chat.stream`
- **State**: `useAppStore` — `activeProvider`, `selectedChatSession`, `setSelectedChatSession`
