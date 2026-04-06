import { Feature, TestCase, DevPlan, DevTaskItem } from '@/lib/api';
import { StepStatus } from '../types/pipeline-wizard.types';

export function deriveStatus(
  stepNum: number,
  feature: Feature,
  testCaseCount: number,
  activeStep: number | null,
): StepStatus {
  const isDone =
    stepNum === 1 ? !!feature.extractedRequirements :
    stepNum === 2 ? !!feature.testScenarios :
    stepNum === 3 ? testCaseCount > 0 :
    stepNum === 4 ? !!feature.devPlanWorkflow :
    !!feature.devPromptApi;

  if (isDone) return 'completed';
  if (activeStep === stepNum) return 'running';
  if (feature.pipelineStep === stepNum && feature.pipelineStatus === 'FAILED') return 'failed';
  return 'idle';
}

export function arrToText(arr: string[]) {
  return arr.join('\n');
}

export function textToArr(text: string) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Markdown export helpers ───────────────────────────────────────────────────

export function downloadMarkdown(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function step1ToMarkdown(feature: Feature): string {
  const req = feature.extractedRequirements;
  const beh = feature.extractedBehaviors;
  if (!req && !beh) return '';

  const lines: string[] = [`# Requirements & Behaviors — ${feature.name}`, ''];

  if (req) {
    lines.push('## Requirements', '');
    if (req.features.length) {
      lines.push('### Features', '');
      req.features.forEach((f) => lines.push(`- ${f}`));
      lines.push('');
    }
    if (req.businessRules.length) {
      lines.push('### Business Rules', '');
      req.businessRules.forEach((r) => lines.push(`- ${r}`));
      lines.push('');
    }
    if (req.acceptanceCriteria.length) {
      lines.push('### Acceptance Criteria', '');
      req.acceptanceCriteria.forEach((c) => lines.push(`- ${c}`));
      lines.push('');
    }
    if (req.entities.length) {
      lines.push('### Entities', '');
      req.entities.forEach((e) => lines.push(`- ${e}`));
      lines.push('');
    }
  }

  if (beh) {
    lines.push('## Behaviors', '');
    lines.push(`**Feature:** ${beh.feature}`, '');
    if (beh.actors.length) {
      lines.push('### Actors', '');
      beh.actors.forEach((a) => lines.push(`- ${a}`));
      lines.push('');
    }
    if (beh.actions.length) {
      lines.push('### Actions', '');
      beh.actions.forEach((a) => lines.push(`- ${a}`));
      lines.push('');
    }
    if (beh.rules.length) {
      lines.push('### Rules', '');
      beh.rules.forEach((r) => lines.push(`- ${r}`));
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function step2ToMarkdown(feature: Feature): string {
  const scenarios = feature.testScenarios ?? [];
  if (!scenarios.length) return '';

  const lines: string[] = [`# Test Scenarios — ${feature.name}`, ''];
  lines.push('| # | Title | Type | Requirement Refs |');
  lines.push('|---|-------|------|-----------------|');
  scenarios.forEach((s, i) => {
    const refs = s.requirementRefs.join(', ');
    lines.push(`| ${i + 1} | ${s.title} | ${s.type} | ${refs} |`);
  });

  return lines.join('\n');
}

export function step3ToMarkdown(testCases: TestCase[], featureName: string): string {
  if (!testCases.length) return '';

  const lines: string[] = [`# Test Cases — ${featureName}`, ''];

  testCases.forEach((tc, i) => {
    lines.push(`## TC-${i + 1}: ${tc.title}`, '');
    lines.push(`**Priority:** ${tc.priority}  `);
    lines.push(`**Status:** ${tc.status}  `);
    if (tc.preconditions) lines.push(`**Preconditions:** ${tc.preconditions}`);
    lines.push('');
    if (tc.steps?.length) {
      lines.push('### Steps', '');
      lines.push('| # | Action | Expected Result |');
      lines.push('|---|--------|----------------|');
      tc.steps.forEach((step, si) => {
        lines.push(`| ${si + 1} | ${step.action} | ${step.expectedResult} |`);
      });
      lines.push('');
    }
  });

  return lines.join('\n');
}

export function step4ToMarkdown(feature: Feature): string {
  if (!feature.devPlanWorkflow) return '';

  let devPlan: DevPlan | null = null;
  try {
    devPlan = {
      workflow: JSON.parse(feature.devPlanWorkflow),
      backend:  JSON.parse(feature.devPlanBackend!),
      frontend: JSON.parse(feature.devPlanFrontend!),
      testing:  JSON.parse(feature.devPlanTesting!),
    };
  } catch {
    return '';
  }

  const lines: string[] = [`# Development Plan — ${feature.name}`, ''];

  lines.push('## Workflow', '');
  devPlan.workflow.forEach((step) => {
    lines.push(`${step.order}. **${step.title}** _(${step.actor})_`);
    lines.push(`   ${step.description}`);
    lines.push('');
  });

  lines.push('## Backend Architecture', '');
  lines.push('### Database', '');
  devPlan.backend.database.entities.forEach((entity) => {
    lines.push(`#### ${entity.name} (\`${entity.tableName}\`)`, '');
    if (entity.fields?.length) {
      lines.push('| Field | Type | PK | Nullable | Notes |');
      lines.push('|-------|------|----|---------|-------|');
      entity.fields.forEach((f) => {
        lines.push(`| ${f.name} | ${f.type} | ${f.isPrimaryKey ? '✓' : ''} | ${f.isNullable ? '✓' : ''} | ${f.description ?? ''} |`);
      });
      lines.push('');
    }
  });
  if (devPlan.backend.database.relationships.length) {
    lines.push('**Relationships:**', '');
    devPlan.backend.database.relationships.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  lines.push('### API Routes', '');
  devPlan.backend.apiRoutes.forEach((route) => {
    lines.push(`#### ${route.method} ${route.path}`, '');
    lines.push(route.description, '');
    if (route.params?.length) {
      lines.push('**Parameters:**', '');
      lines.push('| Name | In | Type | Required |');
      lines.push('|------|----|------|---------|');
      route.params.forEach((p) => {
        lines.push(`| ${p.name} | ${p.in} | ${p.type} | ${p.required ? 'yes' : 'no'} |`);
      });
      lines.push('');
    }
    if (route.jsonResponse) {
      lines.push('**Response:**', '');
      lines.push('```json');
      lines.push(route.jsonResponse);
      lines.push('```', '');
    }
  });

  lines.push('### Folder Structure', '');
  lines.push('```');
  devPlan.backend.folderStructure.forEach((p) => lines.push(p));
  lines.push('```', '');

  lines.push('## Frontend Architecture', '');
  const frontendSections: [string, string[]][] = [
    ['Components', devPlan.frontend.components],
    ['Pages', devPlan.frontend.pages],
    ['Store', devPlan.frontend.store],
    ['Hooks', devPlan.frontend.hooks],
    ['Utils', devPlan.frontend.utils],
    ['Services', devPlan.frontend.services],
  ];
  frontendSections.forEach(([label, items]) => {
    if (items.length) {
      lines.push(`### ${label}`, '');
      items.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }
  });

  lines.push('## Testing Plan', '');
  if (devPlan.testing.backendUnitTests.length) {
    lines.push('### Backend Unit Tests', '');
    devPlan.testing.backendUnitTests.forEach((t) => lines.push(`- ${t}`));
    lines.push('');
  }
  if (devPlan.testing.frontendTests.length) {
    lines.push('### Frontend Tests', '');
    devPlan.testing.frontendTests.forEach((t) => lines.push(`- ${t}`));
    lines.push('');
  }

  return lines.join('\n');
}

export function step5ToMarkdown(feature: Feature): string {
  const parseField = (val: string | undefined): DevTaskItem[] | null => {
    if (!val) return null;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as DevTaskItem[];
    } catch { /* not JSON — legacy string */ }
    return [{ title: 'Prompt', prompt: val }];
  };

  const lines: string[] = [`# Dev Prompts — ${feature.name}`, ''];

  const categories: [string, string | undefined][] = [
    ['API', feature.devPromptApi],
    ['Frontend', feature.devPromptFrontend],
    ['Testing', feature.devPromptTesting],
  ];

  categories.forEach(([label, val]) => {
    const items = parseField(val);
    if (!items) return;
    lines.push(`## ${label}`, '');
    items.forEach((item) => {
      lines.push(`### ${item.title}`, '');
      lines.push('```');
      lines.push(item.prompt);
      lines.push('```', '');
    });
  });

  return lines.join('\n');
}
