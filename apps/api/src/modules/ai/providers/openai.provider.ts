import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ai-sdk/openai';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import {
  AIProvider,
  buildDevPromptInput,
  ChatHistoryItem,
  CombinedExtraction,
  DevPrompt,
  ExtractedBehaviors,
  ExtractedRequirements,
  GeneratedTestCase,
  TestScenario,
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

@Injectable()
export class OpenAIProvider extends AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  readonly providerName = 'openai';
  readonly modelVersion: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.modelVersion = config.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  private logRateLimit(label: string, headers?: Record<string, string>) {
    if (!headers) return;
    const limit     = headers['x-ratelimit-limit-requests']     ?? headers['ratelimit-limit']     ?? '-';
    const remaining = headers['x-ratelimit-remaining-requests'] ?? headers['ratelimit-remaining'] ?? '-';
    const reset     = headers['x-ratelimit-reset-requests']     ?? headers['ratelimit-reset']     ?? '-';
    this.logger.log(`${label} rate-limit — limit: ${limit}, remaining: ${remaining}, reset: ${reset}`);
  }

  private logPromptSize(label: string, prompt: string) {
    console.log('prompt', prompt);
    this.logger.log(`${label} prompt — chars: ${prompt.length}, ~tokens: ${Math.ceil(prompt.length / 4)}`);
  }

  // ── Layer 1 (combined): Requirements + Behaviors in one call ─────────────────

  async extractAll(baDocumentContent: string): Promise<CombinedExtraction> {
    this.logger.log('[Layer 1] Extracting requirements & behaviors (combined)...');
    const CombinedSchema = z.object({
      requirements: RequirementsSchema,
      behaviors: BehaviorsSchema,
    });
    const prompt1 = `You are a senior business analyst and UX researcher. Read the following BA document and extract TWO things in a single pass.

1. DOMAIN REQUIREMENTS:
   - features: list of functional features/capabilities described
   - businessRules: constraints, validations, and business logic rules
   - acceptanceCriteria: specific conditions that must be met for acceptance
   - entities: key domain objects/models mentioned (e.g. User, Order, Product)

2. BEHAVIOR MODEL:
   - feature: the primary feature name
   - actors: users or systems involved
   - actions: atomic steps (Actor + Verb + Object), keep only business logic, remove UI/visual details
   - rules: validation rules, business rules, conditional logic, inferred edge cases

Be thorough — missing a requirement or edge case means missing test coverage.

BA Document:
${baDocumentContent}`;
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
    const promptSynth = `You are a business analyst. The arrays below were extracted from multiple chunks of the same document and may contain near-duplicate entries. Consolidate them: merge similar items into one canonical phrase, remove exact duplicates, keep the result concise.

${JSON.stringify(merged, null, 0)}

Return the same structure with duplicates removed.`;
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
    const prompt2 = `You are a QA strategist. Using both the domain requirements and the normalized behaviors below, identify ALL test scenarios that need to be covered.

## Domain Requirements (Layer 1A)
Features: ${requirements.features.join('\n- ')}
Business Rules: ${requirements.businessRules.join('\n- ')}
Acceptance Criteria: ${requirements.acceptanceCriteria.join('\n- ')}
Entities: ${requirements.entities.join(', ')}

## Behaviors (Layer 1B)
Feature: ${behaviors.feature}
Actors: ${behaviors.actors.join(', ')}
Actions:
- ${behaviors.actions.join('\n- ')}
Rules:
- ${behaviors.rules.join('\n- ')}

For each scenario specify:
- title: short descriptive name
- type: one of happy_path | edge_case | error | boundary | security
- requirementRefs: which requirements or actions this scenario covers

Ensure complete coverage across both layers. Return at most 15 scenarios. Prioritise happy_path and error scenarios. Be concise — one line per title.`;
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
    const prompt3 = `You are a QA engineer. Write detailed, executable test cases for each of the following scenarios.

Domain context:
Entities: ${requirements.entities.join(', ')}
Business Rules: ${requirements.businessRules.join('\n- ')}

Scenarios to cover:
${scenarios.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}\n   Covers: ${s.requirementRefs.join('; ')}`).join('\n')}

For each scenario write a concise test case:
- title: copy exactly from the scenario title
- description: one sentence describing what is being tested
- preconditions: one sentence describing the required system state
- priority: HIGH (critical path/security), MEDIUM (important features), LOW (edge cases)
- steps: at most 6 steps, each action and expectedResult under 20 words`;
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

  // ── Layer 4: Dev Prompt Generator (4A API · 4B Frontend · 4C Testing) ──────────

  async generateDevPrompt(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
  ): Promise<DevPrompt> {
    this.logger.log('[Layer 4] Generating dev prompts (API / Frontend / Testing)...');
    const prompt4 = buildDevPromptInput(requirements, behaviors, scenarios);
    this.logPromptSize('[Layer 4]', prompt4);
    const { object, usage, response } = await generateObject({
      model: openai(this.modelVersion),
      schema: z.object({ api: z.string(), frontend: z.string(), testing: z.string() }),
      prompt: prompt4,
    });
    this.logger.log(`[Layer 4] tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`);
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
