import { BadRequestException, Injectable } from '@nestjs/common';
import { AIProviderFactory, ProviderName } from '../../ai/ai-provider.factory';
import type { AIProvider } from '../../ai/ai-provider.abstract';
import { PrismaService } from '../../../prisma.service';

const MAX_PROMPT_APPEND_CHARS = 2000;

@Injectable()
export class PipelineProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
  ) {}

  normalizePromptAppend(promptAppend?: string): string | undefined {
    if (typeof promptAppend !== 'string') return undefined;
    const trimmed = promptAppend.trim();
    if (!trimmed) return undefined;
    if (trimmed.length > MAX_PROMPT_APPEND_CHARS) {
      throw new BadRequestException(`promptAppend must be <= ${MAX_PROMPT_APPEND_CHARS} characters`);
    }
    return trimmed;
  }

  async resolveProvider(
    featureId: string,
    step: number,
    runtimeProvider?: string,
    runtimeModel?: string,
  ): Promise<AIProvider> {
    if (runtimeProvider) {
      return this.aiFactory.getProvider(runtimeProvider as ProviderName, runtimeModel);
    }

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

    return this.aiFactory.getProvider(undefined, runtimeModel);
  }
}
