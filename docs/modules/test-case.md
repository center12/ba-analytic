# Module: test-case
**Purpose**: Runs the multi-step AI pipeline to transform BA docs into scenarios, test cases, dev plans, and developer tasks.

## Scope
- In: pipeline step orchestration (run/resume/sectional runs), test case CRUD, prompt preview/saving edited outputs
- Out: model inference delegated to `AIProviderFactory`; file access delegated to `StorageModule`; project configs read from `project` data

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `TestCase` | `id`, `featureId`, `title`, `priority`, `status`, `steps(json)`, provider/model metadata | Postgres |
| `Feature pipeline fields` | `extractedRequirements`, `extractedBehaviors`, `testScenarios`, `devPlan*`, `devPrompt*`, pipeline status fields | Postgres(JSON) |
| `DeveloperTask` | `featureId`, `category`, `title`, `prompt` | Postgres |

**Relationships**: `Feature (1) -> (N) TestCase`; `Feature (1) -> (N) DeveloperTask`; step outputs persist on `Feature` and feed later steps.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/test-cases/feature/:featureId/step-prompt/:step` | path:`featureId`, `step:int` | `{ prompt: string }` | `400 invalid step/prereq`, `404 feature` |
| GET | `/api/test-cases/feature/:featureId` | path:`featureId` | test case list | auth errors |
| GET | `/api/test-cases/:id` | path:`id` | one test case | `404 TestCase not found` |
| PUT | `/api/test-cases/:id` | path:`id`, body:`UpdateTestCaseDto` | updated test case | `404` |
| DELETE | `/api/test-cases/:id` | path:`id` | `204 No Content` | `404` |
| POST | `/api/test-cases/feature/:featureId/generate` | query:`provider?`,`model?` | full pipeline result payload | step failures, `404/400` prereq errors |
| POST | `/api/test-cases/feature/:featureId/resume` | query:`provider?`,`model?` | resumed pipeline result | `400` if pipeline not failed |
| POST | `/api/test-cases/feature/:featureId/run-step/:step` | query:`provider?`,`model?`, body:`override?` | step-specific result | `400 invalid step/prereq` |
| POST | `/api/test-cases/feature/:featureId/run-step-4-section/:section` | `section` in `workflow-backend` \| `frontend` \| `testing-backend` \| `testing-frontend`; API also accepts high-level `testing` as a convenience wrapper, query provider/model | section result | `400 invalid section/prereq` |
| POST | `/api/test-cases/feature/:featureId/resume-step1` | query provider/model | resumed extraction result | `400` if step1 not failed |
| PATCH | `/api/test-cases/feature/:featureId/step-results` | body edited step payload | persisted step output summary | `400` invalid body |

## Core Flows (top 3)
### Full pipeline run/resume
1. Resolve providers per step (runtime override > saved project step config > env default).
2. Step 1 reads BA doc via storage, chunks content, retries AI calls, and supports resume from failed chunk.
3. Step 2 plans scenarios from extraction; Step 3 batches case generation and rewrites `TestCase` rows.
4. Step 4 runs in order: 4A `workflow-backend`, 4B `frontend`, 4C backend testing, then 4C frontend testing.
5. Step 4 persists JSON outputs on `Feature` as `devPlanWorkflow`, `devPlanBackend`, `devPlanFrontend`, and merged `devPlanTesting`.
6. Step 5 generates API/Frontend/Testing prompts and rewrites `DeveloperTask` rows.

### Step-specific execution
1. `runStepForFeature` dispatches to pipeline step handlers (1-5).
2. Step 4 sectional endpoint dispatches to `runStep4a`, `runStep4b`, `runStep4cBackend`, `runStep4cFrontend`, or the convenience `runStep4c` wrapper for high-level `testing`.
3. Each step validates prerequisites and sets pipeline status (`RUNNING`/`FAILED`/`COMPLETED`).

### Manual edit persistence
1. `saveStepResults` accepts user-edited payload for step 1-5.
2. For step 3 and 5, existing `TestCase`/`DeveloperTask` rows are deleted then recreated.
3. Feature pipeline metadata is updated to completed state for edited step.

## Constraints
- Chunking limits: `MAX_DOC_CHARS 120000`, `CHUNK_MAX_CHARS 40000`, overlap `1500`, delay `2000ms`.
- Scenario generation batches use `SCENARIO_BATCH 15`.
- Retry uses exponential backoff for quota/429 failures.
- Step prerequisites enforced:
  - Step 2 needs Step 1 output.
  - `frontend` requires `workflow-backend`.
  - `testing-backend` requires backend output from `workflow-backend`.
  - `testing-frontend` requires backend and frontend outputs.

## Dependencies
- Depends on: `PrismaService`, `AIModule` (`AIProviderFactory`), `StorageModule` (`STORAGE_PROVIDER`)
- Used by: test-case dashboard/workflow UI, dev-task module data, project pipeline configuration at runtime
