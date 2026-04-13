# Global Backend Shared Code
**Purpose**: Shared guards, decorators, filters, interceptors, and utilities used across two or more modules.

## Guards
| File | Export | Purpose |
|------|--------|---------|
| `modules/auth/jwt-auth.guard.ts` | `JwtAuthGuard` | Global guard; validates Bearer JWT on all routes; skips routes decorated with `@Public()` |
| `modules/auth/guards/sse-jwt-auth.guard.ts` | `SseJwtAuthGuard` | SSE-specific guard; reads JWT from `?token=` query param instead of Authorization header |

## Decorators
| File | Export | Purpose |
|------|--------|---------|
| `modules/auth/decorators/public.decorator.ts` | `@Public()` | Route metadata decorator to opt out of `JwtAuthGuard` |

## Common Utilities / Lib
| File | Export | Purpose |
|------|--------|---------|
| `prisma.service.ts` | `PrismaService` | Extends `PrismaClient`; declared as a provider in each module that needs DB access (no global PrismaModule) |
| `modules/storage/storage.interface.ts` | `IStorageProvider`, `STORAGE_PROVIDER` | Interface + injection token for pluggable file storage |
| `modules/ai/ai-provider.abstract.ts` | `AIProvider` | Abstract base class with typed methods for all pipeline steps and chat streaming |
| `modules/ai/ai-provider.factory.ts` | `AIProviderFactory` | Resolves concrete AI provider from `AI_PROVIDER` env var or runtime `provider` name |

## Pipeline Utilities (`modules/feature-analysis/pipeline/utils/`)
| File | Export | Purpose |
|------|--------|---------|
| `document-reader.util.ts` | `readDocumentContent` | Reads BA doc file with BOM/encoding detection, control-char stripping, and prompt-injection redaction |
| `retry.util.ts` | `withRetry` | Exponential backoff retry (3 attempts, base 30s) for 429/quota AI errors |
| `chunking.util.ts` | `chunkMarkdown`, `estimateTokens` | Splits markdown into overlapping chunks; estimates token counts |
| `compression.util.ts` | `compressForDownstream` | Compresses step output JSON for use as input to subsequent pipeline steps |
| `layer1.util.ts` | `layer1ToLegacy`, `mergeLayer1AB` | Converts 4-sublayer Layer 1 output to legacy extraction format; merges partial sublayer results |
