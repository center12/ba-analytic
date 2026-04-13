# Module: feature-analysis
**Purpose**: Runs the multi-step AI pipeline to transform BA docs into scenarios, test cases, dev plans, and developer tasks.

## Scope
- In: pipeline step orchestration (run/resume/sectional runs), FeatureAnalysis CRUD, prompt preview, manual result saving
- Out: model inference delegated to `AIProviderFactory`; file access delegated to `StorageModule`; project configs read from `project` data

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `FeatureAnalysis` | `id`, `featureId`, `title`, `priority`, `status`, `steps(json)`, provider/model metadata | Postgres |
| `Feature pipeline fields` | `extractedRequirements`, `testScenarios`, `devPlan*`, `devPrompt*`, `pipelineStatus`, `pipelineStep` | Postgres (JSON cols) |
| `DeveloperTask` | `featureId`, `category(API/FRONTEND/TESTING)`, `title`, `prompt` | Postgres |

**Relationships**: `Feature (1) -> (N) FeatureAnalysis`; `Feature (1) -> (N) DeveloperTask`; step outputs persist on `Feature` and feed later steps.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/feature-analysis/feature/:featureId/step-prompt/:step` | path:`featureId`, `step:int` | `{ prompt: string }` | `400 invalid step/prereq`, `404 feature` |
| GET | `/api/feature-analysis/feature/:featureId` | path:`featureId` | FeatureAnalysis list (desc) | auth errors |
| GET | `/api/feature-analysis/:id` | path:`id` | one FeatureAnalysis | `404 FeatureAnalysis not found` |
| PUT | `/api/feature-analysis/:id` | path:`id`, body:`UpdateFeatureAnalysisDto` | updated record | `404` |
| DELETE | `/api/feature-analysis/:id` | path:`id` | `204 No Content` | `404` |
| POST | `/api/feature-analysis/feature/:featureId/generate` | query:`provider?`,`model?` | full pipeline result | step failures, `404/400` |
| POST | `/api/feature-analysis/feature/:featureId/resume` | query:`provider?`,`model?` | resumed pipeline result | `400` if pipeline not FAILED |
| POST | `/api/feature-analysis/feature/:featureId/run-step/:step` | query:`provider?`,`model?`, body:`override?`, `promptAppend?` | step-specific result | `400 invalid step` |
| POST | `/api/feature-analysis/feature/:featureId/run-step-1-section/:sublayer` | `sublayer`: `ssr-stories`\|`mapping`\|`validation`, query provider/model | sublayer result | `400 invalid sublayer/prereq` |
| POST | `/api/feature-analysis/feature/:featureId/run-step-4-section/:section` | `section`: `workflow-backend`\|`frontend`\|`testing`\|`testing-backend`\|`testing-frontend`, query provider/model, body:`promptAppend?` | section result | `400 invalid section/prereq` |
| POST | `/api/feature-analysis/feature/:featureId/run-step-5-section/:section` | `section`: `backend`\|`api`\|`frontend`\|`testing`, query provider/model, body:`promptAppend?` | section result | `400 invalid section/prereq` |
| POST | `/api/feature-analysis/feature/:featureId/resume-step1` | query provider/model | resumed extraction | `400` if step1 not FAILED |
| PATCH | `/api/feature-analysis/feature/:featureId/step-results` | body edited step payload | persisted step output | `400` invalid body |

## Core Flows (top 3)
### Full pipeline run (steps 1–5)
1. Reset pipeline state; resolve providers per step (runtime override > saved project step config > env default).
2. Step 1: read BA doc via storage, chunk content (max 40k chars, 1.5k overlap), retry AI on quota errors.
3. Step 2: plan scenarios from extraction; Step 3: batch generate `FeatureAnalysis` rows in batches of 15.
4. Step 4: run 4A (workflow+backend), 4B (frontend), 4C backend testing, then 4C frontend testing.
5. Step 5: generate Backend/API, Frontend, Testing prompts; delete and recreate `DeveloperTask` rows.

### Step sectional execution
1. `run-step/:step` dispatches to pipeline step handlers 1–5.
2. `run-step-4-section/:section` dispatches to `runStep4a`, `runStep4b`, `runStep4cBackend`, `runStep4cFrontend`.
3. `run-step-5-section/:section` dispatches per category; `api` alias maps to backend.
4. Optional `promptAppend` (≤ 2000 chars) appended to final AI prompt at runtime; never persisted.
5. Each step sets pipeline status `RUNNING`/`FAILED`/`COMPLETED`.

### Manual edit persistence
1. `saveStepResults` accepts user-edited payload for steps 1–5.
2. For steps 3 and 5, existing rows are deleted then recreated.
3. Feature pipeline metadata is updated to completed state for edited step.
4. Copy step prompt via `step-prompt` endpoint, refine in external AI, paste JSON, save via `step-results`.

## Constraints
- Chunking: `MAX_DOC_CHARS 120000`, `CHUNK_MAX_CHARS 40000`, overlap `1500`, delay `2000ms`.
- Scenario batch size: 15.
- Retry uses exponential backoff starting at 30s for 429/quota errors.
- `promptAppend` trimmed, ignored when empty, max 2000 chars, never persisted.
- Step prerequisites: Step 2 needs Step 1; `frontend` requires `workflow-backend`; `testing-backend` requires backend; `testing-frontend` requires backend + frontend.
- Layer 1B stores `stories[].acceptanceCriteria` as AC IDs only (`AC-01`, `AC-02`, ...), not full Given/When/Then text.
- Layer 1C must persist one mapping link per SSR rule/system policy; omitted AI links are normalized into `coverage: 'none'` fallback rows.
- Legacy `extractedRequirements.acceptanceCriteria` remains full-text Given/When/Then content for downstream scenario and test generation.

## Dependencies
- Depends on: `PrismaService`, `AIModule` (`AIProviderFactory`), `StorageModule` (`STORAGE_PROVIDER`)
- Used by: feature detail pipeline wizard UI, dev-task module data, project pipeline config at runtime
