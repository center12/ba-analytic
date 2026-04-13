import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildDevPlanWorkflowBackendPrompt,
  buildDevPromptInput,
  buildExtractSSRAndStoriesPrompt,
  buildGenerateTestCasesPrompt,
  buildPlanScenariosPrompt,
} from '../../ai/ai-provider.abstract';
import { STORAGE_PROVIDER, IStorageProvider } from '../../storage/storage.interface';
import { Inject } from '@nestjs/common';
import { AI_CONFIG } from '../constants/feature-analysis.constants';
import { PipelineContextService } from './pipeline-context.service';
import { readDocumentContent } from './utils/document-reader.util';
import { compressForDownstream } from './utils/compression.util';

const { MAX_DOC_CHARS } = AI_CONFIG;

@Injectable()
export class PipelinePromptPreviewService {
  constructor(
    private readonly context: PipelineContextService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async getStepPrompt(featureId: string, step: number): Promise<{ prompt: string }> {
    const feature = await this.context.getFeatureWithAssets(featureId);

    if (step === 1) {
      if (!feature.baDocument) throw new BadRequestException(`Feature ${featureId} has no BA document uploaded`);
      const baDocumentPath = await this.storage.getSignedUrl(feature.baDocument.storageKey);
      const screenshotPaths = await Promise.all(feature.screenshots.map((screenshot) => this.storage.getSignedUrl(screenshot.storageKey)));
      let baContent = await readDocumentContent(baDocumentPath);
      if (screenshotPaths.length > 0) baContent += `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`;
      if (baContent.length > MAX_DOC_CHARS) baContent = baContent.slice(0, MAX_DOC_CHARS);
      return { prompt: buildExtractSSRAndStoriesPrompt(baContent) };
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
