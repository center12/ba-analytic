# Module: dev-task
**Purpose**: CRUD for DeveloperTask records created by pipeline step 4 (dev prompt generation).

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/dev-tasks/feature/:featureId` | `findByFeature` | List dev tasks for a feature ordered by `createdAt asc` |
| DELETE | `/api/dev-tasks/:id` | `remove` | Delete a single dev task |

## Service Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `findByFeature` | `(featureId: string) => Promise<DeveloperTask[]>` | — |
| `remove` | `(id: string) => Promise<DeveloperTask>` | — |

## NestJS Dependencies
- Imports: `PrismaService`
- Guards: `JwtAuthGuard` (global)
