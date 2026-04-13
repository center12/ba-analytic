# Feature: Feature

## Purpose
- Manage a feature detail workflow: uploads, AI pipeline execution (Steps 1–5), and developer task outputs.

---

## User Flow
1. Open `/projects/:projectId/features/:featureId` and choose provider/model.
2. Upload BA document (`.md`) and/or screenshots.
3. Run Steps 1–5 sequentially (or paste manual JSON via `ManualPanel`).
4. Optionally append runtime instructions (`promptAppend`) before running any step.
5. In Step 4, generate `workflow-backend` first, then `frontend`, then testing sub-sections.
6. In Step 5, run `backend`, `frontend`, or `testing` sections individually.
7. Edit outputs inline (Step 1 & 2) or copy step prompt to external AI, paste refined JSON back.
8. Review generated test cases, dev plan, prompts, and developer task list.
9. In Step 1 manual/edit flows, `layer1Stories.stories[].acceptanceCriteria` uses AC IDs only; full acceptance-criteria text remains in legacy `extractedRequirements`.

---

## Screens
### FeatureDetailPage
- Elements:
  - Back link, `ModelSelector`, BA doc / screenshot upload buttons
  - `BADocFormatGuide` dialog, `PipelineWizard`, `DeveloperTaskPanel`
  - `AppFeedbackDialog` in header

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
- `FeatureDetailPage` — page shell; owns file upload mutations and layout
- `PipelineWizard` — owns all query/mutation logic and step state
- `PipelineStep1`/`2`/`3`/`4`/`5` — per-step UI for extraction, scenarios, test cases, dev plan, prompts
- `StepHeader` — shows step number, title, and `StepStatus` badge
- `ManualPanel` — copy prompt / paste & save JSON for manual external-AI flow
- `DevPlanPanel`, `DevPromptPanel` — read-only viewers for Step 4 and Step 5 outputs
- `EditableList` — inline editable list widget used in Step 1/2 edit mode
- `BADocFormatGuide` — dialog with BA template download and AI conversion prompt copy
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
### GET `/features/:featureId` — load feature on mount
### POST `/features/:featureId/upload/ba-document` — upload BA doc (.md only)
### POST `/features/:featureId/upload/screenshot` — upload screenshot (any image)
### POST `/feature-analysis/feature/:featureId/run-step/:step` — run step 1–5 (`promptAppend?`)
### POST `/feature-analysis/feature/:featureId/resume-step1` — resume failed Step 1
### PATCH `/feature-analysis/feature/:featureId/step-results` — save manual/edited step results
### POST `/feature-analysis/feature/:featureId/run-step-4-section/:section` — run Step 4 section (`promptAppend?`)
- `workflow-backend` | `frontend` | `testing-backend` | `testing-frontend`
### POST `/feature-analysis/feature/:featureId/run-step-5-section/:section` — run Step 5 section (`promptAppend?`)
- `backend` (alias `api`) | `frontend` | `testing`
### GET `/feature-analysis/feature/:featureId/step-prompt/:step` — fetch manual prompt text
### GET `/feature-analysis/feature/:featureId` — list FeatureAnalysis records (query key: `['feature-analysis', featureId]`)

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

## Dependencies
- API: `api.features`, `api.featureAnalysis`
- Store: `useAppStore` (provider/model), `useQueryClient` (TanStack Query)
