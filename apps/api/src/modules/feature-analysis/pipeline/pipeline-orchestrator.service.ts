import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { PipelinePersistenceService } from './pipeline-persistence.service';
import { PipelineStepRunnerService } from './pipeline-step-runner.service';

@Injectable()
export class PipelineOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly persistence: PipelinePersistenceService,
    private readonly stepRunner: PipelineStepRunnerService,
  ) {}

  async run(featureId: string, providerName?: string, model?: string) {
    await this.persistence.resetPipeline(featureId);
    await this.stepRunner.runStep1(featureId, providerName, model);
    await this.stepRunner.runStep2(featureId, providerName, model);
    await this.stepRunner.runStep3(featureId, providerName, model);
    await this.stepRunner.runStep4(featureId, providerName, model);
    return this.stepRunner.runStep5(featureId, providerName, model);
  }

  async resume(featureId: string, providerName?: string, model?: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) {
      throw new BadRequestException(`Feature ${featureId} not found`);
    }
    if (feature.pipelineStatus !== 'FAILED') {
      throw new BadRequestException(
        `Feature ${featureId} pipeline is not in FAILED state (current: ${feature.pipelineStatus})`,
      );
    }

    switch ((feature as any).pipelineStep) {
      case 1:
        await this.stepRunner.resumeStep1(featureId, providerName, model);
        await this.stepRunner.runStep2(featureId, providerName, model);
        await this.stepRunner.runStep3(featureId, providerName, model);
        await this.stepRunner.runStep4(featureId, providerName, model);
        return this.stepRunner.runStep5(featureId, providerName, model);
      case 2:
        await this.stepRunner.runStep2(featureId, providerName, model);
        await this.stepRunner.runStep3(featureId, providerName, model);
        await this.stepRunner.runStep4(featureId, providerName, model);
        return this.stepRunner.runStep5(featureId, providerName, model);
      case 3:
        await this.stepRunner.runStep3(featureId, providerName, model);
        await this.stepRunner.runStep4(featureId, providerName, model);
        return this.stepRunner.runStep5(featureId, providerName, model);
      case 4:
        await this.stepRunner.runStep4(featureId, providerName, model);
        return this.stepRunner.runStep5(featureId, providerName, model);
      case 5:
        return this.stepRunner.runStep5(featureId, providerName, model);
      default:
        throw new BadRequestException(`Feature ${featureId} has no resumable failed step`);
    }
  }
}
