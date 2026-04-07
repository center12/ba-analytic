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
| `generateDevPlanWorkflowBackend(req, beh, scenarios)` | Step 4A — workflow steps + backend (DB entities, API routes, folder structure) |
| `generateDevPlanFrontend(req, beh, workflowSummary)` | Step 4B — frontend components, pages, store, hooks, utils, services |
| `generateDevPlanTesting(req, scenarios, apiRoutes, components)` | Step 4C — backend unit tests and frontend test cases |
| `generateDevPrompt(req, beh, scenarios, devPlan?)` | Step 5 — API/Frontend/Testing sub-task prompts |
| `chat(history, userMessage)` | SSE streaming chat (AsyncIterable) |
| `withModel(model)` | Clone provider with overridden modelVersion |
| `cacheContext(content)` | Cache large context with provider (returns cache key or null) |

## Factory Methods (AIProviderFactory)
| Method | Signature | Description |
|--------|-----------|-------------|
| `getProvider` | `(name?: ProviderName, model?: string): AIProvider` | Resolve provider by name (falls back to `AI_PROVIDER` env); applies model override via `withModel` |

## NestJS Dependencies
- Imports: `ConfigModule`
- Guards: `JwtAuthGuard` (global)
