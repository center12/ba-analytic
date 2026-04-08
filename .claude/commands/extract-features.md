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
1. `types/<name>.types.ts` — exported interface/type signatures (fields + types only, no bodies)
2. `constants/<name>.constants.ts` — exported constant names; note "see file" for large strings
3. `helpers/<name>.helpers.ts` — exported function names + param list only
4. `*.tsx` in the feature root — default export name + one-sentence purpose
5. `components/*.tsx` and `components/**/*.tsx` — export name + one-sentence purpose
6. `services/<name>.service.ts` — function names + HTTP method/path
7. `stores/<name>.store.ts` — exported state field names

When extracting, emit markdown bullet lines only:
- Use `-` bullets for lists
- Use numbered `1.`/`2.`/`3.` only for ordered user flow steps
- Never emit table syntax (`| col | col |`) or row-like output

## Step 3 — Write docs/features/<name>.md

Use this template. Omit any section whose content is empty.
Keep the file under 60 lines. Overwrite completely if it already exists.

```
# Feature: <Name>

## Purpose
- What user can do

---

## User Flow
1. Step 1
2. Step 2
3. Step 3

---

## Screens
### <Page>
- Elements:
  - <element>
  - <element>

---

## Components
- `Name` — purpose

---

## State
### Local:
- field
- field

### Global (store):
- field — storeName

---

## Types
- `TypeName` — { field: type }

---

## API
### METHOD /path — trigger (e.g. onSubmit)

Request:
- field: type

Response:
- field: type

Behavior:
- Success -> <what happens in UI>
- Error -> <what happens in UI>

Validation:
- field: rule

---

## UX States
- Loading: <behavior>
- Error: <behavior>
- Empty: <optional>
- Success: <behavior>

---

## Routing
- /path -> page
- Guard: condition

---

## Edge Cases
- scenario

---

## Dependencies
- API: serviceName
- Store: storeName
```

## Step 4 — Extract global shared code

Scan the global frontend folders (outside `features/`):
- `src/components/**/*.tsx`
- `src/hooks/**/*.ts`
- `src/services/**/*.ts`
- `src/stores/**/*.ts`
- `src/utils/**/*.ts`
- `src/lib/**/*.ts`

For each file found, read to extract: export name + one-line purpose.
Emit markdown bullet lines only (no tables), using this style:
- `ExportName` (`file.ts/tsx`) — one-line purpose

Write `docs/features/_global.md` using this template (omit empty sections).
Keep the file under 100 lines. Overwrite if it already exists.

```
# Global Frontend Shared Code

## Purpose
- Shared utilities, components, hooks, services, and stores used across two or more features.

---

## Components
- `ComponentName` — purpose

---

## Hooks
- `useHookName` — purpose

---

## Services
- `functionName` (`service.ts`) — purpose

---

## Stores
- `useStoreName` — fields: `field`, `field`

---

## Utils / Lib
- `functionName` (`file.ts`) — purpose
```

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
