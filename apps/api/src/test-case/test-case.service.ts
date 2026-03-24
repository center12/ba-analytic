import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AIProviderFactory, ProviderName } from '../ai/ai-provider.factory';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';

@Injectable()
export class TestCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async findByFeature(featureId: string) {
    return this.prisma.testCase.findMany({
      where: { featureId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tc = await this.prisma.testCase.findUnique({ where: { id } });
    if (!tc) throw new NotFoundException(`TestCase ${id} not found`);
    return tc;
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    await this.findOne(id);
    return this.prisma.testCase.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.testCase.delete({ where: { id } });
  }

  /**
   * Trigger AI generation for all test cases for a given Feature.
   * Reads the stored BA document, resolves screenshot paths, calls the AI,
   * and persists the results.
   */
  async generateForFeature(featureId: string, providerName?: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { baDocument: true, screenshots: true },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (!feature.baDocument) {
      throw new BadRequestException(
        `Feature ${featureId} has no BA document uploaded`,
      );
    }

    // Resolve file paths via storage adapter
    const baDocumentPath = await this.storage.getSignedUrl(
      feature.baDocument.storageKey,
    );
    const screenshotPaths = await Promise.all(
      feature.screenshots.map((s: { storageKey: string }) => this.storage.getSignedUrl(s.storageKey)),
    );

    // Read BA document content from disk (local adapter returns absolute path)
    const fs = await import('fs/promises');
    let baContent: string;
    try {
      baContent = await fs.readFile(baDocumentPath, 'utf-8');
    } catch {
      // For binary formats (PDF/DOCX), send the path and let the AI provider handle it
      baContent = `[Binary document at path: ${baDocumentPath}]`;
    }

    const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
    const generated = await provider.generateTestCases(baContent, screenshotPaths);

    // Persist all generated test cases
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

    return { generated: created.length, testCases: created };
  }
}
