---
name: analyze-feature
description: Deep-analyze one feature and write analysis/<NN>-<slug>.md. Args: feature=<slug> src=<path> out=<path> index=<NN>
---

You are performing a deep analysis of a single feature in a React/TypeScript codebase.

## Argument Parsing

Parse `$ARGUMENTS` by splitting on spaces then `=`. Extract:

- `feature` → feature slug (e.g. `auth`, `files`)
- `src` → source root (default: `src`)
- `out` → output directory (default: `analysis`)
- `index` → zero-padded two-digit number (e.g. `01`)

## Step 1 — Resolve Feature Path

Check `<src>/features/<feature>/` first using Glob. If it returns matches, use it as `featurePath`.
If not found, fall back to `<src>/<feature>/`.
If neither exists, report an error and stop.

## Step 2 — Discover Source Files

Use Glob to discover files in this priority order. Read the most important files — cap at ~100 files total if the feature is very large.

**Priority 1 — State (read all):**

- `<featurePath>/stores/**/*.ts`
- `<featurePath>/stores/**/*.tsx`
- `<featurePath>/store/**/*.ts`
- `<featurePath>/store/**/*.tsx`
- `<featurePath>/redux/**/*.ts`
- `<featurePath>/**/*.slice.ts`
- `<featurePath>/**/*.epic.ts`

**Priority 2 — Services (read all):**

- `<featurePath>/services/**/*.ts`
- `<featurePath>/**/*.service.ts`

**Priority 3 — Pages (read up to 10):**

- `<featurePath>/pages/**/*.tsx`

**Priority 4 — Components (read up to 30):**

- `<featurePath>/components/**/*.tsx`

**Priority 5 — Hooks & Utils (read up to 15):**

- `<featurePath>/hooks/**/*.ts`
- `<featurePath>/utils/**/*.ts`

**Priority 6 — Entry:**

- `<featurePath>/index.ts`
- `<featurePath>/index.tsx`

**Cross-cutting context (always check):**

- Grep `<src>/pages/` for any imports referencing the feature name or slug
- Read `<src>/store/reducers.ts` or `<src>/store/index.ts` to check slice registration

## Step 3 — Analyze

Analyze the code across these seven dimensions. Be specific — reference actual file names, function names, type names, and patterns you observed.

### Responsibilities

What does this feature own? List the user-facing capabilities and technical responsibilities.

### Components & Structure

Describe the directory structure, key components, routing/layout patterns, and any notable code organization decisions or anomalies.

### State Management

Describe the slice/store structure, epic/thunk patterns, what is global vs. local, cross-slice dependencies, and any shared state issues (naming collisions, duplicate sources of truth, global flag misuse).

### API & Data Flow

Describe service modules, HTTP client usage (typed facade vs. raw client), observable/async patterns, wire payload typing (strongly typed vs. `unknown`), and any DTO shape concerns.

### UX/UI Observations

Describe loading state granularity, error surface patterns (toast/boundary/console-only), design system usage (which component libraries), accessibility signals, and any UX inconsistencies.

### Issues

List concrete problems found. Format each as:
`- **[Severity]** Description of the issue.`

Severity levels:

- `[Critical]` — data loss, security hole, crash path
- `[High]` — race condition, broken feature path, significant UX degradation
- `[Medium]` — maintenance burden, inconsistent pattern, moderate risk
- `[Low]` — naming/style, minor friction, cosmetic

### Risks

List technical debt and risk areas that could cause future problems. Be forward-looking.

## Step 4 — Score

Score the feature on four dimensions from 1 (poor) to 10 (excellent). Use half-points if helpful (but the existing format uses integers).

Guidance:

- **Architecture**: clarity of ownership, separation of concerns, dependency direction
- **Code Quality**: typing, error handling, test surface, naming, duplication
- **Performance**: render efficiency, epic blast radius, polling/caching, bundle contribution
- **UX**: loading granularity, error visibility, consistency with design system

## Step 5 — Write Output

Write to `<out>/<index>-<feature>.md` using this exact structure (section headers must match exactly for downstream parsing by cross-analysis):

```markdown
# Feature: <Human Name>

## Responsibilities

<content>

## Components & Structure

<content>

## State Management

<content>

## API & Data Flow

<content>

## UX/UI Observations

<content>

## Issues

- **[Severity]** <description>

## Risks

<content>

## Score (1–10)

- Architecture: **<N>**
- Code Quality: **<N>**
- Performance: **<N>**
- UX: **<N>**
```

After writing, confirm: "Written: `<out>/<index>-<feature>.md`"
