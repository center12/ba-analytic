import { Module } from '@nestjs/common';
import { FeatureAnalysisController } from './feature-analysis.controller';
import { FeatureAnalysisService } from './feature-analysis.service';
import { ChangeDetectionService } from './change-detection.service';
import { FeatureSyncService } from './feature-sync.service';
import { DocumentVersionService } from './document-version.service';
import { PrismaService } from '../../prisma.service';
import { AIModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { PipelineContextService } from './pipeline/pipeline-context.service';
import { PipelineOrchestratorService } from './pipeline/pipeline-orchestrator.service';
import { PipelinePersistenceService } from './pipeline/pipeline-persistence.service';
import { PipelinePromptPreviewService } from './pipeline/pipeline-prompt-preview.service';
import { PipelineProviderService } from './pipeline/pipeline-provider.service';
import { PipelineStepRunnerService } from './pipeline/pipeline-step-runner.service';
import { TokenUsageService } from './token-usage.service';

@Module({
  imports: [AIModule, StorageModule],
  controllers: [FeatureAnalysisController],
  providers: [
    FeatureAnalysisService,
    ChangeDetectionService,
    FeatureSyncService,
    PipelineOrchestratorService,
    PipelineStepRunnerService,
    PipelineContextService,
    PipelinePersistenceService,
    PipelineProviderService,
    PipelinePromptPreviewService,
    DocumentVersionService,
    PrismaService,
    TokenUsageService,
  ],
  exports: [ChangeDetectionService, FeatureSyncService, DocumentVersionService, PipelineStepRunnerService, TokenUsageService],
})
export class FeatureAnalysisModule {}
