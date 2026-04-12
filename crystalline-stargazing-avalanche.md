# Plan: Layer 1 Pipeline Refactor — 4-Sublayer Architecture

## Context
The current Layer 1 (Step 1) pipeline runs two sub-extractions in a single combined AI call:
- **1A**: Domain/Requirements extraction (`ExtractedRequirements`)
- **1B**: Behavior extraction (`ExtractedBehaviors`)

The goal is to replace this with a richer 4-sublayer pipeline:
- **1A — SSR Extractor**: Extracts global rules (system rules, business rules, constraints, global policies, entities)
- **1B — User Story Extractor**: Extracts feature units as structured user stories (actor/action/benefit/AC/priority)
- **1C — Mapping**: Produces a traceability matrix linking rules to stories
- **1D — Validation**: Quality gate scoring completeness, consistency, and coverage gaps

Steps 2–5 are **not changed** — backward compat is preserved via an adapter that derives the old `ExtractedRequirements`/`ExtractedBehaviors` shapes from the new 1A+1B output.

---

## New Data Types

### Backend — add to `apps/api/src/modules/ai/ai-provider.abstract.ts`

```typescript
interface SSRData {
  featureName: string;
  systemRules: string[];      // SYS-xx
  businessRules: string[];    // BR-xx
  constraints: string[];      // VR-xx / AC-xx constraints
  globalPolicies: string[];   // auth, audit, rate-limit policies
  entities: string[];
}

interface UserStory {
  id: string;                 // US-01, US-02, ...
  actor: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  relatedRuleIds: string[];
  priority: 'MUST' | 'SHOULD' | 'COULD';
}

interface UserStories { featureName: string; stories: UserStory[]; }

interface RuleStoryLink {
  ruleId: string; ruleText: string; storyIds: string[];
  coverage: 'full' | 'partial' | 'none';
}

interface Mapping {
  links: RuleStoryLink[];
  uncoveredRules: string[];
  storiesWithNoRules: string[];
}

interface ValidationIssue {
  type: 'missing_coverage' | 'ambiguous_story' | 'conflicting_rules' | 'incomplete_criteria' | 'orphan_story';
  severity: 'error' | 'warning' | 'info';
  affectedIds: string[];
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  score: number;       // 0–100
  issues: ValidationIssue[];
  summary: string;
}

interface Layer1ABPartial { ssr: SSRData; stories: UserStories; }
interface Layer1Extraction extends Layer1ABPartial { mapping: Mapping; validation: ValidationResult; }
```

### Frontend — mirror types in `apps/web/src/lib/api.ts`
Same interfaces exported from frontend API client.

---

## Implementation Steps

### Phase 1 — Database
1. **`apps/api/prisma/schema.prisma`**: Add 4 new optional Text columns to `Feature` model:
   ```prisma
   layer1SSR        String?  @db.Text   // JSON: SSRData
   layer1Stories    String?  @db.Text   // JSON: UserStories
   layer1Mapping    String?  @db.Text   // JSON: Mapping
   layer1Validation String?  @db.Text   // JSON: ValidationResult
   ```
   Keep existing `extractedRequirements` and `extractedBehaviors` (dual-write from adapter).
2. Run `pnpm db:migrate --name add_layer1_sublayers`

### Phase 2 — AI Abstractions (`apps/api/src/modules/ai/ai-provider.abstract.ts`)
3. Add new types listed above.
4. Add new prompt builders:
   - `buildExtractSSRAndStoriesPrompt(content, chunkInfo?)` — replaces `buildExtractAllPrompt` for Step 1; extracts both 1A+1B in one call to preserve chunked-pipeline contract
   - `buildMappingPrompt(ssr, stories)` — single call on merged output
   - `buildValidationPrompt(ssr, stories, mapping)` — single call
   - `buildLayer1SynthesisPrompt(merged: Layer1ABPartial)` — replaces `buildSynthesisPrompt` for Step 1
5. Add 4 new abstract method signatures (keep old `extractAll`/`extractRequirements`/`extractBehaviors`/`synthesiseExtraction` to avoid breaking anything):
   - `abstract extractSSRAndStories(content, promptAppend?): Promise<Layer1ABPartial>`
   - `abstract extractMapping(ssr, stories): Promise<Mapping>`
   - `abstract extractValidation(ssr, stories, mapping): Promise<ValidationResult>`
   - `abstract synthesiseLayer1AB(merged): Promise<Layer1ABPartial>`

### Phase 3 — Provider Implementations
6. **Each provider** (`gemini.provider.ts`, `claude.provider.ts`, `openai.provider.ts`): Implement the 4 new abstract methods with provider-specific Zod schemas and `generateObject` calls. Zod schemas mirror the TypeScript interfaces.

### Phase 3b — Downstream Type Updates (`apps/api/src/modules/ai/ai-provider.abstract.ts`)
Update existing types to carry user story references through the pipeline:

```typescript
// Step 2 output — add optional story link
interface TestScenario {
  title: string;
  type: ScenarioType;
  requirementRefs: string[];   // existing — FR-xx, BR-xx, AC-xx, US-xx
  userStoryId?: string;        // NEW — e.g. "US-01" (the primary story this scenario covers)
}

// Step 3 output — carry story ref from scenario
interface GeneratedTestCase {
  title: string;
  description: string;
  preconditions: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TestCaseStep[];
  userStoryId?: string;        // NEW — inherited from scenario
}

// Step 4 task items — add story ref
interface BackendTask   { title: string; description: string; userStoryIds?: string[]; }  // add userStoryIds
interface FrontendTask  { id: string; title: string; description: string; userStoryIds?: string[]; }  // add
interface TestingTask   { id: string; title: string; description: string; userStoryIds?: string[]; }  // add

// Step 5 dev task item — add story ref
interface DevTaskItem {
  title: string;
  prompt: string;
  userStoryIds?: string[];     // NEW — US-xx IDs this task implements
}
```

### Phase 3c — Downstream Prompt Updates (same file)
Update prompt builders to:
- Accept `userStories?: UserStory[]` as optional additional input (all step 2–5 builders)
- When provided, display user stories in a richer "US-01: As a [actor], I want [action]" format instead of just the flat features list from the legacy adapter
- Instruct AI to populate the new `userStoryId` / `userStoryIds` fields in output
- Step 2 prompt: "For each user story, generate scenarios that verify it — set `userStoryId` to the US-xx of the story being covered"
- Step 4 prompts: "For each task, list the `userStoryIds` it implements"
- Step 5 prompts: "For each dev task, set `userStoryIds` to the US-xx stories the implementation covers"

### Phase 4 — Pipeline Utils (`apps/api/src/modules/test-case/helpers/pipeline.utils.ts`)
7. Add `mergeLayer1AB(parts: Layer1ABPartial[]): Layer1ABPartial` — analogous to `mergeExtractions`, deduplicating by rule ID and story ID.
8. Add `layer1ToLegacy(ssr, stories): { requirements: ExtractedRequirements; behaviors: ExtractedBehaviors }` — adapter for Steps 2–5 backward compat:
   - `features` ← user stories formatted as `"US-01: As a [actor], I want [action]"`
   - `businessRules` ← `[...ssr.businessRules, ...ssr.constraints]`
   - `acceptanceCriteria` ← flattened from all story AC arrays
   - `entities` ← `ssr.entities`
   - `behaviors.feature` ← `ssr.featureName`
   - `behaviors.actors` ← unique actors from stories
   - `behaviors.actions` ← `story.action` for each story
   - `behaviors.rules` ← `[...ssr.systemRules, ...ssr.businessRules, ...ssr.globalPolicies]`
9a. Add `compressUserStories(stories: UserStory[], max: number): UserStory[]` — slices to `MAX_STORIES` limit for safe downstream consumption.
9b. Update `compressForDownstream()` to also accept and compress `UserStory[]`, returning a third value for the prompt builders.
9. Add new constants to `apps/api/src/modules/test-case/constants.ts`:
   - `MAX_STORIES: 25`, `MAX_SSR_RULES: 40`, `MAX_CONSTRAINTS: 20`, `MAX_GLOBAL_POLICIES: 10`

### Phase 4b — Database Schema for Downstream Tracing (`apps/api/prisma/schema.prisma`)
Add user story reference fields:
```prisma
// In TestCase model:
requirementRefs  Json?   // Array of US-xx / FR-xx / BR-xx IDs from the scenario

// In DeveloperTask model:
userStoryIds     Json?   // Array of US-xx IDs this task implements
```
Include in the same migration as Phase 1 DB additions.

### Phase 5 — Pipeline Service (`apps/api/src/modules/test-case/pipeline.service.ts`)
10. Add private `_layer1ExtractionNew(featureId, provider, startChunk, partial?, promptAppend?)`:
    - Same chunking/merging/resuming logic as current `_layer1Extraction`
    - Uses `provider.extractSSRAndStories()` per chunk instead of `provider.extractAll()`
    - After all chunks merged: calls `synthesiseLayer1AB()` (multi-chunk only)
    - Then calls `provider.extractMapping(ssr, stories)` — single call
    - Then calls `provider.extractValidation(ssr, stories, mapping)` — single call
    - On failure during 1C/1D: saves `pipelinePartial` as `{ partial: Layer1ABPartial, phase: 'mapping' | 'validation' }` so resume can skip re-chunking
11. Modify `runStep1()` to call `_layer1ExtractionNew()` and save:
    - `layer1SSR`, `layer1Stories`, `layer1Mapping`, `layer1Validation` (new fields)
    - `extractedRequirements`, `extractedBehaviors` (via `layer1ToLegacy()` adapter — for backward compat)
    - After saving Layer 1, also pass `UserStory[]` directly to Step 2–5 prompt builders (alongside the legacy adapter output), so scenarios/tasks carry US-xx refs
12. Modify `resumeStep1()` to be phase-aware: read `pipelinePartial.phase` — if `'mapping'` or `'validation'`, skip chunking and resume from that sublayer using saved `layer1SSR`/`layer1Stories`.
13. Add section re-run methods:
    - `runStep1Mapping(featureId, providerName?, model?)` — re-runs 1C using saved `layer1SSR`+`layer1Stories`
    - `runStep1Validation(featureId, providerName?, model?)` — re-runs 1D using saved mapping
14. Modify `saveStepResults()` step 1 branch to accept new payload fields (`ssrData`, `userStories`, `mapping`, `validationResult`) and derive legacy fields via adapter.
15. Modify `getStepPrompt()` step 1 to use `buildExtractSSRAndStoriesPrompt()`.
16. Update `runStep2()`: pass `UserStory[]` (from saved `layer1Stories`) to `buildPlanScenariosPrompt()` alongside compressed requirements/behaviors; scenarios now carry `userStoryId`.
17. Update `runStep3()`: read `scenario.userStoryId` and write it to `GeneratedTestCase.userStoryId`; persist as `TestCase.requirementRefs` (JSON array).
18. Update `runStep4a/4b/4c()`: pass `UserStory[]` to respective prompt builders; each task item in the returned plan gets `userStoryIds?: string[]`.
19. Update `runStep5()` (all sections): pass `UserStory[]` to prompt builders; persist `userStoryIds` from each `DevTaskItem` into `DeveloperTask.userStoryIds` (JSON array).

### Phase 6 — Controller & Service Facade
21. `apps/api/src/modules/test-case/test-case.service.ts`: Add `runStep1SectionForFeature(featureId, sublayer: 'mapping' | 'validation', ...)`.
22. `apps/api/src/modules/test-case/test-case.controller.ts`: Add endpoint:
    ```
    POST /test-cases/feature/:featureId/run-step-1-section/:sublayer
    sublayer: 'ssr-stories' | 'mapping' | 'validation'
    ```

### Phase 7 — Frontend Types & API Client
23. `apps/web/src/lib/api.ts`:
    - Add new interfaces (`SSRData`, `UserStory`, `UserStories`, `Mapping`, `ValidationResult`, etc.)
    - Add `layer1SSR?`, `layer1Stories?`, `layer1Mapping?`, `layer1Validation?` to `Feature` interface (stored as raw JSON strings, parse with `JSON.parse()` in components)
    - Add `userStoryId?` to `TestScenario`; `requirementRefs?` (string[]) to the existing test case type; `userStoryIds?` to `DevTaskItem`
    - Add `runStep1Section(featureId, sublayer, provider?, model?)` method
    - Update `saveStepResults` type for step 1 new payload fields

### Phase 8 — Frontend UI
24. `apps/web/src/features/feature/PipelineWizard.tsx`:
    - `deriveStatus(1)`: use `!!feature.layer1SSR` as completion signal (fallback: `!!feature.extractedRequirements` for old records)
    - `startEdit(1)`: populate draft from parsed `layer1SSR` + `layer1Stories`
    - `handleSave(1)`: send new payload shape
    - `MANUAL_TEMPLATES[1]`: update to `{ ssr: {...}, stories: {...}, mapping: {...}, validation: {...} }` shape
25. Rewrite `apps/web/src/features/feature/components/pipeline-wizard/PipelineStep1.tsx` with 4 collapsible panels:
    - **Panel 1A** — System & Business Rules: shows `systemRules`, `businessRules`, `constraints`, `globalPolicies`, `entities` as labeled lists
    - **Panel 1B** — User Stories: table with columns `ID | Actor | Action | Benefit | Priority` with expandable rows for AC and relatedRuleIds
    - **Panel 1C** — Traceability Map: table `Rule ID | Text | Linked Stories | Coverage` with red badges for uncovered rules and orphan story warnings
    - **Panel 1D** — Validation: quality score badge (green ≥80, amber 50-79, red <50), summary paragraph, issues list with severity icons
    - Backward-compat fallback: if `layer1SSR` is null but `extractedRequirements` exists, render the old 2-column view
    - Keep all existing controls: Run, Resume, Re-run, Edit, Manual, Copy Markdown, Prompt Append

### Phase 9 — BA Document Format Guide
21b. `apps/web/src/features/feature/components/feature-detail/BADocFormatGuide.tsx`:
- **`CONVERSION_PROMPT`** — update two lines to match the new pipeline expectations:
  - User Stories: change `← Bullet list with IDs: US-01, US-02, ...` → `← "As a [Actor], I want [Action], so that [Benefit]" format with IDs; link AC IDs where applicable`
  - Add new section entry: `## System Rules  ← Bullet list with IDs: SYS-01, SYS-02, ... (global/cross-cutting rules: auth, audit, rate-limit, multi-tenancy)`
  - Add `SYS-01` to the ID assignment rule: `Assign sequential IDs ... (FR-01, BR-01, AC-01, VR-01, US-01, SYS-01)`
- **`BA_TEMPLATE`** — add a `## System Rules` section after `## Validation Rules` (same as CONVERSION_PROMPT addition, so the downloadable template stays consistent with the converter):
  ```markdown
  ## System Rules
  - SYS-01: [Cross-cutting rule, e.g. "All API endpoints require authentication"]
  - SYS-02: [e.g. "All data mutations must be audit-logged"]
  ```
  No other changes needed — `BA_TEMPLATE` already has the correct `As a / I want / so that` user story format.

---

## Critical Files

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add 4 Layer 1 columns + `TestCase.requirementRefs` + `DeveloperTask.userStoryIds` |
| `apps/api/src/modules/ai/ai-provider.abstract.ts` | New Layer 1 types, updated Step 2–5 types (`userStoryId`, `userStoryIds`), prompt builders |
| `apps/api/src/modules/ai/providers/gemini.provider.ts` | Implement 4 new methods |
| `apps/api/src/modules/ai/providers/claude.provider.ts` | Implement 4 new methods |
| `apps/api/src/modules/ai/providers/openai.provider.ts` | Implement 4 new methods |
| `apps/api/src/modules/test-case/helpers/pipeline.utils.ts` | `mergeLayer1AB`, `layer1ToLegacy` |
| `apps/api/src/modules/test-case/constants.ts` | New MAX_* constants |
| `apps/api/src/modules/test-case/pipeline.service.ts` | Core logic changes |
| `apps/api/src/modules/test-case/test-case.service.ts` | New section method |
| `apps/api/src/modules/test-case/test-case.controller.ts` | New section endpoint |
| `apps/web/src/lib/api.ts` | New types + API methods |
| `apps/web/src/features/feature/PipelineWizard.tsx` | State/draft changes |
| `apps/web/src/features/feature/components/pipeline-wizard/PipelineStep1.tsx` | Full redesign |
| `apps/web/src/features/feature/components/feature-detail/BADocFormatGuide.tsx` | Update CONVERSION_PROMPT (User Stories format + SYS-xx section); add System Rules to BA_TEMPLATE |

---

## Reusable Patterns to Follow
- Step 4 section pattern in `pipeline.service.ts` — `runStep4a/4b/4c` for individual sublayer runners
- `run-step-4-section/:section` controller pattern — replicate for `run-step-1-section/:sublayer`
- `withRetry()` from `pipeline.utils.ts` — wrap all new AI calls
- `generateObject()` with Zod schemas — all providers use this pattern for structured AI output

---

## Verification
1. Run `pnpm dev:api` — confirm migration runs, server starts
2. Upload a BA doc and run Step 1 — confirm all 4 sublayers return data
3. Immediately run Step 2 — confirm it still works AND that `testScenarios[0].userStoryId` is populated with a US-xx ID
4. Run Step 3 — confirm `TestCase.requirementRefs` contains US-xx references
5. Run Step 4 — confirm dev plan task items include `userStoryIds`
6. Run Step 5 — confirm `DeveloperTask.userStoryIds` is persisted in DB
4. Kill the API mid-step-1 and restart — confirm resume from chunk works
5. Kill during 1C — confirm `pipelinePartial.phase === 'mapping'` triggers 1C-only resume
6. Manually paste JSON in Step 1 Manual panel — confirm new template shape is accepted
7. Open a feature with old `extractedRequirements` data (no `layer1SSR`) — confirm fallback render works
8. Run `pnpm build:api && pnpm build:web` — confirm no TypeScript errors
