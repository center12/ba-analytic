---
name: cross-analysis
description: Read all analysis/<NN>-*.md feature files and write analysis/cross-analysis.md with cross-cutting patterns, issue heatmap, and aggregated scores.
---

You are performing a cross-feature analysis of a React/TypeScript codebase.

## Argument Parsing

Parse `$ARGUMENTS` by splitting on spaces then `=`. Extract:

- `out` → output directory containing feature analysis files (default: `analysis`)

## Step 1 — Load Feature Analyses

Use `Glob` on `<out>/[0-9][0-9]-*.md` to find all feature analysis files.
This pattern matches `01-auth.md` but excludes `cross-analysis.md` and `FINAL-AUDIT-REPORT.md`.

Read all matched files. For each file extract:

- **Feature name** (from `# Feature:` heading)
- **Score table** (all four score lines: Architecture, Code Quality, Performance, UX)
- **Issues section** (all `- **[Severity]**` lines)
- **State Management section** (full text)
- **API & Data Flow section** (full text)
- **Risks section** (full text)
- **UX/UI Observations section** (full text)

## Step 2 — Analyze Cross-Cutting Patterns

Analyze across all feature files for these six areas. Be specific — cite feature names and concrete evidence from the files.

### Architecture Patterns

- What architectural patterns are used consistently? (e.g. RTK slices + epics, lazy routing, layout composition)
- Where do patterns diverge? (e.g. some features use local state, others use global slices for the same concern)
- Are there hybrid or unusual internal layouts?
- How is routing/code-splitting applied across features?

### State Management

- Which features use global loading flags that could conflict?
- Are there naming collisions in slice names across features?
- Which features import from other features' slices (cross-slice coupling)?
- Where are there duplicate sources of truth for the same data?
- Are there features with multiple slice/store homes?

### API & Data Flow

- Which features use multiple service facades for the same domain?
- Where is `unknown` or weakly typed used at wire boundaries?
- Are there inconsistent HTTP client patterns (typed facade vs. raw get/post)?
- Where does DTO shape drift occur (casing fallbacks, runtime coercion)?
- Which features share or overlap API endpoints?

### UX/UI Consistency

- Which design systems/component libraries appear and in which features?
- Where are errors surfaced differently (toast vs. boundary vs. console-only)?
- How consistent is loading state granularity (global flag vs. per-operation)?
- Where is batch partial failure handling inconsistent?

### Performance

- Which features have epics that touch shared lists (blast radius risk)?
- Where is polling used without backoff?
- Which features could contribute to bundle size issues?
- Where is `cloneDeep` or expensive merges used?
- Which features lack per-view or per-operation loading granularity?

### Issue Heatmap

Build a severity summary table:

1. Count total issues per severity (`[Critical]`, `[High]`, `[Medium]`, `[Low]`) across ALL features.
2. List which features appear most frequently with `[Critical]` or `[High]` issues.
3. Identify the top 5 recurring issue themes (e.g. "global loading flag misuse", "unknown wire types").

## Step 3 — Write Output

Write to `<out>/cross-analysis.md`:

```markdown
# Cross-Feature Analysis

**Source:** <count> feature analysis files from `<out>/`
**Date:** <today's date in YYYY-MM-DD>

---

## Architecture Patterns

<content>

---

## State Management

<content>

---

## API & Data Flow

<content>

---

## UX/UI Consistency

<content>

---

## Performance

<content>

---

## Issue Heatmap

### Severity Counts

| Severity  | Count |
| --------- | ----- |
| Critical  | N     |
| High      | N     |
| Medium    | N     |
| Low       | N     |
| **Total** | **N** |

### Features with Most Critical/High Issues

| Feature | Critical | High |
| ------- | -------- | ---- |
| ...     | N        | N    |

### Top Recurring Issue Themes

1. <theme> — affects: <feature list>
2. ...
```

After writing, confirm: "Written: `<out>/cross-analysis.md`"
