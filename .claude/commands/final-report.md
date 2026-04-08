---
name: final-report
description: Synthesize all feature analyses and cross-analysis into analysis/FINAL-AUDIT-REPORT.md with executive summary, scored findings, and recommendations.
---

You are generating the final audit report for a React/TypeScript codebase.

## Argument Parsing

Parse `$ARGUMENTS` by splitting on spaces then `=`. Extract:

- `out` → output directory (default: `analysis`)

## Step 1 — Load All Inputs

1. Read `<out>/cross-analysis.md`
2. Use `Glob` on `<out>/[0-9][0-9]-*.md` to find all feature analysis files. Read all of them.
3. Read `package.json` from the project root to extract the `name` field for the project name. If `package.json` is not found, use the current working directory name.

## Step 2 — Compute Aggregate Scores

From each feature file, parse the `## Score (1–10)` section. Extract the four numeric scores (Architecture, Code Quality, Performance, UX).

Compute the **mean** for each dimension across all features. Round to one decimal place.

Create a score summary:

| Dimension    | Mean Score |
| ------------ | ---------- |
| Architecture | X.X        |
| Code Quality | X.X        |
| Performance  | X.X        |
| UX           | X.X        |

## Step 3 — Synthesize Report Content

Using the cross-analysis and feature analyses, prepare content for each section below. Be specific — cite feature names. The executive summary should reflect the actual findings.

**For the Key Issues Top 5 table:** Identify the five highest-impact issues from across all features. Rank by: (1) severity, (2) number of features affected, (3) technical risk. Each issue needs a concrete recommendation.

**For Quick Wins:** Identify low-effort, high-ROI improvements — things that can be fixed in a day or less with clear positive impact. Prefer fixes at shared boundaries (types, services, naming).

**For Scoring justifications:** Each dimension's justification should describe the specific patterns that drove the score up or down, citing feature names where relevant.

## Step 4 — Write Output

Write to `<out>/FINAL-AUDIT-REPORT.md` using this exact structure:

```markdown
# <Project Name> — Final Frontend Audit Report

**Scope:** Cross-feature synthesis of <N> analyses from `<out>/`.
**Date:** <YYYY-MM-DD>
**Focus:** Patterns across features, not per-feature detail.

---

## 1. Executive Summary

- **Overall frontend quality:** <2-3 sentence assessment of the codebase maturity, dominant stack, and main trade-offs>

- **Key strengths:** <3 bullet points — concrete, specific to this codebase>

- **Top 3 critical issues:**
  1. **<Issue title>** — <one-line description>
  2. **<Issue title>** — <one-line description>
  3. **<Issue title>** — <one-line description>

- **Recommendation:** <1-2 sentences on the highest-leverage architectural direction>

---

## 2. Cross-Feature Findings

### Architecture

<Draw from cross-analysis Architecture Patterns section. 3-6 bullet points.>

### State Management

<Draw from cross-analysis State Management section. 3-6 bullet points.>

### API Handling

<Draw from cross-analysis API & Data Flow section. 3-6 bullet points.>

### UX/UI Consistency

<Draw from cross-analysis UX/UI Consistency section. 3-6 bullet points.>

### Performance

<Draw from cross-analysis Performance section. 3-6 bullet points.>

---

## 3. Key Issues (Top 5)

| #   | Title   | Severity     | Affected features (representative) | Recommendation   |
| --- | ------- | ------------ | ---------------------------------- | ---------------- |
| 1   | <title> | **Critical** | <features>                         | <recommendation> |
| 2   | <title> | **High**     | <features>                         | <recommendation> |
| 3   | <title> | **High**     | <features>                         | <recommendation> |
| 4   | <title> | **High**     | <features>                         | <recommendation> |
| 5   | <title> | **High**     | <features>                         | <recommendation> |

---

## 4. Risks & Technical Debt

- <risk 1>
- <risk 2>
- <risk 3>
- <risk 4>
- <risk 5>

---

## 5. Quick Wins

- <quick win 1>
- <quick win 2>
- <quick win 3>
- <quick win 4>

---

## 6. Long-Term Recommendations

- **<Theme>:** <recommendation>
- **<Theme>:** <recommendation>
- **<Theme>:** <recommendation>
- **<Theme>:** <recommendation>
- **<Theme>:** <recommendation>

---

## 7. Scoring (1–10)

| Dimension            | Score   | Justification                          |
| -------------------- | ------- | -------------------------------------- |
| **Architecture**     | **X.X** | <one sentence — what drove this score> |
| **State Management** | **X.X** | <one sentence>                         |
| **Code Quality**     | **X.X** | <one sentence>                         |
| **Performance**      | **X.X** | <one sentence>                         |
| **UX/UI**            | **X.X** | <one sentence>                         |

---

_Generated from feature-level analyses in this directory; revise when underlying analyses change._
```

After writing, confirm: "Written: `<out>/FINAL-AUDIT-REPORT.md`"
