import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildDevPlanWorkflowBackendPrompt,
  buildDevPromptInput,
  buildExtractSSRPrompt,
  buildExtractUserStoriesPrompt,
  buildGenerateTestCasesPrompt,
  buildPlanScenariosPrompt,
  type SSRData,
} from '../../ai/ai-provider.abstract';
import { STORAGE_PROVIDER, IStorageProvider } from '../../storage/storage.interface';
import { Inject } from '@nestjs/common';
import { AI_CONFIG } from '../constants/feature-analysis.constants';
import { PrismaService } from '../../../prisma.service';
import { PipelineContextService } from './pipeline-context.service';
import { compressForDownstream } from './utils/compression.util';

const { MAX_DOC_CHARS } = AI_CONFIG;

@Injectable()
export class PipelinePromptPreviewService {
  constructor(
    private readonly context: PipelineContextService,
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async getStepPrompt(featureId: string, step: number): Promise<{ prompt: string }> {
    const feature = await this.context.getFeatureWithAssets(featureId);

    if (step === 1) {
      if (!feature.content?.trim()) throw new BadRequestException(`Feature ${featureId} has no content. Add requirements in the project page first.`);
      const screenshotPaths = await Promise.all(feature.screenshots.map((screenshot) => this.storage.getSignedUrl(screenshot.storageKey)));
      let baContent = feature.content;
      const projectOverview = feature.project?.overview?.trim();
      if (projectOverview) {
        baContent = [
          '## Project Overview Context',
          'Use this as background context only. If it conflicts with the feature or SSR content below, prefer the feature or SSR content.',
          '',
          projectOverview,
          '',
          '---',
          '',
          baContent,
        ].join('\n');
      }
      const relatedIds = Array.isArray((feature as any).relatedFeatureIds) ? (feature as any).relatedFeatureIds as string[] : [];
      if (relatedIds.length > 0) {
        const relatedFeatures = await this.prisma.feature.findMany({
          where: { id: { in: relatedIds } },
          select: { name: true, content: true },
        });
        const relatedContext = relatedFeatures
          .filter((relatedFeature) => relatedFeature.content?.trim())
          .map((relatedFeature) => `### Related Feature: ${relatedFeature.name}\n${relatedFeature.content}`)
          .join('\n\n');
        if (relatedContext) {
          baContent += `\n\n---\n## Related Features & Rules\n\n${relatedContext}`;
        }
      }
      if (screenshotPaths.length > 0) baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;
      if (baContent.length > MAX_DOC_CHARS) baContent = baContent.slice(0, MAX_DOC_CHARS);
      const parsed = this.context.parseLayer1Fields(feature);
      const previewSSR: SSRData = parsed.ssr ?? {
        featureName: feature.name,
        functionalRequirements: [],
        systemRules: [],
        businessRules: [],
        constraints: [],
        globalPolicies: [],
        entities: [],
      };
      return {
        prompt: [
          '=== Phase 1A: SSR Extraction ===',
          buildExtractSSRPrompt(baContent),
          '',
          '=== Phase 1B: User Story Extraction ===',
          buildExtractUserStoriesPrompt(baContent, previewSSR),
        ].join('\n\n'),
      };
    }

    if (step === 2) {
      const { requirements, behaviors } = await this.context.getStep2Context(featureId);
      return { prompt: buildPlanScenariosPrompt(requirements, behaviors) };
    }

    if (step === 3) {
      const { requirements, testScenarios, userStories } = await this.context.getStep3Context(featureId);
      const compressed = compressForDownstream(
        requirements,
        { feature: '', actors: [], actions: [], rules: [] },
        userStories,
      );
      return { prompt: buildGenerateTestCasesPrompt(testScenarios, compressed.req, compressed.stories) };
    }

    if (step === 4) {
      const { requirements, behaviors, testScenarios } = await this.context.getStep4Context(featureId);
      const compressed = compressForDownstream(requirements, behaviors);
      return { prompt: buildDevPlanWorkflowBackendPrompt(compressed.req, compressed.beh, testScenarios) };
    }

    if (step === 5) {
      const { requirements, behaviors, testScenarios, devPlan } = await this.context.getStep5Context(featureId);
      const compressed = compressForDownstream(requirements, behaviors);
      return { prompt: buildDevPromptInput(compressed.req, compressed.beh, testScenarios, devPlan) };
    }

    throw new BadRequestException(`Invalid step: ${step}. Must be 1–5`);
  }
}
