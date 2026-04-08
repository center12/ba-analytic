# Module: storage
**Purpose**: Exposes a pluggable storage provider contract and binds local-disk storage by default.

## Scope
- In: upload/read-url/delete file operations through `IStorageProvider`
- Out: file lifecycle ownership belongs to caller modules (`project`, `test-case`) that store metadata in DB

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `Storage Object` | `key`, binary content, `mimeType` | Local filesystem (`UPLOAD_DIR`) |

**Relationships**: referenced by DB records such as `BADocument.storageKey` and `Screenshot.storageKey`.

## Core Flows (top 3)
### Provider binding
1. `StorageModule` registers `STORAGE_PROVIDER` token.
2. Token resolves to `LocalStorageAdapter` by default.
3. Other adapters can replace binding without changing consumers.

### Upload file
1. Build absolute path from `uploadDir + key`.
2. Ensure parent directories exist.
3. Write buffer to disk and return key.

### Resolve read path / delete
1. `getSignedUrl` returns local absolute path (or signed URL for cloud adapter).
2. `delete` unlinks file by key.
3. Missing delete target logs warning and does not crash.

## Constraints
- Default root directory is `./uploads` unless `UPLOAD_DIR` is set.
- Local adapter has no TTL enforcement; TTL argument is ignored.
- Deletion is best-effort (missing files are tolerated).

## Dependencies
- Depends on: `ConfigService`, Node `fs/promises`, path utilities
- Used by: `project` module uploads, `test-case` pipeline document reads, any future file-backed modules
