# Feature: Feedback

## Purpose
- Users can submit feedback from any page with optional file attachment
- Admins can view all recent feedback in a windowed list

---

## User Flow
1. Click "Feedback" button on any page to open the dialog
2. Enter feedback text and optionally attach a file
3. Submit — feedback is persisted with page context metadata
4. Navigate to `/feedback` to view all submitted feedback

---

## Screens
### FeedbackPage
- Elements:
  - Back button to /projects
  - Page title "Feedback"
  - `AppFeedbackDialog` button (submit new feedback)
  - `RecentFeedbackList` (windowed list of all feedback)

---

## Components
- `AppFeedbackDialog` — modal dialog to submit feedback with optional file attachment; receives `pageTitle`, `contextLabel`, `triggerLabel`, `className` props
- `RecentFeedbackList` — virtualized (windowed) list of recent feedback with pagination-friendly rendering; supports opening attached media in new tab

---

## State
### Local:
- open (dialog open state)
- content (textarea text)
- file (optional attachment)
- downloadingId (which item attachment is being opened)
- scrollTop (for virtual list scroll position)

---

## API
### GET /feedback — on mount (RecentFeedbackList)

Response:
- id: string; content: string; routePath: string; pageTitle?: string; contextLabel?: string; originalName?: string; createdAt: string

Behavior:
- Loading -> "Loading feedback..." text
- Empty -> "No feedback yet."
- Success -> windowed list of feedback cards

### POST /feedback — onSubmit (AppFeedbackDialog)

Request (multipart/form-data):
- content: string
- routePath: string
- pageTitle?: string
- contextLabel?: string
- file?: File

Behavior:
- Success -> invalidate ['app-feedback'], close dialog, success toast
- Error -> destructive toast

### GET /feedback/:id/media — on attachment button click

Behavior:
- Opens blob URL in new tab

---

## UX States
- Loading: "Loading feedback..." text
- Empty: "No feedback yet."
- Success: windowed scrollable list with 136px item height

---

## Routing
- /feedback -> FeedbackPage
- Guard: authenticated

---

## Edge Cases
- Large feedback volumes: list uses virtual windowing (ITEM_HEIGHT=136, OVERSCAN=4)
- Attachment preview opens in new tab; blob URL revoked after 60s

---

## Dependencies
- API: api.feedback.listRecent, api.feedback.create, api.feedback.downloadMedia
- Query key: ['app-feedback']
