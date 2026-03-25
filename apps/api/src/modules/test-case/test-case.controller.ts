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
import { TestCaseService } from './test-case.service';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';

@Controller('test-cases')
export class TestCaseController {
  constructor(private readonly service: TestCaseService) {}

  @Get('feature/:featureId')
  findByFeature(@Param('featureId') featureId: string) {
    return this.service.findByFeature(featureId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestCaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  /**
   * POST /api/test-cases/feature/:featureId/generate?provider=gemini
   * Triggers AI generation and persists results.
   */
  @Post('feature/:featureId/generate')
  generate(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
  ) {
    return this.service.generateForFeature(featureId, provider);
  }

  /**
   * POST /api/test-cases/feature/:featureId/resume?provider=gemini
   * Continues a FAILED pipeline run from the chunk that failed.
   */
  @Post('feature/:featureId/resume')
  resume(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
  ) {
    return this.service.resumeForFeature(featureId, provider);
  }

  /**
   * POST /api/test-cases/feature/:featureId/run-step/:step?provider=gemini
   * Runs a single pipeline step (1–4) independently.
   */
  @Post('feature/:featureId/run-step/:step')
  runStep(
    @Param('featureId') featureId: string,
    @Param('step', ParseIntPipe) step: number,
    @Query('provider') provider?: string,
    @Body() body?: { override?: unknown },
  ) {
    return this.service.runStepForFeature(featureId, step, provider, body?.override);
  }

  /**
   * POST /api/test-cases/feature/:featureId/resume-step1?provider=gemini
   * Resumes Step 1 from the failed chunk.
   */
  @Post('feature/:featureId/resume-step1')
  resumeStep1(
    @Param('featureId') featureId: string,
    @Query('provider') provider?: string,
  ) {
    return this.service.resumeStep1ForFeature(featureId, provider);
  }

  /**
   * PATCH /api/test-cases/feature/:featureId/step-results
   * Saves user-edited step results without re-running AI.
   */
  @Patch('feature/:featureId/step-results')
  saveStepResults(
    @Param('featureId') featureId: string,
    @Body() body: unknown,
  ) {
    return this.service.saveStepResults(featureId, body);
  }
}
