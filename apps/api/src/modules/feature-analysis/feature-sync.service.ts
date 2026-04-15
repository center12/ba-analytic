import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { SSRData, UserStories, UserStory } from '../ai/ai-provider.abstract';
import { buildExtractedFeatureName, storyToMarkdown } from './helpers/ssr-story.helpers';
import { ChangeDetectionService } from './change-detection.service';

@Injectable()
export class FeatureSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changeDetection: ChangeDetectionService,
  ) {}

  /**
   * Sync an extracted FEATURE's content from its parent SSR.
   * Re-derives content from the SSR's current Layer-1 output, then
   * updates the feature atomically and marks it IN_SYNC.
   */
  async updateFromSSR(featureId: string): Promise<void> {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    if (!feature.extractedFromSSRId) {
      throw new BadRequestException('Feature was not extracted from an SSR — cannot sync.');
    }

    const ssr = await this.prisma.feature.findUnique({
      where: { id: feature.extractedFromSSRId },
    });
    if (!ssr) throw new NotFoundException('Parent SSR feature not found.');
    if (!ssr.layer1Stories) {
      throw new BadRequestException(
        'Parent SSR has no Layer-1 data. Run Step 1 on the SSR first.',
      );
    }

    const parsedStories = JSON.parse(ssr.layer1Stories) as UserStories;
    const parsedSSR: SSRData | null = ssr.layer1SSR ? (JSON.parse(ssr.layer1SSR) as SSRData) : null;

    const featureReqIds = (feature.extractedRequirementIds as string[] | null) ?? [];

    // Find the matching story from the current SSR Layer-1 output
    const matchingStory = parsedStories.stories.find((s: UserStory) =>
      featureReqIds.includes(s.id),
    );

    if (!matchingStory) {
      throw new BadRequestException(
        `No story matching requirement IDs [${featureReqIds.join(', ')}] found in parent SSR. ` +
          'The requirement may have been removed. Use "keep" or "remove" instead.',
      );
    }

    const legacyAC = (feature.extractedRequirements as any)?.acceptanceCriteria as string[] ?? [];
    const newContent = storyToMarkdown(matchingStory, parsedSSR, legacyAC, ssr.name);
    const newName = buildExtractedFeatureName(ssr.code ?? ssr.id, matchingStory.id, matchingStory.action);

    await this.prisma.feature.update({
      where: { id: featureId },
      data: {
        name: newName,
        content: newContent,
        syncStatus: 'IN_SYNC',
        lastSyncedWithSSRAt: new Date(),
      },
    });
  }

  /**
   * Mark a feature as intentionally diverged from its parent SSR.
   * The feature content is kept as-is; future SSR updates will not
   * affect it unless the user explicitly chooses to update again.
   */
  async markDiverged(featureId: string): Promise<void> {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);

    await this.prisma.feature.update({
      where: { id: featureId },
      data: { syncStatus: 'DIVERGED' },
    });
  }

  /**
   * Delete an extracted feature and all its related data (cascade).
   */
  async remove(featureId: string): Promise<void> {
    const feature = await this.prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    await this.prisma.feature.delete({ where: { id: featureId } });
  }

  /**
   * After an SSR's Step 1 is re-run, compare old vs new stories and mark all
   * affected extracted features as OUT_OF_SYNC. Call this from the pipeline step runner.
   * No-op if there are no changes or no extracted features.
   */
  async markAffectedOutOfSync(ssrId: string, oldStories: UserStory[], newStories: UserStory[]): Promise<void> {
    const comparison = this.changeDetection.compareUserStories(oldStories, newStories);
    const changes = this.changeDetection.storyComparisonToChangedRequirements(comparison);
    const warnings = await this.changeDetection.findAffectedExtractedFeatures(ssrId, changes);
    if (warnings.length === 0) return;

    const affectedIds = warnings.map((w) => w.featureId);
    await this.prisma.feature.updateMany({
      where: { id: { in: affectedIds }, syncStatus: { not: 'DIVERGED' } },
      data: { syncStatus: 'OUT_OF_SYNC', syncChangeReason: 'story_changed' },
    });
  }

  /**
   * Return all extracted features for a given SSR that are currently OUT_OF_SYNC.
   * Used by the frontend warning dialog to show what needs attention.
   */
  async getSSRSyncWarnings(ssrId: string) {
    const features = await this.prisma.feature.findMany({
      where: { extractedFromSSRId: ssrId, syncStatus: 'OUT_OF_SYNC' },
      select: {
        id: true,
        code: true,
        name: true,
        syncStatus: true,
        syncChangeReason: true,
        extractedRequirementIds: true,
        lastSyncedWithSSRAt: true,
      },
    });
    return { ssrId, outOfSyncFeatures: features, hasConflicts: features.length > 0 };
  }

  /**
   * Return the current sync metadata for a feature.
   */
  async getSyncStatus(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      select: {
        id: true,
        code: true,
        name: true,
        syncStatus: true,
        extractedFromSSRId: true,
        extractedRequirementIds: true,
        lastSyncedWithSSRAt: true,
      },
    });
    if (!feature) throw new NotFoundException(`Feature ${featureId} not found`);
    return feature;
  }
}
