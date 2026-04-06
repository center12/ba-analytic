# Feature: ai
**Purpose**: Global AI provider and model selector used across the app to override default pipeline settings.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `ModelSelector.tsx` | `ModelSelector` | Inline provider + model dropdowns that update global app store |

## TanStack Query Keys
- `['ai-providers']` (staleTime: Infinity)

## Dependencies
- **API calls**: `api.ai.getProviders`
- **State**: `useAppStore` — `activeProvider`, `setActiveProvider`, `activeModel`, `setActiveModel`
