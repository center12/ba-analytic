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
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FeatureAnalysisService } from './feature-analysis.service';
import { FeatureSyncService } from './feature-sync.service';
import { TokenUsageService } from './token-usage.service';
import { UpdateFeatureAnalysisDto } from './dto/update-feature-analysis.dto';
import { SSRSyncWarningsResponseDto, SyncStatusDto } from './dto/feature-sync.dto';
import { PromptAppendDto, RunFeatureAnalysisStepDto } from './dto/run-feature-analysis-step.dto';

@ApiTags('Feature Analysis')
@Controller('feature-analysis')
export class FeatureAnalysisController {
  constructor(
    private readonly service: FeatureAnalysisService,
    private readonly featureSync: FeatureSyncService,
    private readonly tokenUsage: TokenUsageService,
  ) {}

  /**
   * GET /api/feature-analysis/feature/:featureId/step-prompt/:step
   * Returns the prompt that would be sent to AI for the given step, without calling AI.
   */
  @ApiOperation({ summary: 'Preview the generated AI prompt for a pipeline step' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiParam({ name: 'step', description: 'Pipeline step number.', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Prompt preview returned.' })
  @Get('feature/:featureId/step-prompt/:step')
  getStepPrompt(
    @Param('featureId') featureId: string,
    @Param('step', ParseIntPipe) step: number,
  ) {
    return this.service.getStepPrompt(featureId, step);
  }

  @ApiOperation({ summary: 'List analysis records for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Feature analysis records returned.' })
  @Get('feature/:featureId')
  findByFeature(@Param('featureId') featureId: string) {
    return this.service.findByFeature(featureId);
  }

  @ApiOperation({ summary: 'Get a single analysis record' })
  @ApiParam({ name: 'id', description: 'Feature analysis identifier.' })
  @ApiOkResponse({ description: 'Feature analysis record returned.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Update a feature analysis record' })
  @ApiParam({ name: 'id', description: 'Feature analysis identifier.' })
  @ApiBody({ type: UpdateFeatureAnalysisDto })
  @ApiOkResponse({ description: 'Feature analysis updated.' })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeatureAnalysisDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a feature analysis record' })
  @ApiParam({ name: 'id', description: 'Feature analysis identifier.' })
  @ApiNoContentResponse({ description: 'Feature analysis deleted.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/generate?provider=gemini
   * Triggers AI generation and persists results.
   */
  @ApiOperation({ summary: 'Generate the full analysis pipeline for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiOkResponse({ description: 'Generation started and persisted.' })
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
  @ApiOperation({ summary: 'Resume a failed full pipeline run' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiOkResponse({ description: 'Pipeline resume triggered.' })
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
  @ApiOperation({ summary: 'Run a single pipeline step for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiParam({ name: 'step', description: 'Pipeline step number.', type: Number, example: 3 })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiBody({ type: RunFeatureAnalysisStepDto, required: false })
  @ApiOkResponse({ description: 'Pipeline step executed.' })
  @Post('feature/:featureId/run-step/:step')
  runStep(
    @Param('featureId') featureId: string,
    @Param('step', ParseIntPipe) step: number,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Body() body?: RunFeatureAnalysisStepDto,
  ) {
    return this.service.runStepForFeature(featureId, step, provider, model, body?.override, body?.promptAppend);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/run-step-1-section/:sublayer?provider=gemini
   * Re-runs a single sublayer of Step 1 (ssr-stories | mapping | validation).
   */
  @ApiOperation({ summary: 'Re-run one Step 1 sublayer' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiParam({
    name: 'sublayer',
    description: 'Step 1 sublayer to run.',
    enum: ['ssr-stories', 'mapping', 'validation'],
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiOkResponse({ description: 'Step 1 sublayer executed.' })
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
  @ApiOperation({ summary: 'Generate one Step 4 section' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiParam({
    name: 'section',
    description: 'Step 4 section to run.',
    enum: ['workflow-backend', 'frontend', 'testing', 'testing-backend', 'testing-frontend'],
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiBody({ type: PromptAppendDto, required: false })
  @ApiOkResponse({ description: 'Step 4 section generated.' })
  @Post('feature/:featureId/run-step-4-section/:section')
  runStep4Section(
    @Param('featureId') featureId: string,
    @Param('section') section: 'workflow-backend' | 'frontend' | 'testing' | 'testing-backend' | 'testing-frontend',
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Body() body?: PromptAppendDto,
  ) {
    return this.service.runStep4SectionForFeature(featureId, section, provider, model, body?.promptAppend);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/run-step-5-section/:section?provider=gemini
   * Generates one Step 5 section (backend|api alias | frontend | testing).
   */
  @ApiOperation({ summary: 'Generate one Step 5 section' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiParam({
    name: 'section',
    description: 'Step 5 section to run.',
    enum: ['backend', 'api', 'frontend', 'testing'],
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiBody({ type: PromptAppendDto, required: false })
  @ApiOkResponse({ description: 'Step 5 section generated.' })
  @Post('feature/:featureId/run-step-5-section/:section')
  runStep5Section(
    @Param('featureId') featureId: string,
    @Param('section') section: 'backend' | 'api' | 'frontend' | 'testing',
    @Query('provider') provider?: string,
    @Query('model') model?: string,
    @Body() body?: PromptAppendDto,
  ) {
    return this.service.runStep5SectionForFeature(featureId, section, provider, model, body?.promptAppend);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/resume-step1?provider=gemini&model=gemini-2.0-flash
   * Resumes Step 1 from the failed chunk.
   */
  @ApiOperation({ summary: 'Resume Step 1 after a failed chunk' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiOkResponse({ description: 'Step 1 resume triggered.' })
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
  @ApiOperation({ summary: 'Save edited pipeline step results without rerunning AI' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      additionalProperties: true,
      description: 'Arbitrary step results payload persisted for the feature.',
    },
  })
  @ApiOkResponse({ description: 'Step results saved.' })
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
  @ApiOperation({ summary: 'Extract sub-features from an SSR feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'model', required: false, description: 'Optional AI model override.' })
  @ApiOkResponse({ description: 'Extracted sub-features returned.' })
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
  @ApiOperation({ summary: 'List SSR sync warnings' })
  @ApiParam({ name: 'ssrId', description: 'SSR feature identifier.' })
  @ApiOkResponse({ description: 'SSR sync warnings returned.', type: SSRSyncWarningsResponseDto })
  @Get('ssr/:ssrId/sync-warnings')
  getSSRSyncWarnings(@Param('ssrId') ssrId: string) {
    return this.featureSync.getSSRSyncWarnings(ssrId);
  }

  /**
   * GET /api/feature-analysis/feature/:featureId/sync-status
   * Returns the current sync state for an extracted feature.
   */
  @ApiOperation({ summary: 'Get the sync status for an extracted feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Current sync status returned.', type: SyncStatusDto })
  @Get('feature/:featureId/sync-status')
  getSyncStatus(@Param('featureId') featureId: string) {
    return this.featureSync.getSyncStatus(featureId);
  }

  /**
   * POST /api/feature-analysis/feature/:featureId/sync/update
   * Re-syncs the extracted feature's content from its parent SSR.
   * Sets syncStatus = IN_SYNC.
   */
  @ApiOperation({ summary: 'Re-sync an extracted feature from its parent SSR' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiNoContentResponse({ description: 'Feature re-synced from SSR.' })
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
  @ApiOperation({ summary: 'Keep the current extracted feature and mark it diverged' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiNoContentResponse({ description: 'Feature kept and marked diverged.' })
  @Post('feature/:featureId/sync/keep')
  @HttpCode(HttpStatus.NO_CONTENT)
  syncKeep(@Param('featureId') featureId: string) {
    return this.featureSync.markDiverged(featureId);
  }

  /**
   * DELETE /api/feature-analysis/feature/:featureId/sync/remove
   * Deletes the extracted feature and all its related data.
   */
  @ApiOperation({ summary: 'Delete an extracted feature during sync resolution' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiNoContentResponse({ description: 'Extracted feature removed.' })
  @Delete('feature/:featureId/sync/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  syncRemove(@Param('featureId') featureId: string) {
    return this.featureSync.remove(featureId);
  }

  /**
   * GET /api/feature-analysis/feature/:featureId/token-usage
   * Returns token usage per pipeline step for the feature.
   */
  @ApiOperation({ summary: 'Get token usage per pipeline step for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Token usage per step returned.' })
  @Get('feature/:featureId/token-usage')
  getFeatureTokenUsage(@Param('featureId') featureId: string) {
    return this.tokenUsage.getFeatureTokenUsage(featureId);
  }
}
