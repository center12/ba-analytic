---
name: check-conventions-frontend
description: Post-task validator for frontend. Scans frontend source code for violations of folder structure and naming conventions. Run after implementing new features to catch misplaced files and naming errors before committing.
---

Validate that frontend code follows the required folder structure and naming conventions.

## Arguments
$ARGUMENTS is an optional subdirectory path to limit scope (e.g. `src/features/user`).

If empty, scan the entire frontend.

## Step 1 — Detect Frontend Root

Check for frontend root (use first match):
- `apps/web/src/features/` → frontend features root
- `src/features/` → frontend features root

If $ARGUMENTS is set, restrict scanning to that path only.

If no frontend root found, report and stop.

## Step 2 — Frontend Checks

Use Glob to find all TypeScript/React files under the frontend root.

### Check F1: Component naming (PascalCase.tsx)
- Glob: `<frontend-root>/*/components/**/*.tsx`
- Rule: filename must match `^[A-Z][A-Za-z0-9]+\.tsx$`
- Violation: any file starting with lowercase or containing hyphens/underscores
- Fix: rename to PascalCase (e.g. `userCard.tsx` → `UserCard.tsx`)

### Check F2: Page naming (PascalCasePage.tsx)
- Glob: `<frontend-root>/*/pages/**/*.tsx`
- Rule: filename must end with `Page.tsx`
- Violation: pages not suffixed with `Page`
- Fix: rename (e.g. `UserList.tsx` → `UserListPage.tsx`)

### Check F3: Hook naming (use-*.hook.ts)
- Glob: `<frontend-root>/*/hooks/**/*.ts`
- Rule: filename must match `^use-[a-z][a-z0-9-]+\.hook\.ts$`
- Violation: hooks not starting with `use-` or not ending with `.hook.ts`
- Fix: rename (e.g. `useUser.ts` → `use-user.hook.ts`)

### Check F4: Service naming (*.service.ts)
- Glob: `<frontend-root>/*/services/**/*.ts`
- Rule: filename must end with `.service.ts`
- Violation: service files without `.service.ts` suffix
- Fix: rename

### Check F5: Store naming (*.store.ts)
- Glob: `<frontend-root>/*/stores/**/*.ts`
- Rule: filename must end with `.store.ts`
- Violation: store files without `.store.ts` suffix
- Fix: rename

### Check F6: No .tsx files in non-component folders
- Glob: `<frontend-root>/*/hooks/**/*.tsx`, `<frontend-root>/*/services/**/*.tsx`, `<frontend-root>/*/stores/**/*.tsx`, `<frontend-root>/*/utils/**/*.tsx`
- Violation: any `.tsx` file found (React components don't belong in these folders)
- Fix: move to `components/` folder

### Check F7: No mixed concerns in component files
- For each `.tsx` file > 80 lines in `components/` or `pages/`:
  - Check if there is a corresponding `types/`, `helpers/`, or `constants/` file in the same feature
  - If not, warn: "Large component file with no separate types/helpers — consider extracting"

### Check F8: Global vs feature scope
- Glob: `src/components/**/*.tsx` (global components)
- For each global component, use Grep to count how many features import it
- If imported by only 1 feature → suggest: "Consider moving to `src/features/<that-feature>/components/`"

## Step 3 — Output Report

```
## Frontend Convention Check Report
Scanned: <path or "full frontend">
Date: <today>

---

### Violations

| Check | File | Issue | Fix |
|-------|------|-------|-----|
| F1    | src/features/user/components/userCard.tsx | Not PascalCase | Rename to UserCard.tsx |
| ...   | ...  | ...   | ... |

Frontend violations: <N>

---

### Suggestions (non-blocking)

- <file>: <suggestion>

---

### Summary

Total violations: <N>
Suggestions: <N>

<If 0 violations>: All frontend conventions pass. ✓
```

If violations are found, ask the user: "Fix violations now? (yes/no)"
If yes, rename/move the files and print a diff of changes made.
