# Module: ai
**Purpose**: Centralizes AI provider discovery and provider selection for pipeline generation and chat streaming.

## Scope
- In: provider availability endpoint, provider/model selection, abstract AI contract
- Out: business-specific orchestration delegated to `test-case` and `chat` modules

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
3. For Step 4, consumers call separate generation methods for `workflow-backend`, `frontend`, `testing-backend`, and `testing-frontend`.
4. All generation methods accept optional runtime `promptAppend` instructions and append them to the final prompt while preserving output schema constraints.
5. Concrete provider executes model-specific implementation.

## Constraints
- Supported providers are limited to `gemini`, `claude`, `openai`.
- Unknown provider selection throws immediately.
- Provider visibility in API is gated by configured API keys.
- `promptAppend` handling is runtime-only; persistence and validation are owned by the `test-case` module.

## Dependencies
- Depends on: `ConfigService`, provider implementations, Nest DI module wiring
- Used by: `test-case` pipeline (`AIProviderFactory`) for Step 1-5 generation including split Step 4 runs, `chat` streaming (`AIProviderFactory`), frontend model selector endpoint
