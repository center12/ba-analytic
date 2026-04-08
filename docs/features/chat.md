# Feature: Chat

## Purpose
- Provide feature-scoped AI chat with session tabs and real-time SSE response streaming.

---

## User Flow
1. Create/select a chat session for the current feature.
2. Send a message from input box.
3. Stream assistant chunks in real time, then persist and reload message history.

---

## Screens
### ChatSidebar
- Elements:
  - Session list header and create-session action
  - Session tabs
  - Message history with USER/ASSISTANT bubbles
  - Input and send button with streaming lock

---

## Components
- `ChatSidebar` — session management, message querying, SSE streaming, and message rendering.

---

## State
- Local: `input`, `streamingContent`, `isStreaming`
- Global (store): `activeProvider`, `selectedChatSession`, `setSelectedChatSession`

---

## API
### GET `/chat/sessions/feature/:featureId` — list sessions
### POST `/chat/sessions` — create session
### GET `/chat/sessions/:sessionId/messages` — list messages
### GET `/chat/sessions/:sessionId/stream` — SSE stream (`message`, optional `provider`, `token`)

---

## Dependencies
- Query keys: `['chat-sessions', featureId]`, `['chat-messages', sessionId]`
- API: `api.chat.listSessions`, `api.chat.createSession`, `api.chat.listMessages`, `api.chat.stream`
