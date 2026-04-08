# Feature: Feature

## Purpose
- Manage a feature detail workflow: uploads, AI pipeline execution, and generated developer tasks.

---

## User Flow
1. Open `/projects/:projectId/features/:featureId` and choose provider/model.
2. Upload BA document (`.md`) and screenshots.
3. Run steps 1-5 (or save manual JSON), then review generated outputs.
4. Users can append optional runtime instructions before re-running Step 1-5.
5. In Step 4, generate `workflow-backend` first, then `frontend`, then testing sub-runs (`testing-backend`, `testing-frontend`) as prerequisites allow; each section also supports its own appended instruction text.
6. Step 5 section runs (`backend`, `frontend`, `testing`) also support section-specific appended instruction text.
7. For Step 4 and Step 5, users can click `Manual`, copy prompt text to external AI tools, then paste customized JSON back via `ManualPanel`.
8. Consume test cases, dev plan sections, prompts, and task list.

---

## Screens
### FeatureDetailPage
- Elements:
  - Back link, `ModelSelector`, BA doc/screenshot upload actions
  - `BADocFormatGuide`, `PipelineWizard`, `DeveloperTaskPanel`

### PipelineWizard
- Elements:
  - Step accordions (`PipelineStep1`...`PipelineStep5`) with `StepHeader` status
  - Step 4 section panels for Workflow + Backend, Frontend, and Testing
  - Manual JSON panel (`ManualPanel`) and markdown export (`CopyMarkdownButton`)

---

## Components
- `PipelineWizard` — owns query/mutation flow and step state.
- `PipelineStep1`/`2`/`3`/`4`/`5` — per-step UI for extraction, scenarios, test cases, dev plan, and prompts.
- `PipelineStep4` — renders section-specific Step 4 generation controls, per-section appended prompt input, and prerequisite messaging.
- `PipelineStep5` — renders section-specific Step 5 generation controls and per-section appended prompt input.
- `ManualPanel` — copy prompt + paste/save JSON for manual external-AI refinement.
- `DevPlanPanel` and `DevPromptPanel` — viewers for Step 4 and Step 5 outputs.

---

## State
- Local: `openStep`, `editingStep`, `draft`, `manualStep`, `manualJson`, `manualJsonError`, `stepPromptAppend`, `step4SectionPromptAppend`, `step5SectionPromptAppend`
- Global (store): `activeProvider`, `activeModel`
- Type: `StepStatus` (`idle` | `running` | `completed` | `failed`)

---

## API
### GET `/features/:id` — load feature detail
### POST `/features/:id/ba-document` — upload BA doc (`.md`)
### POST `/features/:id/screenshot` — upload screenshot (image)
### POST `/test-cases/feature/:id/run-step/:step` — run pipeline step (`promptAppend?` supported)
### POST `/test-cases/feature/:id/resume-step-1` — resume step 1
### POST `/test-cases/feature/:id/save-step-results` — manual/edit save
### POST `/test-cases/feature/:id/run-step-4-section/:section` — run one Step 4 section (`promptAppend?` supported):
- `workflow-backend` — generates workflow and backend plans
- `frontend` — generates frontend plan; requires `workflow-backend`
- `testing-backend` — generates backend testing plan; requires backend plan
- `testing-frontend` — generates frontend testing plan; requires backend and frontend plans
### POST `/test-cases/feature/:id/run-step-5-section/:section` — run one Step 5 section (`promptAppend?` supported):
- `backend` (or alias `api`) — generates backend prompts/tasks only
- `frontend` — generates frontend prompts/tasks only
- `testing` — generates testing prompts/tasks only
### GET `/test-cases/feature/:id/step/:step/prompt` — fetch manual prompt

Note: Step 5 UI label `Backend` maps to persisted `devPromptApi` / `API` category for compatibility.
Note: appended instructions are runtime-only and not persisted.

---

## UX States
- Loading: feature and step panels wait for query data.
- Error: mutation failures show destructive toasts.
- Success: successful actions show toasts and invalidate queries.
