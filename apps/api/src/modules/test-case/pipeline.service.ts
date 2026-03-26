import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AIProviderFactory, ProviderName } from '../ai/ai-provider.factory';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import {
  buildDevPromptInput,
  buildExtractAllPrompt,
  buildGenerateTestCasesPrompt,
  buildPlanScenariosPrompt,
  CombinedExtraction,
  DevPrompt,
  ExtractedBehaviors,
  ExtractedRequirements,
  GeneratedTestCase,
  TestScenario,
} from '../ai/ai-provider.abstract';
import { AI_CONFIG } from '@/modules/test-case/constants';
import {
  chunkMarkdown,
  chunkText,
  compressForDownstream,
  estimateTokens,
  mergeExtractions,
  readDocumentContent,
  withRetry,
} from './pipeline.utils';

const {
  MAX_DOC_CHARS,
  CHUNK_DELAY_MS,
  SCENARIO_BATCH,
} = AI_CONFIG;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  // ── Individual step runners ────────────────────────────────────────────────

  /** Step 1: Run Layer 1 extraction and save results to Feature */
  async runStep1(featureId: string, providerName?: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      // prisma client types may lag behind schema migrations in editor/tsserver;
      // keep runtime field writes while avoiding TS noise here.
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 1, pipelineFailedAt: null, pipelinePartial: Prisma.JsonNull } as any),
    });
    try {
      const extraction = await this._layer1Extraction(featureId, providerName, 0, null);
      await this.prisma.feature.update({
        where: { id: featureId },
        data: {
          extractedRequirements: JSON.parse(JSON.stringify(extraction.requirements)),
          extractedBehaviors:    JSON.parse(JSON.stringify(extraction.behaviors)),
          pipelineStatus: 'COMPLETED',
          pipelinePartial: Prisma.JsonNull,
        },
      });
      return { requirements: extraction.requirements, behaviors: extraction.behaviors };
    } catch (err) {
      // pipelineStatus/pipelineFailedAt already set inside _layer1Extraction on chunk failure
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

  /** Resume Step 1 from failed chunk */
  async resumeStep1(featureId: string, providerName?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (feature.pipelineStatus !== 'FAILED' || (feature as any).pipelineStep !== 1) {
      throw new BadRequestException(`Feature ${featureId} step 1 is not in FAILED state`);
    }
    const resumeFromChunk = feature.pipelineFailedAt ?? 0;
    const partial = feature.pipelinePartial as CombinedExtraction | null;
    await this.prisma.feature.update({ where: { id: featureId }, data: { pipelineStatus: 'RUNNING' } });
    try {
      const extraction = await this._layer1Extraction(featureId, providerName, resumeFromChunk, partial);
      await this.prisma.feature.update({
        where: { id: featureId },
        data: {
          extractedRequirements: JSON.parse(JSON.stringify(extraction.requirements)),
          extractedBehaviors:    JSON.parse(JSON.stringify(extraction.behaviors)),
          pipelineStatus: 'COMPLETED',
          pipelinePartial: Prisma.JsonNull,
        },
      });
      return { requirements: extraction.requirements, behaviors: extraction.behaviors };
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

  /** Step 2: Run Layer 2 scenario planning using saved Layer 1 results (or override) */
  async runStep2(featureId: string, providerName?: string, override?: CombinedExtraction) {
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

      const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
      const { req: compReq, beh: compBeh } = compressForDownstream(req, beh);

      this.logger.log(`[Pipeline] Step 2 — planning scenarios`);
      const testScenarios = await withRetry(() => provider.planTestScenarios(compReq, compBeh));

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
  async runStep3(featureId: string, providerName?: string) {
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

      const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
      const { req: compReq } = compressForDownstream(req, { feature: '', actors: [], actions: [], rules: [] });

      const totalBatches = Math.ceil(testScenarios.length / SCENARIO_BATCH);
      this.logger.log(`[Pipeline] Step 3 — ${testScenarios.length} scenarios in ${totalBatches} batch(es)`);
      const allGenerated: GeneratedTestCase[] = [];
      for (let i = 0; i < testScenarios.length; i += SCENARIO_BATCH) {
        const batch = testScenarios.slice(i, i + SCENARIO_BATCH);
        this.logger.log(`[Pipeline] Step 3 — batch ${Math.floor(i / SCENARIO_BATCH) + 1}/${totalBatches}`);
        const cases = await withRetry(() => provider.generateTestCasesFromScenarios(batch, compReq));
        allGenerated.push(...cases);
      }

      // Delete old test cases before creating new ones
      await this.prisma.testCase.deleteMany({ where: { featureId } });
      const created = await this.prisma.$transaction(
        allGenerated.map((tc) =>
          this.prisma.testCase.create({
            data: {
              featureId, title: tc.title, description: tc.description,
              preconditions: tc.preconditions, priority: tc.priority, status: 'DRAFT',
              steps: JSON.parse(JSON.stringify(tc.steps)),
              aiProvider: provider.providerName, modelVersion: provider.modelVersion,
            },
          }),
        ),
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

  /** Step 4: Run Layer 4 dev prompt generation using saved Layer 1+2 results */
  async runStep4(featureId: string, providerName?: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: 4 } as any),
    });
    try {
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId }, include: { developerTasks: false } });
      if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

      const req          = feature.extractedRequirements as ExtractedRequirements | null;
      const beh          = feature.extractedBehaviors    as ExtractedBehaviors    | null;
      const testScenarios = feature.testScenarios         as TestScenario[]       | null;
      if (!req || !beh)         throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
      if (!testScenarios?.length) throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);

      const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
      const { req: compReq, beh: compBeh } = compressForDownstream(req, beh);

      this.logger.log('[Pipeline] Step 4 — generating dev prompts');
      const devPrompt = await withRetry(() => provider.generateDevPrompt(compReq, compBeh, testScenarios));

      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          devPromptApi:      JSON.stringify(devPrompt.api),
          devPromptFrontend: JSON.stringify(devPrompt.frontend),
          devPromptTesting:  JSON.stringify(devPrompt.testing),
          pipelineStatus: 'COMPLETED',
          pipelineStep: 4,
        } as any),
      });

      const taskRows = [
        ...devPrompt.api.map(t      => ({ featureId, category: 'API'      as const, title: t.title, prompt: t.prompt })),
        ...devPrompt.frontend.map(t => ({ featureId, category: 'FRONTEND' as const, title: t.title, prompt: t.prompt })),
        ...devPrompt.testing.map(t  => ({ featureId, category: 'TESTING'  as const, title: t.title, prompt: t.prompt })),
      ];
      await this.prisma.developerTask.deleteMany({ where: { featureId } });
      await this.prisma.developerTask.createMany({ data: taskRows });

      this.logger.log(`[Pipeline] Step 4 — created ${taskRows.length} dev task(s) (${devPrompt.api.length} API, ${devPrompt.frontend.length} Frontend, ${devPrompt.testing.length} Testing)`);
      return { devPrompt };
    } catch (err) {
      await this.prisma.feature.update({
        where: { id: featureId },
        data: ({ pipelineStatus: 'FAILED', pipelineStep: 4 } as any),
      });
      throw err;
    }
  }

  /** Save user-edited step results without re-running AI */
  async saveStepResults(
    featureId: string,
    data: {
      step: 1 | 2 | 3 | 4;
      extractedRequirements?: ExtractedRequirements;
      extractedBehaviors?: ExtractedBehaviors;
      testScenarios?: TestScenario[];
      generatedTestCases?: GeneratedTestCase[];
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
      if (!data.devPrompt) throw new BadRequestException('devPrompt is required for step 4');
      const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
      if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
      const feature4 = await this.prisma.feature.update({
        where: { id: featureId },
        data: ({
          devPromptApi:      JSON.stringify(data.devPrompt.api),
          devPromptFrontend: JSON.stringify(data.devPrompt.frontend),
          devPromptTesting:  JSON.stringify(data.devPrompt.testing),
          pipelineStep: 4,
          pipelineStatus: 'COMPLETED',
        } as any),
      });
      const taskRows4 = [
        ...data.devPrompt.api.map(t      => ({ featureId, category: 'API'      as const, title: t.title, prompt: t.prompt })),
        ...data.devPrompt.frontend.map(t => ({ featureId, category: 'FRONTEND' as const, title: t.title, prompt: t.prompt })),
        ...data.devPrompt.testing.map(t  => ({ featureId, category: 'TESTING'  as const, title: t.title, prompt: t.prompt })),
      ];
      await this.prisma.developerTask.deleteMany({ where: { featureId } });
      await this.prisma.developerTask.createMany({ data: taskRows4 });
      const devTasks = await this.prisma.developerTask.findMany({ where: { featureId } });
      return { step: 4, feature: feature4, devPrompt: data.devPrompt, devTasks };
    }

    // Steps 1 and 2
    const update: Record<string, unknown> = {};
    if (data.extractedRequirements) update.extractedRequirements = JSON.parse(JSON.stringify(data.extractedRequirements));
    if (data.extractedBehaviors)    update.extractedBehaviors    = JSON.parse(JSON.stringify(data.extractedBehaviors));
    if (data.testScenarios)         update.testScenarios         = JSON.parse(JSON.stringify(data.testScenarios));
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
      return { prompt: buildExtractAllPrompt(baContent) };
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
      return { prompt: buildGenerateTestCasesPrompt(scenarios, req) };
    }

    if (step === 4) {
      const req       = feature.extractedRequirements as ExtractedRequirements | null;
      const beh       = feature.extractedBehaviors    as ExtractedBehaviors    | null;
      const scenarios = feature.testScenarios          as TestScenario[]       | null;
      if (!req || !beh)       throw new BadRequestException(`Run Step 1 first — no extraction results found`);
      if (!scenarios?.length) throw new BadRequestException(`Run Step 2 first — no scenarios found`);
      const { req: compReq, beh: compBeh } = compressForDownstream(req, beh);
      return { prompt: buildDevPromptInput(compReq, compBeh, scenarios) };
    }

    throw new BadRequestException(`Invalid step: ${step}. Must be 1–4`);
  }

  // ── Full pipeline (kept for backward compat) ───────────────────────────────

  /** Fresh run — always starts from chunk 0 */
  async run(featureId: string, providerName?: string) {
    // Reset pipeline state for a fresh start
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: null, pipelineFailedAt: null, pipelinePartial: Prisma.JsonNull } as any),
    });
    return this.runLayer1(featureId, providerName, 0, null);
  }

  /** Resume — continues from the chunk that previously failed */
  async resume(featureId: string, providerName?: string) {
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
    return this.runLayer1(featureId, providerName, resumeFromChunk, partial);
  }

  /** Shared Layer 1 extraction logic — used by runStep1 and runLayer1 */
  private async _layer1Extraction(
    featureId: string,
    providerName: string | undefined,
    startChunk: number,
    previousPartial: CombinedExtraction | null,
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

    const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
    const chunks   = chunkMarkdown(baContent);

    this.logger.log(`[Pipeline] Layer 1 — ${chunks.length} chunk(s) from ${(baContent.match(/^## /gm) ?? []).length} section(s), ~${estimateTokens(baContent)} tokens (provider: ${provider.providerName}, starting at chunk ${startChunk})`);

    if (chunks.length === 1 && startChunk === 0) {
      return withRetry(() => provider.extractAll(chunks[0]));
    }

    const completedParts: CombinedExtraction[] = previousPartial ? [previousPartial] : [];
    for (let i = startChunk; i < chunks.length; i++) {
      this.logger.log(`[Pipeline] Layer 1 — chunk ${i + 1}/${chunks.length} (~${estimateTokens(chunks[i])} tokens)`);
      if (i > startChunk) await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
      try {
        const chunkWithContext = `[Chunk ${i + 1} of ${chunks.length} — partial section of a larger document. Extract every item present; similar items from other chunks will be merged.]\n\n${chunks[i]}`;
        const part = await withRetry(() => provider.extractAll(chunkWithContext));
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
    startChunk: number,
    previousPartial: CombinedExtraction | null,
  ) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { baDocument: true, screenshots: true },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (!feature.baDocument) {
      throw new BadRequestException(`Feature ${featureId} has no BA document uploaded`);
    }

    const baDocumentPath = await this.storage.getSignedUrl(feature.baDocument.storageKey);
    const screenshotPaths = await Promise.all(
      feature.screenshots.map((s) => this.storage.getSignedUrl(s.storageKey)),
    );

    let baContent = await readDocumentContent(baDocumentPath);
    this.logger.log(`[Pipeline] Document read — ${baContent.length} chars (~${estimateTokens(baContent)} tokens)`);
    if (screenshotPaths.length > 0) {
      baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;
    }

    // Hard-cap to keep total token spend within free-tier quota
    if (baContent.length > MAX_DOC_CHARS) {
      this.logger.warn(
        `[Pipeline] Document truncated from ${baContent.length} to ${MAX_DOC_CHARS} chars (~${estimateTokens(baContent)} → ~${Math.ceil(MAX_DOC_CHARS / 4)} tokens)`,
      );
      baContent = baContent.slice(0, MAX_DOC_CHARS);
    }

    const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
    const chunks = chunkText(baContent);

    this.logger.log(
      `[Pipeline] Layer 1 — ${chunks.length} chunk(s) from ${(baContent.match(/^## /gm) ?? []).length} section(s), ~${estimateTokens(baContent)} tokens (provider: ${provider.providerName}, starting at chunk ${startChunk})`,
    );

    // ── Layer 1: Combined extraction (chunked, resumable) ─────────────────────
    let combinedExtraction: CombinedExtraction;

    if (chunks.length === 1 && startChunk === 0) {
      combinedExtraction = await withRetry(() => provider.extractAll(chunks[0]));
    } else {
      // Seed with previously completed chunks (may be null for a fresh single-chunk run)
      const completedParts: CombinedExtraction[] = previousPartial ? [previousPartial] : [];

      for (let i = startChunk; i < chunks.length; i++) {
        this.logger.log(`[Pipeline] Layer 1 — chunk ${i + 1}/${chunks.length} (~${estimateTokens(chunks[i])} tokens)`);
        if (i > startChunk) await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));

        try {
          const chunkWithContext = `[Chunk ${i + 1} of ${chunks.length} — partial section of a larger document. Extract every item present; similar items from other chunks will be merged.]\n\n${chunks[i]}`;
          const part = await withRetry(() => provider.extractAll(chunkWithContext));
          completedParts.push(part);

          // Save running partial after every successful chunk
          const runningMerge = mergeExtractions(completedParts);
          await this.prisma.feature.update({
            where: { id: featureId },
            data: { pipelinePartial: JSON.parse(JSON.stringify(runningMerge)) },
          });
        } catch (err) {
          // Mark as failed at this chunk index so resume() knows where to start
          await this.prisma.feature.update({
            where: { id: featureId },
            data: { pipelineStatus: 'FAILED', pipelineFailedAt: i },
          });
          this.logger.error(`[Pipeline] Layer 1 failed at chunk ${i} — progress saved, use resume to continue`);
          throw err;
        }
      }

      const merged = mergeExtractions(completedParts);

      if (chunks.length > 1) {
        this.logger.log('[Pipeline] Layer 1 — synthesising merged extraction');
        combinedExtraction = await withRetry(() => provider.synthesiseExtraction(merged));
      } else {
        combinedExtraction = merged;
      }
    }

    const extractedRequirements = combinedExtraction.requirements;
    const extractedBehaviors    = combinedExtraction.behaviors;
    const { req: compReq, beh: compBeh } = compressForDownstream(extractedRequirements, extractedBehaviors);

    // ── Layer 2: Plan scenarios ───────────────────────────────────────────────
    this.logger.log(`[Pipeline] Layer 2 — planning scenarios from ${compReq.features.length} features + ${compBeh.actions.length} actions`);
    const testScenarios = await withRetry(() => provider.planTestScenarios(compReq, compBeh));

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
      const cases = await withRetry(() => provider.generateTestCasesFromScenarios(batch, compReq));
      allGenerated.push(...cases);
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
            aiProvider:    provider.providerName,
            modelVersion:  provider.modelVersion,
          },
        }),
      ),
    );

    // ── Layer 4: Generate dev prompts ─────────────────────────────────────────
    this.logger.log('[Pipeline] Layer 4 — generating dev prompts');
    const devPrompt = await withRetry(() =>
      provider.generateDevPrompt(compReq, compBeh, testScenarios),
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
}
