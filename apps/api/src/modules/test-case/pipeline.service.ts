import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AIProviderFactory, ProviderName } from '../ai/ai-provider.factory';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import {
  AIProvider,
  BackendPlan,
  BackendTestingPlan,
  buildDevPlanWorkflowBackendPrompt,
  buildDevPromptInput,
  buildExtractAllPrompt,
  buildExtractSSRAndStoriesPrompt,
  buildGenerateTestCasesPrompt,
  buildPlanScenariosPrompt,
  CombinedExtraction,
  DevTaskItem,
  DevPlan,
  DevPrompt,
  ExtractedBehaviors,
  ExtractedRequirements,
  FrontendPlan,
  FrontendTestingPlan,
  GeneratedTestCase,
  Layer1ABPartial,
  Mapping,
  SSRData,
  TestScenario,
  UserStories,
  UserStory,
  ValidationResult,
  WorkflowStep,
} from '../ai/ai-provider.abstract';
import { AI_CONFIG } from '@/modules/test-case/constants';
import {
  chunkMarkdown,
  compressForDownstream,
  compressUserStories,
  estimateTokens,
  layer1ToLegacy,
  mergeExtractions,
  mergeLayer1AB,
  readDocumentContent,
  withRetry,
} from './helpers/pipeline.utils';

const {
  MAX_DOC_CHARS,
  CHUNK_DELAY_MS,
  SCENARIO_BATCH,
} = AI_CONFIG;
const MAX_PROMPT_APPEND_CHARS = 2000;

type Step5Section = 'api' | 'frontend' | 'testing';

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  private _normalizePromptAppend(promptAppend?: string): string | undefined {
    if (typeof promptAppend !== 'string') return undefined;
    const trimmed = promptAppend.trim();
    if (!trimmed) return undefined;
    if (trimmed.length > MAX_PROMPT_APPEND_CHARS) {
      throw new BadRequestException(`promptAppend must be <= ${MAX_PROMPT_APPEND_CHARS} characters`);
    }
    return trimmed;
  }

  // ── Individual step runners ────────────────────────────────────────────────

  /** Step 1: Run Layer 1 extraction (4-sublayer) and save results to Feature */
  async runStep1(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      // prisma client types may lag behind schema migrations in editor/tsserver;
      // keep runtime field writes while avoiding TS noise here.
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 1, pipelineFailedAt: null, pipelinePartial: Prisma.JsonNull } as any),
    });
    try {
      const provider = await this._resolveProvider(featureId, 1, providerName, model);
      const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);
      const layer1 = await this._layer1ExtractionNew(featureId, provider, 0, null, normalizedPromptAppend);
      const { requirements, behaviors } = layer1ToLegacy(layer1.ssr, layer1.stories);
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          layer1SSR:        JSON.stringify(layer1.ssr),
          layer1Stories:    JSON.stringify(layer1.stories),
          layer1Mapping:    JSON.stringify(layer1.mapping),
          layer1Validation: JSON.stringify(layer1.validation),
          extractedRequirements: JSON.parse(JSON.stringify(requirements)),
          extractedBehaviors:    JSON.parse(JSON.stringify(behaviors)),
          pipelineStatus: 'COMPLETED',
          pipelinePartial: Prisma.JsonNull,
        } as any),
      });
      return { requirements, behaviors, layer1 };
    } catch (err) {
      // pipelineStatus/pipelineFailedAt already set inside _layer1ExtractionNew on chunk failure
      // If it's a non-chunk error, set failed here
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId }, select: { pipelineStatus: true } });
      if (feature?.pipelineStatus !== 'FAILED') {
        await this.prisma.feature.update({
          where: { id: featureId },
          data: ({ pipelineStatus: 'FAILED', pipelineStep: 1 } as any),
        });
      }
      throw err;
    }
  }

  /** Resume Step 1 from failed chunk or failed phase (mapping/validation) */
  async resumeStep1(featureId: string, providerName?: string, model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (feature.pipelineStatus !== 'FAILED' || (feature as any).pipelineStep !== 1) {
      throw new BadRequestException(`Feature ${featureId} step 1 is not in FAILED state`);
    }
    await this.prisma.feature.update({ where: { id: featureId }, data: { pipelineStatus: 'RUNNING' } });
    try {
      const provider = await this._resolveProvider(featureId, 1, providerName, model);

      // Check if we failed mid-phase (mapping or validation) vs mid-chunk (AB extraction)
      const partialRaw = feature.pipelinePartial as Record<string, unknown> | null;
      const failedPhase = partialRaw?.phase as string | undefined;

      let layer1: { ssr: SSRData; stories: UserStories; mapping: Mapping; validation: ValidationResult };

      if (failedPhase === 'mapping' || failedPhase === 'validation') {
        // AB extraction already done — read saved SSR + stories and resume from 1C/1D
        const savedSSR     = (feature as any).layer1SSR     as string | null;
        const savedStories = (feature as any).layer1Stories as string | null;
        if (!savedSSR || !savedStories) {
          throw new BadRequestException(`Feature ${featureId} has no saved Layer 1AB data to resume from`);
        }
        const ssr: SSRData      = JSON.parse(savedSSR);
        const stories: UserStories = JSON.parse(savedStories);

        let mapping: Mapping;
        let validation: ValidationResult;

        if (failedPhase === 'mapping') {
          this.logger.log('[Pipeline] Resume Step 1 — resuming from 1C (mapping)');
          mapping    = await withRetry(() => provider.extractMapping(ssr, stories));
          validation = await withRetry(() => provider.extractValidation(ssr, stories, mapping));
        } else {
          const savedMapping = (feature as any).layer1Mapping as string | null;
          if (!savedMapping) throw new BadRequestException(`Feature ${featureId} has no saved mapping to resume from`);
          mapping = JSON.parse(savedMapping);
          this.logger.log('[Pipeline] Resume Step 1 — resuming from 1D (validation)');
          validation = await withRetry(() => provider.extractValidation(ssr, stories, mapping));
        }
        layer1 = { ssr, stories, mapping, validation };
      } else {
        // Standard chunk resume
        const resumeFromChunk = feature.pipelineFailedAt ?? 0;
        const abPartial = partialRaw?.partial as Layer1ABPartial | null ?? null;
        layer1 = await this._layer1ExtractionNew(featureId, provider, resumeFromChunk, abPartial);
      }

      const { requirements, behaviors } = layer1ToLegacy(layer1.ssr, layer1.stories);
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          layer1SSR:        JSON.stringify(layer1.ssr),
          layer1Stories:    JSON.stringify(layer1.stories),
          layer1Mapping:    JSON.stringify(layer1.mapping),
          layer1Validation: JSON.stringify(layer1.validation),
          extractedRequirements: JSON.parse(JSON.stringify(requirements)),
          extractedBehaviors:    JSON.parse(JSON.stringify(behaviors)),
          pipelineStatus: 'COMPLETED',
          pipelinePartial: Prisma.JsonNull,
        } as any),
      });
      return { requirements, behaviors, layer1 };
    } catch (err) {
      const f = await this.prisma.feature.findUnique({ where: { id: featureId }, select: { pipelineStatus: true } });
      if (f?.pipelineStatus !== 'FAILED') {
        await this.prisma.feature.update({
          where: { id: featureId },
          data: ({ pipelineStatus: 'FAILED', pipelineStep: 1 } as any),
        });
      }
      throw err;
    }
  }

  /** Re-run Step 1C (mapping) only — requires saved SSR + stories */
  async runStep1Mapping(featureId: string, providerName?: string, model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    const savedSSR     = (feature as any).layer1SSR     as string | null;
    const savedStories = (feature as any).layer1Stories as string | null;
    if (!savedSSR || !savedStories) {
      throw new BadRequestException(`Feature ${featureId} has no Layer 1AB data — run Step 1 first`);
    }
    const ssr: SSRData         = JSON.parse(savedSSR);
    const stories: UserStories = JSON.parse(savedStories);
    const provider = await this._resolveProvider(featureId, 1, providerName, model);
    const mapping = await withRetry(() => provider.extractMapping(ssr, stories));
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ layer1Mapping: JSON.stringify(mapping) } as any),
    });
    return { mapping };
  }

  /** Re-run Step 1D (validation) only — requires saved SSR + stories + mapping */
  async runStep1Validation(featureId: string, providerName?: string, model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    const savedSSR     = (feature as any).layer1SSR     as string | null;
    const savedStories = (feature as any).layer1Stories as string | null;
    const savedMapping = (feature as any).layer1Mapping as string | null;
    if (!savedSSR || !savedStories) throw new BadRequestException(`Feature ${featureId} has no Layer 1AB data — run Step 1 first`);
    if (!savedMapping)              throw new BadRequestException(`Feature ${featureId} has no mapping — run Step 1 Mapping first`);
    const ssr: SSRData         = JSON.parse(savedSSR);
    const stories: UserStories = JSON.parse(savedStories);
    const mapping: Mapping     = JSON.parse(savedMapping);
    const provider = await this._resolveProvider(featureId, 1, providerName, model);
    const validation = await withRetry(() => provider.extractValidation(ssr, stories, mapping));
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ layer1Validation: JSON.stringify(validation) } as any),
    });
    return { validation };
  }

  /** Step 2: Run Layer 2 scenario planning using saved Layer 1 results (or override) */
  async runStep2(
    featureId: string,
    providerName?: string,
    model?: string,
    override?: CombinedExtraction,
    promptAppend?: string,
  ) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 2 } as any),
    });
    try {
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
      if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

      const req  = (override?.requirements ?? feature.extractedRequirements) as ExtractedRequirements | null;
      const beh  = (override?.behaviors    ?? feature.extractedBehaviors)    as ExtractedBehaviors    | null;
      if (!req || !beh) throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);

      const provider = await this._resolveProvider(featureId, 2, providerName, model);
      const savedStories = (feature as any).layer1Stories as string | null;
      const userStories: UserStory[] | undefined = savedStories ? (JSON.parse(savedStories) as UserStories).stories : undefined;
      const { req: compReq, beh: compBeh, stories: compStories } = compressForDownstream(req, beh, userStories);

      this.logger.log(`[Pipeline] Step 2 — planning scenarios`);
      const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);
      const testScenarios = await withRetry(() => provider.planTestScenarios(compReq, compBeh, normalizedPromptAppend, compStories));

      await this.prisma.feature.update({
        where: { id: featureId },
        data: { testScenarios: JSON.parse(JSON.stringify(testScenarios)), pipelineStatus: 'COMPLETED' },
      });
      return { testScenarios };
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 2 } as any),
      });
      throw err;
    }
  }

  /** Step 3: Run Layer 3 test case generation using saved Layer 2 results */
  async runStep3(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 3 } as any),
    });
    try {
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
      if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

      const testScenarios = feature.testScenarios as TestScenario[] | null;
      if (!testScenarios?.length) throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);

      const req = feature.extractedRequirements as ExtractedRequirements | null;
      if (!req) throw new BadRequestException(`Feature ${featureId} has no requirements — run Step 1 first`);

      const provider = await this._resolveProvider(featureId, 3, providerName, model);
      const savedStories = (feature as any).layer1Stories as string | null;
      const userStories: UserStory[] | undefined = savedStories ? (JSON.parse(savedStories) as UserStories).stories : undefined;
      const { req: compReq, stories: compStories } = compressForDownstream(
        req,
        { feature: '', actors: [], actions: [], rules: [] },
        userStories,
      );
      const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);

      const totalBatches = Math.ceil(testScenarios.length / SCENARIO_BATCH);
      this.logger.log(`[Pipeline] Step 3 — ${testScenarios.length} scenarios in ${totalBatches} batch(es)`);
      const allGenerated: GeneratedTestCase[] = [];
      for (let i = 0; i < testScenarios.length; i += SCENARIO_BATCH) {
        const batch = testScenarios.slice(i, i + SCENARIO_BATCH);
        this.logger.log(`[Pipeline] Step 3 — batch ${Math.floor(i / SCENARIO_BATCH) + 1}/${totalBatches}`);
        const cases = await withRetry(() =>
          provider.generateTestCasesFromScenarios(batch, compReq, normalizedPromptAppend, compStories),
        );
        allGenerated.push(...cases);
      }

      // Build a scenario → traceability lookup so persisted test cases retain all refs.
      const scenarioTraceMap = new Map<string, string[]>();
      for (const s of testScenarios) {
        const refs = [...s.requirementRefs];
        if (s.userStoryId && !refs.includes(s.userStoryId)) refs.push(s.userStoryId);
        scenarioTraceMap.set(s.title, refs);
      }

      // Delete old test cases before creating new ones
      await this.prisma.testCase.deleteMany({ where: { featureId } });
      const created = await this.prisma.$transaction(
        allGenerated.map((tc) => {
          const requirementRefs = scenarioTraceMap.get(tc.title) ?? [];
          return this.prisma.testCase.create({
            data: ({
              featureId, title: tc.title, description: tc.description,
              preconditions: tc.preconditions, priority: tc.priority, status: 'DRAFT',
              steps: JSON.parse(JSON.stringify(tc.steps)),
              requirementRefs: requirementRefs.length > 0 ? requirementRefs : undefined,
              aiProvider: provider.providerName, modelVersion: provider.modelVersion,
            } as any),
          });
        }),
      );

      await this.prisma.feature.update({ where: { id: featureId }, data: { pipelineStatus: 'COMPLETED' } });
      return { generated: created.length, testCases: created };
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 3 } as any),
      });
      throw err;
    }
  }

  /** Step 4: Generate Development Plan using 3 separate AI calls (workflow+backend, frontend, testing) */
  async runStep4(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 4 } as any),
    });
    try {
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
      if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

      const req           = feature.extractedRequirements as ExtractedRequirements | null;
      const beh           = feature.extractedBehaviors    as ExtractedBehaviors    | null;
      const testScenarios = feature.testScenarios          as TestScenario[]       | null;
      if (!req || !beh)          throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
      if (!testScenarios?.length) throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);

      const provider = await this._resolveProvider(featureId, 4, providerName, model);
      const { req: compReq, beh: compBeh } = compressForDownstream(req, beh);
      const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);

      // Call A: Workflow + Backend
      this.logger.log('[Pipeline] Step 4A — generating workflow + backend plan');
      const { workflow, backend } = await withRetry(() =>
        provider.generateDevPlanWorkflowBackend(compReq, compBeh, testScenarios, normalizedPromptAppend)
      );

      // Call B: Frontend (receives condensed workflow text summary)
      const workflowSummary = workflow.map(s => `${s.order}. ${s.title} (${s.actor}): ${s.description}`).join('\n');
      this.logger.log('[Pipeline] Step 4B — generating frontend plan');
      const frontend = await withRetry(() =>
        provider.generateDevPlanFrontend(compReq, compBeh, workflowSummary, undefined, normalizedPromptAppend)
      );

      // Call C: Testing — backend first, then frontend
      this.logger.log('[Pipeline] Step 4C-BE — generating backend testing plan');
      const backendTesting = await withRetry(() =>
        provider.generateDevPlanBackendTesting(compReq, compBeh, backend, normalizedPromptAppend)
      );
      this.logger.log('[Pipeline] Step 4C-FE — generating frontend testing plan');
      const frontendTesting = await withRetry(() =>
        provider.generateDevPlanFrontendTesting(compReq, compBeh, backend, frontend, normalizedPromptAppend)
      );
      const testing = { backend: backendTesting, frontend: frontendTesting };

      const devPlan: DevPlan = { workflow, backend, frontend, testing };

      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          devPlanWorkflow:  JSON.stringify(devPlan.workflow),
          devPlanBackend:   JSON.stringify(devPlan.backend),
          devPlanFrontend:  JSON.stringify(devPlan.frontend),
          devPlanTesting:   JSON.stringify(devPlan.testing),
          pipelineStatus: 'COMPLETED',
          pipelineStep: 4,
        } as any),
      });

      this.logger.log(`[Pipeline] Step 4 done — ${workflow.length} workflow steps, ${backend.apiRoutes.length} routes, ${frontend.components.length} components`);
      return { devPlan };
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 4 } as any),
      });
      throw err;
    }
  }

  /** Step 4A (manual): Generate Workflow + Backend only */
  async runStep4a(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    const req          = feature.extractedRequirements as ExtractedRequirements | null;
    const beh          = feature.extractedBehaviors    as ExtractedBehaviors    | null;
    const testScenarios = feature.testScenarios         as TestScenario[]       | null;
    if (!req || !beh)           throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!testScenarios?.length) throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);

    const provider = await this._resolveProvider(featureId, 4, providerName, model);
    const savedStories4a = (feature as any).layer1Stories as string | null;
    const userStories4a: UserStory[] | undefined = savedStories4a ? (JSON.parse(savedStories4a) as UserStories).stories : undefined;
    const { req: compReq, beh: compBeh, stories: compStories4a } = compressForDownstream(req, beh, userStories4a);
    const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);

    this.logger.log('[Pipeline] Step 4A (manual) — generating workflow + backend');
    const { workflow, backend } = await withRetry(() =>
      provider.generateDevPlanWorkflowBackend(compReq, compBeh, testScenarios, normalizedPromptAppend, compStories4a)
    );

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanWorkflow: JSON.stringify(workflow),
        devPlanBackend:  JSON.stringify(backend),
        pipelineStep:    4,
        pipelineStatus:  'COMPLETED',
        pipelineFailedAt: null,
      } as any),
    });
    return { workflow, backend };
  }

  /** Step 4B (manual): Generate Frontend plan only — requires workflow to exist */
  async runStep4b(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    const req        = feature.extractedRequirements as ExtractedRequirements | null;
    const beh        = feature.extractedBehaviors    as ExtractedBehaviors    | null;
    const rawWorkflow = (feature as any).devPlanWorkflow as string | null;
    if (!req || !beh)  throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!rawWorkflow)  throw new BadRequestException(`Feature ${featureId} has no workflow — generate Workflow+Backend first`);

    const workflow: WorkflowStep[] = JSON.parse(rawWorkflow);
    const workflowSummary = workflow.map(s => `${s.order}. ${s.title} (${s.actor}): ${s.description}`).join('\n');

    const rawBackend = (feature as any).devPlanBackend as string | null;
    let backendPlan: BackendPlan | null = null;
    if (rawBackend) {
      try { backendPlan = JSON.parse(rawBackend); } catch { /* ignore */ }
    }

    const provider = await this._resolveProvider(featureId, 4, providerName, model);
    const savedStories4b = (feature as any).layer1Stories as string | null;
    const userStories4b: UserStory[] | undefined = savedStories4b ? (JSON.parse(savedStories4b) as UserStories).stories : undefined;
    const { req: compReq, beh: compBeh, stories: compStories4b } = compressForDownstream(req, beh, userStories4b);
    const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);

    this.logger.log('[Pipeline] Step 4B (manual) — generating frontend plan');
    const frontend = await withRetry(() =>
      provider.generateDevPlanFrontend(compReq, compBeh, workflowSummary, backendPlan, normalizedPromptAppend, compStories4b)
    );

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanFrontend: JSON.stringify(frontend),
        pipelineStep:    4,
        pipelineStatus:  'COMPLETED',
        pipelineFailedAt: null,
      } as any),
    });
    return { frontend };
  }

  /** Step 4C-Backend (manual): Generate Backend Testing plan only — requires backend plan to exist */
  async runStep4cBackend(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    const req      = feature.extractedRequirements as ExtractedRequirements | null;
    const beh      = feature.extractedBehaviors    as ExtractedBehaviors    | null;
    const rawBackend = (feature as any).devPlanBackend as string | null;
    if (!req || !beh)  throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!rawBackend)   throw new BadRequestException(`Feature ${featureId} has no backend plan — generate Workflow+Backend first`);

    const backend: BackendPlan = JSON.parse(rawBackend);
    const provider = await this._resolveProvider(featureId, 4, providerName, model);
    const savedStories4cBe = (feature as any).layer1Stories as string | null;
    const userStories4cBe: UserStory[] | undefined = savedStories4cBe ? (JSON.parse(savedStories4cBe) as UserStories).stories : undefined;
    const { req: compReq, beh: compBeh, stories: compStories4cBe } = compressForDownstream(req, beh, userStories4cBe);
    const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);

    this.logger.log('[Pipeline] Step 4C-BE (manual) — generating backend testing plan');
    const backendTesting: BackendTestingPlan = await withRetry(() =>
      provider.generateDevPlanBackendTesting(compReq, compBeh, backend, normalizedPromptAppend, compStories4cBe)
    );

    // Merge into existing devPlanTesting (preserve frontend if it exists)
    const existing = (feature as any).devPlanTesting as string | null;
    let currentTesting: Record<string, unknown> = {};
    if (existing) { try { currentTesting = JSON.parse(existing); } catch { /* ignore */ } }
    const merged = { ...currentTesting, backend: backendTesting };

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanTesting:  JSON.stringify(merged),
        pipelineStep:    4,
        pipelineStatus:  'COMPLETED',
        pipelineFailedAt: null,
      } as any),
    });
    return { backendTesting };
  }

  /** Step 4C-Frontend (manual): Generate Frontend Testing plan only — requires backend + frontend plans to exist */
  async runStep4cFrontend(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    const req        = feature.extractedRequirements as ExtractedRequirements | null;
    const beh        = feature.extractedBehaviors    as ExtractedBehaviors    | null;
    const rawBackend  = (feature as any).devPlanBackend  as string | null;
    const rawFrontend = (feature as any).devPlanFrontend as string | null;
    if (!req || !beh)  throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!rawBackend)   throw new BadRequestException(`Feature ${featureId} has no backend plan — generate Workflow+Backend first`);
    if (!rawFrontend)  throw new BadRequestException(`Feature ${featureId} has no frontend plan — generate Frontend first`);

    const backend:  BackendPlan  = JSON.parse(rawBackend);
    const frontend: FrontendPlan = JSON.parse(rawFrontend);
    const provider = await this._resolveProvider(featureId, 4, providerName, model);
    const savedStories4cFe = (feature as any).layer1Stories as string | null;
    const userStories4cFe: UserStory[] | undefined = savedStories4cFe ? (JSON.parse(savedStories4cFe) as UserStories).stories : undefined;
    const { req: compReq, beh: compBeh, stories: compStories4cFe } = compressForDownstream(req, beh, userStories4cFe);
    const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);

    this.logger.log('[Pipeline] Step 4C-FE (manual) — generating frontend testing plan');
    const frontendTesting: FrontendTestingPlan = await withRetry(() =>
      provider.generateDevPlanFrontendTesting(compReq, compBeh, backend, frontend, normalizedPromptAppend, compStories4cFe)
    );

    // Merge into existing devPlanTesting (preserve backend if it exists)
    const existing = (feature as any).devPlanTesting as string | null;
    let currentTesting: Record<string, unknown> = {};
    if (existing) { try { currentTesting = JSON.parse(existing); } catch { /* ignore */ } }
    const merged = { ...currentTesting, frontend: frontendTesting };

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanTesting:  JSON.stringify(merged),
        pipelineStep:    4,
        pipelineStatus:  'COMPLETED',
        pipelineFailedAt: null,
      } as any),
    });
    return { frontendTesting };
  }

  /** Step 4C (manual): Generate both Backend + Frontend Testing plans */
  async runStep4c(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.runStep4cBackend(featureId, providerName, model, promptAppend);
    return this.runStep4cFrontend(featureId, providerName, model, promptAppend);
  }

  /** Step 5: Run Layer 4 dev prompt generation using saved Layer 1+2 results */
  async runStep5(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 5 } as any),
    });
    try {
      const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);
      const { provider, compReq, compBeh, testScenarios, devPlan, compStories } = await this._loadStep5Context(featureId, providerName, model);
      this.logger.log('[Pipeline] Step 5 — generating dev prompts');
      const devPrompt = await withRetry(() =>
        provider.generateDevPrompt(compReq, compBeh, testScenarios, devPlan, undefined, normalizedPromptAppend, compStories),
      );
      await this._applyStep5Full(featureId, devPrompt);

      const taskRowsCount = devPrompt.api.length + devPrompt.frontend.length + devPrompt.testing.length;
      this.logger.log(`[Pipeline] Step 5 — created ${taskRowsCount} dev task(s) (${devPrompt.api.length} API, ${devPrompt.frontend.length} Frontend, ${devPrompt.testing.length} Testing)`);
      return { devPrompt };
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 5 } as any),
      });
      throw err;
    }
  }

  /** Step 5A (manual): Generate Backend/API prompts only */
  async runStep5Backend(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    return this.runStep5Section(featureId, 'api', providerName, model, promptAppend);
  }

  /** Step 5B (manual): Generate Frontend prompts only */
  async runStep5Frontend(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    return this.runStep5Section(featureId, 'frontend', providerName, model, promptAppend);
  }

  /** Step 5C (manual): Generate Testing prompts only */
  async runStep5Testing(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    return this.runStep5Section(featureId, 'testing', providerName, model, promptAppend);
  }

  private async runStep5Section(
    featureId: string,
    section: Step5Section,
    providerName?: string,
    model?: string,
    promptAppend?: string,
  ) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 5 } as any),
    });

    try {
      const normalizedPromptAppend = this._normalizePromptAppend(promptAppend);
      const { provider, compReq, compBeh, testScenarios, devPlan, compStories } = await this._loadStep5Context(featureId, providerName, model);
      this.logger.log(`[Pipeline] Step 5 (${section}) — generating section prompts`);
      const devPrompt = await withRetry(() =>
        provider.generateDevPrompt(compReq, compBeh, testScenarios, devPlan, section, normalizedPromptAppend, compStories),
      );
      const sectionTasks = devPrompt[section] ?? [];

      await this._applyStep5Section(featureId, section, sectionTasks);

      this.logger.log(`[Pipeline] Step 5 (${section}) — created ${sectionTasks.length} task(s)`);
      return { section: section === 'api' ? 'backend' : section, tasksGenerated: sectionTasks.length };
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 5 } as any),
      });
      throw err;
    }
  }

  /** Save user-edited step results without re-running AI */
  async saveStepResults(
    featureId: string,
    data: {
      step: 1 | 2 | 3 | 4 | 5;
      extractedRequirements?: ExtractedRequirements;
      extractedBehaviors?: ExtractedBehaviors;
      ssrData?: SSRData;
      userStories?: UserStories;
      mapping?: Mapping;
      validationResult?: ValidationResult;
      testScenarios?: TestScenario[];
      generatedTestCases?: GeneratedTestCase[];
      devPlan?: DevPlan;
      devPrompt?: DevPrompt;
    },
  ) {
    if (data.step === 3) {
      if (!data.generatedTestCases?.length) throw new BadRequestException('generatedTestCases is required for step 3');
      await this.prisma.testCase.deleteMany({ where: { featureId } });
      await this.prisma.testCase.createMany({
        data: data.generatedTestCases.map((tc) => ({
          featureId,
          title:        tc.title,
          description:  tc.description,
          preconditions: tc.preconditions,
          priority:     tc.priority,
          steps:        tc.steps as unknown as Prisma.InputJsonValue,
          aiProvider:   'manual',
          modelVersion: 'manual',
        })),
      });
      const feature3 = await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStep: 3, pipelineStatus: 'COMPLETED' } as any),
      });
      const testCases = await this.prisma.testCase.findMany({ where: { featureId } });
      return { step: 3, generated: testCases.length, feature: feature3, testCases };
    }

    if (data.step === 4) {
      if (!data.devPlan) throw new BadRequestException('devPlan is required for step 4');
      const feature4 = await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          devPlanWorkflow:  JSON.stringify(data.devPlan.workflow),
          devPlanBackend:   JSON.stringify(data.devPlan.backend),
          devPlanFrontend:  JSON.stringify(data.devPlan.frontend),
          devPlanTesting:   JSON.stringify(data.devPlan.testing),
          pipelineStep: 4,
          pipelineStatus: 'COMPLETED',
        } as any),
      });
      return { step: 4, feature: feature4, devPlan: data.devPlan };
    }

    if (data.step === 5) {
      if (!data.devPrompt) throw new BadRequestException('devPrompt is required for step 5');
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
      if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
      const feature5 = await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          devPromptApi:      JSON.stringify(data.devPrompt.api),
          devPromptFrontend: JSON.stringify(data.devPrompt.frontend),
          devPromptTesting:  JSON.stringify(data.devPrompt.testing),
          pipelineStep: 5,
          pipelineStatus: 'COMPLETED',
        } as any),
      });
      const taskRows5 = [
        ...data.devPrompt.api.map(t      => ({ featureId, category: 'API'      as const, title: t.title, prompt: t.prompt })),
        ...data.devPrompt.frontend.map(t => ({ featureId, category: 'FRONTEND' as const, title: t.title, prompt: t.prompt })),
        ...data.devPrompt.testing.map(t  => ({ featureId, category: 'TESTING'  as const, title: t.title, prompt: t.prompt })),
      ];
      await this.prisma.developerTask.deleteMany({ where: { featureId } });
      await this.prisma.developerTask.createMany({ data: taskRows5 });
      const devTasks = await this.prisma.developerTask.findMany({ where: { featureId } });
      return { step: 5, feature: feature5, devPrompt: data.devPrompt, devTasks };
    }

    // Steps 1 and 2
    const update: Record<string, unknown> = {};

    // Step 1: new Layer 1 fields — derive legacy from new payload if provided
    if (data.step === 1 && data.ssrData && data.userStories) {
      update.layer1SSR     = JSON.stringify(data.ssrData);
      update.layer1Stories = JSON.stringify(data.userStories);
      if (data.mapping)          update.layer1Mapping    = JSON.stringify(data.mapping);
      if (data.validationResult) update.layer1Validation = JSON.stringify(data.validationResult);
      const { requirements, behaviors } = layer1ToLegacy(data.ssrData, data.userStories);
      update.extractedRequirements = JSON.parse(JSON.stringify(requirements));
      update.extractedBehaviors    = JSON.parse(JSON.stringify(behaviors));
    } else {
      if (data.extractedRequirements) update.extractedRequirements = JSON.parse(JSON.stringify(data.extractedRequirements));
      if (data.extractedBehaviors)    update.extractedBehaviors    = JSON.parse(JSON.stringify(data.extractedBehaviors));
    }

    if (data.testScenarios) update.testScenarios = JSON.parse(JSON.stringify(data.testScenarios));
    if (!Object.keys(update).length) return { step: data.step };
    update.pipelineStep   = data.step;
    update.pipelineStatus = 'COMPLETED';
    const savedFeature = await this.prisma.feature.update({ where: { id: featureId }, data: update });
    return { step: data.step, feature: savedFeature };
  }

  /** Return the prompt that would be sent to AI for the given step, without calling the AI */
  async getStepPrompt(featureId: string, step: number): Promise<{ prompt: string }> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { baDocument: true, screenshots: true },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

    if (step === 1) {
      if (!feature.baDocument) throw new BadRequestException(`Feature ${featureId} has no BA document uploaded`);
      const baDocumentPath  = await this.storage.getSignedUrl(feature.baDocument.storageKey);
      const screenshotPaths = await Promise.all(feature.screenshots.map((s) => this.storage.getSignedUrl(s.storageKey)));
      let baContent = await readDocumentContent(baDocumentPath);
      if (screenshotPaths.length > 0) baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;
      if (baContent.length > MAX_DOC_CHARS) baContent = baContent.slice(0, MAX_DOC_CHARS);
      return { prompt: buildExtractSSRAndStoriesPrompt(baContent) };
    }

    if (step === 2) {
      const req = feature.extractedRequirements as ExtractedRequirements | null;
      const beh = feature.extractedBehaviors    as ExtractedBehaviors    | null;
      if (!req || !beh) throw new BadRequestException(`Run Step 1 first — no extraction results found`);
      return { prompt: buildPlanScenariosPrompt(req, beh) };
    }

    if (step === 3) {
      const req       = feature.extractedRequirements as ExtractedRequirements | null;
      const scenarios = feature.testScenarios          as TestScenario[]       | null;
      if (!req)            throw new BadRequestException(`Run Step 1 first — no extraction results found`);
      if (!scenarios?.length) throw new BadRequestException(`Run Step 2 first — no scenarios found`);
      const savedStories = (feature as any).layer1Stories as string | null;
      const userStories: UserStory[] | undefined = savedStories ? (JSON.parse(savedStories) as UserStories).stories : undefined;
      const { req: compReq, stories: compStories } = compressForDownstream(
        req,
        { feature: '', actors: [], actions: [], rules: [] },
        userStories,
      );
      return { prompt: buildGenerateTestCasesPrompt(scenarios, compReq, compStories) };
    }

    if (step === 4) {
      const req       = feature.extractedRequirements as ExtractedRequirements | null;
      const beh       = feature.extractedBehaviors    as ExtractedBehaviors    | null;
      const scenarios = feature.testScenarios          as TestScenario[]       | null;
      if (!req || !beh)       throw new BadRequestException(`Run Step 1 first — no extraction results found`);
      if (!scenarios?.length) throw new BadRequestException(`Run Step 2 first — no scenarios found`);
      const { req: compReq, beh: compBeh } = compressForDownstream(req, beh);
      return { prompt: buildDevPlanWorkflowBackendPrompt(compReq, compBeh, scenarios) };
    }

    if (step === 5) {
      const req       = feature.extractedRequirements as ExtractedRequirements | null;
      const beh       = feature.extractedBehaviors    as ExtractedBehaviors    | null;
      const scenarios = feature.testScenarios          as TestScenario[]       | null;
      if (!req || !beh)       throw new BadRequestException(`Run Step 1 first — no extraction results found`);
      if (!scenarios?.length) throw new BadRequestException(`Run Step 2 first — no scenarios found`);
      const { req: compReq, beh: compBeh } = compressForDownstream(req, beh);
      let devPlan: DevPlan | undefined;
      const rawW = (feature as any).devPlanWorkflow;
      const rawB = (feature as any).devPlanBackend;
      const rawF = (feature as any).devPlanFrontend;
      const rawT = (feature as any).devPlanTesting;
      if (rawW && rawB && rawF && rawT) {
        try { devPlan = { workflow: JSON.parse(rawW), backend: JSON.parse(rawB), frontend: JSON.parse(rawF), testing: JSON.parse(rawT) }; }
        catch { /* ignore */ }
      }
      return { prompt: buildDevPromptInput(compReq, compBeh, scenarios, devPlan) };
    }

    throw new BadRequestException(`Invalid step: ${step}. Must be 1–5`);
  }

  // ── Full pipeline (kept for backward compat) ───────────────────────────────

  /** Fresh run — always starts from chunk 0 */
  async run(featureId: string, providerName?: string, model?: string) {
    // Reset pipeline state for a fresh start
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: null, pipelineFailedAt: null, pipelinePartial: Prisma.JsonNull } as any),
    });
    return this.runLayer1(featureId, providerName, model, 0, null);
  }

  /** Resume — continues from the chunk that previously failed */
  async resume(featureId: string, providerName?: string, model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (feature.pipelineStatus !== 'FAILED') {
      throw new BadRequestException(
        `Feature ${featureId} pipeline is not in FAILED state (current: ${feature.pipelineStatus})`,
      );
    }
    const resumeFromChunk = feature.pipelineFailedAt ?? 0;
    const partial = feature.pipelinePartial as CombinedExtraction | null;

    await this.prisma.feature.update({
      where: { id: featureId },
      data: { pipelineStatus: 'RUNNING' },
    });

    this.logger.log(`[Pipeline] Resuming from chunk ${resumeFromChunk}`);
    return this.runLayer1(featureId, providerName, model, resumeFromChunk, partial);
  }

  /** New 4-sublayer Layer 1 extraction — chunks 1A+1B, then single-call 1C+1D */
  private async _layer1ExtractionNew(
    featureId: string,
    provider: AIProvider,
    startChunk: number,
    previousPartial: Layer1ABPartial | null,
    promptAppend?: string,
  ): Promise<{ ssr: SSRData; stories: UserStories; mapping: Mapping; validation: ValidationResult }> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { baDocument: true, screenshots: true },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (!feature.baDocument) throw new BadRequestException(`Feature ${featureId} has no BA document uploaded`);

    const baDocumentPath  = await this.storage.getSignedUrl(feature.baDocument.storageKey);
    const screenshotPaths = await Promise.all(feature.screenshots.map((s) => this.storage.getSignedUrl(s.storageKey)));

    let baContent = await readDocumentContent(baDocumentPath);
    this.logger.log(`[Pipeline] Document read — ${baContent.length} chars (~${estimateTokens(baContent)} tokens)`);
    if (screenshotPaths.length > 0) baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;

    if (baContent.length > MAX_DOC_CHARS) {
      this.logger.warn(`[Pipeline] Document truncated from ${baContent.length} to ${MAX_DOC_CHARS} chars`);
      baContent = baContent.slice(0, MAX_DOC_CHARS);
    }

    const chunks = chunkMarkdown(baContent);
    this.logger.log(`[Pipeline] Layer 1 (new) — ${chunks.length} chunk(s), starting at chunk ${startChunk} (provider: ${provider.providerName})`);

    // ── Phase 1A+1B: Extract SSR + User Stories per chunk ────────────────────

    let abPartial: Layer1ABPartial;

    if (chunks.length === 1 && startChunk === 0) {
      abPartial = await withRetry(() => provider.extractSSRAndStories(chunks[0], promptAppend));
    } else {
      const completedParts: Layer1ABPartial[] = previousPartial ? [previousPartial] : [];
      for (let i = startChunk; i < chunks.length; i++) {
        this.logger.log(`[Pipeline] Layer 1AB — chunk ${i + 1}/${chunks.length}`);
        if (i > startChunk) await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
        try {
          const chunkWithContext = `[Chunk ${i + 1} of ${chunks.length} — partial section of a larger document. Extract every item present; similar items from other chunks will be merged.]\n\n${chunks[i]}`;
          const part = await withRetry(() => provider.extractSSRAndStories(chunkWithContext, promptAppend));
          completedParts.push(part);
          const runningMerge = mergeLayer1AB(completedParts);
          await this.prisma.feature.update({
            where: { id: featureId },
            data: ({ pipelinePartial: { partial: JSON.parse(JSON.stringify(runningMerge)), phase: 'ab' } } as any),
          });
        } catch (err) {
          await this.prisma.feature.update({
            where: { id: featureId },
            data: ({ pipelineStatus: 'FAILED', pipelineStep: 1, pipelineFailedAt: i } as any),
          });
          this.logger.error(`[Pipeline] Layer 1AB failed at chunk ${i} — use resume to continue`);
          throw err;
        }
      }
      const merged = mergeLayer1AB(completedParts);
      this.logger.log('[Pipeline] Layer 1AB — synthesising merged extraction');
      abPartial = await withRetry(() => provider.synthesiseLayer1AB(merged));
    }

    // Save AB partial to DB so if 1C/1D fails we can resume without re-chunking
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        layer1SSR:     JSON.stringify(abPartial.ssr),
        layer1Stories: JSON.stringify(abPartial.stories),
      } as any),
    });

    // ── Phase 1C: Traceability mapping ───────────────────────────────────────

    let mapping: Mapping;
    try {
      this.logger.log('[Pipeline] Layer 1C — generating traceability mapping');
      mapping = await withRetry(() => provider.extractMapping(abPartial.ssr, abPartial.stories));
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 1, pipelinePartial: { phase: 'mapping' } } as any),
      });
      this.logger.error('[Pipeline] Layer 1C failed — use resume to retry from mapping phase');
      throw err;
    }

    // ── Phase 1D: Validation ─────────────────────────────────────────────────

    let validation: ValidationResult;
    try {
      this.logger.log('[Pipeline] Layer 1D — validating extraction quality');
      validation = await withRetry(() => provider.extractValidation(abPartial.ssr, abPartial.stories, mapping));
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          pipelineStatus:  'FAILED',
          pipelineStep:    1,
          layer1Mapping:   JSON.stringify(mapping),
          pipelinePartial: { phase: 'validation' },
        } as any),
      });
      this.logger.error('[Pipeline] Layer 1D failed — use resume to retry from validation phase');
      throw err;
    }

    return { ssr: abPartial.ssr, stories: abPartial.stories, mapping, validation };
  }

  /** Shared Layer 1 extraction logic — used by runStep1 and runLayer1 */
  private async _layer1Extraction(
    featureId: string,
    provider: AIProvider,
    startChunk: number,
    previousPartial: CombinedExtraction | null,
    promptAppend?: string,
  ): Promise<CombinedExtraction> {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { baDocument: true, screenshots: true },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (!feature.baDocument) throw new BadRequestException(`Feature ${featureId} has no BA document uploaded`);

    const baDocumentPath  = await this.storage.getSignedUrl(feature.baDocument.storageKey);
    const screenshotPaths = await Promise.all(feature.screenshots.map((s) => this.storage.getSignedUrl(s.storageKey)));

    let baContent = await readDocumentContent(baDocumentPath);
    this.logger.log(`[Pipeline] Document read — ${baContent.length} chars (~${estimateTokens(baContent)} tokens)`);
    if (screenshotPaths.length > 0) baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;

    if (baContent.length > MAX_DOC_CHARS) {
      this.logger.warn(`[Pipeline] Document truncated from ${baContent.length} to ${MAX_DOC_CHARS} chars`);
      baContent = baContent.slice(0, MAX_DOC_CHARS);
    }

    const chunks = chunkMarkdown(baContent);

    this.logger.log(`[Pipeline] Layer 1 — ${chunks.length} chunk(s) from ${(baContent.match(/^## /gm) ?? []).length} section(s), ~${estimateTokens(baContent)} tokens (provider: ${provider.providerName}, starting at chunk ${startChunk})`);

    if (chunks.length === 1 && startChunk === 0) {
      return withRetry(() => provider.extractAll(chunks[0], promptAppend));
    }

    const completedParts: CombinedExtraction[] = previousPartial ? [previousPartial] : [];
    for (let i = startChunk; i < chunks.length; i++) {
      this.logger.log(`[Pipeline] Layer 1 — chunk ${i + 1}/${chunks.length} (~${estimateTokens(chunks[i])} tokens)`);
      if (i > startChunk) await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
      try {
        const chunkWithContext = `[Chunk ${i + 1} of ${chunks.length} — partial section of a larger document. Extract every item present; similar items from other chunks will be merged.]\n\n${chunks[i]}`;
        const part = await withRetry(() => provider.extractAll(chunkWithContext, promptAppend));
        completedParts.push(part);
        const runningMerge = mergeExtractions(completedParts);
        await this.prisma.feature.update({
          where: { id: featureId },
          data: { pipelinePartial: JSON.parse(JSON.stringify(runningMerge)) },
        });
      } catch (err) {
        await this.prisma.feature.update({
          where: { id: featureId },
          data: ({ pipelineStatus: 'FAILED', pipelineStep: 1, pipelineFailedAt: i } as any),
        });
        this.logger.error(`[Pipeline] Layer 1 failed at chunk ${i} — progress saved, use resume to continue`);
        throw err;
      }
    }

    const merged = mergeExtractions(completedParts);
    if (chunks.length > 1) {
      this.logger.log('[Pipeline] Layer 1 — synthesising merged extraction');
      return withRetry(() => provider.synthesiseExtraction(merged));
    }
    return merged;
  }

  /** Core pipeline execution — shared by run() and resume() */
  private async runLayer1(
    featureId: string,
    providerName: string | undefined,
    model: string | undefined,
    startChunk: number,
    previousPartial: CombinedExtraction | null,
  ) {
    // Resolve per-step providers — each step independently consults saved project config
    const [provider1, provider2, provider3, provider4, provider5] = await Promise.all([
      this._resolveProvider(featureId, 1, providerName, model),
      this._resolveProvider(featureId, 2, providerName, model),
      this._resolveProvider(featureId, 3, providerName, model),
      this._resolveProvider(featureId, 4, providerName, model),
      this._resolveProvider(featureId, 5, providerName, model),
    ]);

    // ── Layer 1: Combined extraction (chunked, resumable) ─────────────────────
    const combinedExtraction = await this._layer1Extraction(featureId, provider1, startChunk, previousPartial);

    const extractedRequirements = combinedExtraction.requirements;
    const extractedBehaviors    = combinedExtraction.behaviors;
    const { req: compReq, beh: compBeh } = compressForDownstream(extractedRequirements, extractedBehaviors);

    // ── Layer 2: Plan scenarios ───────────────────────────────────────────────
    this.logger.log(`[Pipeline] Layer 2 — planning scenarios from ${compReq.features.length} features + ${compBeh.actions.length} actions`);
    const testScenarios = await withRetry(() => provider2.planTestScenarios(compReq, compBeh));

    await this.prisma.feature.update({
      where: { id: featureId },
      data: {
        extractedRequirements: JSON.parse(JSON.stringify(extractedRequirements)),
        extractedBehaviors:    JSON.parse(JSON.stringify(extractedBehaviors)),
        testScenarios:         JSON.parse(JSON.stringify(testScenarios)),
      },
    });

    // ── Layer 3: Generate test cases in batches ───────────────────────────────
    const totalBatches = Math.ceil(testScenarios.length / SCENARIO_BATCH);
    this.logger.log(`[Pipeline] Layer 3 — ${testScenarios.length} scenarios in ${totalBatches} batch(es)`);
    const allGenerated: GeneratedTestCase[] = [];
    for (let i = 0; i < testScenarios.length; i += SCENARIO_BATCH) {
      const batch = testScenarios.slice(i, i + SCENARIO_BATCH);
      this.logger.log(`[Pipeline] Layer 3 — batch ${Math.floor(i / SCENARIO_BATCH) + 1}/${totalBatches}`);
      const cases = await withRetry(() => provider3.generateTestCasesFromScenarios(batch, compReq));
      allGenerated.push(...cases);
    }

    const scenarioTraceMap = new Map<string, string[]>();
    for (const scenario of testScenarios) {
      const refs = [...scenario.requirementRefs];
      if (scenario.userStoryId && !refs.includes(scenario.userStoryId)) refs.push(scenario.userStoryId);
      scenarioTraceMap.set(scenario.title, refs);
    }

    const created = await this.prisma.$transaction(
      allGenerated.map((tc) =>
        this.prisma.testCase.create({
          data: {
            featureId,
            title:         tc.title,
            description:   tc.description,
            preconditions: tc.preconditions,
            priority:      tc.priority,
            status:        'DRAFT',
            steps:         JSON.parse(JSON.stringify(tc.steps)),
            requirementRefs: scenarioTraceMap.get(tc.title),
            aiProvider:    provider3.providerName,
            modelVersion:  provider3.modelVersion,
          },
        }),
      ),
    );

    // ── Step 4: Generate Development Plan ────────────────────────────────────
    this.logger.log('[Pipeline] Step 4A — generating workflow + backend plan');
    const { workflow, backend } = await withRetry(() =>
      provider4.generateDevPlanWorkflowBackend(compReq, compBeh, testScenarios),
    );
    const workflowSummary = workflow.map((s: WorkflowStep) => `${s.order}. ${s.title} (${s.actor}): ${s.description}`).join('\n');

    this.logger.log('[Pipeline] Step 4B — generating frontend plan');
    const frontend = await withRetry(() =>
      provider4.generateDevPlanFrontend(compReq, compBeh, workflowSummary),
    );

    this.logger.log('[Pipeline] Step 4C-BE — generating backend testing plan');
    const backendTesting = await withRetry(() =>
      provider4.generateDevPlanBackendTesting(compReq, compBeh, backend as BackendPlan),
    );
    this.logger.log('[Pipeline] Step 4C-FE — generating frontend testing plan');
    const frontendTesting = await withRetry(() =>
      provider4.generateDevPlanFrontendTesting(compReq, compBeh, backend as BackendPlan, frontend as FrontendPlan),
    );
    const testing = { backend: backendTesting, frontend: frontendTesting };

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanWorkflow:  JSON.stringify(workflow),
        devPlanBackend:   JSON.stringify(backend),
        devPlanFrontend:  JSON.stringify(frontend),
        devPlanTesting:   JSON.stringify(testing),
      } as any),
    });

    // ── Step 5: Generate dev prompts ──────────────────────────────────────────
    this.logger.log('[Pipeline] Step 5 — generating dev prompts');
    const devPrompt = await withRetry(() =>
      provider5.generateDevPrompt(compReq, compBeh, testScenarios, { workflow, backend, frontend, testing }),
    );

    await this.prisma.feature.update({
      where: { id: featureId },
      data: {
        devPromptApi:      JSON.stringify(devPrompt.api),
        devPromptFrontend: JSON.stringify(devPrompt.frontend),
        devPromptTesting:  JSON.stringify(devPrompt.testing),
        // Mark complete and clear resume state
        pipelineStatus:    'COMPLETED',
        pipelineFailedAt:  null,
        pipelinePartial:   Prisma.JsonNull,
      },
    });

    const legacyTaskRows = [
      ...devPrompt.api.map(t      => ({ featureId, category: 'API'      as const, title: t.title, prompt: t.prompt })),
      ...devPrompt.frontend.map(t => ({ featureId, category: 'FRONTEND' as const, title: t.title, prompt: t.prompt })),
      ...devPrompt.testing.map(t  => ({ featureId, category: 'TESTING'  as const, title: t.title, prompt: t.prompt })),
    ];
    await this.prisma.developerTask.deleteMany({ where: { featureId } });
    await this.prisma.developerTask.createMany({ data: legacyTaskRows });

    this.logger.log(`[Pipeline] Done — ${created.length} test cases created`);

    return {
      generated: created.length,
      testCases: created,
      pipeline: {
        requirementsCount:
          extractedRequirements.features.length +
          extractedRequirements.businessRules.length +
          extractedRequirements.acceptanceCriteria.length,
        scenariosCount: testScenarios.length,
      },
    };
  }

  private _parseStep5DevPlan(feature: any): DevPlan | undefined {
    const rawWorkflow = feature.devPlanWorkflow;
    const rawBackend = feature.devPlanBackend;
    const rawFrontend = feature.devPlanFrontend;
    const rawTesting = feature.devPlanTesting;

    if (!rawWorkflow || !rawBackend || !rawFrontend || !rawTesting) return undefined;
    try {
      return {
        workflow: JSON.parse(rawWorkflow),
        backend: JSON.parse(rawBackend),
        frontend: JSON.parse(rawFrontend),
        testing: JSON.parse(rawTesting),
      };
    } catch {
      this.logger.warn('[Pipeline] Step 5 — devPlan JSON parse failed, proceeding without it');
      return undefined;
    }
  }

  private async _loadStep5Context(featureId: string, providerName?: string, model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId }, include: { developerTasks: false } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

    const req = feature.extractedRequirements as ExtractedRequirements | null;
    const beh = feature.extractedBehaviors as ExtractedBehaviors | null;
    const testScenarios = feature.testScenarios as TestScenario[] | null;
    if (!req || !beh) throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!testScenarios?.length) throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);

    const provider = await this._resolveProvider(featureId, 5, providerName, model);
    const savedStories = (feature as any).layer1Stories as string | null;
    const userStories: UserStory[] | undefined = savedStories ? (JSON.parse(savedStories) as UserStories).stories : undefined;
    const { req: compReq, beh: compBeh, stories: compStories } = compressForDownstream(req, beh, userStories);
    const devPlan = this._parseStep5DevPlan(feature as any);
    if (devPlan) this.logger.log('[Pipeline] Step 5 — devPlan loaded from DB, passing as context');

    return { provider, compReq, compBeh, testScenarios, devPlan, compStories };
  }

  private async _applyStep5Full(featureId: string, devPrompt: DevPrompt) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPromptApi: JSON.stringify(devPrompt.api),
        devPromptFrontend: JSON.stringify(devPrompt.frontend),
        devPromptTesting: JSON.stringify(devPrompt.testing),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 5,
      } as any),
    });

    const taskRows = [
      ...devPrompt.api.map(t => ({ featureId, category: 'API' as const, title: t.title, prompt: t.prompt, userStoryIds: t.userStoryIds ?? undefined })),
      ...devPrompt.frontend.map(t => ({ featureId, category: 'FRONTEND' as const, title: t.title, prompt: t.prompt, userStoryIds: t.userStoryIds ?? undefined })),
      ...devPrompt.testing.map(t => ({ featureId, category: 'TESTING' as const, title: t.title, prompt: t.prompt, userStoryIds: t.userStoryIds ?? undefined })),
    ];

    await this.prisma.developerTask.deleteMany({ where: { featureId } });
    if (taskRows.length > 0) {
      await this.prisma.developerTask.createMany({ data: taskRows as any });
    }
  }

  private async _applyStep5Section(featureId: string, section: Step5Section, sectionTasks: DevTaskItem[]) {
    const sectionMeta = section === 'api'
      ? { field: 'devPromptApi', category: 'API' as const }
      : section === 'frontend'
        ? { field: 'devPromptFrontend', category: 'FRONTEND' as const }
        : { field: 'devPromptTesting', category: 'TESTING' as const };

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        [sectionMeta.field]: JSON.stringify(sectionTasks),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 5,
      } as any),
    });

    await this.prisma.developerTask.deleteMany({ where: { featureId, category: sectionMeta.category } });
    if (sectionTasks.length > 0) {
      await this.prisma.developerTask.createMany({
        data: sectionTasks.map(t => ({
          featureId,
          category: sectionMeta.category,
          title: t.title,
          prompt: t.prompt,
          userStoryIds: t.userStoryIds ?? undefined,
        })) as any,
      });
    }
  }

  // ── Provider resolution ────────────────────────────────────────────────────

  /**
   * Resolve the effective AI provider for a pipeline step.
   * Priority: runtime arg (tier 1) > saved project config (tier 2) > env default (tier 3).
   */
  private async _resolveProvider(
    featureId: string,
    step: number,
    runtimeProvider: string | undefined,
    runtimeModel: string | undefined,
  ): Promise<AIProvider> {
    // Tier 1: explicit runtime override
    if (runtimeProvider) {
      return this.aiFactory.getProvider(runtimeProvider as ProviderName, runtimeModel);
    }

    // Tier 2: saved project config for this step
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: { projectId: true },
    });
    if (feature) {
      const saved = await this.prisma.projectPipelineConfig.findUnique({
        where: { projectId_step: { projectId: feature.projectId, step } },
      });
      if (saved) {
        return this.aiFactory.getProvider(saved.provider as ProviderName, saved.model ?? undefined);
      }
    }

    // Tier 3: factory / env default
    return this.aiFactory.getProvider(undefined, runtimeModel);
  }
}
