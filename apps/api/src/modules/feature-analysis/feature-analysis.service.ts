import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateFeatureAnalysisDto } from './dto/update-feature-analysis.dto';
import { PipelineOrchestratorService } from './pipeline/pipeline-orchestrator.service';
import { PipelinePromptPreviewService } from './pipeline/pipeline-prompt-preview.service';
import { PipelineProviderService } from './pipeline/pipeline-provider.service';
import { PipelineStepRunnerService } from './pipeline/pipeline-step-runner.service';
import type { SaveStepResultsPayload } from './pipeline/types/pipeline.types';
import type { SSRData, UserStories, UserStory, SubFeatureItem } from '../ai/ai-provider.abstract';
import {
  buildExtractedFeatureName,
  extractPrefixedId,
  filterItemsByIds,
  storyToMarkdown,
} from './helpers/ssr-story.helpers';

@Injectable()
export class FeatureAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
    private readonly pipelineStepRunner: PipelineStepRunnerService,
    private readonly pipelinePromptPreview: PipelinePromptPreviewService,
    private readonly pipelineProvider: PipelineProviderService,
  ) {}

  async findByFeature(featureId: string) {
    return this.prisma.featureAnalysis.findMany({
      where: { featureId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const featureAnalysis = await this.prisma.featureAnalysis.findUnique({ where: { id } });
    if (!featureAnalysis) throw new NotFoundException(`FeatureAnalysis ${id} not found`);
    return featureAnalysis;
  }

  async update(id: string, dto: UpdateFeatureAnalysisDto) {
    await this.findOne(id);
    return this.prisma.featureAnalysis.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.featureAnalysis.delete({ where: { id } });
  }

  async generateForFeature(featureId: string, providerName?: string, model?: string) {
    return this.pipelineOrchestrator.run(featureId, providerName, model);
  }

  async resumeForFeature(featureId: string, providerName?: string, model?: string) {
    return this.pipelineOrchestrator.resume(featureId, providerName, model);
  }

  async runStepForFeature(
    featureId: string,
    step: number,
    providerName?: string,
    model?: string,
    override?: unknown,
    promptAppend?: string,
  ) {
    switch (step) {
      case 1: return this.pipelineStepRunner.runStep1(featureId, providerName, model, promptAppend);
      case 2: return this.pipelineStepRunner.runStep2(featureId, providerName, model, override as any, promptAppend);
      case 3: return this.pipelineStepRunner.runStep3(featureId, providerName, model, promptAppend);
      case 4: return this.pipelineStepRunner.runStep4(featureId, providerName, model, promptAppend);
      case 5: return this.pipelineStepRunner.runStep5(featureId, providerName, model, promptAppend);
      default: throw new Error(`Invalid pipeline step: ${step}`);
    }
  }

  async runStep1SectionForFeature(
    featureId: string,
    sublayer: 'ssr-stories' | 'mapping' | 'validation',
    providerName?: string,
    model?: string,
  ) {
    return this.pipelineStepRunner.runStep1Section(featureId, sublayer, providerName, model);
  }

  async runStep4SectionForFeature(
    featureId: string,
    section: 'workflow-backend' | 'frontend' | 'testing' | 'testing-backend' | 'testing-frontend',
    providerName?: string,
    model?: string,
    promptAppend?: string,
  ) {
    return this.pipelineStepRunner.runStep4Section(featureId, section, providerName, model, promptAppend);
  }

  async runStep5SectionForFeature(
    featureId: string,
    section: 'backend' | 'api' | 'frontend' | 'testing',
    providerName?: string,
    model?: string,
    promptAppend?: string,
  ) {
    return this.pipelineStepRunner.runStep5Section(featureId, section, providerName, model, promptAppend);
  }

  async resumeStep1ForFeature(featureId: string, providerName?: string, model?: string) {
    return this.pipelineStepRunner.resumeStep1(featureId, providerName, model);
  }

  async saveStepResults(featureId: string, data: unknown) {
    return this.pipelineStepRunner.saveStepResults(featureId, data as SaveStepResultsPayload);
  }

  async getStepPrompt(featureId: string, step: number) {
    return this.pipelinePromptPreview.getStepPrompt(featureId, step);
  }

  async extractSubFeaturesForFeature(featureId: string, _providerName?: string, _model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (feature.featureType !== 'SSR') {
      throw new BadRequestException('Sub-feature extraction is only supported for SSR features.');
    }

    // Require Step 1 to be run first — derive features from structured user stories
    if (!feature.layer1Stories) {
      throw new BadRequestException(
        'Step 1 must be completed first. Run Step 1 on this SSR to extract user stories before generating sub-features.',
      );
    }

    let parsedStories: UserStories;
    try {
      parsedStories = JSON.parse(feature.layer1Stories as string) as UserStories;
    } catch {
      throw new BadRequestException('Layer 1 stories data is corrupt. Re-run Step 1 to regenerate.');
    }

    if (!parsedStories.stories?.length) {
      throw new BadRequestException(
        'No user stories found in Step 1 results. Re-run Step 1 to regenerate.',
      );
    }

    let parsedSSR: SSRData | null = null;
    try {
      parsedSSR = feature.layer1SSR ? (JSON.parse(feature.layer1SSR as string) as SSRData) : null;
    } catch {
      parsedSSR = null;
    }

    // Fallback AC source for legacy pipeline users (new pipeline stores AC-xx in ssr.constraints)
    const legacyAcceptanceCriteria = (feature.extractedRequirements as any)?.acceptanceCriteria as string[] | undefined;

    const features: SubFeatureItem[] = parsedStories.stories.map((story: UserStory) => ({
      name: buildExtractedFeatureName(feature.code ?? feature.id, story.id, story.action),
      description: story.benefit,
      content: storyToMarkdown(story, parsedSSR, legacyAcceptanceCriteria ?? [], feature.name),
    }));

    return { features };
  }

}

