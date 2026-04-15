import type { UserStory } from '../../../modules/ai/ai-provider.abstract';
import type { FeatureSyncStatus } from '@prisma/client';

/** IDs of requirements that changed between two SSR versions */
export interface ChangedRequirements {
  added: string[];    // IDs present in new version but not old (e.g. "US-08", "BR-05")
  removed: string[];  // IDs present in old version but not new
  modified: string[]; // IDs present in both versions but content differs
}

/** Story-level diff between two SSR Layer-1 outputs */
export interface StoryComparison {
  addedStories: UserStory[];
  removedStories: UserStory[];
  modifiedStories: Array<{ old: UserStory; new: UserStory }>;
}

/** Per-feature warning returned by the SSR publish endpoint */
export interface SyncWarning {
  featureId: string;
  featureCode: string;
  featureName: string;
  syncStatus: FeatureSyncStatus;
  changedRequirements: ChangedRequirements;
  /** Human-readable reasons, e.g. ["US-001 modified", "US-004 added"] */
  affectedReasons: string[];
}
