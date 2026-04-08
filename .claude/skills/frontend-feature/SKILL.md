---
name: frontend-feature
description: Guides frontend development by scanning for reusable code before creating new files, and enforcing feature-based folder structure. Triggered when creating components, pages, hooks, services, stores, utils, helpers, types, or constants in a React/Vite project.
---

## When This Skill Applies

Any time you are about to create or modify a frontend file — component, page, hook, service, store, utility, helper, type definition, or constant.

---

## Rule 1: Scan Before Creating

Before writing any new file, search for existing code that could be reused or extended.

### What to scan

**Feature-scoped locations** (per feature):
- `src/features/*/components/` — existing components
- `src/features/*/hooks/` — existing hooks
- `src/features/*/services/` — existing API service functions
- `src/features/*/stores/` — existing Zustand stores
- `src/features/*/utils/` — existing utilities
- `src/features/*/helpers/` — existing helpers
- `src/features/*/types/` — existing type definitions
- `src/features/*/constants/` — existing constants

**Global locations:**
- `src/components/` — shared components
- `src/hooks/` — shared hooks
- `src/services/` — shared API services
- `src/stores/` — shared stores
- `src/utils/` — shared utilities
- `src/lib/` — shared libraries (e.g. API client, auth helpers)

### Decision logic

| Situation | Action |
|-----------|--------|
| Existing file covers the need exactly | Import and use it — do NOT create a new one |
| Existing file partially covers the need | Extend or compose with it |
| Nothing suitable exists | Create a new file following Rule 2 |

---

## Rule 2: Follow the Folder Structure

```
src/
  features/
    <feature-name>/
      components/    # .tsx UI components scoped to this feature
      pages/         # Page-level entry components (used in router)
      services/      # API call functions (fetch/axios wrappers)
      hooks/         # React hooks (useQuery, useMutation, custom)
      utils/         # Pure utility functions (no React)
      stores/        # Zustand store slices
      types/         # TypeScript interfaces and types
      constants/     # Constants and enums
      helpers/       # Helper functions (formatting, transforms)
  components/        # Global shared components (used by 2+ features)
  services/          # Global shared API services
  hooks/             # Global shared hooks
  utils/             # Global shared utilities
  stores/            # Global shared stores
```

### Scope decision

- Used by **one feature only** → place inside `src/features/<feature-name>/`
- Used by **two or more features** → place in the global `src/` folder

---

## Rule 3: Naming Conventions

| File type | Pattern | Example |
|-----------|---------|---------|
| Component | `PascalCase.tsx` | `UserAvatar.tsx` |
| Page | `PascalCasePage.tsx` | `UserListPage.tsx` |
| Hook | `use-<domain>.hook.ts` | `use-user.hook.ts` |
| Service | `<domain>.service.ts` | `user.service.ts` |
| Store | `<domain>.store.ts` | `auth.store.ts` |
| Helpers | `<domain>.helpers.ts` | `user.helpers.ts` |
| Utils | `<domain>.utils.ts` | `date.utils.ts` |
| Types | `<domain>.types.ts` | `user.types.ts` |
| Constants | `<domain>.constants.ts` | `user.constants.ts` |

---

## Rule 4: Logging

Add structured logging to make frontend code debuggable.

### Where to log

| Location | What to log |
|----------|-------------|
| Service functions | Request start, response received, errors |
| Hooks (mutations) | `onSuccess`, `onError` callbacks |
| Stores | State transitions that aren't obvious from UI |
| Error boundaries / catch blocks | Caught errors with context |

### Pattern

Use a consistent prefix so logs are filterable in DevTools:

```ts
// Service
export async function getUsers(): Promise<User[]> {
  console.debug('[user.service] getUsers: fetching')
  try {
    const data = await api.get('/users')
    console.debug('[user.service] getUsers: ok', data)
    return data
  } catch (err) {
    console.error('[user.service] getUsers: failed', err)
    throw err
  }
}

// Hook mutation
const mutation = useMutation({
  mutationFn: userService.create,
  onSuccess: (data) => {
    console.debug('[use-user.hook] create: success', data)
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all })
  },
  onError: (err) => {
    console.error('[use-user.hook] create: error', err)
  },
})
```

### Rules
- Use `console.debug` for normal flow, `console.error` for failures — never `console.log` in production paths
- Always include the file prefix: `[<feature>.<type>] <method>: <event>`
- Log the payload on success, the error object on failure
- Do not log sensitive data (tokens, passwords, PII)

---

## Rule 5: Do Not Mix Concerns

- Keep types in `types/`, helpers in `helpers/`, constants in `constants/`
- Do not inline type definitions or helper functions inside component files unless they are trivially small (< 5 lines) and not reused anywhere
- One component per file

---

## Checklist Before Creating Any File

- [ ] Searched `src/features/*/` for existing similar code
- [ ] Searched global `src/` folders for existing similar code
- [ ] Confirmed nothing reusable exists
- [ ] Chose correct folder (feature-scoped vs global) based on usage scope
- [ ] Used correct file naming convention
- [ ] Did not mix types/helpers/constants into component files
- [ ] Added `console.debug` / `console.error` logging to service functions and hook mutations
