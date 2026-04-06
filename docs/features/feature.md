# Feature: feature
**Purpose**: Feature detail view with BA document upload, 4-step AI pipeline wizard, and result panels.

## Pages / Entry Components
| File | Export | Purpose |
|------|--------|---------|
| `FeatureDetailPage.tsx` | `FeatureDetailPage` | Full-page layout with header (upload buttons, model selector) and pipeline wizard |
| `PipelineWizard.tsx` | `PipelineWizard` | Accordion of 4 pipeline steps; orchestrates all run/save/edit/manual mutations |

## Components
| File | Purpose |
|------|---------|
| `components/feature-detail/BADocFormatGuide.tsx` | Dialog with BA document template download and AI conversion prompt copy |
| `components/pipeline-wizard/StepHeader.tsx` | Collapsible header for a pipeline step showing status icon and label |
| `components/pipeline-wizard/PipelinePanel.tsx` | Read-only panel showing extracted requirements, behaviors, and scenarios in tabs |
| `components/pipeline-wizard/DevPromptPanel.tsx` | Collapsible panel showing generated dev prompts (API/Frontend/Testing) with copy |
| `components/pipeline-wizard/ManualPanel.tsx` | JSON textarea for manually pasting AI output into a pipeline step |
| `components/pipeline-wizard/EditableList.tsx` | Inline editable bullet list for step-1 extracted fields |
| `components/pipeline-wizard/PipelineStep1.tsx` | Step 1 UI — extract requirements & behaviors |
| `components/pipeline-wizard/PipelineStep2.tsx` | Step 2 UI — plan test scenarios |
| `components/pipeline-wizard/PipelineStep3.tsx` | Step 3 UI — generate test cases |
| `components/pipeline-wizard/PipelineStep4.tsx` | Step 4 UI — generate dev prompts |

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

## Constants
| Name | Value / Notes |
|------|---------------|
| `BADGE` | `Record<ScenarioType, { label, cls }>` — badge styles per scenario type |
| `MANUAL_TEMPLATES` | `Record<1\|2\|3\|4, string>` — JSON template strings per step (see file) |

## TanStack Query Keys
- `['features', featureId]`
- `['test-cases', featureId]`
- `['dev-tasks', featureId]`

## Dependencies
- **API calls**: `api.features.get`, `api.features.uploadBADocument`, `api.features.uploadScreenshot`, `api.testCases.list`, `api.testCases.runStep`, `api.testCases.resumeStep1`, `api.testCases.saveStepResults`, `api.testCases.getStepPrompt`
- **State**: `useAppStore` — `activeProvider`, `activeModel`, `selectedChatSession`, `setSelectedChatSession`
