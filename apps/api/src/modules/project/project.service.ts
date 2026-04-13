import * as path from 'path';
import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpsertPipelineConfigDto } from './dto/upsert-pipeline-config.dto';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  async findAllProjects() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { features: true } } },
    });
  }

  async findOneProject(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { features: { orderBy: { createdAt: 'desc' } } },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async createProject(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: dto });
  }

  async updateProject(id: string, dto: Partial<CreateProjectDto>) {
    await this.findOneProject(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async deleteProject(id: string) {
    await this.findOneProject(id);
    return this.prisma.project.delete({ where: { id } });
  }

  // ── Features ──────────────────────────────────────────────────────────────

  async findAllFeatures(projectId: string) {
    await this.findOneProject(projectId);
    return this.prisma.feature.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        baDocument: true,
        _count: { select: { screenshots: true, featureAnalyses: true } },
      },
    });
  }

  async findOneFeature(id: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
      include: {
        baDocument: true,
        screenshots: true,
        _count: { select: { featureAnalyses: true, chatSessions: true } },
      },
    });
    if (!feature) throw new NotFoundException(`Feature ${id} not found`);
    return feature;
  }

  async createFeature(projectId: string, dto: CreateFeatureDto) {
    await this.findOneProject(projectId);
    return this.prisma.feature.create({ data: { ...dto, projectId } });
  }

  async updateFeature(id: string, dto: Partial<CreateFeatureDto>) {
    await this.findOneFeature(id);
    return this.prisma.feature.update({ where: { id }, data: dto });
  }

  async deleteFeature(id: string) {
    await this.findOneFeature(id);
    return this.prisma.feature.delete({ where: { id } });
  }

  // ── File Uploads ──────────────────────────────────────────────────────────

  async uploadBADocument(featureId: string, file: Express.Multer.File) {
    await this.findOneFeature(featureId);
    if (path.extname(file.originalname).toLowerCase() !== '.md')
      throw new BadRequestException('Only Markdown (.md) files are accepted');
    const ext = 'md';
    const key = `features/${featureId}/ba-document/${uuidv4()}.${ext}`;
    await this.storage.upload(file.buffer, key, file.mimetype);

    return this.prisma.bADocument.upsert({
      where: { featureId },
      update: { originalName: file.originalname, storageKey: key, mimeType: file.mimetype },
      create: { featureId, originalName: file.originalname, storageKey: key, mimeType: file.mimetype },
    });
  }

  async uploadScreenshot(featureId: string, file: Express.Multer.File) {
    await this.findOneFeature(featureId);
    const ext = mime.extension(file.mimetype) || 'bin';
    const key = `features/${featureId}/screenshots/${uuidv4()}.${ext}`;
    await this.storage.upload(file.buffer, key, file.mimetype);

    return this.prisma.screenshot.create({
      data: { featureId, originalName: file.originalname, storageKey: key, mimeType: file.mimetype },
    });
  }

  // ── Pipeline Config ───────────────────────────────────────────────────────

  async getProjectPipelineConfig(projectId: string) {
    await this.findOneProject(projectId);
    return this.prisma.projectPipelineConfig.findMany({
      where: { projectId },
      orderBy: { step: 'asc' },
    });
  }

  async upsertProjectPipelineConfig(projectId: string, dto: UpsertPipelineConfigDto) {
    await this.findOneProject(projectId);
    return this.prisma.$transaction(
      dto.configs.map((c) =>
        this.prisma.projectPipelineConfig.upsert({
          where: { projectId_step: { projectId, step: c.step } },
          create: { projectId, step: c.step, provider: c.provider, model: c.model ?? null },
          update: { provider: c.provider, model: c.model ?? null },
        }),
      ),
    );
  }

  async deleteProjectPipelineConfigStep(projectId: string, step: number) {
    await this.findOneProject(projectId);
    return this.prisma.projectPipelineConfig.deleteMany({ where: { projectId, step } });
  }
}
