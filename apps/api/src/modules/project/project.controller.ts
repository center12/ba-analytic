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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';

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
  update(@Param('id') id: string, @Body() dto: CreateProjectDto) {
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
    @Body() dto: CreateFeatureDto,
  ) {
    return this.service.updateFeature(featureId, dto);
  }

  @Delete('features/:featureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFeature(@Param('featureId') featureId: string) {
    return this.service.deleteFeature(featureId);
  }

  // ── File Uploads ──────────────────────────────────────────────────────────

  @Post('features/:featureId/upload/ba-document')
  @UseInterceptors(FileInterceptor('file'))
  uploadBADocument(
    @Param('featureId') featureId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadBADocument(featureId, file);
  }

  @Post('features/:featureId/upload/screenshot')
  @UseInterceptors(FileInterceptor('file'))
  uploadScreenshot(
    @Param('featureId') featureId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadScreenshot(featureId, file);
  }
}
