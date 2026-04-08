Extract structured documentation for frontend features in this project and save
each as a compact Markdown file under docs/features/. Future prompts can reference
these files instead of reading source code to reduce token usage.

## Arguments
$ARGUMENTS may be empty (extract all frontend features) or a single feature name
like `auth` or `test-case` (extract only that feature).

## Step 1 — Identify targets
Root: `apps/web/src/features/`
Features: auth, user, project, feature, test-case, chat, dev-task, ai

If $ARGUMENTS is set, process only the matching feature folder. Otherwise process all.

## Step 2 — Read each feature

For `apps/web/src/features/<name>/`, read in order (skip absent files):
1. `types/<name>.types.ts` — exported interface/type signatures only
2. `constants/<name>.constants.ts` — exported constant names (skip large template strings; note "see file")
3. `helpers/<name>.helpers.ts` — exported function signatures (name + params, no bodies)
4. `*.tsx` in the feature root — default export name + one-sentence purpose
5. `components/*.tsx` and `components/**/*.tsx` — export name + one-sentence purpose

## Step 3 — Write docs/features/<name>.md

Use this template. Omit any section whose content is empty.
Overwrite the file completely if it already exists.

```
# Feature: <name>
**Purpose**: <one sentence describing what this feature does for the user>

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|

## Components
| File | Purpose |
|------|---------|

## Types
​```ts
// interface/type signatures only — no implementations
​```

## Exported Helpers
| Function | Signature |
|----------|-----------|

## Constants
| Name | Value / Notes |
|------|---------------|

## TanStack Query Keys
- `['<key>', ...]`

## Dependencies
- **API calls**: lib/api.ts functions used (names only)
- **State**: Zustand store fields used
```

Keep each file under 120 lines. Do not paste function bodies.

## Step 4 — Extract global shared code

Scan the global frontend folders (outside `features/`):
- `src/components/**/*.tsx` (or `apps/web/src/components/`)
- `src/hooks/**/*.ts`
- `src/services/**/*.ts`
- `src/stores/**/*.ts`
- `src/utils/**/*.ts`
- `src/lib/**/*.ts`

For each file found, read to extract: export name + one-line purpose.

Write `docs/features/_global.md` using this template (omit empty sections):

```
# Global Frontend Shared Code
**Purpose**: Shared utilities, components, hooks, services, and stores used across two or more features.

## Components
| File | Export | Purpose |
|------|--------|---------|

## Hooks
| File | Export | Purpose |
|------|--------|---------|

## Services
| File | Export | Purpose |
|------|--------|---------|

## Stores
| File | Export | Purpose |
|------|--------|---------|

## Utils / Lib
| File | Export | Purpose |
|------|--------|---------|
```

Keep the file under 150 lines. Overwrite if it already exists.

## Step 5 — Update docs/INDEX.md

If `docs/INDEX.md` exists, update only the rows in the "Frontend Features" table
for the features just processed, preserving all other content.

If `docs/INDEX.md` does not exist, create it with this structure:

```
# Documentation Index
_Last updated: <today's date>_

## Frontend Features (`apps/web/src/features/`)
| Feature | Doc | Purpose |
|---------|-----|---------|
| auth | [docs/features/auth.md](features/auth.md) | <one-line purpose> |
| ... | ... | ... |

## Backend Modules (`apps/api/src/modules/`)
| Module | Doc | Purpose |
|--------|-----|---------|
| _(run /extract-modules to populate)_ | | |

## Usage
Reference these docs instead of source code to reduce token usage:
​```
Read docs/features/chat.md, then add a "mark as read" button to ChatSidebar.
​```
```

## Step 6 — Print summary

After all files are written, output:

```
Frontend docs extracted:
  docs/features/<name>.md
  ...
  docs/features/_global.md
  docs/INDEX.md (updated)

Total: X feature docs + 1 global doc written
Refresh a single feature: /extract-features <name>
```
