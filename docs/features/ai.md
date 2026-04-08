# Feature: AI

## Purpose
- Provide global provider/model selection used by pipeline and chat requests.

---

## User Flow
1. Load provider list from backend.
2. Select active provider.
3. Optionally select a provider-specific model override.

---

## Screens
### ModelSelector
- Elements:
  - Provider `<select>`
  - Model `<select>` (shown when provider has models)

---

## Components
- `ModelSelector` — reads providers and updates global provider/model store values.

---

## State
- Global (store): `activeProvider`, `setActiveProvider`, `activeModel`, `setActiveModel`

---

## API
### GET `/ai/providers` — list provider/model options

---

## Dependencies
- Query key: `['ai-providers']` (`staleTime: Infinity`)
- API: `api.ai.getProviders`
