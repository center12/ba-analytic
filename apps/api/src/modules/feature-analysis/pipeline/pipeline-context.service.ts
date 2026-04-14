import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BackendPlan,
  DevPlan,
  ExtractedBehaviors,
  ExtractedRequirements,
  FrontendPlan,
  Mapping,
  RelatedFeatureDevPlan,
  SSRData,
  TestScenario,
  UserStories,
  UserStory,
  ValidationResult,
  WorkflowStep,
} from '../../ai/ai-provider.abstract';
import { PrismaService } from '../../../prisma.service';
import { compressForDownstream } from './utils/compression.util';
import { normalizeSSRData, normalizeUserStories } from './utils/layer1.util';
import type {
  Layer1ResumePartial,
  Layer1ResumeState,
  ParsedLayer1Fields,
  Step2Context,
  Step3Context,
  Step4Context,
  Step5Context,
} from './types/pipeline-context.types';

@Injectable()
export class PipelineContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeature(featureId: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    return feature;
  }

  async getFeatureWithAssets(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        screenshots: true,
        project: { select: { name: true, overview: true } },
      },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    return feature;
  }

  parseJsonField<T>(value: unknown, fieldName: string): T {
    if (typeof value !== 'string' || !value) {
      throw new BadRequestException(`Feature is missing ${fieldName}`);
    }
    return JSON.parse(value) as T;
  }

  tryParseJsonField<T>(value: unknown): T | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  parseLayer1Fields(feature: any): ParsedLayer1Fields {
    const parsedSSR = this.tryParseJsonField<SSRData>(feature.layer1SSR);
    return {
      ssr: parsedSSR ? normalizeSSRData(parsedSSR) : undefined,
      stories: this.tryParseJsonField<UserStories>(feature.layer1Stories),
      mapping: this.tryParseJsonField<Mapping>(feature.layer1Mapping),
      validation: this.tryParseJsonField<ValidationResult>(feature.layer1Validation),
    };
  }

  parseDevPlan(feature: any): DevPlan | undefined {
    const workflow = this.tryParseJsonField<WorkflowStep[]>(feature.devPlanWorkflow);
    const backend = this.tryParseJsonField<BackendPlan>(feature.devPlanBackend);
    const frontend = this.tryParseJsonField<FrontendPlan>(feature.devPlanFrontend);
    const testing = this.tryParseJsonField<DevPlan['testing']>(feature.devPlanTesting);

    if (!workflow || !backend || !frontend || !testing) return undefined;
    return { workflow, backend, frontend, testing };
  }

  buildWorkflowSummary(workflow: WorkflowStep[]): string {
    return workflow.map((step) => `${step.order}. ${step.title} (${step.actor}): ${step.description}`).join('\n');
  }

  getUserStories(feature: any): UserStory[] | undefined {
    const stories = this.tryParseJsonField<UserStories>(feature.layer1Stories);
    return stories?.stories;
  }

  getLayer1ResumeState(feature: any): Layer1ResumeState {
    const partialRaw = feature.pipelinePartial as Record<string, unknown> | null;
    const partial = (partialRaw?.partial as Layer1ResumePartial | null) ?? null;
    return {
      failedPhase: typeof partialRaw?.phase === 'string' ? partialRaw.phase : undefined,
      resumeFromChunk: feature.pipelineFailedAt ?? 0,
      partial: partial
        ? {
            ssr: partial.ssr ? normalizeSSRData(partial.ssr) : undefined,
            stories: partial.stories ? normalizeUserStories(partial.stories) : undefined,
          }
        : null,
    };
  }

  async getStep2Context(featureId: string, override?: { requirements?: ExtractedRequirements; behaviors?: ExtractedBehaviors }): Promise<Step2Context> {
    const feature = await this.getFeature(featureId);
    const requirements = (override?.requirements ?? feature.extractedRequirements) as ExtractedRequirements | null;
    const behaviors = (override?.behaviors ?? feature.extractedBehaviors) as ExtractedBehaviors | null;

    if (!requirements || !behaviors) {
      throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    }

    const userStories = this.getUserStories(feature);
    const compressed = compressForDownstream(requirements, behaviors, userStories);
    return {
      feature,
      requirements,
      behaviors,
      userStories,
      compressedRequirements: compressed.req,
      compressedBehaviors: compressed.beh,
      compressedStories: compressed.stories,
    };
  }

  async getStep3Context(featureId: string): Promise<Step3Context> {
    const feature = await this.getFeature(featureId);
    const requirements = feature.extractedRequirements as ExtractedRequirements | null;
    const testScenarios = feature.testScenarios as TestScenario[] | null;

    if (!testScenarios?.length) {
      throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);
    }
    if (!requirements) {
      throw new BadRequestException(`Feature ${featureId} has no requirements — run Step 1 first`);
    }

    const userStories = this.getUserStories(feature);
    const compressed = compressForDownstream(
      requirements,
      { feature: '', actors: [], actions: [], rules: [] },
      userStories,
    );

    return {
      feature,
      requirements,
      testScenarios,
      userStories,
      compressedRequirements: compressed.req,
      compressedStories: compressed.stories,
    };
  }

  async getStep4Context(featureId: string): Promise<Step4Context> {
    const feature = await this.getFeature(featureId);
    const requirements = feature.extractedRequirements as ExtractedRequirements | null;
    const behaviors = feature.extractedBehaviors as ExtractedBehaviors | null;
    const testScenarios = feature.testScenarios as TestScenario[] | null;

    if (!requirements || !behaviors) {
      throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    }
    if (!testScenarios?.length) {
      throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);
    }

    const userStories = this.getUserStories(feature);
    const compressed = compressForDownstream(requirements, behaviors, userStories);
    const relatedFeatures = await this.loadRelatedFeatureDevPlans(feature);

    return {
      feature,
      requirements,
      behaviors,
      testScenarios,
      userStories,
      compressedRequirements: compressed.req,
      compressedBehaviors: compressed.beh,
      compressedStories: compressed.stories,
      relatedFeatures,
    };
  }

  private async loadRelatedFeatureDevPlans(feature: any): Promise<RelatedFeatureDevPlan[] | undefined> {
    const relatedIds = feature.relatedFeatureIds as string[] | null;
    if (!relatedIds?.length) return undefined;

    const relatedFeatures = await this.prisma.feature.findMany({
      where: { id: { in: relatedIds } },
      select: {
        id: true,
        code: true,
        name: true,
        devPlanWorkflow: true,
        devPlanBackend: true,
        devPlanFrontend: true,
      },
    });

    const result: RelatedFeatureDevPlan[] = [];
    for (const rf of relatedFeatures) {
      const workflow = this.tryParseJsonField<WorkflowStep[]>((rf as any).devPlanWorkflow);
      const backend = this.tryParseJsonField<BackendPlan>((rf as any).devPlanBackend);
      const frontend = this.tryParseJsonField<FrontendPlan>((rf as any).devPlanFrontend);
      if (workflow || backend || frontend) {
        result.push({ featureName: rf.name, featureCode: rf.code, workflow, backend, frontend });
      }
    }
    return result.length > 0 ? result : undefined;
  }

  async getStep5Context(featureId: string): Promise<Step5Context> {
    const feature = await this.getFeature(featureId);
    const requirements = feature.extractedRequirements as ExtractedRequirements | null;
    const behaviors = feature.extractedBehaviors as ExtractedBehaviors | null;
    const testScenarios = feature.testScenarios as TestScenario[] | null;

    if (!requirements || !behaviors) {
      throw new BadRequestException(`Feature ${featureId} has no Layer 1 results — run Step 1 first`);
    }
    if (!testScenarios?.length) {
      throw new BadRequestException(`Feature ${featureId} has no scenarios — run Step 2 first`);
    }

    const userStories = this.getUserStories(feature);
    const compressed = compressForDownstream(requirements, behaviors, userStories);

    return {
      feature,
      requirements,
      behaviors,
      testScenarios,
      userStories,
      compressedRequirements: compressed.req,
      compressedBehaviors: compressed.beh,
      compressedStories: compressed.stories,
      devPlan: this.parseDevPlan(feature),
    };
  }

  buildScenarioTraceMap(testScenarios: TestScenario[]): Map<string, string[]> {
    const scenarioTraceMap = new Map<string, string[]>();
    for (const scenario of testScenarios) {
      const refs = [...scenario.requirementRefs];
      if (scenario.userStoryId && !refs.includes(scenario.userStoryId)) refs.push(scenario.userStoryId);
      scenarioTraceMap.set(scenario.title, refs);
    }
    return scenarioTraceMap;
  }
}
