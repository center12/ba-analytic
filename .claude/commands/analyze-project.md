---
name: analyze-project
description: 4-phase codebase audit pipeline — extract features, analyze each, cross-analyze patterns, generate final report. Optional args: src=<path> out=<path>
---

You are running a 4-phase codebase audit pipeline. Execute each phase in sequence. Do not skip any phase.

## Argument Parsing

Parse `$ARGUMENTS` by splitting on spaces, then on `=`. Extract:

- `src` → source root (default: `src`)
- `out` → output directory (default: `analysis`)

Example: `/analyze-project src=frontend out=reports` → `src=frontend`, `out=reports`.

## Setup

1. Ensure the output directory exists: run `Bash: mkdir -p <out>`
2. Use TodoWrite to initialize 4 tasks:
   - "Phase 1 — Extract features" (pending)
   - "Phase 2 — Analyze features (loop)" (pending)
   - "Phase 3 — Cross-analysis" (pending)
   - "Phase 4 — Final report" (pending)

## Phase 1 — Extract Features

Mark "Phase 1 — Extract features" as in_progress.

Invoke `Skill: extract-features` with argument `src=<src>`.

The skill returns a numbered list followed by a YAML block. Parse the YAML block to get the feature list. The YAML block looks like:

```yaml
features:
  - index: "01"
    name: "Feature Name"
    slug: "slug"
    src: "src/features/slug"
```

Store this list for Phase 2. Mark Phase 1 as completed.

## Phase 2 — Analyze Features (Loop)

Mark "Phase 2 — Analyze features (loop)" as in_progress.

For each feature in the YAML list, in order (NOT in parallel):

1. Check if `<out>/<index>-<slug>.md` already exists using Glob. If it exists, skip this feature (log: "Skipping <name> — already analyzed").
2. If it does not exist, invoke `Skill: analyze-feature` with arguments: `feature=<slug> src=<src> out=<out> index=<index>`
3. Wait for completion before moving to the next feature.

Add a sub-task per feature to TodoWrite so progress is visible. Mark each sub-task done as it completes.

Mark Phase 2 as completed when all features are done.

## Phase 3 — Cross-Analysis

Mark "Phase 3 — Cross-analysis" as in_progress.

Invoke `Skill: cross-analysis` with argument `out=<out>`.

Wait for completion. Mark Phase 3 as completed.

## Phase 4 — Final Report

Mark "Phase 4 — Final report" as in_progress.

Invoke `Skill: final-report` with argument `out=<out>`.

Wait for completion. Mark Phase 4 as completed.

## Summary

Print a summary table:

| Item                      | Value                   |
| ------------------------- | ----------------------- |
| Features analyzed         | <count>                 |
| Output directory          | <out>/                  |
| Files written             | <list of written files> |
| Skipped (already existed) | <count or "none">       |

The pipeline is complete.
