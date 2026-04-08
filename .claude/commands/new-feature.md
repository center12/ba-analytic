Scaffold a new frontend feature folder structure with placeholder files.

## Arguments
$ARGUMENTS must be a feature name in kebab-case (e.g. `user`, `dev-task`, `test-case`).

If $ARGUMENTS is empty, ask the user for the feature name before proceeding.

## Step 1 — Validate

- Feature name: `$ARGUMENTS`
- Target root: `src/features/$ARGUMENTS/`

Check if `src/features/$ARGUMENTS/` already exists. If it does, stop and inform the user.

Detect the frontend root by looking for `src/features/` relative to the current working directory.
Common locations: `src/features/`, `apps/web/src/features/`. Use whichever exists.

## Step 2 — Create folder structure

Create the following directories and placeholder files:

```
src/features/$ARGUMENTS/
  components/           (empty — for .tsx UI components)
  pages/                (empty — for page-level entry components)
  services/             (empty — for API call functions)
  hooks/                (empty — for React hooks)
  utils/                (empty — for pure utility functions)
  stores/               (empty — for Zustand stores)
  types/
    $ARGUMENTS.types.ts
  constants/
    $ARGUMENTS.constants.ts
  helpers/
    $ARGUMENTS.helpers.ts
```

### Content for `types/$ARGUMENTS.types.ts`
```ts
// Types for the $ARGUMENTS feature

export interface $PascalName {
  id: string
  // TODO: add fields
}
```
(Replace `$PascalName` with PascalCase of the feature name, e.g. `DevTask` for `dev-task`)

### Content for `constants/$ARGUMENTS.constants.ts`
```ts
// Constants for the $ARGUMENTS feature

export const $UPPER_NAME_QUERY_KEY = '$ARGUMENTS' as const
```
(Replace `$UPPER_NAME_QUERY_KEY` with SCREAMING_SNAKE_CASE, e.g. `DEV_TASK_QUERY_KEY`)

### Content for `helpers/$ARGUMENTS.helpers.ts`
```ts
// Helpers for the $ARGUMENTS feature

```

### Content for `services/$ARGUMENTS.service.ts`
```ts
// Service for the $ARGUMENTS feature

const LOG_PREFIX = '[$ARGUMENTS.service]'

export async function getAll$PascalNames(): Promise<$PascalName[]> {
  console.debug(`${LOG_PREFIX} getAll$PascalNames: fetching`)
  try {
    // TODO: replace with real API call
    const data: $PascalName[] = []
    console.debug(`${LOG_PREFIX} getAll$PascalNames: ok`, data)
    return data
  } catch (err) {
    console.error(`${LOG_PREFIX} getAll$PascalNames: failed`, err)
    throw err
  }
}

export async function create$PascalName(payload: unknown): Promise<$PascalName> {
  console.debug(`${LOG_PREFIX} create$PascalName: called`, payload)
  try {
    // TODO: replace with real API call
    const data = {} as $PascalName
    console.debug(`${LOG_PREFIX} create$PascalName: ok`, data)
    return data
  } catch (err) {
    console.error(`${LOG_PREFIX} create$PascalName: failed`, err)
    throw err
  }
}
```
(Replace `$PascalName` with PascalCase of the feature name)

## Step 3 — Extract feature docs

Run the `extract-features` command with `$ARGUMENTS` as the argument to generate the initial doc for the new feature.

Wait for completion. Note the path of the doc file written (e.g. `docs/features/$ARGUMENTS.md`).

## Step 4 — Print summary

After all files and docs are created, output:

```
Feature scaffolded: src/features/$ARGUMENTS/

Folders created:
  components/   → .tsx UI components
  pages/        → page-level entry components
  services/     → API call functions
  hooks/        → React hooks
  utils/        → pure utility functions
  stores/       → Zustand stores

Files created:
  types/$ARGUMENTS.types.ts
  constants/$ARGUMENTS.constants.ts
  helpers/$ARGUMENTS.helpers.ts
  services/$ARGUMENTS.service.ts

Docs generated:
  docs/features/$ARGUMENTS.md

Next steps:
  1. Add your page component to pages/ and register it in the router
  2. Add API calls to services/$ARGUMENTS.service.ts
  3. Add data-fetching hook to hooks/use-$ARGUMENTS.hook.ts
  4. Run /sync-docs any time to keep docs up to date
```
