# Module: test-case
**Purpose**: Orchestrates the 4-layer AI pipeline to generate and persist test cases and dev prompts.

## API Routes
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/test-cases/feature/:featureId/step-prompt/:step` | `getStepPrompt` | Return prompt text for a step without calling AI |
| GET | `/api/test-cases/feature/:featureId` | `findByFeature` | List test cases for a feature |
| GET | `/api/test-cases/:id` | `findOne` | Get one test case |
| PUT | `/api/test-cases/:id` | `update` | Update test case fields |
| DELETE | `/api/test-cases/:id` | `delete` | Delete a test case |
| POST | `/api/test-cases/feature/:featureId/generate` | `generate` | Run full pipeline (steps 1–4) |
| POST | `/api/test-cases/feature/:featureId/resume` | `resume` | Resume failed full pipeline from failed chunk |
| POST | `/api/test-cases/feature/:featureId/run-step/:step` | `runStep` | Run a single step (1–4) independently |
| POST | `/api/test-cases/feature/:featureId/resume-step1` | `resumeStep1` | Resume step 1 from failed chunk |
| PATCH | `/api/test-cases/feature/:featureId/step-results` | `saveStepResults` | Persist manually edited step output |

## Service Methods (TestCaseService — delegates to PipelineService)
| Method | Signature | Description |
|--------|-----------|-------------|
| `findByFeature` | `(featureId) => Promise<TestCase[]>` | — |
| `findOne` | `(id) => Promise<TestCase>` | 404 if missing |
| `update` | `(id, dto) => Promise<TestCase>` | — |
| `delete` | `(id) => Promise<TestCase>` | — |
| `generateForFeature` | `(featureId, provider?, model?) => Promise` | Full pipeline run |
| `runStepForFeature` | `(featureId, step, provider?, model?, override?) => Promise` | Single step |
| `saveStepResults` | `(featureId, data) => Promise` | Save edited step data |
| `getStepPrompt` | `(featureId, step) => Promise<{ prompt: string }>` | — |

## DTOs
| Class | Fields |
|-------|--------|
| `UpdateTestCaseDto` | `title?`, `description?`, `preconditions?`, `priority? (HIGH/MEDIUM/LOW)`, `status? (DRAFT/APPROVED/DEPRECATED)`, `steps? [{action, expectedResult}]` |

## Constants
| Name | Value |
|------|-------|
| `AI_CONFIG.MAX_DOC_CHARS` | `120_000` (triggers chunking) |
| `AI_CONFIG.CHUNK_MAX_CHARS` | `40_000` |
| `AI_CONFIG.SCENARIO_BATCH` | `15` |
| `AI_CONFIG.TEMPERATURE` | `0.2` |
| Other limits | `MAX_FEATURES=25`, `MAX_RULES=40`, `MAX_CRITERIA=20`, `MAX_ENTITIES=15` |

## Helpers (`helpers/pipeline.utils.ts`)
| Function | Signature |
|----------|-----------|
| `readDocumentContent` | `(filePath: string) => Promise<string>` — reads file, strips BOM, sanitises injection patterns |
| `estimateTokens` | `(text: string) => number` |
| `chunkMarkdown` | `(text: string, maxChars?) => string[]` — splits by `##` sections |
| `mergeExtractions` | `(extractions: CombinedExtraction[]) => CombinedExtraction` — deduplicates chunk results |
| `compressForDownstream` | `(req, beh) => { req, beh }` — trims arrays to config limits |
| `withRetry` | `<T>(fn, retries=3, baseDelayMs=30000) => Promise<T>` — exponential backoff on 429 |

## Extra Files
| File | Responsibility |
|------|----------------|
| `pipeline.service.ts` | `PipelineService` — runs `runStep1`–`runStep4`, chunking, synthesis, and persistence |

## NestJS Dependencies
- Imports: `AIModule`, `StorageModule`, `PrismaService`
- Guards: `JwtAuthGuard` (global)
