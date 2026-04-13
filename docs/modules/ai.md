# Module: ai
**Purpose**: Centralizes AI provider discovery and provider selection for pipeline generation and chat streaming.

## Scope
- In: provider availability endpoint, provider/model selection, abstract AI contract
- Out: business-specific orchestration delegated to `feature-analysis` and `chat` modules

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `Provider Catalog` | `provider`, `label`, API-key presence | In-memory/config |
| `Supported Models` | model `id`, `label` by provider | In-memory constants |

**Relationships**: `AIProviderFactory` injects concrete providers (`GeminiProvider`, `ClaudeProvider`, `OpenAIProvider`) and returns an `AIProvider` interface.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/ai/providers` | none | `[ { provider, label, models[] } ]` filtered by configured API keys | no explicit module-level errors |

## Core Flows (top 3)
### Provider discovery endpoint
1. Build static catalog of `gemini`/`claude`/`openai`.
2. Check each provider API key from `ConfigService`.
3. Return only configured providers with model lists.

### Provider resolution
1. Resolve requested provider name or fallback to `AI_PROVIDER` default.
2. Select concrete provider via switch.
3. Optionally clone provider with model override (`withModel`).
4. Throw `Error` for unknown provider names.

### Shared AI contract usage
1. Consumer requests `AIProvider` from factory.
2. Consumer calls abstract methods for extraction/planning/generation/chat.
3. Concrete provider executes model-specific implementation via Vercel AI SDK.

## Constraints
- Supported providers are limited to `gemini`, `claude`, `openai`.
- Unknown provider selection throws immediately.
- Provider visibility in API is gated by configured API keys.
- Claude provider uses inline `cache_control` on all calls via `experimental_providerMetadata`.

## Dependencies
- Depends on: `ConfigService`, provider implementations (Vercel AI SDK), Nest DI module wiring
- Used by: `feature-analysis` pipeline (`AIProviderFactory`) for Steps 1-5, `chat` streaming (`AIProviderFactory`), frontend model selector endpoint
