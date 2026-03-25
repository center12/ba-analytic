import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ai-sdk/openai';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import {
  AIProvider,
  buildDevPromptInput,
  ChatHistoryItem,
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

  // ── Layer 1: Requirements Extractor ─────────────────────────────────────────

  async extractRequirements(baDocumentContent: string): Promise<ExtractedRequirements> {
    this.logger.log('[Layer 1] Extracting requirements...');
    const { object } = await generateObject({
      model: openai(this.modelVersion),
      schema: RequirementsSchema,
      prompt: `You are a senior business analyst. Carefully read the following BA document and extract ALL requirements in a structured format.

BA Document:
${baDocumentContent}

Extract:
- features: list of functional features/capabilities described
- businessRules: constraints, validations, and business logic rules
- acceptanceCriteria: specific conditions that must be met for acceptance
- entities: key domain objects/models mentioned (e.g. User, Order, Product)

Be thorough — missing a requirement means missing test coverage.`,
    });
    return object as ExtractedRequirements;
  }

  // ── Layer 1B: Behavior Extractor ─────────────────────────────────────────────

  async extractBehaviors(baDocumentContent: string): Promise<ExtractedBehaviors> {
    this.logger.log('[Layer 1B] Extracting behaviors...');
    const { object } = await generateObject({
      model: openai(this.modelVersion),
      schema: BehaviorsSchema,
      prompt: `## Instructions
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
${baDocumentContent}`,
    });
    return object as ExtractedBehaviors;
  }

  // ── Layer 2: Test Scenario Planner ───────────────────────────────────────────

  async planTestScenarios(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
  ): Promise<TestScenario[]> {
    this.logger.log('[Layer 2] Planning test scenarios...');
    const { object } = await generateObject({
      model: openai(this.modelVersion),
      schema: ScenariosSchema,
      prompt: `You are a QA strategist. Using both the domain requirements and the normalized behaviors below, identify ALL test scenarios that need to be covered.

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

Ensure complete coverage across both layers.`,
    });
    return object.scenarios as TestScenario[];
  }

  // ── Layer 3: Test Case Generator ─────────────────────────────────────────────

  async generateTestCasesFromScenarios(
    scenarios: TestScenario[],
    requirements: ExtractedRequirements,
  ): Promise<GeneratedTestCase[]> {
    this.logger.log(`[Layer 3] Generating ${scenarios.length} test cases...`);
    const { object } = await generateObject({
      model: openai(this.modelVersion),
      schema: TestCasesSchema,
      prompt: `You are a QA engineer. Write detailed, executable test cases for each of the following scenarios.

Domain context:
Entities: ${requirements.entities.join(', ')}
Business Rules: ${requirements.businessRules.join('\n- ')}

Scenarios to cover:
${scenarios.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}\n   Covers: ${s.requirementRefs.join('; ')}`).join('\n')}

For each scenario write a test case with:
- title: matches the scenario title
- description: what is being tested and why
- preconditions: system state required before test execution
- priority: HIGH (critical path/security), MEDIUM (important features), LOW (edge cases)
- steps: ordered list of { action, expectedResult } pairs — be precise and specific`,
    });
    return object.testCases as GeneratedTestCase[];
  }

  // ── Layer 4: Dev Prompt Generator (4A API · 4B Frontend · 4C Testing) ──────────

  async generateDevPrompt(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
  ): Promise<DevPrompt> {
    this.logger.log('[Layer 4] Generating dev prompts (API / Frontend / Testing)...');
    const { object } = await generateObject({
      model: openai(this.modelVersion),
      schema: z.object({ api: z.string(), frontend: z.string(), testing: z.string() }),
      prompt: buildDevPromptInput(requirements, behaviors, scenarios),
    });
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
    const [requirements, behaviors] = await Promise.all([
      this.extractRequirements(content),
      this.extractBehaviors(content),
    ]);
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
