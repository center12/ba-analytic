# Module: project
**Purpose**: CRUD for Projects and Features, file uploads (BA docs + screenshots), and per-project pipeline AI config.

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/projects` | `findAll` | List all projects with feature counts |
| GET | `/api/projects/:id` | `findOne` | Get one project with its features |
| POST | `/api/projects` | `create` | Create a project |
| PUT | `/api/projects/:id` | `update` | Update a project |
| DELETE | `/api/projects/:id` | `delete` | Delete a project (cascade) |
| GET | `/api/projects/:projectId/features` | `findAllFeatures` | List features for a project |
| POST | `/api/projects/:projectId/features` | `createFeature` | Create a feature |
| GET | `/api/projects/features/:featureId` | `findOneFeature` | Get one feature with uploads |
| PUT | `/api/projects/features/:featureId` | `updateFeature` | Update a feature |
| DELETE | `/api/projects/features/:featureId` | `deleteFeature` | Delete a feature (cascade) |
| POST | `/api/projects/features/:featureId/upload/ba-document` | `uploadBADocument` | Upload `.md` BA document (5 MB max) |
| POST | `/api/projects/features/:featureId/upload/screenshot` | `uploadScreenshot` | Upload any image file |
| GET | `/api/projects/:projectId/pipeline-config` | `getPipelineConfig` | Get per-step AI overrides |
| PUT | `/api/projects/:projectId/pipeline-config` | `upsertPipelineConfig` | Upsert step configs |
| DELETE | `/api/projects/:projectId/pipeline-config/:step` | `deletePipelineConfigStep` | Remove override for a step |

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `findAllProjects` | `() => Promise<Project[]>` | Projects with `_count.features` |
| `findOneProject` | `(id: string) => Promise<Project>` | 404 if missing |
| `createProject` | `(dto: CreateProjectDto) => Promise<Project>` | — |
| `updateProject` | `(id, dto) => Promise<Project>` | — |
| `deleteProject` | `(id) => Promise<Project>` | — |
| `findAllFeatures` | `(projectId) => Promise<Feature[]>` | Includes baDocument + counts |
| `findOneFeature` | `(id) => Promise<Feature>` | Includes uploads + counts |
| `createFeature` | `(projectId, dto) => Promise<Feature>` | — |
| `updateFeature` | `(id, dto) => Promise<Feature>` | — |
| `deleteFeature` | `(id) => Promise<Feature>` | — |
| `uploadBADocument` | `(featureId, file) => Promise<BADocument>` | Validates `.md`, upserts record |
| `uploadScreenshot` | `(featureId, file) => Promise<Screenshot>` | Any image, appends record |
| `getProjectPipelineConfig` | `(projectId) => Promise<ProjectPipelineConfig[]>` | — |
| `upsertProjectPipelineConfig` | `(projectId, dto) => Promise<ProjectPipelineConfig[]>` | Transaction upsert |
| `deleteProjectPipelineConfigStep` | `(projectId, step) => Promise` | — |

## DTOs
| Class | Fields |
|-------|--------|
| `CreateProjectDto` | `name: string (min 1)`, `description?: string` |
| `CreateFeatureDto` | `name: string (min 1)`, `description?: string` |
| `StepConfigDto` | `step: number`, `provider: string`, `model?: string` |
| `UpsertPipelineConfigDto` | `configs: StepConfigDto[]` |

## NestJS Dependencies
- Imports: `StorageModule` (for `STORAGE_PROVIDER` token), `MulterModule` (memory storage), `PrismaService`
- Guards: `JwtAuthGuard` (global)
