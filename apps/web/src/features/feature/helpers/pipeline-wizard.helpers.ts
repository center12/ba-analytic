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

  if (devPlan.backend.featureOverview) {
    lines.push('### Feature Overview', '');
    lines.push(devPlan.backend.featureOverview, '');
  }

  lines.push('### Database', '');
  devPlan.backend.database.entities.forEach((entity) => {
    const softDeleteNote = entity.softDelete ? ' _(soft-delete)_' : '';
    lines.push(`#### ${entity.name} (\`${entity.tableName}\`)${softDeleteNote}`, '');
    if (entity.fields?.length) {
      lines.push('| Field | Type | PK | Nullable | Notes |');
      lines.push('|-------|------|----|---------|-------|');
      entity.fields.forEach((f) => {
        lines.push(`| ${f.name} | ${f.type} | ${f.isPrimaryKey ? '✓' : ''} | ${f.isNullable ? '✓' : ''} | ${f.description ?? ''} |`);
      });
      lines.push('');
    }
    if (entity.indexes?.length) {
      lines.push('**Indexes:**', '');
      entity.indexes.forEach((idx) => lines.push(`- \`${idx}\``));
      lines.push('');
    }
    if (entity.constraints?.length) {
      lines.push('**Constraints:**', '');
      entity.constraints.forEach((c) => lines.push(`- \`${c}\``));
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
    if (route.requestBody) {
      lines.push('**Request Body:**', '');
      lines.push('```json');
      lines.push(route.requestBody);
      lines.push('```', '');
    }
    if (route.jsonResponse) {
      lines.push('**Response:**', '');
      lines.push('```json');
      lines.push(route.jsonResponse);
      lines.push('```', '');
    }
    if (route.errorCases?.length) {
      lines.push('**Error Cases:**', '');
      route.errorCases.forEach((e) => lines.push(`- ${e}`));
      lines.push('');
    }
  });

  if (devPlan.backend.businessLogicFlow?.length) {
    lines.push('### Business Logic Flow', '');
    devPlan.backend.businessLogicFlow.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('');
  }

  if (devPlan.backend.queryDesign?.length) {
    lines.push('### Query Design', '');
    devPlan.backend.queryDesign.forEach((q) => {
      const paginatedNote = q.isPaginated ? ' _(cursor-paginated)_' : '';
      lines.push(`#### ${q.name}${paginatedNote}`, '');
      lines.push('```sql');
      lines.push(q.sql);
      lines.push('```', '');
    });
  }

  if (devPlan.backend.transactions?.length) {
    lines.push('### Transactions', '');
    lines.push('| Operation | Reason |');
    lines.push('|-----------|--------|');
    devPlan.backend.transactions.forEach((t) => lines.push(`| ${t.where} | ${t.why} |`));
    lines.push('');
  }

  if (devPlan.backend.cachingStrategy?.length) {
    lines.push('### Caching Strategy (Redis)', '');
    lines.push('| Key Pattern | TTL | Description |');
    lines.push('|-------------|-----|-------------|');
    devPlan.backend.cachingStrategy.forEach((c) => lines.push(`| \`${c.key}\` | ${c.ttl} | ${c.description} |`));
    lines.push('');
  }

  if (devPlan.backend.validationRules?.length) {
    lines.push('### Validation & Business Rules', '');
    devPlan.backend.validationRules.forEach((r) => lines.push(`- ${r}`));
    lines.push('');
  }

  if (devPlan.backend.security?.length) {
    lines.push('### Security', '');
    devPlan.backend.security.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }

  if (devPlan.backend.backendTasks?.length) {
    lines.push('### Backend Tasks', '');
    devPlan.backend.backendTasks.forEach((t, i) => {
      lines.push(`${i + 1}. **${t.title}**`);
      lines.push(`   ${t.description}`);
      lines.push('');
    });
  }

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

  if (devPlan.frontend.stateManagement) {
    const sm = devPlan.frontend.stateManagement;
    lines.push('### State Management', '');
    if (sm.tool) lines.push(`**Tool:** ${sm.tool}`, '');
    if (sm.local.length) {
      lines.push('**Local State:**', '');
      sm.local.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }
    if (sm.global.length) {
      lines.push('**Global State:**', '');
      sm.global.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }
  }

  if (devPlan.frontend.apiIntegration) {
    const ai = devPlan.frontend.apiIntegration;
    lines.push('### API Integration', '');
    if (ai.services.length) {
      lines.push('**Service Layer:**', '');
      ai.services.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }
    if (ai.apiMapping.length) {
      lines.push('**API Mapping:**', '');
      ai.apiMapping.forEach((m) => lines.push(`- ${m}`));
      lines.push('');
    }
    if (ai.errorMapping.length) {
      lines.push('**Error Mapping:**', '');
      ai.errorMapping.forEach((e) => lines.push(`- ${e}`));
      lines.push('');
    }
  }

  if (devPlan.frontend.validation?.length) {
    lines.push('### Validation', '');
    devPlan.frontend.validation.forEach((v) => lines.push(`- ${v}`));
    lines.push('');
  }

  if (devPlan.frontend.uxStates?.length) {
    lines.push('### UX States', '');
    devPlan.frontend.uxStates.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }

  if (devPlan.frontend.routing?.length) {
    lines.push('### Routing', '');
    lines.push('| Path | Component | Guard |');
    lines.push('|------|-----------|-------|');
    devPlan.frontend.routing.forEach((r) => {
      // Format: "/path → PageComponent — guard"
      const arrowIdx = r.indexOf('→');
      const dashIdx  = r.indexOf('—', arrowIdx);
      if (arrowIdx > -1 && dashIdx > -1) {
        const path      = r.slice(0, arrowIdx).trim();
        const component = r.slice(arrowIdx + 1, dashIdx).trim();
        const guard     = r.slice(dashIdx + 1).trim();
        lines.push(`| ${path} | ${component} | ${guard} |`);
      } else {
        lines.push(`| ${r} | | |`);
      }
    });
    lines.push('');
  }

  if (devPlan.frontend.errorHandling?.length) {
    lines.push('### Error Handling', '');
    devPlan.frontend.errorHandling.forEach((e) => lines.push(`- ${e}`));
    lines.push('');
  }

  if (devPlan.frontend.frontendTasks?.length) {
    lines.push('### Frontend Tasks', '');
    devPlan.frontend.frontendTasks.forEach((t) => {
      lines.push(`${t.id}. **${t.title}**`);
      lines.push(`   ${t.description}`);
      lines.push('');
    });
  }

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
