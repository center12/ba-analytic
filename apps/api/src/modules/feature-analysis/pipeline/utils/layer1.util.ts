import type {
  CombinedExtraction,
  ExtractedBehaviors,
  ExtractedRequirements,
  Layer1ABPartial,
  Mapping,
  RuleStoryLink,
  SSRData,
  UserStories,
  UserStory,
} from '../../../ai/ai-provider.abstract';
import { extractAcceptanceCriteriaIds, extractAnyRuleId } from '../../../ai/ai-provider.abstract';
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

type CanonicalRule = {
  ruleId: string;
  ruleText: string;
};

const RULE_ID_PATTERN = /\b(?:SYS|BR|VR|AC|GP)-\d+\b/gi;

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
      storyMap.set(story.id, normalizeUserStory(story));
    }
  }

  const stories: UserStories = {
    featureName: first.stories.featureName,
    stories: [...storyMap.values()].slice(0, MAX_STORIES),
  };

  return { ssr, stories };
}

export function normalizeUserStory(story: UserStory): UserStory {
  return {
    ...story,
    acceptanceCriteria: extractAcceptanceCriteriaIds(story.acceptanceCriteria),
    relatedRuleIds: dedupe(
      story.relatedRuleIds.flatMap((item) => item.match(RULE_ID_PATTERN) ?? []).map((item) => item.toUpperCase()),
    ),
  };
}

export function normalizeUserStories(storiesData: UserStories): UserStories {
  return {
    ...storiesData,
    stories: storiesData.stories.map(normalizeUserStory),
  };
}

export function buildCanonicalRuleInventory(ssr: SSRData): CanonicalRule[] {
  return [
    ...ssr.systemRules.map((ruleText) => ({ ruleId: extractAnyRuleId(ruleText, 'SYS'), ruleText })),
    ...ssr.businessRules.map((ruleText) => ({ ruleId: extractAnyRuleId(ruleText, 'BR'), ruleText })),
    ...ssr.constraints.map((ruleText) => ({ ruleId: extractAnyRuleId(ruleText, 'VR'), ruleText })),
    ...ssr.globalPolicies.map((ruleText, index) => ({ ruleId: `GP-${String(index + 1).padStart(2, '0')}`, ruleText })),
  ];
}

export function normalizeMapping(mapping: Mapping | null | undefined, ssr: SSRData, storiesData: UserStories): Mapping {
  const canonicalRules = buildCanonicalRuleInventory(ssr);
  const validStoryIds = new Set(storiesData.stories.map((story) => story.id));
  const inputLinks = mapping?.links ?? [];

  const links: RuleStoryLink[] = canonicalRules.map((rule) => {
    const matched = inputLinks.find((link) => normalizeId(link.ruleId) === normalizeId(rule.ruleId))
      ?? inputLinks.find((link) => link.ruleText.trim() === rule.ruleText.trim());
    const storyIds = dedupe((matched?.storyIds ?? []).filter((storyId) => validStoryIds.has(storyId)));
    const coverage: RuleStoryLink['coverage'] =
      storyIds.length === 0 ? 'none' : matched?.coverage === 'partial' ? 'partial' : 'full';

    return {
      ruleId: rule.ruleId,
      ruleText: matched?.ruleText?.trim() || rule.ruleText,
      storyIds,
      coverage,
    };
  });

  const uncoveredRules = links.filter((link) => link.coverage === 'none').map((link) => link.ruleId);
  const coveredStoryIds = new Set(links.flatMap((link) => link.storyIds));
  const storiesWithNoRules = storiesData.stories
    .map((story) => story.id)
    .filter((storyId) => !coveredStoryIds.has(storyId));

  return { links, uncoveredRules, storiesWithNoRules };
}

export function extractAcceptanceCriteriaFromMarkdown(markdown: string): string[] {
  const lines = markdown.split('\n');
  const rows: string[] = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isAcceptanceCriteriaHeader(lines[index]) || !isMarkdownTableDivider(lines[index + 1])) continue;

    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const line = lines[rowIndex].trim();
      if (!line.startsWith('|')) break;
      const columns = line
        .split('|')
        .slice(1, -1)
        .map((column) => column.trim());
      if (columns.length < 4 || !/^AC-\d+$/i.test(columns[0])) continue;

      rows.push(`${columns[0].toUpperCase()}: Given ${columns[1]}, When ${columns[2]}, Then ${columns[3]}`);
    }
  }

  return dedupe(rows).slice(0, MAX_CRITERIA);
}

export function layer1ToLegacy(
  ssr: SSRData,
  storiesData: UserStories,
  acceptanceCriteriaText: string[] = [],
): { requirements: ExtractedRequirements; behaviors: ExtractedBehaviors } {
  const normalizedStories = normalizeUserStories(storiesData);
  const requirements: ExtractedRequirements = {
    features: normalizedStories.stories.map((story: UserStory) => `${story.id}: As a ${story.actor}, I want ${story.action}`),
    businessRules: [...ssr.businessRules, ...ssr.constraints],
    acceptanceCriteria: dedupe(acceptanceCriteriaText).slice(0, MAX_CRITERIA),
    entities: ssr.entities,
  };

  const behaviors: ExtractedBehaviors = {
    feature: ssr.featureName,
    actors: [...new Set(normalizedStories.stories.map((story: UserStory) => story.actor))],
    actions: normalizedStories.stories.map((story: UserStory) => story.action),
    rules: [...ssr.systemRules, ...ssr.businessRules, ...ssr.globalPolicies],
  };

  return { requirements, behaviors };
}

function dedupe(items: string[]) {
  return [...new Set(items)];
}

function normalizeId(value: string) {
  return value.trim().toUpperCase();
}

function isAcceptanceCriteriaHeader(line: string) {
  const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.includes('| id |') && normalized.includes('| given |') && normalized.includes('| when |') && normalized.includes('| then |');
}

function isMarkdownTableDivider(line: string) {
  return /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}
