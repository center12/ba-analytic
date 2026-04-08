---
name: check-conventions-backend
description: Post-task validator for backend. Scans backend (NestJS) source code for violations of folder structure and naming conventions. Run after implementing new modules to catch misplaced files and naming errors before committing.
---

Validate that backend code follows the required NestJS folder structure and naming conventions.

## Arguments
$ARGUMENTS is an optional subdirectory path to limit scope (e.g. `apps/api/src/modules/chat`).

If empty, scan the entire backend.

## Step 1 — Detect Backend Root

Check for backend root (use first match):
- `apps/api/src/modules/` → backend modules root
- `src/modules/` → backend modules root

If $ARGUMENTS is set, restrict scanning to that path only.

If no backend root found, report and stop.

## Step 2 — Backend Checks

### Check B1: Kebab-case file naming
- Glob: `<backend-root>/**/*.ts`
- Rule: filename (without extension) must be all lowercase with hyphens only — `^[a-z][a-z0-9-]+$`
- Violation: any CamelCase or underscore_case filename (e.g. `UserService.ts`, `user_service.ts`)
- Fix: rename to kebab-case

### Check B2: DTO naming
- Glob: `<backend-root>/*/dto/**/*.ts`
- Rule: must match `^(create|update|query|response)-[a-z][a-z0-9-]+\.dto\.ts$`
- Violation: DTOs not following naming pattern
- Fix: rename

### Check B3: No root-level constants/helpers/utils
- Glob: `<backend-root>/*/*.ts`
- Rule: filenames `constants.ts`, `helpers.ts`, `utils.ts` at module root are violations
- Fix: move to `constants/<domain>.constants.ts` or `helpers/<domain>.helpers.ts`

### Check B4: Module completeness
- For each directory under `<backend-root>/`:
  - Must contain: `<name>.module.ts`, `<name>.service.ts`, `<name>.controller.ts`
  - Warn if any of these is missing (may be intentional for lib-only modules)

### Check B5: Constants/helpers in correct subfolder
- Glob: `<backend-root>/*/constants/*.ts`
- Rule: must match `<domain>.constants.ts`
- Same for helpers: must match `<domain>.helpers.ts`
- Violation: files named just `index.ts` or `constants.ts` inside the subfolder

## Step 3 — Output Report

```
## Backend Convention Check Report
Scanned: <path or "full backend">
Date: <today>

---

### Violations

| Check | File | Issue | Fix |
|-------|------|-------|-----|
| B1    | src/modules/user/UserService.ts | Not kebab-case | Rename to user.service.ts |
| ...   | ...  | ...   | ... |

Backend violations: <N>

---

### Suggestions (non-blocking)

- <file>: <suggestion>

---

### Summary

Total violations: <N>
Suggestions: <N>

<If 0 violations>: All backend conventions pass. ✓
```

If violations are found, ask the user: "Fix violations now? (yes/no)"
If yes, rename/move the files and print a diff of changes made.
