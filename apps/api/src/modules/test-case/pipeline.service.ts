import { readFile } from 'fs/promises';
import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AIProviderFactory, ProviderName } from '../ai/ai-provider.factory';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import {
  CombinedExtraction,
  ExtractedBehaviors,
  ExtractedRequirements,
  GeneratedTestCase,
  TestScenario,
} from '../ai/ai-provider.abstract';

// ── Document reader ───────────────────────────────────────────────────────────

/**
 * Read a BA document file and return clean, LLM-safe text.
 *
 * Pipeline:
 *   Read buffer → Detect & strip BOM → Decode to UTF-8 string
 *   → Normalize line endings & whitespace
 *   → Sanitize prompt-injection patterns
 *   → Return plain text ready for chunking
 */
async function readDocumentContent(filePath: string): Promise<string> {
  // ── 1. Read as raw buffer ──────────────────────────────────────────────────
  const buf = await readFile(filePath);

  // ── 2. Detect & strip BOM, pick encoding ──────────────────────────────────
  let text: string;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    // UTF-8 BOM
    text = buf.subarray(3).toString('utf-8');
  } else if (buf[0] === 0xff && buf[1] === 0xfe) {
    // UTF-16 LE
    text = buf.subarray(2).toString('utf16le');
  } else if (buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16 BE — Node has no built-in utf16be; swap bytes and use utf16le
    const swapped = Buffer.allocUnsafe(buf.length - 2);
    for (let i = 2; i < buf.length - 1; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    text = swapped.toString('utf16le');
  } else {
    // Default: try UTF-8; if replacement chars appear, fall back to Latin-1
    const utf8 = buf.toString('utf-8');
    text = utf8.includes('\ufffd') ? buf.toString('latin1') : utf8;
  }

  // ── 3. Normalize line endings ──────────────────────────────────────────────
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ── 4. Strip null bytes and dangerous control characters ──────────────────
  // Keep: printable ASCII/Unicode, \t (tab), \n (newline)
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

  // ── 5. Collapse excessive blank lines (max 2 consecutive) ─────────────────
  text = text.replace(/\n{3,}/g, '\n\n');

  // ── 6. Trim leading/trailing whitespace per line ──────────────────────────
  text = text.split('\n').map(l => l.trimEnd()).join('\n').trim();

  // ── 7. Prompt-injection guard ─────────────────────────────────────────────
  // Replace injection-style directives with a neutralised marker so the model
  // sees the text but cannot interpret it as a new instruction.
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /you\s+are\s+now\s+(?:a|an)\s+/gi,          // "you are now a [role]"
    /act\s+as\s+(?:a|an)\s+/gi,                  // "act as a [role]"
    /new\s+system\s+prompt\s*:/gi,
    /\[system\]/gi,
    /<\s*system\s*>/gi,
    /#{1,6}\s*system\s*$/gim,                     // markdown "# System" headings
  ];
  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, (match) => `[REDACTED: ${match.slice(0, 20)}…]`);
  }

  return text;
}

// ── Token budget constants ────────────────────────────────────────────────────

const MAX_DOC_CHARS   = 24_000; // hard cap ~6 000 tokens — fits in one call on most free tiers
const CHUNK_MAX_CHARS = 12_000; // ~3 000 tokens per chunk when doc exceeds MAX_DOC_CHARS
const CHUNK_OVERLAP   = 500;    // overlap so no concept is lost at a boundary
const CHUNK_DELAY_MS  = 3_000;  // pause between chunk calls to avoid RPM spike
const MAX_FEATURES    = 12;
const MAX_RULES       = 15;
const MAX_CRITERIA    = 12;
const MAX_ENTITIES    = 10;
const MAX_ACTORS      = 6;
const MAX_ACTIONS     = 20;
const MAX_BEH_RULES   = 15;
const SCENARIO_BATCH  = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

function chunkText(
  text: string,
  maxChars = CHUNK_MAX_CHARS,
  overlap = CHUNK_OVERLAP,
): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n', end);
      if (breakAt > start) end = breakAt;
    }
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }
  return chunks;
}

function mergeExtractions(extractions: CombinedExtraction[]): CombinedExtraction {
  const dedup = (arr: string[]) => [...new Set(arr)];
  return {
    requirements: {
      features:           dedup(extractions.flatMap(e => e.requirements.features)).slice(0, MAX_FEATURES),
      businessRules:      dedup(extractions.flatMap(e => e.requirements.businessRules)).slice(0, MAX_RULES),
      acceptanceCriteria: dedup(extractions.flatMap(e => e.requirements.acceptanceCriteria)).slice(0, MAX_CRITERIA),
      entities:           dedup(extractions.flatMap(e => e.requirements.entities)).slice(0, MAX_ENTITIES),
    },
    behaviors: {
      feature: extractions[0].behaviors.feature,
      actors:  dedup(extractions.flatMap(e => e.behaviors.actors)).slice(0, MAX_ACTORS),
      actions: dedup(extractions.flatMap(e => e.behaviors.actions)).slice(0, MAX_ACTIONS),
      rules:   dedup(extractions.flatMap(e => e.behaviors.rules)).slice(0, MAX_BEH_RULES),
    },
  };
}

function compressForDownstream(
  req: ExtractedRequirements,
  beh: ExtractedBehaviors,
): { req: ExtractedRequirements; beh: ExtractedBehaviors } {
  return {
    req: {
      features:           req.features.slice(0, MAX_FEATURES),
      businessRules:      req.businessRules.slice(0, MAX_RULES),
      acceptanceCriteria: req.acceptanceCriteria.slice(0, MAX_CRITERIA),
      entities:           req.entities.slice(0, MAX_ENTITIES),
    },
    beh: {
      feature: beh.feature,
      actors:  beh.actors.slice(0, MAX_ACTORS),
      actions: beh.actions.slice(0, MAX_ACTIONS),
      rules:   beh.rules.slice(0, MAX_BEH_RULES),
    },
  };
}

const retryLogger = new Logger('withRetry');

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 30_000,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isQuota =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('quota'));
      if (!isQuota || attempt === retries) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1); // 30s → 60s → 120s
      retryLogger.warn(
        `Rate-limit / quota hit (attempt ${attempt}/${retries}) — waiting ${delay / 1000}s before retry. ` +
        `Error: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`,
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

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
          devPromptApi: devPrompt.api,
          devPromptFrontend: devPrompt.frontend,
          devPromptTesting: devPrompt.testing,
          pipelineStatus: 'COMPLETED',
          pipelineStep: 4,
        } as any),
      });

      await this.prisma.developerTask.deleteMany({ where: { featureId } });
      await this.prisma.developerTask.createMany({
        data: [
          { featureId, category: 'API',      title: `${feature.name} — API Implementation`,      prompt: devPrompt.api },
          { featureId, category: 'FRONTEND', title: `${feature.name} — Frontend Implementation`, prompt: devPrompt.frontend },
          { featureId, category: 'TESTING',  title: `${feature.name} — Test Automation`,         prompt: devPrompt.testing },
        ],
      });

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
      extractedRequirements?: ExtractedRequirements;
      extractedBehaviors?: ExtractedBehaviors;
      testScenarios?: TestScenario[];
    },
  ) {
    const update: Record<string, unknown> = {};
    if (data.extractedRequirements) update.extractedRequirements = JSON.parse(JSON.stringify(data.extractedRequirements));
    if (data.extractedBehaviors)    update.extractedBehaviors    = JSON.parse(JSON.stringify(data.extractedBehaviors));
    if (data.testScenarios)         update.testScenarios         = JSON.parse(JSON.stringify(data.testScenarios));
    if (!Object.keys(update).length) return;
    await this.prisma.feature.update({ where: { id: featureId }, data: update });
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
    const chunks   = chunkText(baContent);

    this.logger.log(`[Pipeline] Layer 1 — ${chunks.length} chunk(s), ~${estimateTokens(baContent)} tokens (provider: ${provider.providerName}, starting at chunk ${startChunk})`);

    if (chunks.length === 1 && startChunk === 0) {
      return withRetry(() => provider.extractAll(chunks[0]));
    }

    const completedParts: CombinedExtraction[] = previousPartial ? [previousPartial] : [];
    for (let i = startChunk; i < chunks.length; i++) {
      this.logger.log(`[Pipeline] Layer 1 — chunk ${i + 1}/${chunks.length} (~${estimateTokens(chunks[i])} tokens)`);
      if (i > startChunk) await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
      try {
        const part = await withRetry(() => provider.extractAll(chunks[i]));
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
      `[Pipeline] Layer 1 — ${chunks.length} chunk(s), ~${estimateTokens(baContent)} tokens (provider: ${provider.providerName}, starting at chunk ${startChunk})`,
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
          const part = await withRetry(() => provider.extractAll(chunks[i]));
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
        devPromptApi:      devPrompt.api,
        devPromptFrontend: devPrompt.frontend,
        devPromptTesting:  devPrompt.testing,
        // Mark complete and clear resume state
        pipelineStatus:    'COMPLETED',
        pipelineFailedAt:  null,
        pipelinePartial:   Prisma.JsonNull,
      },
    });

    await this.prisma.developerTask.deleteMany({ where: { featureId } });
    await this.prisma.developerTask.createMany({
      data: [
        { featureId, category: 'API',      title: `${feature.name} — API Implementation`,      prompt: devPrompt.api },
        { featureId, category: 'FRONTEND', title: `${feature.name} — Frontend Implementation`, prompt: devPrompt.frontend },
        { featureId, category: 'TESTING',  title: `${feature.name} — Test Automation`,         prompt: devPrompt.testing },
      ],
    });

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
