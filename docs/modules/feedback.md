# Module: feedback
**Purpose**: Stores and serves app-wide user feedback submissions with optional file attachments.

## Scope
- In: AppFeedback CRUD, file upload/download for feedback attachments
- Out: File persistence delegated to StorageModule (`IStorageProvider`)

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| AppFeedback | id, content, routePath, pageTitle?, contextLabel?, originalName?, storageKey?, mimeType?, createdAt | PostgreSQL |

**Relationships**: AppFeedback is standalone (no foreign keys to other models)

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | /feedback | — | AppFeedback[] (latest 50, desc) | — |
| POST | /feedback | multipart: `CreateAppFeedbackDto` + optional `file` | AppFeedback | 400 if content/routePath empty |
| GET | /feedback/:feedbackId/media | — | File stream (inline) | 404 if not found or no media |

## Core Flows (top 3)
### Submit Feedback with Attachment
1. Receive `content`, `routePath`, optional `pageTitle`/`contextLabel` and file
2. If file present: generate UUID key (`feedback/<uuid>.<ext>`), upload via `IStorageProvider`
3. Persist `AppFeedback` record with optional file metadata fields

### List Feedback
1. Query `appFeedback.findMany` ordered by `createdAt` desc, limit 50
2. Return raw records

### Download Feedback Media
1. Look up `AppFeedback` by id; 404 if missing
2. Return null if no `storageKey` (caller gets 404)
3. Resolve absolute path via `storage.getSignedUrl`, stream file with original MIME type

## Constraints
- File size limit: 10 MB (MulterModule config)
- `content` and `routePath` must be non-empty strings (MinLength 1)
- List endpoint returns at most 50 records

## Dependencies
- Depends on: StorageModule (`STORAGE_PROVIDER` token), PrismaService, MulterModule (memory storage)
- Used by: Frontend `feedback` feature
