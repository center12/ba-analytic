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
| `modules/ai/ai-provider.abstract.ts` | `AIProvider` | Abstract base class for all AI provider implementations |
| `modules/ai/ai-provider.factory.ts` | `AIProviderFactory` | Resolves concrete AI provider from `AI_PROVIDER` env var or `?provider=` query param |
