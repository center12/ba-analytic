import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import {
  appendPromptInstructions,
  AIProvider,
  BackendPlan,
  BackendTestingPlan,
  buildDevPlanBackendTestingPrompt,
  buildDevPlanFrontendPrompt,
  buildDevPlanFrontendTestingPrompt,
  buildDevPlanWorkflowBackendPrompt,
  buildDevPromptInput,
  buildExtractAllPrompt,
  buildExtractSSRPrompt,
  buildExtractSSRAndStoriesPrompt,
  buildExtractUserStoriesPrompt,
  buildGenerateTestCasesPrompt,
  buildSSRSynthesisPrompt,
  buildLayer1SynthesisPrompt,
  buildMappingPrompt,
  buildPlanScenariosPrompt,
  buildSynthesisPrompt,
  buildUserStoriesSynthesisPrompt,
  buildValidationPrompt,
  ChatHistoryItem,
  CombinedExtraction,
  DevPlan,
  DevPrompt,
  DevPromptSection,
  ExtractedBehaviors,
  ExtractedRequirements,
  FrontendPlan,
  FrontendTestingPlan,
  GeneratedTestCase,
  extractAcceptanceCriteriaIds,
  Layer1ABPartial,
  Mapping,
  RelatedFeatureDevPlan,
  SSRData,
  TestScenario,
  UserStories,
  UserStory,
  ValidationResult,
  WorkflowStep,
} from '../ai-provider.abstract';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const RequirementsSchema = z.object({
  features: z.array(z.string()),
  businessRules: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  entities: z.array(z.string()),
});

const BehaviorsSchema = z.object({
  feature: z.string(),
  actors: z.array(z.string()),
  actions: z.array(z.string()),
  rules: z.array(z.string()),
});

const AcceptanceCriteriaIdListSchema = z.preprocess(
  (input) => Array.isArray(input) ? extractAcceptanceCriteriaIds(input.filter((item): item is string => typeof item === 'string')) : input,
  z.array(z.string().regex(/^AC-\d+$/i)).default([]),
);

const ScenariosSchema = z.object({
  scenarios: z.array(
    z.object({
      title: z.string(),
      type: z.enum(['happy_path', 'edge_case', 'error', 'boundary', 'security']),
      requirementRefs: z.array(z.string()),
      userStoryId: z.string().optional(),
    }),
  ),
});

const TestCasesSchema = z.object({
  testCases: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      preconditions: z.string(),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      steps: z.array(
        z.object({
          action: z.string(),
          expectedResult: z.string(),
        }),
      ),
    }),
  ),
});

const DevTaskItemSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  userStoryIds: z.array(z.string()).optional(),
});
const DevPromptSchema = z.object({
  api:      z.array(DevTaskItemSchema),
  frontend: z.array(DevTaskItemSchema),
  testing:  z.array(DevTaskItemSchema),
});

const ApiParamSchema = z.object({
  name: z.string(),
  in: z.enum(['path', 'query', 'body']),
  type: z.string(),
  required: z.boolean(),
});
const ApiRouteSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
  description: z.string(),
  params: z.array(ApiParamSchema).default([]),
  requestBody: z.string().default(''),
  jsonResponse: z.string().default(''),
  errorCases: z.array(z.string()).default([]),
});
const DatabaseFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  isPrimaryKey: z.boolean(),
  isNullable: z.boolean(),
  description: z.string().optional(),
});
const DatabaseEntitySchema = z.object({
  name: z.string(),
  tableName: z.string(),
  fields: z.array(DatabaseFieldSchema),
  indexes: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  softDelete: z.boolean().default(false),
});
const QueryDesignSchema = z.object({
  name: z.string(),
  sql: z.string(),
  isPaginated: z.boolean(),
});
const TransactionSchema = z.object({
  where: z.string(),
  why: z.string(),
});
const CacheEntrySchema = z.object({
  key: z.string(),
  ttl: z.string(),
  description: z.string(),
});
const BackendTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  userStoryIds: z.array(z.string()).optional(),
});
const WorkflowBackendSchema = z.object({
  workflow: z.array(z.object({
    order: z.number(),
    title: z.string(),
    description: z.string(),
    actor: z.string(),
  })),
  backend: z.object({
    featureOverview: z.string().default(''),
    database: z.object({
      entities: z.array(DatabaseEntitySchema),
      relationships: z.array(z.string()),
    }),
    apiRoutes: z.array(ApiRouteSchema),
    businessLogicFlow: z.array(z.string()).default([]),
    queryDesign: z.array(QueryDesignSchema).default([]),
    transactions: z.array(TransactionSchema).default([]),
    cachingStrategy: z.array(CacheEntrySchema).default([]),
    validationRules: z.array(z.string()).default([]),
    security: z.array(z.string()).default([]),
    backendTasks: z.array(BackendTaskSchema).default([]),
    folderStructure: z.array(z.string()),
  }),
});
const FrontendTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  userStoryIds: z.array(z.string()).optional(),
});
const StateManagementSchema = z.object({
  local: z.array(z.string()).default([]),
  global: z.array(z.string()).default([]),
  tool: z.string().default('Zustand'),
});
const ApiIntegrationSchema = z.object({
  services: z.array(z.string()).default([]),
  apiMapping: z.array(z.string()).default([]),
  errorMapping: z.array(z.string()).default([]),
});
const FrontendPlanSchema = z.object({
  components: z.array(z.string()).default([]),
  pages: z.array(z.string()).default([]),
  store: z.array(z.string()).default([]),
  hooks: z.array(z.string()).default([]),
  utils: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  stateManagement: StateManagementSchema.optional(),
  apiIntegration: ApiIntegrationSchema.optional(),
  validation: z.array(z.string()).default([]),
  uxStates: z.array(z.string()).default([]),
  routing: z.array(z.string()).default([]),
  errorHandling: z.array(z.string()).default([]),
  frontendTasks: z.array(FrontendTaskSchema).default([]),
});
const TestingTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  userStoryIds: z.array(z.string()).optional(),
});

const ApiTestScenarioSchema = z.object({
  name: z.string(),
  steps: z.array(z.string()).default([]),
  expectedResponse: z.string().default(''),
  expectedStatus: z.number().default(200),
});
const ApiEndpointTestsSchema = z.object({
  endpoint: z.string(),
  scenarios: z.array(ApiTestScenarioSchema).default([]),
});

const UiTestScenarioSchema = z.object({
  name: z.string(),
  steps: z.array(z.string()).default([]),
  expectedBehavior: z.string().default(''),
});
const UiScreenTestsSchema = z.object({
  screen: z.string(),
  scenarios: z.array(UiTestScenarioSchema).default([]),
});

const BackendTestingPlanSchema = z.object({
  testScenarios: z.array(z.string()).default([]),
  apiTestCases: z.array(ApiEndpointTestsSchema).default([]),
  databaseTesting: z.array(z.string()).default([]),
  businessLogicTesting: z.array(z.string()).default([]),
  paginationQueryTesting: z.array(z.string()).default([]),
  performanceTesting: z.array(z.string()).default([]),
  securityTesting: z.array(z.string()).default([]),
  errorHandlingTesting: z.array(z.string()).default([]),
  tasks: z.array(TestingTaskSchema).default([]),
});

const FrontendTestingPlanSchema = z.object({
  testScenarios: z.array(z.string()).default([]),
  uiTestCases: z.array(UiScreenTestsSchema).default([]),
  validationTesting: z.array(z.string()).default([]),
  uxStateTesting: z.array(z.string()).default([]),
  apiIntegrationTesting: z.array(z.string()).default([]),
  routingNavigationTesting: z.array(z.string()).default([]),
  crossBrowserTesting: z.array(z.string()).default([]),
  edgeCases: z.array(z.string()).default([]),
  tasks: z.array(TestingTaskSchema).default([]),
});

// ── New Layer 1 Zod schemas ───────────────────────────────────────────────────

const SSRDataSchema = z.object({
  featureName: z.string(),
  functionalRequirements: z.array(z.string()).default([]),
  systemRules: z.array(z.string()).default([]),
  businessRules: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  globalPolicies: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
});

const UserStorySchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.string(),
  benefit: z.string(),
  acceptanceCriteria: AcceptanceCriteriaIdListSchema,
  relatedRuleIds: z.array(z.string()).default([]),
  priority: z.enum(['MUST', 'SHOULD', 'COULD']).default('SHOULD'),
});

const UserStoriesSchema = z.object({
  featureName: z.string(),
  stories: z.array(UserStorySchema).default([]),
});

const Layer1ABSchema = z.object({
  ssr: SSRDataSchema,
  stories: UserStoriesSchema,
});

const RuleStoryLinkSchema = z.object({
  ruleId: z.string(),
  ruleText: z.string(),
  storyIds: z.array(z.string()).default([]),
  coverage: z.enum(['full', 'partial', 'none']),
});

const MappingSchema = z.object({
  links: z.array(RuleStoryLinkSchema).default([]),
  uncoveredRules: z.array(z.string()).default([]),
  storiesWithNoRules: z.array(z.string()).default([]),
});

const ValidationIssueSchema = z.object({
  type: z.enum(['missing_coverage', 'ambiguous_story', 'conflicting_rules', 'incomplete_criteria', 'orphan_story']),
  severity: z.enum(['error', 'warning', 'info']),
  affectedIds: z.array(z.string()).default([]),
  message: z.string(),
  suggestion: z.string().optional(),
});

const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(ValidationIssueSchema).default([]),
  summary: z.string(),
});

@Injectable()
export class ClaudeProvider extends AIProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  readonly providerName = 'claude';
  readonly modelVersion: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.modelVersion = config.get<string>('CLAUDE_MODEL', 'claude-sonnet-4-6');
  }

  private logRateLimit(label: string, headers?: Record<string, string>) {
    if (!headers) return;
    const limit     = headers['x-ratelimit-limit-requests']     ?? headers['ratelimit-limit']     ?? '-';
    const remaining = headers['x-ratelimit-remaining-requests'] ?? headers['ratelimit-remaining'] ?? '-';
    const reset     = headers['x-ratelimit-reset-requests']     ?? headers['ratelimit-reset']     ?? '-';
    this.logger.log(`${label} rate-limit — limit: ${limit}, remaining: ${remaining}, reset: ${reset}`);
  }

  private logPromptSize(label: string, text: string) {
    this.logger.log(`${label} prompt — chars: ${text.length}, ~tokens: ${Math.ceil(text.length / 4)}`);
  }

  // ── Layer 1 (combined): Requirements + Behaviors in one cached call ──────────

  async extractAll(baDocumentContent: string, promptAppend?: string): Promise<CombinedExtraction> {
    this.logger.log('[Layer 1] Extracting requirements & behaviors (combined)...');
    const CombinedSchema = z.object({
      requirements: RequirementsSchema,
      behaviors: BehaviorsSchema,
    });
    const text1 = appendPromptInstructions(buildExtractAllPrompt(baDocumentContent), promptAppend);
    this.logPromptSize('[Layer 1]', text1);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: CombinedSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text1,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 1] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 1]', response.headers);
    return object as CombinedExtraction;
  }

  // ── Layer 1 (synthesis): Consolidate near-duplicates from multi-chunk merge ───

  async synthesiseExtraction(merged: CombinedExtraction): Promise<CombinedExtraction> {
    this.logger.log('[Layer 1] Synthesising merged extraction...');
    const CombinedSchema = z.object({ requirements: RequirementsSchema, behaviors: BehaviorsSchema });
    const textSynth = buildSynthesisPrompt(merged);
    this.logPromptSize('[Layer 1 synthesis]', textSynth);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: CombinedSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: textSynth,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 1 synthesis] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 1 synthesis]', response.headers);
    return object as CombinedExtraction;
  }

  // ── New Layer 1 (4-sublayer) methods ─────────────────────────────────────────

  async extractSSR(baDocumentContent: string, promptAppend?: string): Promise<SSRData> {
    this.logger.log('[Layer 1A] Extracting SSR...');
    const prompt = appendPromptInstructions(buildExtractSSRPrompt(baDocumentContent), promptAppend);
    this.logPromptSize('[Layer 1A]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: SSRDataSchema,
      prompt,
    });
    this.logger.log(`[Layer 1A] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as SSRData;
  }

  async synthesiseSSR(merged: SSRData): Promise<SSRData> {
    this.logger.log('[Layer 1A synthesis] Consolidating SSR extraction...');
    const prompt = buildSSRSynthesisPrompt(merged);
    this.logPromptSize('[Layer 1A synthesis]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: SSRDataSchema,
      prompt,
    });
    this.logger.log(`[Layer 1A synthesis] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as SSRData;
  }

  async extractUserStories(baDocumentContent: string, ssr: SSRData, promptAppend?: string): Promise<UserStories> {
    this.logger.log('[Layer 1B] Extracting user stories...');
    const prompt = appendPromptInstructions(buildExtractUserStoriesPrompt(baDocumentContent, ssr), promptAppend);
    this.logPromptSize('[Layer 1B]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: UserStoriesSchema,
      prompt,
    });
    this.logger.log(`[Layer 1B] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as UserStories;
  }

  async synthesiseUserStories(merged: UserStories, ssr: SSRData): Promise<UserStories> {
    this.logger.log('[Layer 1B synthesis] Consolidating user stories...');
    const prompt = buildUserStoriesSynthesisPrompt(merged, ssr);
    this.logPromptSize('[Layer 1B synthesis]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: UserStoriesSchema,
      prompt,
    });
    this.logger.log(`[Layer 1B synthesis] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as UserStories;
  }

  async extractSSRAndStories(baDocumentContent: string, promptAppend?: string): Promise<Layer1ABPartial> {
    this.logger.log('[Layer 1AB] Extracting SSR + User Stories...');
    const prompt = appendPromptInstructions(buildExtractSSRAndStoriesPrompt(baDocumentContent), promptAppend);
    this.logPromptSize('[Layer 1AB]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: Layer1ABSchema,
      prompt,
    });
    this.logger.log(`[Layer 1AB] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as Layer1ABPartial;
  }

  async synthesiseLayer1AB(merged: Layer1ABPartial): Promise<Layer1ABPartial> {
    this.logger.log('[Layer 1AB synthesis] Consolidating merged extraction...');
    const prompt = buildLayer1SynthesisPrompt(merged);
    this.logPromptSize('[Layer 1AB synthesis]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: Layer1ABSchema,
      prompt,
    });
    this.logger.log(`[Layer 1AB synthesis] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as Layer1ABPartial;
  }

  async extractMapping(ssr: SSRData, stories: UserStories): Promise<Mapping> {
    this.logger.log('[Layer 1C] Generating traceability mapping...');
    const prompt = buildMappingPrompt(ssr, stories);
    this.logPromptSize('[Layer 1C]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: MappingSchema,
      prompt,
    });
    this.logger.log(`[Layer 1C] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as Mapping;
  }

  async extractValidation(ssr: SSRData, stories: UserStories, mapping: Mapping): Promise<ValidationResult> {
    this.logger.log('[Layer 1D] Validating extraction quality...');
    const prompt = buildValidationPrompt(ssr, stories, mapping);
    this.logPromptSize('[Layer 1D]', prompt);
    const { object, usage } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: ValidationResultSchema,
      prompt,
    });
    this.logger.log(`[Layer 1D] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    return object as ValidationResult;
  }

  // ── Layer 1A: Requirements Extractor (cached — document is large & reusable) ──

  async extractRequirements(baDocumentContent: string): Promise<ExtractedRequirements> {
    this.logger.log('[Layer 1] Extracting requirements...');
    const text1a = `You are a senior business analyst. Carefully read the following BA document and extract ALL requirements in a structured format.

BA Document:
${baDocumentContent}

Extract:
- features: list of functional features/capabilities described
- businessRules: constraints, validations, and business logic rules
- acceptanceCriteria: specific conditions that must be met for acceptance
- entities: key domain objects/models mentioned (e.g. User, Order, Product)

Be thorough — missing a requirement means missing test coverage.`;
    this.logPromptSize('[Layer 1A]', text1a);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: RequirementsSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text1a,
              // Cache the document content — it's large and reused across all 3 layers
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 1A] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 1A]', response.headers);
    return object as ExtractedRequirements;
  }

  // ── Layer 1B: Behavior Extractor ─────────────────────────────────────────────

  async extractBehaviors(baDocumentContent: string): Promise<ExtractedBehaviors> {
    this.logger.log('[Layer 1B] Extracting behaviors...');
    const text1b = `## Instructions
1. Clean the document:
   - Remove UI/visual details
   - Remove duplication
   - Keep only business logic

2. Identify:
   - Actors (users, systems)
   - Actions (atomic steps: Actor + Verb + Object)
   - Rules:
     - Validation rules
     - Business rules
     - Conditional logic
     - Edge cases (infer missing ones)

3. Normalize:
   - Use consistent naming
   - Break complex flows into atomic steps

## Important
- Do NOT mix actions and rules
- Add missing edge cases even if not explicitly written
- Keep everything concise and atomic

## Document
${baDocumentContent}`;
    this.logPromptSize('[Layer 1B]', text1b);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: BehaviorsSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text1b,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 1B] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 1B]', response.headers);
    return object as ExtractedBehaviors;
  }

  // ── Layer 2: Test Scenario Planner ───────────────────────────────────────────

  async planTestScenarios(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<TestScenario[]> {
    this.logger.log('[Layer 2] Planning test scenarios...');
    const text2 = appendPromptInstructions(buildPlanScenariosPrompt(requirements, behaviors, userStories), promptAppend);
    this.logPromptSize('[Layer 2]', text2);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: ScenariosSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text2,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 2] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 2]', response.headers);
    return object.scenarios as TestScenario[];
  }

  // ── Layer 3: Test Case Generator ─────────────────────────────────────────────

  async generateTestCasesFromScenarios(
    scenarios: TestScenario[],
    requirements: ExtractedRequirements,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<GeneratedTestCase[]> {
    this.logger.log(`[Layer 3] Generating ${scenarios.length} test cases...`);
    const text3 = appendPromptInstructions(buildGenerateTestCasesPrompt(scenarios, requirements, userStories), promptAppend);
    this.logPromptSize('[Layer 3]', text3);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: TestCasesSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text3,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 3] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 3]', response.headers);
    return object.testCases as GeneratedTestCase[];
  }

  // ── Step 4A: Dev Plan — Workflow + Backend ───────────────────────────────────

  async generateDevPlanWorkflowBackend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
    promptAppend?: string,
    userStories?: UserStory[],
    relatedFeatures?: RelatedFeatureDevPlan[],
  ): Promise<{ workflow: WorkflowStep[]; backend: BackendPlan }> {
    this.logger.log('[Step 4A] Generating workflow + backend plan...');
    const text4a = appendPromptInstructions(
      buildDevPlanWorkflowBackendPrompt(requirements, behaviors, scenarios, userStories, relatedFeatures),
      promptAppend,
    );
    this.logPromptSize('[Step 4A]', text4a);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: WorkflowBackendSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text4a,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Step 4A] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Step 4A]', response.headers);
    return object as { workflow: WorkflowStep[]; backend: BackendPlan };
  }

  // ── Step 4B: Dev Plan — Frontend ─────────────────────────────────────────────

  async generateDevPlanFrontend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    workflowSummary: string,
    backendPlan?: BackendPlan | null,
    promptAppend?: string,
    userStories?: UserStory[],
    relatedFeatures?: RelatedFeatureDevPlan[],
  ): Promise<FrontendPlan> {
    this.logger.log('[Step 4B] Generating frontend plan...');
    const text4b = appendPromptInstructions(
      buildDevPlanFrontendPrompt(requirements, behaviors, workflowSummary, backendPlan, userStories, relatedFeatures),
      promptAppend,
    );
    this.logPromptSize('[Step 4B]', text4b);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: FrontendPlanSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text4b,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Step 4B] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Step 4B]', response.headers);
    return object as FrontendPlan;
  }

  // ── Step 4C: Dev Plan — Testing ──────────────────────────────────────────────

  async generateDevPlanBackendTesting(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    backendPlan: BackendPlan,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<BackendTestingPlan> {
    this.logger.log('[Step 4C-BE] Generating backend testing plan...');
    const text = appendPromptInstructions(
      buildDevPlanBackendTestingPrompt(requirements, behaviors, backendPlan, userStories),
      promptAppend,
    );
    this.logPromptSize('[Step 4C-BE]', text);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: BackendTestingPlanSchema,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text, experimental_providerMetadata: { anthropic: { cacheControl: { type: 'ephemeral' } } } }],
        },
      ],
    });
    this.logger.log(`[Step 4C-BE] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Step 4C-BE]', response.headers);
    return object as BackendTestingPlan;
  }

  async generateDevPlanFrontendTesting(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    backendPlan: BackendPlan,
    frontendPlan: FrontendPlan,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<FrontendTestingPlan> {
    this.logger.log('[Step 4C-FE] Generating frontend testing plan...');
    const text = appendPromptInstructions(
      buildDevPlanFrontendTestingPrompt(requirements, behaviors, backendPlan, frontendPlan, userStories),
      promptAppend,
    );
    this.logPromptSize('[Step 4C-FE]', text);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: FrontendTestingPlanSchema,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text, experimental_providerMetadata: { anthropic: { cacheControl: { type: 'ephemeral' } } } }],
        },
      ],
    });
    this.logger.log(`[Step 4C-FE] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Step 4C-FE]', response.headers);
    return object as FrontendTestingPlan;
  }

  // ── Step 5 (Layer 4): Dev Prompt Generator (4A API · 4B Frontend · 4C Testing) ─

  async generateDevPrompt(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
    devPlan?: DevPlan,
    targetSection?: DevPromptSection,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<DevPrompt> {
    this.logger.log('[Step 5] Generating dev prompts (API / Frontend / Testing)...');
    const text4 = appendPromptInstructions(
      buildDevPromptInput(requirements, behaviors, scenarios, devPlan, targetSection, userStories),
      promptAppend,
    );
    this.logPromptSize('[Layer 4]', text4);
    const { object, usage, response } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: DevPromptSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text4,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
    });
    this.logger.log(`[Layer 4] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.trackUsage(usage);
    this.logRateLimit('[Layer 4]', response.headers);
    return object as DevPrompt;
  }

  // ── Legacy wrapper ────────────────────────────────────────────────────────────

  async generateTestCases(
    baDocumentContent: string,
    screenshotPaths: string[],
  ): Promise<GeneratedTestCase[]> {
    const screenshotNote =
      screenshotPaths.length > 0
        ? `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`
        : '';
    const content = baDocumentContent + screenshotNote;
    const requirements = await this.extractRequirements(content);
    const behaviors = await this.extractBehaviors(content);
    const scenarios = await this.planTestScenarios(requirements, behaviors);
    return this.generateTestCasesFromScenarios(scenarios, requirements);
  }

  async *chat(history: ChatHistoryItem[], userMessage: string): AsyncIterable<string> {
    const messages = [
      ...history.map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const result = streamText({
      model: anthropic(this.modelVersion),
      system:
        'You are a helpful QA assistant. Help the user understand and refine test cases based on BA documents.',
      messages,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  /**
   * Claude prompt caching is applied inline via `cache_control` on message content.
   * This method is a no-op for Claude.
   */
  async cacheContext(_content: string): Promise<string | null> {
    this.logger.log(
      'Claude uses inline cache_control on message content. No separate caching step needed.',
    );
    return null;
  }

  async summarizeDocumentChanges(previousContent: string, newContent: string): Promise<import('../ai-provider.abstract').DocumentChangeSummary> {
    this.logger.log('[DocumentVersion] Generating changelog summary...');
    const prompt = `You are a technical documentation analyst. Compare these two versions of a BA document and describe what changed.

--- PREVIOUS VERSION ---
${previousContent}

--- NEW VERSION ---
${newContent}

Return a structured changelog. Use the same language as the document.`;
    const { object } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: z.object({
        summary: z.string().describe('One-sentence overview of the change'),
        added: z.array(z.string()).describe('New sections, requirements, or features added'),
        removed: z.array(z.string()).describe('Sections, requirements, or features removed'),
        modified: z.array(z.string()).describe('Existing items that were changed, with brief description'),
      }),
      prompt,
    });
    return object;
  }

  async extractSubFeaturesFromSSR(ssrContent: string): Promise<import('../ai-provider.abstract').SubFeatureItem[]> {
    this.logger.log('[SSR Extract] Extracting sub-features from SSR content...');
    const prompt = `You are a business analyst. Given the following SSR (System/Software Requirements Specification) document, extract a list of distinct features or user stories that should be implemented.

For each feature, provide a concise name and a brief description.

IMPORTANT: Detect the language used in the SSR document and write all feature names and descriptions in that same language.

SSR Document:
${ssrContent}

Return a JSON array of features with "name" and "description" fields.`;
    const { object } = await generateObject({
      model: anthropic(this.modelVersion),
      schema: z.object({
        features: z.array(z.object({
          name: z.string(),
          description: z.string(),
        })),
      }),
      prompt,
    });
    return object.features;
  }
}
