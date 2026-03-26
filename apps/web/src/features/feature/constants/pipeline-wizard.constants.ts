import { ScenarioType } from '@/lib/api';

export const BADGE: Record<ScenarioType, { label: string; cls: string }> = {
  happy_path: { label: 'Happy', cls: 'bg-green-100 text-green-800' },
  edge_case: { label: 'Edge', cls: 'bg-yellow-100 text-yellow-800' },
  error: { label: 'Error', cls: 'bg-red-100 text-red-800' },
  boundary: { label: 'Boundary', cls: 'bg-blue-100 text-blue-800' },
  security: { label: 'Security', cls: 'bg-purple-100 text-purple-800' },
};

export const MANUAL_TEMPLATES: Record<number, string> = {
  1: JSON.stringify(
    {
      extractedRequirements: {
        features: ['Feature description 1', 'Feature description 2'],
        businessRules: ['Rule 1', 'Rule 2'],
        acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
        entities: ['Entity1', 'Entity2'],
      },
      extractedBehaviors: {
        feature: 'Feature name',
        actors: ['User', 'Admin'],
        actions: ['User submits form', 'System validates input'],
        rules: ['Field X is required', 'Value must be positive'],
      },
    },
    null,
    2,
  ),
  2: JSON.stringify(
    [
      { title: 'User successfully completes happy path', type: 'happy_path', requirementRefs: ['Feature description 1'] },
      { title: 'User submits with missing required field', type: 'error', requirementRefs: ['Field X is required'] },
    ],
    null,
    2,
  ),
  3: JSON.stringify(
    [
      {
        title: 'User successfully completes happy path',
        description: 'Verifies that a valid user can complete the flow end-to-end',
        preconditions: 'User is logged in and all required data is present',
        priority: 'HIGH',
        steps: [
          { action: 'User navigates to the page', expectedResult: 'Page loads successfully' },
          { action: 'User submits the form', expectedResult: 'Success message is shown' },
        ],
      },
    ],
    null,
    2,
  ),
  4: JSON.stringify(
    {
      api: [{ title: 'API — Core endpoints', prompt: 'You are an expert backend engineer. Implement the API for...' }],
      frontend: [{ title: 'Frontend — Core UI', prompt: 'You are an expert frontend engineer. Implement the UI for...' }],
      testing: [{ title: 'Testing — Core flows', prompt: 'You are an expert QA engineer. Write automated tests for...' }],
    },
    null,
    2,
  ),
};
