# Module: ai
**Purpose**: Exposes available AI providers and models; wraps Vercel AI SDK providers behind an abstract interface.

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/ai/providers` | `getAvailableProviders` | Returns providers with configured API keys and their model lists |

## Constants
| Name | Value |
|------|-------|
| `SUPPORTED_MODELS` | `Record<'gemini'\|'claude'\|'openai', ModelInfo[]>` — see file for full model list |

## Extra Files
| File | Responsibility |
|------|----------------|
| `ai-provider.abstract.ts` | `AIProvider` abstract class with all pipeline layer methods + prompt builder functions |
| `ai-provider.factory.ts` | `AIProviderFactory` — resolves concrete provider by name (`AI_PROVIDER` env var default) |
| `providers/gemini.provider.ts` | `GeminiProvider` — Vercel AI SDK `@ai-sdk/google` implementation |
| `providers/claude.provider.ts` | `ClaudeProvider` — Vercel AI SDK `@ai-sdk/anthropic` with `cache_control` |
| `providers/openai.provider.ts` | `OpenAIProvider` — Vercel AI SDK `@ai-sdk/openai` implementation |

## Abstract Methods (AIProvider)
| Method | Description |
|--------|-------------|
| `extractAll(baDoc)` | Layer 1 combined — requirements + behaviors in one call |
| `synthesiseExtraction(merged)` | Layer 1 synthesis — deduplicates multi-chunk merges |
| `planTestScenarios(req, beh)` | Layer 2 — produce up to 15 test scenarios |
| `generateTestCasesFromScenarios(scenarios, req)` | Layer 3 — detailed test cases per scenario |
| `generateDevPrompt(req, beh, scenarios)` | Layer 4 — API/Frontend/Testing prompts |
| `chat(history, userMessage)` | SSE streaming chat (AsyncIterable) |
| `withModel(model)` | Clone provider with overridden modelVersion |

## NestJS Dependencies
- Imports: `ConfigModule`
- Guards: `JwtAuthGuard` (global)
