Extract structured documentation for backend NestJS modules in this project and
save each as a compact Markdown file under docs/modules/. Future prompts can
reference these files instead of reading source code to reduce token usage.

## Arguments
$ARGUMENTS may be empty (extract all modules) or a single module name like `auth`
or `test-case` (extract only that module).

## Step 1 — Identify targets
Root: `apps/api/src/modules/`
Modules: auth, user, project, storage, ai, chat, test-case, dev-task

If $ARGUMENTS is set, process only the matching module folder. Otherwise process all.

## Step 2 — Read each module

For `apps/api/src/modules/<name>/`, read in order (skip absent files):
1. `<name>.controller.ts` — every @Get/@Post/@Put/@Patch/@Delete/@Sse decorated method:
   record HTTP method, path, handler name, one-line description
2. `<name>.service.ts` — public method signatures only (name + params + return type, no bodies)
3. `dto/*.ts` — each DTO class name and its fields with types
4. `constants/<name>.constants.ts` OR root-level `constants.ts` — exported constant names
   and their scalar values (skip large objects; write "see file" instead)
5. `helpers/*.ts` — exported function names and param signatures
6. Any other files (guards, decorators, adapters, strategies, seeders) —
   filename + one-line responsibility

## Step 3 — Write docs/modules/<name>.md

Use this template. Omit any section whose content is empty.
Overwrite the file completely if it already exists.

```
# Module: <name>
**Purpose**: <one sentence describing what this module does>

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|

## DTOs
| Class | Fields |
|-------|--------|

## Constants
| Name | Value |
|------|-------|

## Helpers
| Function | Signature |
|----------|-----------|

## Extra Files
| File | Responsibility |
|------|----------------|

## NestJS Dependencies
- Imports: (other modules imported by this module)
- Guards: (guards applied globally or per-route)
```

Keep each file under 100 lines.

## Step 4 — Extract global shared backend code

Scan backend folders that live outside `modules/` (shared providers, common utilities):
- `src/common/**/*.ts` (or `apps/api/src/common/`)
- `src/guards/**/*.ts`
- `src/decorators/**/*.ts`
- `src/filters/**/*.ts`
- `src/interceptors/**/*.ts`
- `src/pipes/**/*.ts`
- `src/lib/**/*.ts`

For each file found, read to extract: export name + one-line purpose.

Write `docs/modules/_global.md` using this template (omit empty sections):

```
# Global Backend Shared Code
**Purpose**: Shared guards, decorators, filters, interceptors, and utilities used across two or more modules.

## Guards
| File | Export | Purpose |
|------|--------|---------|

## Decorators
| File | Export | Purpose |
|------|--------|---------|

## Filters / Interceptors / Pipes
| File | Export | Purpose |
|------|--------|---------|

## Common Utilities / Lib
| File | Export | Purpose |
|------|--------|---------|
```

Keep the file under 150 lines. Overwrite if it already exists.

## Step 5 — Update docs/INDEX.md

If `docs/INDEX.md` exists, update only the rows in the "Backend Modules" table
for the modules just processed, preserving all other content.

If `docs/INDEX.md` does not exist, create it with this structure:

```
# Documentation Index
_Last updated: <today's date>_

## Frontend Features (`apps/web/src/features/`)
| Feature | Doc | Purpose |
|---------|-----|---------|
| _(run /extract-features to populate)_ | | |

## Backend Modules (`apps/api/src/modules/`)
| Module | Doc | Purpose |
|--------|-----|---------|
| auth | [docs/modules/auth.md](modules/auth.md) | <one-line purpose> |
| ... | ... | ... |

## Usage
Reference these docs instead of source code to reduce token usage:
​```
Read docs/modules/test-case.md, then add a new pipeline step.
​```
```

## Step 6 — Print summary

After all files are written, output:

```
Backend docs extracted:
  docs/modules/<name>.md
  ...
  docs/modules/_global.md
  docs/INDEX.md (updated)

Total: Y module docs + 1 global doc written
Refresh a single module: /extract-modules <name>
```
