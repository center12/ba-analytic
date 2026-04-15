import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateFeatureDto, UpdateFeatureDto } from './dto/create-feature.dto';
import { UpsertPipelineConfigDto } from './dto/upsert-pipeline-config.dto';
import { DocumentVersionService } from '../feature-analysis/document-version.service';
import { ChangeDetectionService } from '../feature-analysis/change-detection.service';
import { PipelineStepRunnerService } from '../feature-analysis/pipeline/pipeline-step-runner.service';
import type { UserStories } from '../ai/ai-provider.abstract';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { FeatureType } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
    private readonly documentVersion: DocumentVersionService,
    private readonly changeDetection: ChangeDetectionService,
    private readonly pipelineStepRunner: PipelineStepRunnerService,
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
    const { relatedFeatureIds, extractedRequirementIds, ...rest } = dto;
    return this.prisma.feature.create({
      data: {
        ...rest,
        projectId,
        featureType,
        code,
        ...(relatedFeatureIds !== undefined ? { relatedFeatureIds } : {}),
        ...(extractedRequirementIds !== undefined ? { extractedRequirementIds } : {}),
      },
    });
  }

  async updateFeature(id: string, dto: UpdateFeatureDto) {
    const feature = await this.findOneFeature(id);
    const { relatedFeatureIds, ...rest } = dto;

    // If content is being changed and the feature was PUBLISHED, revert to DRAFT
    const contentChanged = dto.content !== undefined && dto.content !== feature.content;
    const resetToDraft = contentChanged && feature.contentStatus === 'PUBLISHED';

    return this.prisma.feature.update({
      where: { id },
      data: {
        ...rest,
        ...(relatedFeatureIds !== undefined ? { relatedFeatureIds } : {}),
        ...(resetToDraft ? { contentStatus: 'DRAFT' } : {}),
      },
    });
  }

  async publishFeature(id: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) throw new NotFoundException(`Feature ${id} not found`);
    if (!feature.content?.trim()) {
      throw new BadRequestException('Cannot publish a feature with no content.');
    }

    const newVersion = feature.publishedVersion + 1;
    const previousContent = feature.publishedContent ?? null;
    const newContent = feature.content;
    const contentChanged = previousContent !== null && previousContent !== newContent;

    // Persist publish: snapshot content, bump version, mark PUBLISHED
    const [updated, changelogEntry] = await this.prisma.$transaction([
      this.prisma.feature.update({
        where: { id },
        data: {
          contentStatus: 'PUBLISHED',
          publishedVersion: newVersion,
          publishedContent: newContent,
        },
      }),
      this.prisma.featureChangelog.create({
        data: {
          featureId: id,
          version: newVersion,
          contentSnapshot: newContent,
          changeSummary: previousContent ? null : 'Initial publish',
          layerSnapshot: {
            layer1Stories: feature.layer1Stories,
            layer1SSR: feature.layer1SSR,
            layer1Mapping: feature.layer1Mapping,
            layer1Validation: feature.layer1Validation,
          },
        },
      }),
    ]);

    // For SSR features: intelligently detect and mark ONLY affected extracted features as OUT_OF_SYNC
    // Only when the content actually changed from the previous publish
    if (feature.featureType === 'SSR' && contentChanged) {
      const oldLayerData = await this.getLayerDataFromChangelog(id, newVersion);
      const newLayerData = {
        stories: feature.layer1Stories ? (JSON.parse(feature.layer1Stories) as UserStories) : null,
        ssrData: feature.layer1SSR ? JSON.parse(feature.layer1SSR) : null,
      };

      if (oldLayerData?.stories && newLayerData?.stories) {
        // Smart detection: compare old vs new stories and mark only affected features
        const comparison = this.changeDetection.compareUserStories(
          oldLayerData.stories.stories,
          newLayerData.stories.stories,
        );
        const changes = this.changeDetection.storyComparisonToChangedRequirements(comparison);
        const warnings = await this.changeDetection.findAffectedExtractedFeatures(id, changes);

        const affectedIds = warnings.map((w) => w.featureId);
        if (affectedIds.length > 0) {
          await this.prisma.feature.updateMany({
            where: { id: { in: affectedIds }, syncStatus: { not: 'DIVERGED' } },
            data: { syncStatus: 'OUT_OF_SYNC', syncChangeReason: 'document_published' },
          });
        }
      } else {
        // Fallback: layer1Stories not available (Step 1 not run yet) → mark all as safe default
        await this.prisma.feature.updateMany({
          where: {
            extractedFromSSRId: id,
            syncStatus: { not: 'DIVERGED' },
          },
          data: {
            syncStatus: 'OUT_OF_SYNC',
            syncChangeReason: 'document_published',
          },
        });
      }
    }

    // Trigger Step 1 if content has changed
    if (contentChanged) {
      void this.pipelineStepRunner.runStep1(id);
    }

    // Fire AI diff generation asynchronously — don't block the publish response
    if (previousContent) {
      void this.documentVersion.generateChangeSummary(changelogEntry.id, previousContent, newContent);
    }

    // Return changelog info if this is not the first publish
    const changelog = previousContent ? {
      id: changelogEntry.id,
      version: changelogEntry.version,
      changeSummary: changelogEntry.changeSummary,
      publishedAt: changelogEntry.publishedAt,
    } : null;

    return {
      feature: updated,
      changelog,
    };
  }

  async getFeatureChangelog(id: string) {
    await this.findOneFeature(id);
    return this.prisma.featureChangelog.findMany({
      where: { featureId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        featureId: true,
        version: true,
        changeSummary: true,
        publishedAt: true,
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

  /**
   * Retrieve the previous layer snapshot from the changelog to detect changes on next publish.
   * Returns null if no previous publish exists or no layer data was stored.
   */
  private async getLayerDataFromChangelog(featureId: string, currentVersion: number) {
    // Get the changelog entry from BEFORE current version to get previous layer state
    const previousChangelog = await this.prisma.featureChangelog.findFirst({
      where: {
        featureId,
        version: { lt: currentVersion },
      },
      orderBy: { version: 'desc' },
    });

    if (!previousChangelog) return null;

    const snapshot = (previousChangelog as any).layerSnapshot;
    if (!snapshot) return null;

    return {
      stories: snapshot.layer1Stories
        ? (JSON.parse(snapshot.layer1Stories) as UserStories)
        : null,
      ssrData: snapshot.layer1SSR
        ? JSON.parse(snapshot.layer1SSR)
        : null,
    };
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
