# Module: project
**Purpose**: Owns project/feature CRUD, file uploads, and per-project pipeline provider/model configuration.

## Scope
- In: project/feature lifecycle, BA doc + screenshot metadata, pipeline step config overrides
- Out: file persistence delegated to `IStorageProvider`; downstream pipelines/chat handled by other modules

## Data Model
| Entity | Key Fields | Storage |
|--------|-----------|---------|
| `Project` | `id`, `name`, `description`, timestamps | Postgres |
| `Feature` | `id`, `projectId`, `name`, `description`, timestamps | Postgres |
| `BADocument` | `featureId`(unique), `storageKey`, `mimeType`, `originalName` | Postgres + file storage |
| `Screenshot` | `id`, `featureId`, `storageKey`, `mimeType`, `originalName` | Postgres + file storage |
| `ProjectPipelineConfig` | `projectId`, `step`, `provider`, `model` | Postgres |

**Relationships**: `Project (1) -> (N) Feature`; `Feature (1) -> (1) BADocument`; `Feature (1) -> (N) Screenshot`; `Project (1) -> (N) ProjectPipelineConfig`.

## API Contracts
| Method | Path | Input | Output | Errors |
|--------|------|-------|--------|--------|
| GET | `/api/projects` | none | project list + feature counts | `401/403` |
| GET | `/api/projects/:id` | path:`id` | project + ordered features | `404 Project not found` |
| POST | `/api/projects` | body:`CreateProjectDto` | created project | validation/auth errors |
| PUT | `/api/projects/:id` | path:`id`, body partial project | updated project | `404` |
| DELETE | `/api/projects/:id` | path:`id` | `204 No Content` | `404` |
| GET | `/api/projects/:projectId/features` | path:`projectId` | feature list + upload/analysis/chat counts | `404 Project not found` |
| POST | `/api/projects/:projectId/features` | path:`projectId`, body:`CreateFeatureDto` | created feature | `404 Project not found` |
| GET | `/api/projects/features/:featureId` | path:`featureId` | feature + baDocument + screenshots | `404 Feature not found` |
| PUT | `/api/projects/features/:featureId` | path:`featureId`, body partial feature | updated feature | `404` |
| DELETE | `/api/projects/features/:featureId` | path:`featureId` | `204 No Content` | `404` |
| POST | `/api/projects/features/:featureId/upload/ba-document` | multipart `file` (.md only) | upserted BA doc record | `400 non-md`, `404 feature` |
| POST | `/api/projects/features/:featureId/upload/screenshot` | multipart `file` | created screenshot record | `404 feature` |
| GET | `/api/projects/:projectId/pipeline-config` | path:`projectId` | step config array | `404 project` |
| PUT | `/api/projects/:projectId/pipeline-config` | body:`UpsertPipelineConfigDto` | upserted config rows | `404 project` |
| DELETE | `/api/projects/:projectId/pipeline-config/:step` | path:`projectId`, `step:int` | `204 No Content` | `404 project` |

## Core Flows (top 3)
### Project and feature CRUD
1. Resolve parent record (`Project`/`Feature`) or throw `NotFoundException`.
2. Execute Prisma create/read/update/delete with ordering and count includes.
3. Return normalized DB entities for UI consumption.

### BA document upload
1. Interceptor enforces markdown type + 5 MB file limit.
2. Service revalidates `.md` extension and resolves feature existence.
3. Generate namespaced storage key and upload via storage provider.
4. Upsert `BADocument` row keyed by `featureId`.

### Pipeline config upsert
1. Validate project existence.
2. Iterate `configs[]` and upsert by composite key `(projectId, step)` in transaction.
3. Persist provider/model overrides for pipeline step resolution.

## Constraints
- BA upload accepts Markdown only; rejects others with `BadRequestException`.
- Controller upload cap: 5 MB for BA docs; module-level Multer cap: 10 MB.
- Pipeline config uses transactional upsert for consistency across multiple steps.
- Not-found checks are enforced before all mutate operations.

## Dependencies
- Depends on: `PrismaService`, `StorageModule` (`STORAGE_PROVIDER`), `MulterModule`
- Used by: `feature-analysis` pipeline (reads BA docs/screenshots and project config), frontend project/feature management pages
