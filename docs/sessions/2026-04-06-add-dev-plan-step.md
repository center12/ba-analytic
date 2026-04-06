# Session: Add Development Plan Step (Step 4) to AI Pipeline

**Date:** 2026-04-06

---

## Summary

Added a new "Development Plan" step to the existing 4-step AI pipeline wizard, inserting it before the dev prompts generation step. The old Step 4 (dev prompts) became Step 5.

The user specified to "separate the prompt to reduce the token" — Step 4 uses 3 separate AI calls instead of one large call.

**New pipeline:**
- Step 1: Extract Requirements & Behaviors (unchanged)
- Step 2: Plan Test Scenarios (unchanged)
- Step 3: Generate Test Cases (unchanged)
- Step 4: **NEW** — Generate Development Plan (3 AI calls)
- Step 5: Generate Dev Prompts (former step 4, unchanged logic)

---

## Development Plan Output Structure

- **Workflow** — ordered steps with actor, title, description
- **Backend Plan**
  - Database: entities + relationships
  - API routes: method, path, description
  - Folder structure: list of file paths
- **Frontend Plan**
  - Components, Pages, Store, Hooks, Utils, Services
- **Testing Plan**
  - Backend unit tests
  - Frontend tests

---

## Token Reduction Strategy (3 AI Calls)

| Call | Input | Output |
|------|-------|--------|
| A | Requirements + behaviors + scenarios | `{ workflow, backend }` |
| B | Condensed workflow text summary | `FrontendPlan` |
| C | API route list + component list (condensed) | `TestingPlan` |

Each call receives only the context it needs — no full JSON blobs passed between calls.

---

## Files Changed

### Backend

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Added 4 `@db.Text` fields: `devPlanWorkflow`, `devPlanBackend`, `devPlanFrontend`, `devPlanTesting` |
| `apps/api/src/modules/ai/ai-provider.abstract.ts` | Added `WorkflowStep`, `ApiRoute`, `BackendPlan`, `FrontendPlan`, `TestingPlan`, `DevPlan` interfaces; 3 prompt builders; 3 abstract methods |
| `apps/api/src/modules/ai/providers/claude.provider.ts` | Added Zod schemas + 3 new methods; renamed step 4 logs to `[Step 5]` |
| `apps/api/src/modules/ai/providers/gemini.provider.ts` | Same as Claude |
| `apps/api/src/modules/ai/providers/openai.provider.ts` | Same as Claude |
| `apps/api/src/modules/test-case/pipeline.service.ts` | New `runStep4` (3 AI calls); old `runStep4` → `runStep5`; updated `saveStepResults`, `getStepPrompt`, `runLayer1` |
| `apps/api/src/modules/test-case/test-case.service.ts` | Added `case 4` and `case 5` dispatch |

### Frontend

| File | Change |
|------|--------|
| `apps/web/src/lib/api.ts` | Added DevPlan type hierarchy; added `devPlan*` fields to `Feature`; updated `saveStepResults` union to support steps 1–5 |
| `apps/web/src/features/feature/helpers/pipeline-wizard.helpers.ts` | Updated `deriveStatus` for 5 steps (step 4 done when `devPlanWorkflow` set) |
| `apps/web/src/features/feature/constants/pipeline-wizard.constants.ts` | Added `MANUAL_TEMPLATES[4]` (DevPlan); moved old template to `MANUAL_TEMPLATES[5]` |
| `apps/web/src/features/feature/components/pipeline-wizard/DevPlanPanel.tsx` | **NEW** — displays DevPlan in 4 collapsible sections |
| `apps/web/src/features/feature/components/pipeline-wizard/PipelineStep4.tsx` | **REWRITTEN** — handles Dev Plan step |
| `apps/web/src/features/feature/components/pipeline-wizard/PipelineStep5.tsx` | **NEW** — former PipelineStep4 with all references updated to step 5 |
| `apps/web/src/features/feature/PipelineWizard.tsx` | Statuses array `[1,2,3,4,5]`; added step 4 & 5 entries; updated `handleManualSave` |

---

## Database Migration

```bash
docker-compose up -d
cd apps/api && npx prisma migrate dev --name add_dev_plan_fields
```

Migration applied: `20260406063702_add_dev_plan_fields`

---

## Migration Strategy (No Destructive Changes)

Existing features with `devPromptApi` set will show:
- Steps 1–3: completed ✓
- Step 4 (dev plan): idle — user can run it optionally
- Step 5 (dev prompts): completed ✓

No data migration required.
