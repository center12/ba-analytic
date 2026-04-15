import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { SSRData, UserStory } from '../ai/ai-provider.abstract';
import type { ChangedRequirements, StoryComparison, SyncWarning } from './helpers/change-detection.types';

@Injectable()
export class ChangeDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract all requirement IDs from an SSRData object.
   * Scans functionalRequirements, businessRules, systemRules, constraints, globalPolicies.
   * Returns unique sorted IDs like ["AC-01", "BR-01", "FR-01", "SYS-01", "VR-01"].
   */
  extractRequirementIds(ssr: SSRData): string[] {
    const allText = [
      ...ssr.functionalRequirements,
      ...ssr.businessRules,
      ...ssr.systemRules,
      ...ssr.constraints,
      ...ssr.globalPolicies,
    ].join(' ');

    const matches = allText.match(/\b([A-Z]{2,}-\d+)\b/g) ?? [];
    return Array.from(new Set(matches)).sort();
  }

  /**
   * Extract all user story IDs from a UserStory array.
   * Returns IDs like ["US-01", "US-02"].
   */
  extractStoryIds(stories: UserStory[]): string[] {
    return stories.map((s) => s.id);
  }

  /**
   * Compare two UserStory arrays (old vs new) and return what changed.
   * Stories are matched by their `id` field.
   */
  compareUserStories(oldStories: UserStory[], newStories: UserStory[]): StoryComparison {
    const oldMap = new Map(oldStories.map((s) => [s.id, s]));
    const newMap = new Map(newStories.map((s) => [s.id, s]));

    const addedStories: UserStory[] = [];
    const removedStories: UserStory[] = [];
    const modifiedStories: Array<{ old: UserStory; new: UserStory }> = [];

    // Find added and modified
    for (const [id, newStory] of newMap) {
      const oldStory = oldMap.get(id);
      if (!oldStory) {
        addedStories.push(newStory);
      } else if (this.isStoryModified(oldStory, newStory)) {
        modifiedStories.push({ old: oldStory, new: newStory });
      }
    }

    // Find removed
    for (const [id, oldStory] of oldMap) {
      if (!newMap.has(id)) {
        removedStories.push(oldStory);
      }
    }

    return { addedStories, removedStories, modifiedStories };
  }

  /**
   * Derive ChangedRequirements from a StoryComparison.
   * Maps story-level changes to flat requirement ID arrays.
   */
  storyComparisonToChangedRequirements(comparison: StoryComparison): ChangedRequirements {
    return {
      added: comparison.addedStories.map((s) => s.id),
      removed: comparison.removedStories.map((s) => s.id),
      modified: comparison.modifiedStories.map((s) => s.new.id),
    };
  }

  /**
   * Given a parent SSR id and a set of changed requirement IDs, return all
   * extracted FEATURE records whose extractedRequirementIds overlap with the changes.
   */
  async findAffectedExtractedFeatures(
    ssrId: string,
    changes: ChangedRequirements,
  ): Promise<SyncWarning[]> {
    const changedIds = new Set([...changes.added, ...changes.removed, ...changes.modified]);
    if (changedIds.size === 0) return [];

    const extractedFeatures = await this.prisma.feature.findMany({
      where: { extractedFromSSRId: ssrId },
      select: {
        id: true,
        code: true,
        name: true,
        syncStatus: true,
        extractedRequirementIds: true,
      },
    });

    const warnings: SyncWarning[] = [];

    for (const feature of extractedFeatures) {
      const featureReqIds = (feature.extractedRequirementIds as string[] | null) ?? [];
      const affectedReasons: string[] = [];

      for (const reqId of featureReqIds) {
        if (changes.added.includes(reqId)) {
          affectedReasons.push(`${reqId} added`);
        } else if (changes.removed.includes(reqId)) {
          affectedReasons.push(`${reqId} removed`);
        } else if (changes.modified.includes(reqId)) {
          affectedReasons.push(`${reqId} modified`);
        }
      }

      if (affectedReasons.length > 0) {
        // Determine the subset of changes relevant to this feature
        const featureReqSet = new Set(featureReqIds);
        warnings.push({
          featureId: feature.id,
          featureCode: feature.code,
          featureName: feature.name,
          syncStatus: feature.syncStatus,
          changedRequirements: {
            added: changes.added.filter((id) => featureReqSet.has(id)),
            removed: changes.removed.filter((id) => featureReqSet.has(id)),
            modified: changes.modified.filter((id) => featureReqSet.has(id)),
          },
          affectedReasons,
        });
      }
    }

    return warnings;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private isStoryModified(oldStory: UserStory, newStory: UserStory): boolean {
    return (
      oldStory.action !== newStory.action ||
      oldStory.actor !== newStory.actor ||
      oldStory.benefit !== newStory.benefit ||
      oldStory.priority !== newStory.priority ||
      JSON.stringify(oldStory.acceptanceCriteria) !== JSON.stringify(newStory.acceptanceCriteria) ||
      JSON.stringify(oldStory.relatedRuleIds) !== JSON.stringify(newStory.relatedRuleIds)
    );
  }
}
