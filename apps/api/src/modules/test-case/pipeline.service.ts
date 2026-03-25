import { readFile } from 'fs/promises';
import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AIProviderFactory, ProviderName } from '../ai/ai-provider.factory';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async run(featureId: string, providerName?: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { baDocument: true, screenshots: true },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (!feature.baDocument) {
      throw new BadRequestException(`Feature ${featureId} has no BA document uploaded`);
    }

    // Resolve storage paths — screenshots are optional
    const baDocumentPath = await this.storage.getSignedUrl(feature.baDocument.storageKey);
    const screenshotPaths = await Promise.all(
      feature.screenshots.map((s) => this.storage.getSignedUrl(s.storageKey)),
    );

    // Read document content
    let baContent: string;
    try {
      baContent = await readFile(baDocumentPath, 'utf-8');
    } catch {
      baContent = `[Binary document at path: ${baDocumentPath}]`;
    }
    if (screenshotPaths.length > 0) {
      baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;
    }

    const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);

    // ── Layer 1A + 1B: Run domain and behavior extraction in parallel ──────────
    this.logger.log(`[Pipeline] Layer 1A+1B — extracting requirements & behaviors (provider: ${provider.providerName})`);
    const [extractedRequirements, extractedBehaviors] = await Promise.all([
      provider.extractRequirements(baContent),
      provider.extractBehaviors(baContent),
    ]);

    // ── Layer 2: Plan scenarios ───────────────────────────────────────────────
    this.logger.log(`[Pipeline] Layer 2 — planning scenarios from ${extractedRequirements.features.length} features + ${extractedBehaviors.actions.length} actions`);
    const testScenarios = await provider.planTestScenarios(extractedRequirements, extractedBehaviors);

    // Save intermediates to Feature record
    await this.prisma.feature.update({
      where: { id: featureId },
      data: {
        extractedRequirements: JSON.parse(JSON.stringify(extractedRequirements)),
        extractedBehaviors: JSON.parse(JSON.stringify(extractedBehaviors)),
        testScenarios: JSON.parse(JSON.stringify(testScenarios)),
      },
    });

    // ── Layer 3: Generate test cases ──────────────────────────────────────────
    this.logger.log(`[Pipeline] Layer 3 — generating test cases for ${testScenarios.length} scenarios`);
    const generated = await provider.generateTestCasesFromScenarios(testScenarios, extractedRequirements);

    // Persist test cases
    const created = await this.prisma.$transaction(
      generated.map((tc) =>
        this.prisma.testCase.create({
          data: {
            featureId,
            title: tc.title,
            description: tc.description,
            preconditions: tc.preconditions,
            priority: tc.priority,
            status: 'DRAFT',
            steps: JSON.parse(JSON.stringify(tc.steps)),
            aiProvider: provider.providerName,
            modelVersion: provider.modelVersion,
          },
        }),
      ),
    );

    // ── Layer 4: Generate dev prompts (4A API · 4B Frontend · 4C Testing) ────────
    this.logger.log('[Pipeline] Layer 4 — generating dev prompts');
    const devPrompt = await provider.generateDevPrompt(
      extractedRequirements,
      extractedBehaviors,
      testScenarios,
    );

    await this.prisma.feature.update({
      where: { id: featureId },
      data: {
        devPromptApi: devPrompt.api,
        devPromptFrontend: devPrompt.frontend,
        devPromptTesting: devPrompt.testing,
      },
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
