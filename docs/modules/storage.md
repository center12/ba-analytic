# Module: storage
**Purpose**: Provides a swappable file storage abstraction; default implementation writes to local disk.

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `upload` | `(buffer: Buffer, key: string, mimeType: string) => Promise<string>` | Save file, return storage key |
| `getSignedUrl` | `(key: string, ttlSeconds?: number) => Promise<string>` | Returns local path (or pre-signed URL for cloud) |
| `delete` | `(key: string) => Promise<void>` | Remove file by key |

## Extra Files
| File | Responsibility |
|------|----------------|
| `storage.interface.ts` | `IStorageProvider` interface + `STORAGE_PROVIDER` DI token |
| `local-storage.adapter.ts` | `LocalStorageAdapter` — writes to `UPLOAD_DIR` env var (default `./uploads`) |

## NestJS Dependencies
- Imports: `ConfigModule`
- Bind: `STORAGE_PROVIDER` token → `LocalStorageAdapter` (swap for S3 by re-binding the token)
