# Module: project
**Purpose**: Owns project/feature CRUD, screenshot uploads, and per-project pipeline provider/model configuration.

## Scope
- In: project/feature lifecycle, screenshot metadata, pipeline step config overrides
- Out: file persistence delegated to `IStorageProvider`; downstream pipelines/chat handled by other modules

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `Project` | `id`, `name`, `description`, `overview`, timestamps | Postgres |
| `Feature` | `id`, `projectId`, `name`, `description`, `content`, `featureType`, `code`, `relatedFeatureIds`, timestamps | Postgres |
| `Screenshot` | `id`, `featureId`, `storageKey`, `mimeType`, `originalName` | Postgres + file storage |
| `ProjectPipelineConfig` | `projectId`, `step`, `provider`, `model` | Postgres |

**Relationships**: `Project (1) -> (N) Feature`; `Feature (1) -> (N) Screenshot`; `Project (1) -> (N) ProjectPipelineConfig`.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/projects` | none | project list + feature counts | `401/403` |
| GET | `/api/projects/:id` | path:`id` | project + ordered features | `404 Project not found` |
| POST | `/api/projects` | body:`CreateProjectDto` | created project | validation/auth errors |
| PUT | `/api/projects/:id` | path:`id`, body partial project | updated project | `404` |
| DELETE | `/api/projects/:id` | path:`id` | `204 No Content` | `404` |
| GET | `/api/projects/:projectId/features` | path:`projectId` | feature list + screenshot/analysis counts | `404 Project not found` |
| POST | `/api/projects/:projectId/features` | path:`projectId`, body:`CreateFeatureDto` | created feature with auto-generated code | `404 Project not found` |
| GET | `/api/projects/features/:featureId` | path:`featureId` | feature + screenshots | `404 Feature not found` |
| PUT | `/api/projects/features/:featureId` | path:`featureId`, body partial feature | updated feature | `404` |
| DELETE | `/api/projects/features/:featureId` | path:`featureId` | `204 No Content` | `404` |
| POST | `/api/projects/features/:featureId/upload/screenshot` | multipart `file` | created screenshot record | `404 feature` |
| GET | `/api/projects/:projectId/pipeline-config` | path:`projectId` | step config array | `404 project` |
| PUT | `/api/projects/:projectId/pipeline-config` | body:`UpsertPipelineConfigDto` | upserted config rows | `404 project` |
| DELETE | `/api/projects/:projectId/pipeline-config/:step` | path:`projectId`, `step:int` | `204 No Content` | `404 project` |

## Core Flows (top 3)
### Project and feature CRUD
1. Resolve parent record (`Project`/`Feature`) or throw `NotFoundException`.
2. Execute Prisma create/read/update/delete with ordering and count includes.
3. Return normalized DB entities for UI consumption.

### Feature creation with auto-code generation
1. Validate project existence; default `featureType` to `FEATURE` if absent.
2. Query existing features of same type in project to find highest sequence number.
3. Generate code with prefix (`FEA-` or `SSR-`) and zero-padded 3-digit sequence.
4. Persist feature with generated code; store optional `relatedFeatureIds` array.

### Pipeline config upsert
1. Validate project existence.
2. Iterate `configs[]` and upsert by composite key `(projectId, step)` in transaction.
3. Persist provider/model overrides for pipeline step resolution.

## Constraints
- Feature codes are auto-generated: `FEA-001` (FEATURE type) or `SSR-001` (SSR type); sequential per project per type.
- Multer file cap: 10 MB module-level for screenshots (memory storage).
- Pipeline config uses transactional upsert for consistency across multiple steps.
- Not-found checks are enforced before all mutate operations.

## Dependencies
- Depends on: `PrismaService`, `StorageModule` (`STORAGE_PROVIDER`), `MulterModule`
- Used by: `feature-analysis` pipeline (reads feature content/screenshots and project config), frontend project/feature management pages
