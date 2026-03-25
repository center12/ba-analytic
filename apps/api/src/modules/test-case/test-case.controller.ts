import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
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
}
