import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateFeatureAnalysisDto } from './dto/update-feature-analysis.dto';
import { PipelineOrchestratorService } from './pipeline/pipeline-orchestrator.service';
import { PipelinePromptPreviewService } from './pipeline/pipeline-prompt-preview.service';
import { PipelineStepRunnerService } from './pipeline/pipeline-step-runner.service';
import type { SaveStepResultsPayload } from './pipeline/types/pipeline.types';

@Injectable()
export class FeatureAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
    private readonly pipelineStepRunner: PipelineStepRunnerService,
    private readonly pipelinePromptPreview: PipelinePromptPreviewService,
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
}
