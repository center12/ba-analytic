# Feature: feature
**Purpose**: Displays a feature's detail page with BA document/screenshot upload and a 5-step AI pipeline wizard that extracts requirements, plans scenarios, generates test cases, builds a dev plan, and produces dev prompts.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `FeatureDetailPage.tsx` | `FeatureDetailPage` | Full-page layout with header (upload buttons, model selector) and PipelineWizard + DeveloperTaskPanel |
| `PipelineWizard.tsx` | `PipelineWizard` | Accordion of 5 pipeline steps; owns all run/save/edit/manual-input state and mutations |

## Components
| File | Purpose |
|------|---------|
| `components/feature-detail/BADocFormatGuide.tsx` | Dialog with BA document format template and download |
| `components/pipeline-wizard/StepHeader.tsx` | Collapsible step header showing status icon (idle/running/completed/failed) |
| `components/pipeline-wizard/EditableList.tsx` | Textarea-based editable list of strings for step 1 edit mode |
| `components/pipeline-wizard/ManualPanel.tsx` | JSON editor panel for manual data entry with save/cancel actions |
| `components/pipeline-wizard/CopyMarkdownButton.tsx` | Button that copies or downloads a step's markdown export |
| `components/pipeline-wizard/PipelinePanel.tsx` | Read-only display of extracted requirements/behaviors and scenarios |
| `components/pipeline-wizard/DevPlanPanel.tsx` | Collapsible sections for workflow, backend, frontend, and testing plan |
| `components/pipeline-wizard/DevPromptPanel.tsx` | Tabbed display of API/Frontend/Testing dev prompts with copy buttons |
| `components/pipeline-wizard/PipelineStep1.tsx` | Step 1 UI — extract requirements & behaviors (run/edit/manual/resume) |
| `components/pipeline-wizard/PipelineStep2.tsx` | Step 2 UI — plan test scenarios (run/edit/manual) |
| `components/pipeline-wizard/PipelineStep3.tsx` | Step 3 UI — generate test cases (run/manual) |
| `components/pipeline-wizard/PipelineStep4.tsx` | Step 4 UI — generate dev plan with per-section re-run support |
| `components/pipeline-wizard/PipelineStep5.tsx` | Step 5 UI — generate dev prompts (run/manual) |

## Types
```ts
export type StepStatus = 'idle' | 'running' | 'completed' | 'failed';
```

## Exported Helpers
| Function | Signature |
|----------|-----------|
| `deriveStatus` | `(stepNum: number, feature: Feature, testCaseCount: number, activeStep: number \| null) => StepStatus` |
| `arrToText` | `(arr: string[]) => string` |
| `textToArr` | `(text: string) => string[]` |
| `downloadMarkdown` | `(text: string, filename: string) => void` |
| `step1ToMarkdown` | `(feature: Feature) => string` |
| `step2ToMarkdown` | `(feature: Feature) => string` |
| `step3ToMarkdown` | `(testCases: TestCase[], featureName: string) => string` |
| `step4ToMarkdown` | `(feature: Feature) => string` |
| `step5ToMarkdown` | `(feature: Feature) => string` |

## Constants
| Name | Value / Notes |
|------|---------------|
| `BADGE` | `Record<ScenarioType, {label, cls}>` — color/label per scenario type |
| `MANUAL_TEMPLATES` | `Record<1..5, string>` — JSON template strings for each step (see file) |

## TanStack Query Keys
- `['features', featureId]`
- `['test-cases', featureId]`
- `['dev-tasks', featureId]`

## Dependencies
- **API calls**: `api.features.get`, `api.features.uploadBADocument`, `api.features.uploadScreenshot`, `api.testCases.runStep`, `api.testCases.resumeStep1`, `api.testCases.saveStepResults`, `api.testCases.list`
- **State**: `useAppStore` — `activeProvider`, `activeModel`
