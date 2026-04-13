import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateFeatureDto, UpdateFeatureDto } from './dto/create-feature.dto';
import { UpsertPipelineConfigDto } from './dto/upsert-pipeline-config.dto';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { FeatureType } from '@prisma/client';

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

  async updateProject(id: string, dto: UpdateProjectDto) {
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
        screenshots: true,
        _count: { select: { screenshots: true, featureAnalyses: true } },
      },
    });
  }

  async findOneFeature(id: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
      include: {
        screenshots: true,
        _count: { select: { featureAnalyses: true, chatSessions: true } },
      },
    });
    if (!feature) throw new NotFoundException(`Feature ${id} not found`);
    return feature;
  }

  async createFeature(projectId: string, dto: CreateFeatureDto) {
    await this.findOneProject(projectId);
    const featureType = dto.featureType ?? FeatureType.FEATURE;
    const code = await this.generateFeatureCode(projectId, featureType);
    const { relatedFeatureIds, ...rest } = dto;
    return this.prisma.feature.create({
      data: {
        ...rest,
        projectId,
        featureType,
        code,
        ...(relatedFeatureIds !== undefined ? { relatedFeatureIds } : {}),
      },
    });
  }

  async updateFeature(id: string, dto: UpdateFeatureDto) {
    await this.findOneFeature(id);
    const { relatedFeatureIds, ...rest } = dto;
    return this.prisma.feature.update({
      where: { id },
      data: {
        ...rest,
        ...(relatedFeatureIds !== undefined ? { relatedFeatureIds } : {}),
      },
    });
  }

  async deleteFeature(id: string) {
    await this.findOneFeature(id);
    return this.prisma.feature.delete({ where: { id } });
  }

  // ── File Uploads ──────────────────────────────────────────────────────────

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

  private async generateFeatureCode(projectId: string, featureType: FeatureType): Promise<string> {
    const prefix = featureType === FeatureType.SSR ? 'SSR' : 'FEA';
    const features = await this.prisma.feature.findMany({
      where: { projectId, featureType },
      select: { code: true },
    });

    const maxSequence = features.reduce((max, feature) => {
      const match = feature.code.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (!match) return max;
      return Math.max(max, Number.parseInt(match[1], 10));
    }, 0);

    return `${prefix}-${String(maxSequence + 1).padStart(3, '0')}`;
  }
}
