import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FeatureAnalysisService } from './feature-analysis.service';
import { FeatureSyncService } from './feature-sync.service';
import { UpdateFeatureAnalysisDto } from './dto/update-feature-analysis.dto';
import { SyncActionDto } from './dto/feature-sync.dto';

@Controller('feature-analysis')
export class FeatureAnalysisController {
  constructor(
    private readonly service: FeatureAnalysisService,
    private readonly featureSync: FeatureSyncService,
  ) {}

  /**
   * GET /api/feature-analysis/feature/:featureId/step-prompt/:step
   * Returns the prompt that would be sent to AI for the given step, without calling AI.
   */
  @Get('feature/:featureId/step-prompt/:step')
  getStepPrompt(
    @Param('featureId') featureId: string,
    @Param('step', ParseIntPipe) step: number,
  ) {
    return this.service.getStepPrompt(featureId, step);
  }

  @Get('feature/:featureId')
  findByFeature(@Param('featureId') featureId: string) {
    return this.service.findByFeature(featureId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeatureAnalysisDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/generate?provider=gemini
   * Triggers AI generation and persists results.
   */
  @Post('feature/:featureId/generate')
  generate(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
  ) {
    return this.service.generateForFeature(featureId, provider, model);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/resume?provider=gemini&model=gemini-2.0-flash
   * Continues a FAILED pipeline run from the chunk that failed.
   */
  @Post('feature/:featureId/resume')
  resume(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
  ) {
    return this.service.resumeForFeature(featureId, provider, model);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/run-step/:step?provider=gemini&model=gemini-2.0-flash
   * Runs a single pipeline step (1–5) independently.
   */
  @Post('feature/:featureId/run-step/:step')
  runStep(
    @Param('featureId') featureId: string,
    @Param('step', ParseIntPipe) step: number,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Body() body?: { override?: unknown; promptAppend?: string },
  ) {
    return this.service.runStepForFeature(featureId, step, provider, model, body?.override, body?.promptAppend);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/run-step-1-section/:sublayer?provider=gemini
   * Re-runs a single sublayer of Step 1 (ssr-stories | mapping | validation).
   */
  @Post('feature/:featureId/run-step-1-section/:sublayer')
  runStep1Section(
    @Param('featureId') featureId: string,
    @Param('sublayer') sublayer: 'ssr-stories' | 'mapping' | 'validation',
    @Query('provider') provider?: string,
    @Query('model') model?: string,
  ) {
    return this.service.runStep1SectionForFeature(featureId, sublayer, provider, model);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/run-step-4-section/:section?provider=gemini
   * Generates a single section of Step 4 (workflow-backend | frontend | testing | testing-backend | testing-frontend).
   */
  @Post('feature/:featureId/run-step-4-section/:section')
  runStep4Section(
    @Param('featureId') featureId: string,
    @Param('section') section: 'workflow-backend' | 'frontend' | 'testing' | 'testing-backend' | 'testing-frontend',
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Body() body?: { promptAppend?: string },
  ) {
    return this.service.runStep4SectionForFeature(featureId, section, provider, model, body?.promptAppend);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/run-step-5-section/:section?provider=gemini
   * Generates one Step 5 section (backend|api alias | frontend | testing).
   */
  @Post('feature/:featureId/run-step-5-section/:section')
  runStep5Section(
    @Param('featureId') featureId: string,
    @Param('section') section: 'backend' | 'api' | 'frontend' | 'testing',
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Body() body?: { promptAppend?: string },
  ) {
    return this.service.runStep5SectionForFeature(featureId, section, provider, model, body?.promptAppend);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/resume-step1?provider=gemini&model=gemini-2.0-flash
   * Resumes Step 1 from the failed chunk.
   */
  @Post('feature/:featureId/resume-step1')
  resumeStep1(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
  ) {
    return this.service.resumeStep1ForFeature(featureId, provider, model);
  }

  /**
   * PATCH /api/feature-analysis/feature/:featureId/step-results
   * Saves user-edited step results without re-running AI.
   */
  @Patch('feature/:featureId/step-results')
  saveStepResults(
    @Param('featureId') featureId: string,
    @Body() body: unknown,
  ) {
    return this.service.saveStepResults(featureId, body);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/extract-sub-features?provider=gemini
   * Parses SSR feature content and returns a list of extracted sub-features.
   * Does NOT create any records — the frontend confirms and creates them separately.
   */
  @Post('feature/:featureId/extract-sub-features')
  extractSubFeatures(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
  ) {
    return this.service.extractSubFeaturesForFeature(featureId, provider, model);
  }

  // ── SSR Sync Endpoints ────────────────────────────────────────────────────

  /**
   * GET /api/feature-analysis/ssr/:ssrId/sync-warnings
   * Returns all OUT_OF_SYNC extracted features for a given SSR.
   * Used by the frontend to show the sync warning dialog after Step 1 re-runs.
   */
  @Get('ssr/:ssrId/sync-warnings')
  getSSRSyncWarnings(@Param('ssrId') ssrId: string) {
    return this.featureSync.getSSRSyncWarnings(ssrId);
  }

  /**
   * GET /api/feature-analysis/feature/:featureId/sync-status
   * Returns the current sync state for an extracted feature.
   */
  @Get('feature/:featureId/sync-status')
  getSyncStatus(@Param('featureId') featureId: string) {
    return this.featureSync.getSyncStatus(featureId);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/sync/update
   * Re-syncs the extracted feature's content from its parent SSR.
   * Sets syncStatus = IN_SYNC.
   */
  @Post('feature/:featureId/sync/update')
  @HttpCode(HttpStatus.NO_CONTENT)
  syncUpdate(@Param('featureId') featureId: string) {
    return this.featureSync.updateFromSSR(featureId);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/sync/keep
   * Marks the feature as intentionally diverged from the parent SSR.
   * Sets syncStatus = DIVERGED and preserves current content.
   */
  @Post('feature/:featureId/sync/keep')
  @HttpCode(HttpStatus.NO_CONTENT)
  syncKeep(@Param('featureId') featureId: string) {
    return this.featureSync.markDiverged(featureId);
  }

  /**
   * DELETE /api/feature-analysis/feature/:featureId/sync/remove
   * Deletes the extracted feature and all its related data.
   */
  @Delete('feature/:featureId/sync/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  syncRemove(@Param('featureId') featureId: string) {
    return this.featureSync.remove(featureId);
  }
}
