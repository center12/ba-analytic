import type { SSRData, UserStory } from '../../ai/ai-provider.abstract';

/** Extract a requirement ID (e.g. "FR-01") from a text string, returns null if none found. */
export function extractPrefixedId(text: string): string | null {
  const match = text.match(/\b([A-Z]{2,}-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

/** Filter items array to only those whose embedded ID appears in the given ids set. */
export function filterItemsByIds(items: string[], ids: string[]): string[] {
  const idSet = new Set(ids.map((id) => id.toUpperCase()));
  return items.filter((item) => {
    const extracted = extractPrefixedId(item);
    return extracted ? idSet.has(extracted) : false;
  });
}

/** Build the canonical feature name for an extracted sub-feature. */
export function buildExtractedFeatureName(
  featureCode: string,
  storyId: string,
  fullName?: string,
): string {
  const normalized = fullName?.trim();
  return normalized ? `${featureCode}-${storyId}: ${normalized}` : `${featureCode}-${storyId}`;
}

/**
 * Render a UserStory as a full Markdown feature document.
 * Mirrors the content structure expected by the pipeline.
 */
export function storyToMarkdown(
  story: UserStory,
  ssr: SSRData | null,
  legacyAcceptanceCriteria: string[],
  parentFeatureName: string,
): string {
  const lines: string[] = [];
  const relatedRuleIds = story.relatedRuleIds ?? [];
  const acIds = story.acceptanceCriteria ?? [];
  const allConstraints = ssr?.constraints ?? [];

  const validationRules = filterItemsByIds(
    allConstraints.filter((item) => /\bVR-\d+\b/i.test(item)),
    relatedRuleIds,
  );

  const acConstraintItems = allConstraints.filter((item) => /\bAC-\d+\b/i.test(item));
  const acFromConstraints =
    acIds.length > 0 ? filterItemsByIds(acConstraintItems, acIds) : acConstraintItems;
  const acFromLegacy =
    acIds.length > 0 ? filterItemsByIds(legacyAcceptanceCriteria, acIds) : [];
  const acceptanceCriteria = acFromConstraints.length > 0 ? acFromConstraints : acFromLegacy;

  const functionalRequirements = filterItemsByIds(ssr?.functionalRequirements ?? [], relatedRuleIds);
  const businessRules = filterItemsByIds(ssr?.businessRules ?? [], relatedRuleIds);
  const systemRules = filterItemsByIds(ssr?.systemRules ?? [], relatedRuleIds);
  const globalPolicies = filterItemsByIds(ssr?.globalPolicies ?? [], relatedRuleIds);

  lines.push(`# ${story.action}`, '');
  lines.push('## Overview', '');
  lines.push(`${story.actor} needs to ${story.action} so that ${story.benefit}.`, '');

  lines.push('## Actors', '');
  lines.push('| Actor | Role |');
  lines.push('| :--- | :--- |');
  lines.push(`| ${story.actor} | Performs this feature (priority: ${story.priority}) |`);
  lines.push('');

  lines.push('## User Stories', '');
  lines.push(
    `* **${story.id}**: As a ${story.actor}, I want to ${story.action} so that ${story.benefit}.`,
  );
  lines.push('');

  lines.push('## Functional Requirements', '');
  if (functionalRequirements.length) {
    functionalRequirements.forEach((item) => lines.push(`* ${item}`));
  } else {
    lines.push('*(none identified — see parent SSR)*');
  }
  lines.push('');

  lines.push('## Business Rules', '');
  if (businessRules.length) {
    businessRules.forEach((item) => lines.push(`* ${item}`));
  } else {
    lines.push('*(none identified — see parent SSR)*');
  }
  lines.push('');

  lines.push('## Acceptance Criteria', '');
  if (acceptanceCriteria.length) {
    lines.push('| ID | Description |');
    lines.push('| :--- | :--- |');
    acceptanceCriteria.forEach((item) => {
      const id = extractPrefixedId(item) ?? '—';
      const desc = item.replace(/\b[A-Z]{2,}-\d+\b:?\s*/i, '').trim() || item;
      lines.push(`| ${id} | ${desc} |`);
    });
  } else if (acIds.length) {
    lines.push('| ID | Given | When | Then |');
    lines.push('| :--- | :--- | :--- | :--- |');
    acIds.forEach((acId) =>
      lines.push(`| ${acId} | *(see parent SSR)* | *(see parent SSR)* | *(see parent SSR)* |`),
    );
  } else {
    lines.push('*(none specified)*');
  }
  lines.push('');

  if (ssr?.entities?.length) {
    lines.push('## Data Entities', '');
    lines.push('*(Referenced from parent SSR — see source document for full field definitions.)*', '');
    ssr.entities.forEach((entity) => lines.push(`- ${entity}`));
    lines.push('');
  }

  lines.push('## Validation Rules', '');
  if (validationRules.length) {
    validationRules.forEach((item) => lines.push(`* ${item}`));
  } else {
    lines.push('*(none identified — see parent SSR)*');
  }
  lines.push('');

  lines.push('## System Rules', '');
  if (systemRules.length) {
    systemRules.forEach((item) => lines.push(`* ${item}`));
  } else {
    lines.push('*(none identified — see parent SSR)*');
  }
  lines.push('');

  if (globalPolicies.length) {
    lines.push('## Global Policies', '');
    globalPolicies.forEach((item) => lines.push(`* ${item}`));
    lines.push('');
  }

  lines.push('## Assumptions & Dependencies', '');
  lines.push(
    `* **Dependencies**: Derived from SSR "${parentFeatureName}" — refer to the parent SSR for complete context.`,
  );
  if (relatedRuleIds.length) {
    lines.push(`* **Assumptions**: Traceability to ${relatedRuleIds.join(', ')}.`);
  }
  lines.push('');

  return lines.join('\n');
}
