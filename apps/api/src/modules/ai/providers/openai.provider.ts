import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ai-sdk/openai';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import {
  AIProvider,
  ApiRoute,
  BackendPlan,
  buildDevPlanFrontendPrompt,
  buildDevPlanTestingPrompt,
  buildDevPlanWorkflowBackendPrompt,
  buildDevPromptInput,
  buildExtractAllPrompt,
  buildGenerateTestCasesPrompt,
  buildPlanScenariosPrompt,
  buildSynthesisPrompt,
  ChatHistoryItem,
  CombinedExtraction,
  DevPlan,
  DevPrompt,
  ExtractedBehaviors,
  ExtractedRequirements,
  FrontendPlan,
  GeneratedTestCase,
  TestingPlan,
  TestScenario,
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

const ScenariosSchema = z.object({
  scenarios: z.array(
    z.object({
      title: z.string(),
      type: z.enum(['happy_path', 'edge_case', 'error', 'boundary', 'security']),
      requirementRefs: z.array(z.string()),
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

const DevTaskItemSchema = z.object({ title: z.string(), prompt: z.string() });
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
  jsonResponse: z.string().default(''),
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
});
const WorkflowBackendSchema = z.object({
  workflow: z.array(z.object({
    order: z.number(),
    title: z.string(),
    description: z.string(),
    actor: z.string(),
  })),
  backend: z.object({
    database: z.object({
      entities: z.array(DatabaseEntitySchema),
      relationships: z.array(z.string()),
    }),
    apiRoutes: z.array(ApiRouteSchema),
    folderStructure: z.array(z.string()),
  }),
});
const FrontendPlanSchema = z.object({
  components: z.array(z.string()),
  pages: z.array(z.string()),
  store: z.array(z.string()),
  hooks: z.array(z.string()),
  utils: z.array(z.string()),
  services: z.array(z.string()),
});
const TestingPlanSchema = z.object({
  backendUnitTests: z.array(z.string()),
  frontendTests: z.array(z.string()),
});

@Injectable()
export class OpenAIProvider extends AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  readonly providerName = 'openai';
  readonly modelVersion: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.modelVersion = config.get<string>('OPENAI_MODEL', 'gpt-4.1-mini');
  }

  private logRateLimit(label: string, headers?: Record<string, string>) {
    if (!headers) return;
    const limit     = headers['x-ratelimit-limit-requests']     ?? headers['ratelimit-limit']     ?? '-';
    const remaining = headers['x-ratelimit-remaining-requests'] ?? headers['ratelimit-remaining'] ?? '-';
    const reset     = headers['x-ratelimit-reset-requests']     ?? headers['ratelimit-reset']     ?? '-';
    this.logger.log(`${label} rate-limit — limit: ${limit}, remaining: ${remaining}, reset: ${reset}`);
  }

  private logPromptSize(label: string, prompt: string) {
    this.logger.log(`${label} prompt — chars: ${prompt.length}, ~tokens: ${Math.ceil(prompt.length / 4)}`);
  }

  // ── Layer 1 (combined): Requirements + Behaviors in one call ─────────────────

  async extractAll(baDocumentContent: string): Promise<CombinedExtraction> {
    this.logger.log('[Layer 1] Extracting requirements & behaviors (combined)...');
    const CombinedSchema = z.object({
      requirements: RequirementsSchema,
      behaviors: BehaviorsSchema,
    });
    const prompt1 = buildExtractAllPrompt(baDocumentContent);
    this.logPromptSize('[Layer 1]', prompt1);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: CombinedSchema,
      prompt: prompt1,
    });
    this.logger.log(`[Layer 1] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Layer 1]', response.headers);
    return object as CombinedExtraction;
  }

  // ── Layer 1 (synthesis): Consolidate near-duplicates from multi-chunk merge ───

  async synthesiseExtraction(merged: CombinedExtraction): Promise<CombinedExtraction> {
    this.logger.log('[Layer 1] Synthesising merged extraction...');
    const CombinedSchema = z.object({ requirements: RequirementsSchema, behaviors: BehaviorsSchema });
    const promptSynth = buildSynthesisPrompt(merged);
    this.logPromptSize('[Layer 1 synthesis]', promptSynth);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: CombinedSchema,
      prompt: promptSynth,
    });
    this.logger.log(`[Layer 1 synthesis] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Layer 1 synthesis]', response.headers);
    return object as CombinedExtraction;
  }

  // ── Layer 1A: Requirements Extractor ─────────────────────────────────────────

  async extractRequirements(baDocumentContent: string): Promise<ExtractedRequirements> {
    this.logger.log('[Layer 1] Extracting requirements...');
    const prompt1a = `You are a senior business analyst. Carefully read the following BA document and extract ALL requirements in a structured format.

BA Document:
${baDocumentContent}

Extract:
- features: list of functional features/capabilities described
- businessRules: constraints, validations, and business logic rules
- acceptanceCriteria: specific conditions that must be met for acceptance
- entities: key domain objects/models mentioned (e.g. User, Order, Product)

Be thorough — missing a requirement means missing test coverage.`;
    this.logPromptSize('[Layer 1A]', prompt1a);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: RequirementsSchema,
      prompt: prompt1a,
    });
    this.logger.log(`[Layer 1A] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Layer 1A]', response.headers);
    return object as ExtractedRequirements;
  }

  // ── Layer 1B: Behavior Extractor ─────────────────────────────────────────────

  async extractBehaviors(baDocumentContent: string): Promise<ExtractedBehaviors> {
    this.logger.log('[Layer 1B] Extracting behaviors...');
    const prompt1b = `## Instructions
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
    this.logPromptSize('[Layer 1B]', prompt1b);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: BehaviorsSchema,
      prompt: prompt1b,
    });
    this.logger.log(`[Layer 1B] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Layer 1B]', response.headers);
    return object as ExtractedBehaviors;
  }

  // ── Layer 2: Test Scenario Planner ───────────────────────────────────────────

  async planTestScenarios(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
  ): Promise<TestScenario[]> {
    this.logger.log('[Layer 2] Planning test scenarios...');
    const prompt2 = buildPlanScenariosPrompt(requirements, behaviors);
    this.logPromptSize('[Layer 2]', prompt2);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: ScenariosSchema,
      prompt: prompt2,
    });
    this.logger.log(`[Layer 2] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Layer 2]', response.headers);
    return object.scenarios as TestScenario[];
  }

  // ── Layer 3: Test Case Generator ─────────────────────────────────────────────

  async generateTestCasesFromScenarios(
    scenarios: TestScenario[],
    requirements: ExtractedRequirements,
  ): Promise<GeneratedTestCase[]> {
    this.logger.log(`[Layer 3] Generating ${scenarios.length} test cases...`);
    const prompt3 = buildGenerateTestCasesPrompt(scenarios, requirements);
    this.logPromptSize('[Layer 3]', prompt3);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: TestCasesSchema,
      prompt: prompt3,
    });
    this.logger.log(`[Layer 3] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Layer 3]', response.headers);
    return object.testCases as GeneratedTestCase[];
  }

  // ── Step 4A: Dev Plan — Workflow + Backend ───────────────────────────────────

  async generateDevPlanWorkflowBackend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
  ): Promise<{ workflow: WorkflowStep[]; backend: BackendPlan }> {
    this.logger.log('[Step 4A] Generating workflow + backend plan...');
    const prompt4a = buildDevPlanWorkflowBackendPrompt(requirements, behaviors, scenarios);
    this.logPromptSize('[Step 4A]', prompt4a);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: WorkflowBackendSchema,
      prompt: prompt4a,
    });
    this.logger.log(`[Step 4A] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Step 4A]', response.headers);
    return object as { workflow: WorkflowStep[]; backend: BackendPlan };
  }

  // ── Step 4B: Dev Plan — Frontend ─────────────────────────────────────────────

  async generateDevPlanFrontend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    workflowSummary: string,
  ): Promise<FrontendPlan> {
    this.logger.log('[Step 4B] Generating frontend plan...');
    const prompt4b = buildDevPlanFrontendPrompt(requirements, behaviors, workflowSummary);
    this.logPromptSize('[Step 4B]', prompt4b);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: FrontendPlanSchema,
      prompt: prompt4b,
    });
    this.logger.log(`[Step 4B] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Step 4B]', response.headers);
    return object as FrontendPlan;
  }

  // ── Step 4C: Dev Plan — Testing ──────────────────────────────────────────────

  async generateDevPlanTesting(
    requirements: ExtractedRequirements,
    scenarios: TestScenario[],
    apiRoutes: ApiRoute[],
    components: string[],
  ): Promise<TestingPlan> {
    this.logger.log('[Step 4C] Generating testing plan...');
    const prompt4c = buildDevPlanTestingPrompt(requirements, scenarios, apiRoutes, components);
    this.logPromptSize('[Step 4C]', prompt4c);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: TestingPlanSchema,
      prompt: prompt4c,
    });
    this.logger.log(`[Step 4C] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Step 4C]', response.headers);
    return object as TestingPlan;
  }

  // ── Step 5 (Layer 4): Dev Prompt Generator (4A API · 4B Frontend · 4C Testing) ─

  async generateDevPrompt(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
    devPlan?: DevPlan,
  ): Promise<DevPrompt> {
    this.logger.log('[Step 5] Generating dev prompts (API / Frontend / Testing)...');
    const prompt4 = buildDevPromptInput(requirements, behaviors, scenarios, devPlan);
    this.logPromptSize('[Step 5]', prompt4);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: DevPromptSchema,
      prompt: prompt4,
    });
    this.logger.log(`[Step 5] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
    this.logRateLimit('[Step 5]', response.headers);
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
      model: openai(this.modelVersion),
      system:
        'You are a helpful QA assistant. Help the user understand and refine test cases based on BA documents.',
      messages,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  /**
   * OpenAI handles prompt caching automatically — no explicit caching needed.
   */
  async cacheContext(_content: string): Promise<string | null> {
    this.logger.log('OpenAI handles prompt caching automatically — no explicit caching needed.');
    return null;
  }
}
