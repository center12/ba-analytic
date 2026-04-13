import type {
  ExtractedBehaviors,
  ExtractedRequirements,
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
} = AI_CONFIG;

export function compressUserStories(stories: UserStory[], max = MAX_STORIES): UserStory[] {
  return stories.slice(0, max);
}

export function compressForDownstream(
  req: ExtractedRequirements,
  beh: ExtractedBehaviors,
  userStories?: UserStory[],
): { req: ExtractedRequirements; beh: ExtractedBehaviors; stories?: UserStory[] } {
  return {
    req: {
      features: req.features.slice(0, MAX_FEATURES),
      businessRules: req.businessRules.slice(0, MAX_RULES),
      acceptanceCriteria: req.acceptanceCriteria.slice(0, MAX_CRITERIA),
      entities: req.entities.slice(0, MAX_ENTITIES),
    },
    beh: {
      feature: beh.feature,
      actors: beh.actors.slice(0, MAX_ACTORS),
      actions: beh.actions.slice(0, MAX_ACTIONS),
      rules: beh.rules.slice(0, MAX_BEH_RULES),
    },
    stories: userStories ? compressUserStories(userStories) : undefined,
  };
}
