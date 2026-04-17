import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AIProvider,
  BackendPlan,
  BackendTestingPlan,
  DevPlan,
  DevPrompt,
  ExtractedRequirements,
  ExtractedBehaviors,
  FrontendPlan,
  FrontendTestingPlan,
  GeneratedTestCase,
  Layer1Extraction,
  Mapping,
  SSRData,
  TestScenario,
  UserStories,
  UserStory,
  ValidationResult,
  WorkflowStep,
} from '../../ai/ai-provider.abstract';
import { PrismaService } from '../../../prisma.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../../storage/storage.interface';
import { AI_CONFIG } from '../constants/feature-analysis.constants';
import { PipelineContextService } from './pipeline-context.service';
import { PipelinePersistenceService } from './pipeline-persistence.service';
import { PipelineProviderService } from './pipeline-provider.service';
import { FeatureSyncService } from '../feature-sync.service';
import { TokenUsageService } from '../token-usage.service';
import type { Layer1ResumePartial } from './types/pipeline-context.types';
import type {
  SaveStepResultsPayload,
  Step1Section,
  Step4Section,
  Step5Section,
} from './types/pipeline.types';
import { chunkMarkdown, estimateTokens } from './utils/chunking.util';
import { compressForDownstream } from './utils/compression.util';
import {
  extractAcceptanceCriteriaFromMarkdown,
  layer1ToLegacy,
  mergeSSRData,
  mergeUserStories,
  normalizeMapping,
  normalizeSSRData,
  normalizeUserStories,
} from './utils/layer1.util';
import { withRetry } from './utils/retry.util';

const {
  CHUNK_DELAY_MS,
  MAX_DOC_CHARS,
  SCENARIO_BATCH,
} = AI_CONFIG;

@Injectable()
export class PipelineStepRunnerService {
  private readonly logger = new Logger(PipelineStepRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: PipelineContextService,
    private readonly persistence: PipelinePersistenceService,
    private readonly providerService: PipelineProviderService,
    private readonly featureSync: FeatureSyncService,
    private readonly tokenUsage: TokenUsageService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async runStep1(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.persistence.markStepStarted(featureId, 1);
    // Capture old stories before re-running (for OUT_OF_SYNC detection on SSR features)
    const featureBefore = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: { featureType: true, layer1Stories: true },
    });
    const oldStories: UserStory[] = featureBefore?.layer1Stories
      ? (JSON.parse(featureBefore.layer1Stories as string) as UserStories).stories ?? []
      : [];
    try {
      const provider = await this.providerService.resolveProvider(featureId, 1, providerName, model);
      const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
      provider.resetSessionUsage();
      const layer1 = await this.extractLayer1(featureId, provider, 0, null, undefined, normalizedPromptAppend);
      const result = await this.persistence.saveLayer1Result(featureId, layer1, await this.resolveLegacyAcceptanceCriteria(featureId));
      await this.tokenUsage.saveStepUsage(featureId, 1, null, provider.getSessionUsage(), provider.providerName, provider.modelVersion);
      // Mark extracted features as OUT_OF_SYNC when parent SSR stories change
      if (featureBefore?.featureType === 'SSR') {
        await this.featureSync.markAffectedOutOfSync(featureId, oldStories, layer1.stories.stories ?? []);
      }
      return result;
    } catch (error) {
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId }, select: { pipelineStatus: true } });
      if (feature?.pipelineStatus !== 'FAILED') {
        await this.persistence.markStepFailed(featureId, 1);
      }
      throw error;
    }
  }

  async resumeStep1(featureId: string, providerName?: string, model?: string) {
    const feature = await this.context.getFeature(featureId);
    if (feature.pipelineStatus !== 'FAILED' || (feature as any).pipelineStep !== 1) {
      throw new BadRequestException(`Feature ${featureId} step 1 is not in FAILED state`);
    }

    await this.persistence.markRunning(featureId);

    try {
      const provider = await this.providerService.resolveProvider(featureId, 1, providerName, model);
      const { failedPhase, resumeFromChunk, partial } = this.context.getLayer1ResumeState(feature);
      let layer1: Layer1Extraction;

      if (failedPhase === 'mapping' || failedPhase === 'validation') {
        const parsed = this.context.parseLayer1Fields(feature);
        if (!parsed.ssr || !parsed.stories) {
          throw new BadRequestException(`Feature ${featureId} has no saved Layer 1AB data to resume from`);
        }

        let mapping: Mapping;
        let validation: ValidationResult;

        if (failedPhase === 'mapping') {
          this.logger.log('[Pipeline] Resume Step 1 — resuming from 1C (mapping)');
          mapping = normalizeMapping(
            await withRetry(() => provider.extractMapping(parsed.ssr as SSRData, parsed.stories as UserStories)),
            parsed.ssr as SSRData,
            parsed.stories as UserStories,
          );
          validation = await withRetry(() => provider.extractValidation(parsed.ssr as SSRData, parsed.stories as UserStories, mapping));
        } else {
          if (!parsed.mapping) {
            throw new BadRequestException(`Feature ${featureId} has no saved mapping to resume from`);
          }
          mapping = parsed.mapping;
          this.logger.log('[Pipeline] Resume Step 1 — resuming from 1D (validation)');
          validation = await withRetry(() => provider.extractValidation(parsed.ssr as SSRData, parsed.stories as UserStories, mapping));
        }

        layer1 = {
          ssr: parsed.ssr,
          stories: parsed.stories,
          mapping,
          validation,
        };
      } else {
        layer1 = await this.extractLayer1(featureId, provider, resumeFromChunk, partial, failedPhase === 'stories' ? 'stories' : 'ssr');
      }

      return this.persistence.saveLayer1Result(featureId, layer1, await this.resolveLegacyAcceptanceCriteria(featureId));
    } catch (error) {
      const current = await this.prisma.feature.findUnique({ where: { id: featureId }, select: { pipelineStatus: true } });
      if (current?.pipelineStatus !== 'FAILED') {
        await this.persistence.markStepFailed(featureId, 1);
      }
      throw error;
    }
  }

  async runStep1Section(featureId: string, section: Step1Section, providerName?: string, model?: string, promptAppend?: string) {
    switch (section) {
      case 'ssr-stories':
        return this.runStep1(featureId, providerName, model, promptAppend);
      case 'mapping':
        return this.runStep1Mapping(featureId, providerName, model);
      case 'validation':
        return this.runStep1Validation(featureId, providerName, model);
    }
  }

  async runStep1Mapping(featureId: string, providerName?: string, model?: string) {
    const feature = await this.context.getFeature(featureId);
    const parsed = this.context.parseLayer1Fields(feature);
    if (!parsed.ssr || !parsed.stories) {
      throw new BadRequestException(`Feature ${featureId} has no Layer 1AB data — run Step 1 first`);
    }

    const provider = await this.providerService.resolveProvider(featureId, 1, providerName, model);
    provider.resetSessionUsage();
    const mapping = normalizeMapping(
      await withRetry(() => provider.extractMapping(parsed.ssr as SSRData, parsed.stories as UserStories)),
      parsed.ssr as SSRData,
      parsed.stories as UserStories,
    );
    await this.persistence.saveLayer1Mapping(featureId, mapping);
    await this.tokenUsage.saveStepUsage(featureId, 1, 'mapping', provider.getSessionUsage(), provider.providerName, provider.modelVersion);
    return { mapping };
  }

  async runStep1Validation(featureId: string, providerName?: string, model?: string) {
    const feature = await this.context.getFeature(featureId);
    const parsed = this.context.parseLayer1Fields(feature);
    if (!parsed.ssr || !parsed.stories) {
      throw new BadRequestException(`Feature ${featureId} has no Layer 1AB data — run Step 1 first`);
    }
    if (!parsed.mapping) {
      throw new BadRequestException(`Feature ${featureId} has no mapping — run Step 1 Mapping first`);
    }

    const provider = await this.providerService.resolveProvider(featureId, 1, providerName, model);
    provider.resetSessionUsage();
    const validation = await withRetry(() =>
      provider.extractValidation(parsed.ssr as SSRData, parsed.stories as UserStories, parsed.mapping as Mapping),
    );
    await this.persistence.saveLayer1Validation(featureId, validation);
    await this.tokenUsage.saveStepUsage(featureId, 1, 'validation', provider.getSessionUsage(), provider.providerName, provider.modelVersion);
    return { validation };
  }

  async runStep2(
    featureId: string,
    providerName?: string,
    model?: string,
    override?: { requirements?: ExtractedRequirements; behaviors?: ExtractedBehaviors },
    promptAppend?: string,
  ) {
    await this.persistence.markStepStarted(featureId, 2);
    try {
      const provider = await this.providerService.resolveProvider(featureId, 2, providerName, model);
      const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
      const context = await this.context.getStep2Context(featureId, override as any);
      this.logger.log('[Pipeline] Step 2 — planning scenarios');
      provider.resetSessionUsage();
      const testScenarios = await withRetry(() =>
        provider.planTestScenarios(
          context.compressedRequirements,
          context.compressedBehaviors,
          normalizedPromptAppend,
          context.compressedStories,
        ),
      );
      await this.persistence.saveTestScenarios(featureId, testScenarios);
      await this.tokenUsage.saveStepUsage(featureId, 2, null, provider.getSessionUsage(), provider.providerName, provider.modelVersion);
      return { testScenarios };
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 2);
      throw error;
    }
  }

  async runStep3(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.persistence.markStepStarted(featureId, 3);
    try {
      const provider = await this.providerService.resolveProvider(featureId, 3, providerName, model);
      const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
      const context = await this.context.getStep3Context(featureId);
      const totalBatches = Math.ceil(context.testScenarios.length / SCENARIO_BATCH);
      this.logger.log(`[Pipeline] Step 3 — ${context.testScenarios.length} scenarios in ${totalBatches} batch(es)`);

      provider.resetSessionUsage();
      const allGenerated: GeneratedTestCase[] = [];
      for (let i = 0; i < context.testScenarios.length; i += SCENARIO_BATCH) {
        const batch = context.testScenarios.slice(i, i + SCENARIO_BATCH);
        this.logger.log(`[Pipeline] Step 3 — batch ${Math.floor(i / SCENARIO_BATCH) + 1}/${totalBatches}`);
        const cases = await withRetry(() =>
          provider.generateTestCasesFromScenarios(batch, context.compressedRequirements, normalizedPromptAppend, context.compressedStories),
        );
        allGenerated.push(...cases);
      }

      const scenarioTraceMap = this.context.buildScenarioTraceMap(context.testScenarios);
      const created = await this.persistence.replaceGeneratedTestCases(featureId, allGenerated, scenarioTraceMap, provider);
      await this.tokenUsage.saveStepUsage(featureId, 3, null, provider.getSessionUsage(), provider.providerName, provider.modelVersion);
      return { generated: created.length, featureAnalyses: created };
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 3);
      throw error;
    }
  }

  async runStep4(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.persistence.markStepStarted(featureId, 4);
    try {
      const provider = await this.providerService.resolveProvider(featureId, 4, providerName, model);
      const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
      const context = await this.context.getStep4Context(featureId);

      provider.resetSessionUsage();
      this.logger.log('[Pipeline] Step 4A — generating workflow + backend plan');
      const { workflow, backend } = await withRetry(() =>
        provider.generateDevPlanWorkflowBackend(
          context.compressedRequirements,
          context.compressedBehaviors,
          context.testScenarios,
          normalizedPromptAppend,
          context.compressedStories,
          context.relatedFeatures,
        ),
      );

      const workflowSummary = this.context.buildWorkflowSummary(workflow);
      this.logger.log('[Pipeline] Step 4B — generating frontend plan');
      const frontend = await withRetry(() =>
        provider.generateDevPlanFrontend(
          context.compressedRequirements,
          context.compressedBehaviors,
          workflowSummary,
          undefined,
          normalizedPromptAppend,
          context.compressedStories,
          context.relatedFeatures,
        ),
      );

      this.logger.log('[Pipeline] Step 4C-BE — generating backend testing plan');
      const backendTesting = await withRetry(() =>
        provider.generateDevPlanBackendTesting(
          context.compressedRequirements,
          context.compressedBehaviors,
          backend,
          normalizedPromptAppend,
          context.compressedStories,
        ),
      );

      this.logger.log('[Pipeline] Step 4C-FE — generating frontend testing plan');
      const frontendTesting = await withRetry(() =>
        provider.generateDevPlanFrontendTesting(
          context.compressedRequirements,
          context.compressedBehaviors,
          backend,
          frontend,
          normalizedPromptAppend,
          context.compressedStories,
        ),
      );

      const devPlan: DevPlan = { workflow, backend, frontend, testing: { backend: backendTesting, frontend: frontendTesting } };
      await this.persistence.saveDevPlan(featureId, devPlan);
      await this.tokenUsage.saveStepUsage(featureId, 4, null, provider.getSessionUsage(), provider.providerName, provider.modelVersion);

      this.logger.log(`[Pipeline] Step 4 done — ${workflow.length} workflow steps, ${backend.apiRoutes.length} routes, ${frontend.components.length} components`);
      return { devPlan };
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 4);
      throw error;
    }
  }

  async runStep4Section(featureId: string, section: Step4Section, providerName?: string, model?: string, promptAppend?: string) {
    switch (section) {
      case 'workflow-backend':
        return this.runStep4a(featureId, providerName, model, promptAppend);
      case 'frontend':
        return this.runStep4b(featureId, providerName, model, promptAppend);
      case 'testing':
        return this.runStep4c(featureId, providerName, model, promptAppend);
      case 'testing-backend':
        return this.runStep4cBackend(featureId, providerName, model, promptAppend);
      case 'testing-frontend':
        return this.runStep4cFrontend(featureId, providerName, model, promptAppend);
    }
  }

  async runStep4a(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const provider = await this.providerService.resolveProvider(featureId, 4, providerName, model);
    const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
    const context = await this.context.getStep4Context(featureId);

    provider.resetSessionUsage();
    this.logger.log('[Pipeline] Step 4A (manual) — generating workflow + backend');
    const { workflow, backend } = await withRetry(() =>
      provider.generateDevPlanWorkflowBackend(
        context.compressedRequirements,
        context.compressedBehaviors,
        context.testScenarios,
        normalizedPromptAppend,
        context.compressedStories,
        context.relatedFeatures,
      ),
    );

    await this.persistence.saveWorkflowBackend(featureId, workflow, backend);
    await this.tokenUsage.saveStepUsage(featureId, 4, 'workflow-backend', provider.getSessionUsage(), provider.providerName, provider.modelVersion);
    return { workflow, backend };
  }

  async runStep4b(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const context = await this.context.getStep4Context(featureId);
    const feature = context.feature;
    const workflow = this.context.tryParseJsonField<WorkflowStep[]>((feature as any).devPlanWorkflow);
    const backend = this.context.tryParseJsonField<BackendPlan>((feature as any).devPlanBackend);
    if (!workflow) throw new BadRequestException(`Feature ${featureId} has no workflow — generate Workflow+Backend first`);

    const provider = await this.providerService.resolveProvider(featureId, 4, providerName, model);
    const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);

    provider.resetSessionUsage();
    this.logger.log('[Pipeline] Step 4B (manual) — generating frontend plan');
    const frontend = await withRetry(() =>
      provider.generateDevPlanFrontend(
        context.compressedRequirements,
        context.compressedBehaviors,
        this.context.buildWorkflowSummary(workflow),
        backend,
        normalizedPromptAppend,
        context.compressedStories,
        context.relatedFeatures,
      ),
    );

    await this.persistence.saveFrontendPlan(featureId, frontend);
    await this.tokenUsage.saveStepUsage(featureId, 4, 'frontend', provider.getSessionUsage(), provider.providerName, provider.modelVersion);
    return { frontend };
  }

  async runStep4cBackend(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const feature = await this.context.getFeature(featureId);
    const requirements = feature.extractedRequirements as ExtractedRequirements | null;
    const behaviors = feature.extractedBehaviors as ExtractedBehaviors | null;
    const backend = this.context.tryParseJsonField<BackendPlan>((feature as any).devPlanBackend);
    if (!requirements || !behaviors) throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!backend) throw new BadRequestException(`Feature ${featureId} has no backend plan — generate Workflow+Backend first`);

    const userStories = this.context.getUserStories(feature);
    const compressed = compressForDownstream(requirements, behaviors, userStories);
    const provider = await this.providerService.resolveProvider(featureId, 4, providerName, model);
    const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);

    provider.resetSessionUsage();
    this.logger.log('[Pipeline] Step 4C-BE (manual) — generating backend testing plan');
    const backendTesting = await withRetry(() =>
      provider.generateDevPlanBackendTesting(
        compressed.req,
        compressed.beh,
        backend,
        normalizedPromptAppend,
        compressed.stories,
      ),
    );

    await this.persistence.mergeTestingPlanSection(featureId, (feature as any).devPlanTesting, 'backend', backendTesting);
    await this.tokenUsage.saveStepUsage(featureId, 4, 'testing-backend', provider.getSessionUsage(), provider.providerName, provider.modelVersion);
    return { backendTesting };
  }

  async runStep4cFrontend(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    const feature = await this.context.getFeature(featureId);
    const requirements = feature.extractedRequirements as ExtractedRequirements | null;
    const behaviors = feature.extractedBehaviors as ExtractedBehaviors | null;
    const backend = this.context.tryParseJsonField<BackendPlan>((feature as any).devPlanBackend);
    const frontend = this.context.tryParseJsonField<FrontendPlan>((feature as any).devPlanFrontend);
    if (!requirements || !behaviors) throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    if (!backend) throw new BadRequestException(`Feature ${featureId} has no backend plan — generate Workflow+Backend first`);
    if (!frontend) throw new BadRequestException(`Feature ${featureId} has no frontend plan — generate Frontend first`);

    const userStories = this.context.getUserStories(feature);
    const compressed = compressForDownstream(requirements, behaviors, userStories);
    const provider = await this.providerService.resolveProvider(featureId, 4, providerName, model);
    const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);

    provider.resetSessionUsage();
    this.logger.log('[Pipeline] Step 4C-FE (manual) — generating frontend testing plan');
    const frontendTesting = await withRetry(() =>
      provider.generateDevPlanFrontendTesting(
        compressed.req,
        compressed.beh,
        backend,
        frontend,
        normalizedPromptAppend,
        compressed.stories,
      ),
    );

    await this.persistence.mergeTestingPlanSection(featureId, (feature as any).devPlanTesting, 'frontend', frontendTesting);
    await this.tokenUsage.saveStepUsage(featureId, 4, 'testing-frontend', provider.getSessionUsage(), provider.providerName, provider.modelVersion);
    return { frontendTesting };
  }

  async runStep4c(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.runStep4cBackend(featureId, providerName, model, promptAppend);
    return this.runStep4cFrontend(featureId, providerName, model, promptAppend);
  }

  async runStep5(featureId: string, providerName?: string, model?: string, promptAppend?: string) {
    await this.persistence.markStepStarted(featureId, 5);
    try {
      const provider = await this.providerService.resolveProvider(featureId, 5, providerName, model);
      const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
      const context = await this.context.getStep5Context(featureId);

      provider.resetSessionUsage();
      this.logger.log('[Pipeline] Step 5 — generating dev prompts');
      const devPrompt = await withRetry(() =>
        provider.generateDevPrompt(
          context.compressedRequirements,
          context.compressedBehaviors,
          context.testScenarios,
          context.devPlan,
          undefined,
          normalizedPromptAppend,
          context.compressedStories,
        ),
      );

      await this.persistence.saveDevPrompt(featureId, devPrompt);
      await this.tokenUsage.saveStepUsage(featureId, 5, null, provider.getSessionUsage(), provider.providerName, provider.modelVersion);
      const taskRowsCount = devPrompt.api.length + devPrompt.frontend.length + devPrompt.testing.length;
      this.logger.log(`[Pipeline] Step 5 — created ${taskRowsCount} dev task(s) (${devPrompt.api.length} API, ${devPrompt.frontend.length} Frontend, ${devPrompt.testing.length} Testing)`);
      return { devPrompt };
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 5);
      throw error;
    }
  }

  async runStep5Section(featureId: string, section: Step5Section, providerName?: string, model?: string, promptAppend?: string) {
    const normalizedSection = section === 'backend' ? 'api' : section;
    if (normalizedSection !== 'api' && normalizedSection !== 'frontend' && normalizedSection !== 'testing') {
      throw new BadRequestException(`Invalid step 5 section: ${section}`);
    }

    await this.persistence.markStepStarted(featureId, 5);

    try {
      const provider = await this.providerService.resolveProvider(featureId, 5, providerName, model);
      const normalizedPromptAppend = this.providerService.normalizePromptAppend(promptAppend);
      const context = await this.context.getStep5Context(featureId);

      provider.resetSessionUsage();
      this.logger.log(`[Pipeline] Step 5 (${normalizedSection}) — generating section prompts`);
      const devPrompt = await withRetry(() =>
        provider.generateDevPrompt(
          context.compressedRequirements,
          context.compressedBehaviors,
          context.testScenarios,
          context.devPlan,
          normalizedSection,
          normalizedPromptAppend,
          context.compressedStories,
        ),
      );

      const sectionTasks = devPrompt[normalizedSection] ?? [];
      await this.persistence.saveDevPromptSection(featureId, normalizedSection, sectionTasks);
      await this.tokenUsage.saveStepUsage(featureId, 5, normalizedSection, provider.getSessionUsage(), provider.providerName, provider.modelVersion);
      this.logger.log(`[Pipeline] Step 5 (${normalizedSection}) — created ${sectionTasks.length} task(s)`);
      return { section: normalizedSection === 'api' ? 'backend' : normalizedSection, tasksGenerated: sectionTasks.length };
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 5);
      throw error;
    }
  }

  async saveStepResults(featureId: string, data: SaveStepResultsPayload) {
    if (data.step === 3) {
      if (!data.generatedTestCases?.length) throw new BadRequestException('generatedTestCases is required for step 3');
      await this.prisma.featureAnalysis.deleteMany({ where: { featureId } });
      await this.prisma.featureAnalysis.createMany({
        data: data.generatedTestCases.map((testCase) => ({
          featureId,
          title: testCase.title,
          description: testCase.description,
          preconditions: testCase.preconditions,
          priority: testCase.priority,
          steps: testCase.steps as unknown as Prisma.InputJsonValue,
          aiProvider: 'manual',
          modelVersion: 'manual',
        })),
      });
      const feature = await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStep: 3, pipelineStatus: 'COMPLETED' } as any),
      });
      const featureAnalyses = await this.prisma.featureAnalysis.findMany({ where: { featureId } });
      return { step: 3, generated: featureAnalyses.length, feature, featureAnalyses };
    }

    if (data.step === 4) {
      if (!data.devPlan) throw new BadRequestException('devPlan is required for step 4');
      await this.persistence.saveDevPlan(featureId, data.devPlan);
      const feature = await this.context.getFeature(featureId);
      return { step: 4, feature, devPlan: data.devPlan };
    }

    if (data.step === 5) {
      if (!data.devPrompt) throw new BadRequestException('devPrompt is required for step 5');
      await this.context.getFeature(featureId);
      await this.persistence.saveDevPrompt(featureId, data.devPrompt);
      const feature = await this.context.getFeature(featureId);
      const devTasks = await this.prisma.developerTask.findMany({ where: { featureId } });
      return { step: 5, feature, devPrompt: data.devPrompt, devTasks };
    }

    const update: Record<string, unknown> = {};

    if (data.step === 1 && data.ssrData && data.userStories) {
      const normalizedSSR = normalizeSSRData(data.ssrData);
      const normalizedStories = normalizeUserStories(data.userStories);
      const normalizedMapping = data.mapping ? normalizeMapping(data.mapping, normalizedSSR, normalizedStories) : undefined;
      const legacyAcceptanceCriteria = data.acceptanceCriteriaText
        ? this.normalizeAcceptanceCriteriaText(data.acceptanceCriteriaText)
        : await this.resolveLegacyAcceptanceCriteria(featureId);
      update.layer1SSR = JSON.stringify(normalizedSSR);
      update.layer1Stories = JSON.stringify(normalizedStories);
      if (normalizedMapping) update.layer1Mapping = JSON.stringify(normalizedMapping);
      if (data.validationResult) update.layer1Validation = JSON.stringify(data.validationResult);
      const { requirements, behaviors } = layer1ToLegacy(normalizedSSR, normalizedStories, legacyAcceptanceCriteria);
      update.extractedRequirements = JSON.parse(JSON.stringify(requirements));
      update.extractedBehaviors = JSON.parse(JSON.stringify(behaviors));
    } else {
      if (data.extractedRequirements) update.extractedRequirements = JSON.parse(JSON.stringify(data.extractedRequirements));
      if (data.extractedBehaviors) update.extractedBehaviors = JSON.parse(JSON.stringify(data.extractedBehaviors));
    }

    if (data.testScenarios) update.testScenarios = JSON.parse(JSON.stringify(data.testScenarios));
    if (!Object.keys(update).length) return { step: data.step };

    update.pipelineStep = data.step;
    update.pipelineStatus = 'COMPLETED';
    const feature = await this.prisma.feature.update({ where: { id: featureId }, data: update });
    return { step: data.step, feature };
  }

  private async extractLayer1(
    featureId: string,
    provider: AIProvider,
    startChunk: number,
    previousPartial: Layer1ResumePartial | null,
    startPhase: 'ssr' | 'stories' = 'ssr',
    promptAppend?: string,
  ): Promise<Layer1Extraction> {
    const feature = await this.context.getFeatureWithAssets(featureId);
    if (!feature.content?.trim()) throw new BadRequestException(`Feature ${featureId} has no content. Add requirements in the project page before running the pipeline.`);

    const screenshotPaths = await Promise.all(feature.screenshots.map((screenshot) => this.storage.getSignedUrl(screenshot.storageKey)));

    let baContent = feature.content;
    this.logger.log(`[Pipeline] Content loaded — ${baContent.length} chars (~${estimateTokens(baContent)} tokens)`);

    const projectOverview = feature.project?.overview?.trim();
    if (projectOverview) {
      baContent = [
        `## Project Overview Context`,
        `Use this as background context only. If it conflicts with the feature or SSR content below, prefer the feature or SSR content.`,
        '',
        projectOverview,
        '',
        '---',
        '',
        baContent,
      ].join('\n');
      this.logger.log('[Pipeline] Prepended project overview to Step 1 context');
    }

    // Append related features' content as additional context
    const relatedIds = Array.isArray((feature as any).relatedFeatureIds) ? (feature as any).relatedFeatureIds as string[] : [];
    if (relatedIds.length > 0) {
      const relatedFeatures = await this.prisma.feature.findMany({
        where: { id: { in: relatedIds } },
        select: { name: true, content: true },
      });
      const relatedContext = relatedFeatures
        .filter((f) => f.content?.trim())
        .map((f) => `### Related Feature: ${f.name}\n${f.content}`)
        .join('\n\n');
      if (relatedContext) {
        baContent += `\n\n---\n## Related Features & Rules\n\n${relatedContext}`;
        this.logger.log(`[Pipeline] Appended ${relatedFeatures.length} related feature(s) to context`);
      }
    }

    if (screenshotPaths.length > 0) baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;

    if (baContent.length > MAX_DOC_CHARS) {
      this.logger.warn(`[Pipeline] Document truncated from ${baContent.length} to ${MAX_DOC_CHARS} chars`);
      baContent = baContent.slice(0, MAX_DOC_CHARS);
    }

    const chunks = chunkMarkdown(baContent);
    this.logger.log(`[Pipeline] Layer 1 — ${chunks.length} chunk(s), starting at chunk ${startChunk} (provider: ${provider.providerName})`);

    const ssr = startPhase === 'stories' && previousPartial?.ssr
      ? normalizeSSRData(previousPartial.ssr)
      : await this.extractLayer1SSR(featureId, provider, chunks, startChunk, previousPartial?.ssr ?? null, promptAppend);

    await this.persistence.saveLayer1Partial(featureId, {
      partial: JSON.parse(JSON.stringify({
        ssr,
        ...(startPhase === 'stories' && previousPartial?.stories ? { stories: previousPartial.stories } : {}),
      })),
      phase: 'stories',
    });

    const stories = await this.extractLayer1Stories(
      featureId,
      provider,
      chunks,
      startPhase === 'stories' ? startChunk : 0,
      ssr,
      startPhase === 'stories' ? previousPartial?.stories ?? null : null,
      promptAppend,
    );

    await this.persistence.saveLayer1AB(featureId, ssr, stories);

    let mapping: Mapping;
    try {
      this.logger.log('[Pipeline] Layer 1C — generating traceability mapping');
      const rawMapping = await withRetry(() => provider.extractMapping(ssr, stories));
      if (
        !rawMapping.links.length &&
        (
          (ssr.functionalRequirements?.length ?? 0) ||
          ssr.systemRules.length ||
          ssr.businessRules.length ||
          ssr.constraints.length ||
          ssr.globalPolicies.length
        )
      ) {
        this.logger.warn('[Pipeline] Layer 1C returned empty links for non-empty SSR rules; normalizing fallback mapping');
      }
      mapping = normalizeMapping(rawMapping, ssr, stories);
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 1, { pipelinePartial: { phase: 'mapping' } });
      this.logger.error('[Pipeline] Layer 1C failed — use resume to retry from mapping phase');
      throw error;
    }

    let validation: ValidationResult;
    try {
      this.logger.log('[Pipeline] Layer 1D — validating extraction quality');
      validation = await withRetry(() => provider.extractValidation(ssr, stories, mapping));
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 1, {
        layer1Mapping: JSON.stringify(mapping),
        pipelinePartial: { phase: 'validation' },
      });
      this.logger.error('[Pipeline] Layer 1D failed — use resume to retry from validation phase');
      throw error;
    }

    return { ssr, stories, mapping, validation };
  }

  private async extractLayer1SSR(
    featureId: string,
    provider: AIProvider,
    chunks: string[],
    startChunk: number,
    previousSSR: SSRData | null,
    promptAppend?: string,
  ): Promise<SSRData> {
    if (chunks.length === 1 && startChunk === 0 && !previousSSR) {
      return normalizeSSRData(await withRetry(() => provider.extractSSR(chunks[0], promptAppend)));
    }

    const completedParts: SSRData[] = previousSSR ? [normalizeSSRData(previousSSR)] : [];
    for (let index = startChunk; index < chunks.length; index += 1) {
      this.logger.log(`[Pipeline] Layer 1A — chunk ${index + 1}/${chunks.length}`);
      if (index > startChunk) await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));

      try {
        const chunkWithContext = `[Chunk ${index + 1} of ${chunks.length} — partial section of a larger document. Extract every SSR item present; similar items from other chunks will be merged.]\n\n${chunks[index]}`;
        const part = normalizeSSRData(await withRetry(() => provider.extractSSR(chunkWithContext, promptAppend)));
        completedParts.push(part);
        const runningMerge = mergeSSRData(completedParts);
        await this.persistence.saveLayer1Partial(featureId, {
          partial: JSON.parse(JSON.stringify({ ssr: runningMerge })),
          phase: 'ssr',
        });
      } catch (error) {
        await this.persistence.markStepFailed(featureId, 1, { pipelineFailedAt: index });
        this.logger.error(`[Pipeline] Layer 1A failed at chunk ${index} — use resume to continue`);
        throw error;
      }
    }

    const merged = mergeSSRData(completedParts);
    try {
      this.logger.log('[Pipeline] Layer 1A — synthesising merged SSR extraction');
      return normalizeSSRData(await withRetry(() => provider.synthesiseSSR(merged)));
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 1, {
        pipelineFailedAt: chunks.length,
        pipelinePartial: { phase: 'ssr', partial: JSON.parse(JSON.stringify({ ssr: merged })) },
      });
      this.logger.error('[Pipeline] Layer 1A synthesis failed — use resume to continue');
      throw error;
    }
  }

  private async extractLayer1Stories(
    featureId: string,
    provider: AIProvider,
    chunks: string[],
    startChunk: number,
    ssr: SSRData,
    previousStories: UserStories | null,
    promptAppend?: string,
  ): Promise<UserStories> {
    if (chunks.length === 1 && startChunk === 0 && !previousStories) {
      return normalizeUserStories(await withRetry(() => provider.extractUserStories(chunks[0], ssr, promptAppend)));
    }

    const completedParts: UserStories[] = previousStories ? [normalizeUserStories(previousStories)] : [];
    for (let index = startChunk; index < chunks.length; index += 1) {
      this.logger.log(`[Pipeline] Layer 1B — chunk ${index + 1}/${chunks.length}`);
      if (index > startChunk) await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));

      try {
        const chunkWithContext = `[Chunk ${index + 1} of ${chunks.length} — partial section of a larger document. Extract every user story present; similar items from other chunks will be merged.]\n\n${chunks[index]}`;
        const part = normalizeUserStories(await withRetry(() => provider.extractUserStories(chunkWithContext, ssr, promptAppend)));
        completedParts.push(part);
        const runningMerge = mergeUserStories(completedParts);
        await this.persistence.saveLayer1Partial(featureId, {
          partial: JSON.parse(JSON.stringify({ ssr, stories: runningMerge })),
          phase: 'stories',
        });
      } catch (error) {
        await this.persistence.markStepFailed(featureId, 1, { pipelineFailedAt: index });
        this.logger.error(`[Pipeline] Layer 1B failed at chunk ${index} — use resume to continue`);
        throw error;
      }
    }

    const merged = mergeUserStories(completedParts);
    try {
      this.logger.log('[Pipeline] Layer 1B — synthesising merged user stories');
      return normalizeUserStories(await withRetry(() => provider.synthesiseUserStories(merged, ssr)));
    } catch (error) {
      await this.persistence.markStepFailed(featureId, 1, {
        pipelineFailedAt: chunks.length,
        pipelinePartial: { phase: 'stories', partial: JSON.parse(JSON.stringify({ ssr, stories: merged })) },
      });
      this.logger.error('[Pipeline] Layer 1B synthesis failed — use resume to continue');
      throw error;
    }
  }

  private async resolveLegacyAcceptanceCriteria(featureId: string): Promise<string[]> {
    const feature = await this.context.getFeatureWithAssets(featureId);
    const existing = (feature.extractedRequirements as ExtractedRequirements | null)?.acceptanceCriteria ?? [];
    if (existing.length && existing.some((item) => !/^AC-\d+$/i.test(item.trim()))) return existing;
    if (!feature.content?.trim()) return [];

    return extractAcceptanceCriteriaFromMarkdown(feature.content);
  }

  private normalizeAcceptanceCriteriaText(items: string[]): string[] {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  }
}
