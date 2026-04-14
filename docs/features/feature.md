# Feature: Feature

## Purpose
- Run the AI pipeline (Steps 1–5) on a feature, review all outputs, and access developer task prompts.

---

## User Flow
1. Open `/projects/:projectId/features/:featureId` — feature content must already be set on the project page.
2. If content is missing, a banner links back to the project page.
3. Choose global provider/model via `ModelSelector` in the header.
4. Expand a pipeline step and click Run (or Resume for a failed Step 1).
5. Optionally append runtime instructions (`promptAppend`) before running any step.
6. In Step 4, generate `workflow-backend` first, then `frontend`, then testing sub-sections.
7. In Step 5, run `backend`, `frontend`, or `testing` sections individually.
8. Edit outputs inline (Steps 1 & 2) or copy step prompt → paste refined JSON back via `ManualPanel`.
9. Review generated test cases (`FeatureAnalysisDashboard`), dev plan, prompts, and developer tasks.
10. Export any step output as Markdown via `CopyMarkdownButton`.

---

## Screens
### FeatureDetailPage
- Elements:
  - Back link, feature name/description header
  - `ModelSelector`, `AppFeedbackDialog`
  - Warning banner when feature has no content
  - `PipelineWizard` (main content area)
  - `DeveloperTaskPanel` (below wizard)

### PipelineWizard
- Elements:
  - Five collapsible step accordions (`PipelineStep1`–`PipelineStep5`) with `StepHeader` status badges
  - Per-step optional `promptAppend` text area
  - Step 4 section controls: `workflow-backend`, `frontend`, `testing-backend`, `testing-frontend`
  - Step 5 section controls: `backend`, `frontend`, `testing`
  - `ManualPanel` for copy-prompt / paste-JSON flow
  - `CopyMarkdownButton` for markdown export per step

---

## Components
- `FeatureDetailPage` — page shell with header, content-missing warning, and layout
- `PipelineWizard` — owns all query/mutation logic and step state
- `PipelineStep1`/`2`/`3`/`4`/`5` — per-step UI for extraction, scenarios, test cases, dev plan, prompts
- `StepHeader` — shows step number, title, and `StepStatus` badge
- `ManualPanel` — copy prompt / paste & save JSON for manual external-AI flow
- `DevPlanPanel`, `DevPromptPanel` — read-only viewers for Step 4 and Step 5 outputs
- `EditableList` — inline editable list widget used in Step 1/2 edit mode
- `CopyMarkdownButton` — triggers markdown export/download for a pipeline step
- Step 4 sub-panels: `WorkflowPanel`, `BackendPanel`, `FrontendPanel`, `TestingPanel`, `Section`, `StringList`
- Step 1 sub-panels: `UserStoriesSection`, `RulesSection`, `TraceabilityMapSection`, `ValidationSection`, `SectionCard`, `LegacyStep1View`

---

## State
### Local (PipelineWizard):
- `openStep` — which step accordion is expanded
- `editingStep` — which step is in inline-edit mode
- `draft` — key/value map of edited field values
- `manualStep`, `manualJson`, `manualJsonError` — manual JSON panel state
- `stepPromptAppend` — per-step appended instruction text (steps 1–5)
- `step4SectionPromptAppend` — per-section appended text for Step 4
- `step5SectionPromptAppend` — per-section appended text for Step 5

### Global (store):
- `activeProvider` — useAppStore
- `activeModel` — useAppStore

---

## Types
- `StepStatus` — `'idle' | 'running' | 'completed' | 'failed'`

---

## API
### GET `/features/:featureId` — load feature on mount (query key: `['features', featureId]`)
### GET `/feature-analysis/feature/:featureId` — list FeatureAnalysis records (query key: `['feature-analysis', featureId]`)
### POST `/feature-analysis/feature/:featureId/run-step/:step` — run step 1–5 (`promptAppend?`)
### POST `/feature-analysis/feature/:featureId/resume-step1` — resume failed Step 1
### PATCH `/feature-analysis/feature/:featureId/step-results` — save manual/edited step results
### POST `/feature-analysis/feature/:featureId/run-step-4-section/:section` — run Step 4 section (`promptAppend?`)
- `workflow-backend` | `frontend` | `testing-backend` | `testing-frontend`
### POST `/feature-analysis/feature/:featureId/run-step-5-section/:section` — run Step 5 section (`promptAppend?`)
- `backend` (alias `api`) | `frontend` | `testing`
### GET `/feature-analysis/feature/:featureId/step-prompt/:step` — fetch manual prompt text

---

## UX States
- Loading: step panels wait for feature/featureAnalysis queries
- Running: `StepHeader` shows spinner; buttons disabled
- Error: mutation failures show destructive toasts; feature refreshed to show FAILED state
- Success: toasts shown; queries invalidated; `openStep` advances to next step

---

## Routing
- `/projects/:projectId/features/:featureId` → FeatureDetailPage
- Guard: authenticated (ProtectedRoute)

---

## Edge Cases
- Feature with no content shows a banner warning linking back to project page
- `layer1Stories.stories[].acceptanceCriteria` uses AC IDs only; full text lives in legacy `extractedRequirements`
- `MANUAL_TEMPLATES` (constants) provides JSON skeletons for all 5 steps for the manual flow

---

## Dependencies
- API: `api.features`, `api.featureAnalysis`
- Store: `useAppStore` (provider/model), TanStack Query
