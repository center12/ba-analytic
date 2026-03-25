import { ChatMessageRole } from '@prisma/client';

export interface TestCaseStep {
  action: string;
  expectedResult: string;
}

export interface GeneratedTestCase {
  title: string;
  description: string;
  preconditions: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TestCaseStep[];
}

export interface ChatHistoryItem {
  role: ChatMessageRole;
  content: string;
}

// ── 3-layer pipeline types ────────────────────────────────────────────────────

/** Layer 1A — Domain Extraction */
export interface ExtractedRequirements {
  features: string[];
  businessRules: string[];
  acceptanceCriteria: string[];
  entities: string[];
}

/** Layer 1B — Behavior Extraction */
export interface ExtractedBehaviors {
  feature: string;
  actors: string[];
  actions: string[];
  rules: string[];
}

/** Layer 4 — Dev Prompts (4A API · 4B Frontend · 4C Testing) */
export interface DevPrompt {
  api: string;       // 4A — backend/API implementation prompt
  frontend: string;  // 4B — frontend/UI implementation prompt
  testing: string;   // 4C — test automation / QA implementation prompt
}

export type ScenarioType = 'happy_path' | 'edge_case' | 'error' | 'boundary' | 'security';

export interface TestScenario {
  title: string;
  type: ScenarioType;
  requirementRefs: string[];
}

/**
 * Builds the input prompt for Layer 4 dev prompt generation.
 * Shared across all provider implementations.
 */
export function buildDevPromptInput(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  scenarios: TestScenario[],
): string {
  const scenarioList = scenarios
    .map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}`)
    .join('\n');

  return `You are a senior software architect. Based on the feature analysis below, generate THREE separate implementation prompts — one for API/backend (4A), one for frontend/UI (4B), and one for test automation (4C). Each prompt must be self-contained and ready to paste into an AI coding tool (Cursor, Copilot, Claude, etc.).

## Feature: ${behaviors.feature}

## Actors
${behaviors.actors.map((a) => `- ${a}`).join('\n')}

## Actions (atomic flows)
${behaviors.actions.map((a) => `- ${a}`).join('\n')}

## Business Rules & Validations
${behaviors.rules.map((r) => `- ${r}`).join('\n')}

## Domain Entities
${requirements.entities.join(', ')}

## Acceptance Criteria
${requirements.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}

## Test Scenarios to Cover
${scenarioList}

---

## Generation Rules (MUST be embedded in every generated prompt)

**ALWAYS generate** (complete, working code):
- Function/method signatures with correct types
- API routes with HTTP methods, paths, and response shapes
- Input validation derived from the business rules above
- Error handling derived from the error/boundary test scenarios above

**PARTIALLY generate** (scaffold only):
- Business logic → output a stub with a clear \`// TODO: implement [specific rule]\` comment for each rule

**NEVER skip**:
- Test files — the testing prompt (4C) must produce fully implemented test cases, not stubs

**Always ensure**:
- Generated code is logically consistent with the test cases (the implementation must be able to pass them)
- Structure is clean and modular (separate concerns: routes, validation, business logic, data access)

---

Generate:
- **api**: Prompt for implementing the backend API. Must include: function signatures, route definitions, input validation (from rules), error handling (from test scenarios), business logic stubs with TODO comments.
- **frontend**: Prompt for implementing the frontend UI. Must include: component signatures, API integration hooks, form validation (from rules), error state handling (from test scenarios), UI logic stubs with TODO comments.
- **testing**: Prompt for writing fully implemented automated tests. Must include: one test per scenario listed above, assertions for both success and error paths, setup/teardown, no stubs — all test bodies must be complete.

Each prompt must start with "You are an expert [role]." and embed all relevant context so it is fully self-contained.`;
}

/**
 * Abstract base class for all AI providers.
 * Concrete implementations: GeminiProvider, ClaudeProvider, OpenAIProvider.
 */
export abstract class AIProvider {
  abstract readonly providerName: string;
  abstract readonly modelVersion: string;

  /**
   * Layer 1A — Extract structured domain requirements from the BA document.
   */
  abstract extractRequirements(baDocumentContent: string): Promise<ExtractedRequirements>;

  /**
   * Layer 1B — Extract normalized behaviors (actors, actions, rules) from the BA document.
   */
  abstract extractBehaviors(baDocumentContent: string): Promise<ExtractedBehaviors>;

  /**
   * Layer 2 — Plan test scenarios from both 1A (domain) and 1B (behavior) outputs.
   */
  abstract planTestScenarios(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
  ): Promise<TestScenario[]>;

  /**
   * Layer 3 — Generate detailed test cases for each scenario.
   */
  abstract generateTestCasesFromScenarios(
    scenarios: TestScenario[],
    requirements: ExtractedRequirements,
  ): Promise<GeneratedTestCase[]>;

  /**
   * Layer 4 — Synthesize all pipeline outputs into a ready-to-copy prompt
   * for AI coding tools (Cursor, Copilot, Claude, etc.).
   */
  abstract generateDevPrompt(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
  ): Promise<DevPrompt>;

  /**
   * Convenience wrapper: runs all 3 layers in sequence.
   * Kept for backwards compatibility; PipelineService stores intermediates.
   */
  abstract generateTestCases(
    baDocumentContent: string,
    screenshotPaths: string[],
  ): Promise<GeneratedTestCase[]>;

  /**
   * Stream a chat response given prior history and a new user message.
   * Yields text chunks as they arrive from the provider.
   */
  abstract chat(
    history: ChatHistoryItem[],
    userMessage: string,
  ): AsyncIterable<string>;

  /**
   * Optionally cache a large context (e.g. BA document) with the provider
   * to reduce token costs on repeated calls.
   *
   * Returns a cache key/ID if the provider supports caching, or null otherwise.
   * Callers should store the cache key and pass it back via the concrete provider
   * if they want to reuse the cached context.
   */
  abstract cacheContext(content: string): Promise<string | null>;
}
