# Module: feedback
**Purpose**: Stores and serves app-wide user feedback submissions with optional file attachments.

## Scope
- In: AppFeedback CRUD, file upload/download for feedback attachments
- Out: File persistence delegated to StorageModule (`IStorageProvider`)

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `AppFeedback` | `id`, `content`, `routePath`, `pageTitle?`, `contextLabel?`, `originalName?`, `storageKey?`, `mimeType?`, `createdAt` | Postgres |

**Relationships**: AppFeedback is standalone (no foreign keys to other models)

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/feedback` | none | AppFeedback[] (latest 50, desc) | `401/403` |
| POST | `/api/feedback` | multipart: `CreateAppFeedbackDto` + optional `file` | AppFeedback | `400 if content/routePath empty` |
| GET | `/api/feedback/:feedbackId/media` | path:`feedbackId` | File stream (inline) | `404 if not found or no media` |

## Core Flows (top 3)
### Submit feedback with attachment
1. Receive `content`, `routePath`, optional `pageTitle`/`contextLabel` and file.
2. If file present: generate UUID key (`feedback/<uuid>.<ext>`), upload via `IStorageProvider`.
3. Persist `AppFeedback` record with optional file metadata fields.

### List feedback
1. Query `appFeedback.findMany` ordered by `createdAt` desc, limit 50.
2. Return raw records.

### Download feedback media
1. Look up `AppFeedback` by id; 404 if missing.
2. Return null if no `storageKey` (caller gets 404).
3. Resolve absolute path via `storage.getSignedUrl`, stream file with original MIME type.

## Constraints
- File size limit: 10 MB (MulterModule config).
- `content` and `routePath` must be non-empty strings (MinLength 1).
- List endpoint returns at most 50 records.

## Dependencies
- Depends on: `StorageModule` (`STORAGE_PROVIDER` token), `PrismaService`, `MulterModule` (memory storage)
- Used by: frontend feedback feature
