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
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateFeatureDto, UpdateFeatureDto } from './dto/create-feature.dto';
import { UpsertPipelineConfigDto } from './dto/upsert-pipeline-config.dto';

@ApiTags('Projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List projects' })
  @ApiOkResponse({ description: 'Projects returned.' })
  @Get()
  findAll() {
    return this.service.findAllProjects();
  }

  @ApiOperation({ summary: 'Get a project by id' })
  @ApiParam({ name: 'id', description: 'Project identifier.' })
  @ApiOkResponse({ description: 'Project returned.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneProject(id);
  }

  @ApiOperation({ summary: 'Create a project' })
  @ApiBody({ type: CreateProjectDto })
  @ApiOkResponse({ description: 'Project created.' })
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.service.createProject(dto);
  }

  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'Project identifier.' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ description: 'Project updated.' })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.updateProject(id, dto);
  }

  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', description: 'Project identifier.' })
  @ApiNoContentResponse({ description: 'Project deleted.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.deleteProject(id);
  }

  // ── Features ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List features for a project' })
  @ApiParam({ name: 'projectId', description: 'Project identifier.' })
  @ApiOkResponse({ description: 'Features returned.' })
  @Get(':projectId/features')
  findAllFeatures(@Param('projectId') projectId: string) {
    return this.service.findAllFeatures(projectId);
  }

  @ApiOperation({ summary: 'Create a feature under a project' })
  @ApiParam({ name: 'projectId', description: 'Project identifier.' })
  @ApiBody({ type: CreateFeatureDto })
  @ApiOkResponse({ description: 'Feature created.' })
  @Post(':projectId/features')
  createFeature(
    @Param('projectId') projectId: string,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.service.createFeature(projectId, dto);
  }

  @ApiOperation({ summary: 'Get a feature by id' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Feature returned.' })
  @Get('features/:featureId')
  findOneFeature(@Param('featureId') featureId: string) {
    return this.service.findOneFeature(featureId);
  }

  @ApiOperation({ summary: 'Update a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiBody({ type: UpdateFeatureDto })
  @ApiOkResponse({ description: 'Feature updated.' })
  @Put('features/:featureId')
  updateFeature(
    @Param('featureId') featureId: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.service.updateFeature(featureId, dto);
  }

  @ApiOperation({ summary: 'Delete a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiNoContentResponse({ description: 'Feature deleted.' })
  @Delete('features/:featureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFeature(@Param('featureId') featureId: string) {
    return this.service.deleteFeature(featureId);
  }

  // ── Document Versioning ───────────────────────────────────────────────────

  @ApiOperation({ summary: 'Publish a feature document and snapshot its content' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Feature published.' })
  @Post('features/:featureId/publish')
  publishFeature(@Param('featureId') featureId: string) {
    return this.service.publishFeature(featureId);
  }

  @ApiOperation({ summary: 'Get the changelog for a published feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Feature changelog returned.' })
  @Get('features/:featureId/changelog')
  getFeatureChangelog(@Param('featureId') featureId: string) {
    return this.service.getFeatureChangelog(featureId);
  }

  // ── File Uploads ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Upload a screenshot for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Screenshot uploaded.' })
  @Post('features/:featureId/upload/screenshot')
  @UseInterceptors(FileInterceptor('file'))
  uploadScreenshot(
    @Param('featureId') featureId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadScreenshot(featureId, file);
  }

  // ── Pipeline Config ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get AI pipeline configuration for a project' })
  @ApiParam({ name: 'projectId', description: 'Project identifier.' })
  @ApiOkResponse({ description: 'Pipeline configuration returned.' })
  @Get(':projectId/pipeline-config')
  getPipelineConfig(@Param('projectId') projectId: string) {
    return this.service.getProjectPipelineConfig(projectId);
  }

  @ApiOperation({ summary: 'Upsert AI pipeline configuration for a project' })
  @ApiParam({ name: 'projectId', description: 'Project identifier.' })
  @ApiBody({ type: UpsertPipelineConfigDto })
  @ApiOkResponse({ description: 'Pipeline configuration upserted.' })
  @Put(':projectId/pipeline-config')
  upsertPipelineConfig(
    @Param('projectId') projectId: string,
    @Body() dto: UpsertPipelineConfigDto,
  ) {
    return this.service.upsertProjectPipelineConfig(projectId, dto);
  }

  @ApiOperation({ summary: 'Delete a single pipeline configuration step' })
  @ApiParam({ name: 'projectId', description: 'Project identifier.' })
  @ApiParam({ name: 'step', description: 'Pipeline step number.', type: Number, example: 2 })
  @ApiNoContentResponse({ description: 'Pipeline configuration step deleted.' })
  @Delete(':projectId/pipeline-config/:step')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePipelineConfigStep(
    @Param('projectId') projectId: string,
    @Param('step', ParseIntPipe) step: number,
  ) {
    return this.service.deleteProjectPipelineConfigStep(projectId, step);
  }
}
