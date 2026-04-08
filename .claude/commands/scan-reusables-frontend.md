---
name: scan-reusables-frontend
description: Pre-task intelligence agent for frontend. Reads extracted docs from docs/features/ to find reusable components, hooks, services, and helpers relevant to a task. Falls back to source scan only if docs are missing. Run before implementing anything new.
---

Survey existing frontend code before starting a new implementation task.

## Arguments
$ARGUMENTS is a free-form task description (e.g. "add avatar to profile page").

If $ARGUMENTS is empty, list all documented features and their purposes.

## Step 1 — Detect docs folder

Check if `docs/features/` exists and contains `.md` files.

- **Docs exist** → follow Step 2 (fast path — read docs only)
- **Docs missing** → follow Step 3 (fallback — scan source)

---

## Step 2 (fast path) — Read from docs/features/

### 2a — Extract keywords
From $ARGUMENTS, extract meaningful keywords:
1. Split on spaces, drop stop words: a, an, the, for, to, add, in, of, with, on
2. Include domain synonyms (e.g. "avatar" → also "image", "photo", "profile")
3. Keep top 5 keywords

### 2b — Filter doc files
Glob: `docs/features/*.md`

Always include `docs/features/_global.md` if it exists — global shared code is relevant to every task.
For the remaining files, keep only those whose filename contains at least one keyword.
If $ARGUMENTS is empty, keep all doc files.

### 2c — Read matched docs (cap at 10 files)
Read each matched `docs/features/<name>.md`. These are compact summaries — do not read source files.

From each doc extract:
- Components and their purpose
- Exported helpers and signatures
- Types and interfaces
- Constants / query keys
- Services / API calls

Skip to Step 4 — output the report.

---

## Step 3 (fallback) — Scan source directly

Only run this if `docs/features/` does not exist. Prompt the user to run `/extract-features` first, then continue with source scan as a best-effort.

### 3a — Detect frontend root
- `apps/web/src/features/` → use this
- `src/features/` → use this

### 3b — Keyword filter on paths (no file reads yet)
Glob paths only:
```
<frontend-root>/*/components/**/*.tsx
<frontend-root>/*/hooks/**/*.ts
<frontend-root>/*/services/**/*.ts
<frontend-root>/*/stores/**/*.ts
<frontend-root>/*/helpers/**/*.ts
<frontend-root>/*/types/**/*.ts
src/components/**/*.tsx
src/hooks/**/*.ts
src/services/**/*.ts
src/lib/**/*.ts
```
Keep only paths whose filename or immediate parent folder contains at least one keyword.
If nothing matches, report "nothing found" and stop.

### 3c — Read matched files (cap at 15)
Read only keyword-matched files to extract exported names and purpose.

---

## Step 4 — Output Report

```
## Frontend Reusability Report
Task: "<$ARGUMENTS>"
Source: docs/features/ (or source scan if fallback)

---

### Components
| Feature | Export | Purpose |
|---------|--------|---------|

### Hooks
| Feature | Export | Purpose |
|---------|--------|---------|

### Services / API calls
| Feature | Export | Purpose |
|---------|--------|---------|

### Types
| Feature | Type | Fields |
|---------|------|--------|

### Utilities / Helpers
| Feature | Export | Signature |
|---------|--------|-----------|

---

### Nothing Found (create new)
- [ ] Component
- [ ] Hook
- [ ] Service function
- (list only missing items)

---

### Suggested Imports
​```ts
import { ComponentName } from 'src/features/<feature>/components/ComponentName'
import { useHookName } from 'src/features/<feature>/hooks/use-<domain>.hook'
​```
```

Omit any section that has no results.
After printing, add: "Run `/check-conventions-frontend` after implementation to validate structure."
If docs were missing, add: "Tip: run `/extract-features` to enable fast doc-based scanning."
