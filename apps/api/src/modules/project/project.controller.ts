import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateFeatureDto, UpdateFeatureDto } from './dto/create-feature.dto';
import { UpsertPipelineConfigDto } from './dto/upsert-pipeline-config.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.service.findAllProjects();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneProject(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.service.createProject(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.updateProject(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.deleteProject(id);
  }

  // ── Features ──────────────────────────────────────────────────────────────

  @Get(':projectId/features')
  findAllFeatures(@Param('projectId') projectId: string) {
    return this.service.findAllFeatures(projectId);
  }

  @Post(':projectId/features')
  createFeature(
    @Param('projectId') projectId: string,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.service.createFeature(projectId, dto);
  }

  @Get('features/:featureId')
  findOneFeature(@Param('featureId') featureId: string) {
    return this.service.findOneFeature(featureId);
  }

  @Put('features/:featureId')
  updateFeature(
    @Param('featureId') featureId: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.service.updateFeature(featureId, dto);
  }

  @Delete('features/:featureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFeature(@Param('featureId') featureId: string) {
    return this.service.deleteFeature(featureId);
  }

  // ── Document Versioning ───────────────────────────────────────────────────

  @Post('features/:featureId/publish')
  publishFeature(@Param('featureId') featureId: string) {
    return this.service.publishFeature(featureId);
  }

  @Get('features/:featureId/changelog')
  getFeatureChangelog(@Param('featureId') featureId: string) {
    return this.service.getFeatureChangelog(featureId);
  }

  // ── File Uploads ──────────────────────────────────────────────────────────

  @Post('features/:featureId/upload/screenshot')
  @UseInterceptors(FileInterceptor('file'))
  uploadScreenshot(
    @Param('featureId') featureId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadScreenshot(featureId, file);
  }

  // ── Pipeline Config ───────────────────────────────────────────────────────

  @Get(':projectId/pipeline-config')
  getPipelineConfig(@Param('projectId') projectId: string) {
    return this.service.getProjectPipelineConfig(projectId);
  }

  @Put(':projectId/pipeline-config')
  upsertPipelineConfig(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertPipelineConfigDto,
  ) {
    return this.service.upsertProjectPipelineConfig(projectId, dto);
  }

  @Delete(':projectId/pipeline-config/:step')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePipelineConfigStep(
    @Param('projectId') projectId: string,
    @Param('step', ParseIntPipe) step: number,
  ) {
    return this.service.deleteProjectPipelineConfigStep(projectId, step);
  }
}
