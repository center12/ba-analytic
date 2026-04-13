import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AIProvider,
  BackendTestingPlan,
  DevPlan,
  DevPrompt,
  DevTaskItem,
  FrontendTestingPlan,
  GeneratedTestCase,
  Layer1Extraction,
  Mapping,
  TestScenario,
  ValidationResult,
  WorkflowStep,
  FrontendPlan,
  BackendPlan,
} from '../../ai/ai-provider.abstract';
import { PrismaService } from '../../../prisma.service';
import { layer1ToLegacy } from './utils/layer1.util';

@Injectable()
export class PipelinePersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async resetPipeline(featureId: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: null, pipelineFailedAt: null, pipelinePartial: Prisma.JsonNull } as any),
    });
  }

  async markStepStarted(featureId: string, step: number) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'RUNNING', pipelineStep: step } as any),
    });
  }

  async markStepFailed(featureId: string, step: number, extraData?: Record<string, unknown>) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'FAILED', pipelineStep: step, ...extraData } as any),
    });
  }

  async markRunning(featureId: string) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: { pipelineStatus: 'RUNNING' },
    });
  }

  async markCompleted(featureId: string, step: number, extraData?: Record<string, unknown>) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelineStatus: 'COMPLETED', pipelineStep: step, ...extraData } as any),
    });
  }

  async saveLayer1Result(featureId: string, layer1: Layer1Extraction, acceptanceCriteriaText: string[] = []) {
    const { requirements, behaviors } = layer1ToLegacy(layer1.ssr, layer1.stories, acceptanceCriteriaText);
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        layer1SSR: JSON.stringify(layer1.ssr),
        layer1Stories: JSON.stringify(layer1.stories),
        layer1Mapping: JSON.stringify(layer1.mapping),
        layer1Validation: JSON.stringify(layer1.validation),
        extractedRequirements: JSON.parse(JSON.stringify(requirements)),
        extractedBehaviors: JSON.parse(JSON.stringify(behaviors)),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 1,
        pipelinePartial: Prisma.JsonNull,
        pipelineFailedAt: null,
      } as any),
    });
    return { requirements, behaviors, layer1 };
  }

  async saveLayer1Partial(featureId: string, partial: any) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ pipelinePartial: partial } as any),
    });
  }

  async saveLayer1AB(featureId: string, ssr: unknown, stories: unknown) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        layer1SSR: JSON.stringify(ssr),
        layer1Stories: JSON.stringify(stories),
      } as any),
    });
  }

  async saveLayer1Mapping(featureId: string, mapping: Mapping) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ layer1Mapping: JSON.stringify(mapping) } as any),
    });
  }

  async saveLayer1Validation(featureId: string, validation: ValidationResult) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({ layer1Validation: JSON.stringify(validation) } as any),
    });
  }

  async saveTestScenarios(featureId: string, testScenarios: TestScenario[]) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        testScenarios: JSON.parse(JSON.stringify(testScenarios)),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 2,
      } as any),
    });
  }

  async replaceGeneratedTestCases(
    featureId: string,
    generated: GeneratedTestCase[],
    scenarioTraceMap: Map<string, string[]>,
    provider: AIProvider,
  ) {
    await this.prisma.featureAnalysis.deleteMany({ where: { featureId } });
    const created = await this.prisma.$transaction(
      generated.map((testCase) =>
        this.prisma.featureAnalysis.create({
          data: ({
            featureId,
            title: testCase.title,
            description: testCase.description,
            preconditions: testCase.preconditions,
            priority: testCase.priority,
            status: 'DRAFT',
            steps: JSON.parse(JSON.stringify(testCase.steps)),
            requirementRefs: scenarioTraceMap.get(testCase.title)?.length ? scenarioTraceMap.get(testCase.title) : undefined,
            aiProvider: provider.providerName,
            modelVersion: provider.modelVersion,
          } as any),
        }),
      ),
    );

    await this.markCompleted(featureId, 3);
    return created;
  }

  async saveDevPlan(featureId: string, devPlan: DevPlan) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanWorkflow: JSON.stringify(devPlan.workflow),
        devPlanBackend: JSON.stringify(devPlan.backend),
        devPlanFrontend: JSON.stringify(devPlan.frontend),
        devPlanTesting: JSON.stringify(devPlan.testing),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 4,
        pipelineFailedAt: null,
      } as any),
    });
  }

  async saveWorkflowBackend(featureId: string, workflow: WorkflowStep[], backend: BackendPlan) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanWorkflow: JSON.stringify(workflow),
        devPlanBackend: JSON.stringify(backend),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 4,
        pipelineFailedAt: null,
      } as any),
    });
  }

  async saveFrontendPlan(featureId: string, frontend: FrontendPlan) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanFrontend: JSON.stringify(frontend),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 4,
        pipelineFailedAt: null,
      } as any),
    });
  }

  async mergeTestingPlanSection(
    featureId: string,
    existing: unknown,
    section: 'backend' | 'frontend',
    value: BackendTestingPlan | FrontendTestingPlan,
  ) {
    const current = typeof existing === 'string' && existing
      ? (JSON.parse(existing) as Record<string, unknown>)
      : {};
    const merged = { ...current, [section]: value };

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPlanTesting: JSON.stringify(merged),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 4,
        pipelineFailedAt: null,
      } as any),
    });
  }

  async saveDevPrompt(featureId: string, devPrompt: DevPrompt) {
    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        devPromptApi: JSON.stringify(devPrompt.api),
        devPromptFrontend: JSON.stringify(devPrompt.frontend),
        devPromptTesting: JSON.stringify(devPrompt.testing),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 5,
      } as any),
    });

    const taskRows = [
      ...devPrompt.api.map((task) => ({ featureId, category: 'API' as const, title: task.title, prompt: task.prompt, userStoryIds: task.userStoryIds ?? undefined })),
      ...devPrompt.frontend.map((task) => ({ featureId, category: 'FRONTEND' as const, title: task.title, prompt: task.prompt, userStoryIds: task.userStoryIds ?? undefined })),
      ...devPrompt.testing.map((task) => ({ featureId, category: 'TESTING' as const, title: task.title, prompt: task.prompt, userStoryIds: task.userStoryIds ?? undefined })),
    ];

    await this.prisma.developerTask.deleteMany({ where: { featureId } });
    if (taskRows.length > 0) {
      await this.prisma.developerTask.createMany({ data: taskRows as any });
    }
  }

  async saveDevPromptSection(featureId: string, section: 'api' | 'frontend' | 'testing', tasks: DevTaskItem[]) {
    const sectionMeta = section === 'api'
      ? { field: 'devPromptApi', category: 'API' as const }
      : section === 'frontend'
        ? { field: 'devPromptFrontend', category: 'FRONTEND' as const }
        : { field: 'devPromptTesting', category: 'TESTING' as const };

    await this.prisma.feature.update({
      where: { id: featureId },
      data: ({
        [sectionMeta.field]: JSON.stringify(tasks),
        pipelineStatus: 'COMPLETED',
        pipelineStep: 5,
      } as any),
    });

    await this.prisma.developerTask.deleteMany({ where: { featureId, category: sectionMeta.category } });
    if (tasks.length > 0) {
      await this.prisma.developerTask.createMany({
        data: tasks.map((task) => ({
          featureId,
          category: sectionMeta.category,
          title: task.title,
          prompt: task.prompt,
          userStoryIds: task.userStoryIds ?? undefined,
        })) as any,
      });
    }
  }
}
