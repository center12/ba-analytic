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
      ssr: {
        featureName: 'Feature Name',
        functionalRequirements: ['FR-01: Feature requirement description'],
        systemRules: ['SYS-01: All API endpoints require authentication'],
        businessRules: ['BR-01: Rule description'],
        constraints: ['VR-01: Constraint description'],
        globalPolicies: ['GP-01: Audit log policy'],
        entities: ['Entity1', 'Entity2'],
      },
      stories: {
        featureName: 'Feature Name',
        stories: [
          {
            id: 'US-01',
            actor: 'User',
            action: 'submit the form',
            benefit: 'the data is saved correctly',
            acceptanceCriteria: ['AC-01', 'AC-02'],
            relatedRuleIds: ['BR-01'],
            priority: 'MUST',
          },
        ],
      },
      mapping: {
        links: [
          { ruleId: 'BR-01', ruleText: 'Rule description', storyIds: ['US-01'], coverage: 'full' },
        ],
        uncoveredRules: [],
        storiesWithNoRules: [],
      },
      validation: {
        isValid: true,
        score: 85,
        issues: [],
        summary: 'Layer 1 extraction is complete and consistent.',
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
      workflow: [
        { order: 1, title: 'User navigates to feature', description: 'User opens the feature page', actor: 'User' },
        { order: 2, title: 'User submits data', description: 'User fills and submits the form', actor: 'User' },
      ],
      backend: {
        database: {
          entities: [
            {
              name: 'Feature',
              tableName: 'features',
              fields: [
                { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false, description: 'Primary key' },
                { name: 'name', type: 'varchar(255)', isPrimaryKey: false, isNullable: false, description: 'Feature name' },
                { name: 'description', type: 'text', isPrimaryKey: false, isNullable: true },
                { name: 'createdAt', type: 'timestamp', isPrimaryKey: false, isNullable: false },
              ],
            },
          ],
          relationships: ['User has many Features'],
        },
        apiRoutes: [
          {
            method: 'GET',
            path: '/api/features',
            description: 'List all features',
            params: [{ name: 'projectId', in: 'query', type: 'string', required: true }],
            jsonResponse: '[{"id":"uuid","name":"string","createdAt":"string"}]',
          },
          {
            method: 'POST',
            path: '/api/features',
            description: 'Create a new feature',
            params: [
              { name: 'name', in: 'body', type: 'string', required: true },
              { name: 'description', in: 'body', type: 'string', required: false },
            ],
            jsonResponse: '{"id":"uuid","name":"string","createdAt":"string"}',
          },
        ],
        folderStructure: [
          'src/modules/feature/feature.controller.ts',
          'src/modules/feature/feature.service.ts',
          'src/modules/feature/feature.module.ts',
          'src/modules/feature/dto/create-feature.dto.ts',
        ],
      },
      frontend: {
        components: ['FeatureForm — form for creating/editing a feature', 'FeatureList — displays list of features'],
        pages: ['FeatureListPage', 'FeatureDetailPage'],
        store: ['featureStore — holds feature list and selected feature'],
        hooks: ['useFeature(id) — fetches and caches a single feature'],
        utils: ['formatFeatureName(name: string) — trims and capitalises'],
        services: ['featureService.create(data) — POST /api/features'],
      },
      testing: {
        backend: {
          testScenarios: ['Feature — create success with valid data', 'Feature — returns 404 when not found'],
          apiTestCases: [],
          databaseTesting: [],
          businessLogicTesting: [],
          paginationQueryTesting: [],
          performanceTesting: [],
          securityTesting: [],
          errorHandlingTesting: [],
          tasks: [{ id: 'QA-BE-01', title: 'Write API integration tests', description: 'Cover all CRUD endpoints with happy path and error cases' }],
        },
        frontend: {
          testScenarios: ['FeatureForm — renders and submits correctly', 'FeatureList — displays items and handles empty state'],
          uiTestCases: [],
          validationTesting: [],
          uxStateTesting: [],
          apiIntegrationTesting: [],
          routingNavigationTesting: [],
          crossBrowserTesting: [],
          edgeCases: [],
          tasks: [{ id: 'QA-FE-01', title: 'Write component tests', description: 'Cover form rendering, submission, and error display' }],
        },
      },
    },
    null,
    2,
  ),
  5: JSON.stringify(
    {
      api: [{ title: 'API — Core endpoints', prompt: 'You are an expert backend engineer. Implement the API for...' }],
      frontend: [{ title: 'Frontend — Core UI', prompt: 'You are an expert frontend engineer. Implement the UI for...' }],
      testing: [{ title: 'Testing — Core flows', prompt: 'You are an expert QA engineer. Write automated tests for...' }],
    },
    null,
    2,
  ),
};
