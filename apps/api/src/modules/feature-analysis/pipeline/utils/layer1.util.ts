import type {
  CombinedExtraction,
  ExtractedBehaviors,
  ExtractedRequirements,
  Layer1ABPartial,
  SSRData,
  UserStories,
  UserStory,
} from '../../../ai/ai-provider.abstract';
import { AI_CONFIG } from '../../constants/feature-analysis.constants';

const {
  MAX_FEATURES,
  MAX_RULES,
  MAX_CRITERIA,
  MAX_ENTITIES,
  MAX_ACTORS,
  MAX_ACTIONS,
  MAX_BEH_RULES,
  MAX_STORIES,
  MAX_SSR_RULES,
  MAX_CONSTRAINTS,
  MAX_GLOBAL_POLICIES,
} = AI_CONFIG;

export function mergeExtractions(extractions: CombinedExtraction[]): CombinedExtraction {
  const dedup = (items: string[]) => [...new Set(items)];
  return {
    requirements: {
      features: dedup(extractions.flatMap((entry) => entry.requirements.features)).slice(0, MAX_FEATURES),
      businessRules: dedup(extractions.flatMap((entry) => entry.requirements.businessRules)).slice(0, MAX_RULES),
      acceptanceCriteria: dedup(extractions.flatMap((entry) => entry.requirements.acceptanceCriteria)).slice(0, MAX_CRITERIA),
      entities: dedup(extractions.flatMap((entry) => entry.requirements.entities)).slice(0, MAX_ENTITIES),
    },
    behaviors: {
      feature: extractions[0].behaviors.feature,
      actors: dedup(extractions.flatMap((entry) => entry.behaviors.actors)).slice(0, MAX_ACTORS),
      actions: dedup(extractions.flatMap((entry) => entry.behaviors.actions)).slice(0, MAX_ACTIONS),
      rules: dedup(extractions.flatMap((entry) => entry.behaviors.rules)).slice(0, MAX_BEH_RULES),
    },
  };
}

export function mergeLayer1AB(parts: Layer1ABPartial[]): Layer1ABPartial {
  if (parts.length === 0) {
    throw new Error('mergeLayer1AB: no parts to merge');
  }

  const dedup = (items: string[]) => [...new Set(items)];
  const first = parts[0];

  const ssr: SSRData = {
    featureName: first.ssr.featureName,
    systemRules: dedup(parts.flatMap((part) => part.ssr.systemRules)).slice(0, MAX_SSR_RULES),
    businessRules: dedup(parts.flatMap((part) => part.ssr.businessRules)).slice(0, MAX_RULES),
    constraints: dedup(parts.flatMap((part) => part.ssr.constraints)).slice(0, MAX_CONSTRAINTS),
    globalPolicies: dedup(parts.flatMap((part) => part.ssr.globalPolicies)).slice(0, MAX_GLOBAL_POLICIES),
    entities: dedup(parts.flatMap((part) => part.ssr.entities)).slice(0, MAX_ENTITIES),
  };

  const storyMap = new Map<string, UserStory>();
  for (const part of parts) {
    for (const story of part.stories.stories) {
      storyMap.set(story.id, story);
    }
  }

  const stories: UserStories = {
    featureName: first.stories.featureName,
    stories: [...storyMap.values()].slice(0, MAX_STORIES),
  };

  return { ssr, stories };
}

export function layer1ToLegacy(
  ssr: SSRData,
  storiesData: UserStories,
): { requirements: ExtractedRequirements; behaviors: ExtractedBehaviors } {
  const requirements: ExtractedRequirements = {
    features: storiesData.stories.map((story: UserStory) => `${story.id}: As a ${story.actor}, I want ${story.action}`),
    businessRules: [...ssr.businessRules, ...ssr.constraints],
    acceptanceCriteria: storiesData.stories.flatMap((story: UserStory) => story.acceptanceCriteria),
    entities: ssr.entities,
  };

  const behaviors: ExtractedBehaviors = {
    feature: ssr.featureName,
    actors: [...new Set(storiesData.stories.map((story: UserStory) => story.actor))],
    actions: storiesData.stories.map((story: UserStory) => story.action),
    rules: [...ssr.systemRules, ...ssr.businessRules, ...ssr.globalPolicies],
  };

  return { requirements, behaviors };
}
