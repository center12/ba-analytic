# Module: ai
**Purpose**: Centralizes AI provider discovery, provider/model selection, and the shared pipeline type contract used by all pipeline steps.

## Scope
- In: provider availability endpoint, provider/model resolution, abstract `AIProvider` interface and all shared pipeline types
- Out: business-specific orchestration delegated to `feature-analysis` and `chat` modules

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `Provider Catalog` | `provider`, `label`, API-key presence | In-memory/config |
| `Supported Models` | model `id`, `label` by provider | In-memory constants (`ai.constants.ts`) |

**Relationships**: `AIProviderFactory` injects concrete providers (`GeminiProvider`, `ClaudeProvider`, `OpenAIProvider`) and returns an `AIProvider` interface; all three providers import shared pipeline types from `ai-provider.abstract.ts`.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/ai/providers` | none | `[ { provider, label, models[] } ]` filtered by configured API keys | none |

## Core Flows (top 3)
### Provider discovery endpoint
1. Build static catalog of `gemini`/`claude`/`openai`.
2. Check each provider API key from `ConfigService`.
3. Return only configured providers with their model lists.

### Provider resolution
1. Resolve requested provider name or fallback to `AI_PROVIDER` env default.
2. Select concrete provider via switch (`gemini`→`GeminiProvider`, etc.).
3. Optionally clone provider with model override via `withModel(model)`.
4. Throw `Error` for unknown provider names.

### Shared pipeline type contract
1. `ai-provider.abstract.ts` exports all shared pipeline types: `SSRData`, `UserStory`, `UserStories`, `Mapping`, `ValidationResult`, `TestScenario`, `GeneratedTestCase`, `DevPlan`, `DevPrompt`, `WorkflowStep`, etc.
2. All three concrete providers import these types to ensure a uniform contract.
3. `ChatHistoryItem` (using `ChatMessageRole`) also lives here for chat streaming.

## Constraints
- Supported providers: `gemini`, `claude`, `openai` only; unknown names throw immediately.
- Provider visibility in API gated by configured API keys (`GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
- Claude provider uses inline `cache_control` via `experimental_providerMetadata` on all calls.
- All providers use **Vercel AI SDK** (`ai`, `@ai-sdk/*`) with Zod schemas for structured output.
- Current model catalog: Gemini (`gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-pro/flash`); Claude (`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`, `claude-3-5-sonnet-20241022`); OpenAI (`gpt-5`, `gpt-5-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o3`, `o3-mini`).

## Dependencies
- Depends on: `ConfigService`, Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/anthropic`, `@ai-sdk/openai`), Zod
- Used by: `feature-analysis` pipeline (Steps 1–5 via `AIProviderFactory`), `chat` streaming (`AIProviderFactory`), frontend model selector
