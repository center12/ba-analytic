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

/** Layer 1 (combined) — Both domain requirements and behaviors in one pass */
export interface CombinedExtraction {
  requirements: ExtractedRequirements;
  behaviors: ExtractedBehaviors;
}

/** A single focused developer sub-task produced by Layer 4 */
export interface DevTaskItem {
  title: string;   // e.g. "API — Authentication endpoints"
  prompt: string;  // self-contained implementation prompt for this sub-task
}

/** Layer 4 — Dev Prompts (4A API · 4B Frontend · 4C Testing), each broken into 1..N sub-tasks */
export interface DevPrompt {
  api:      DevTaskItem[];   // 4A — backend sub-tasks
  frontend: DevTaskItem[];   // 4B — frontend sub-tasks
  testing:  DevTaskItem[];   // 4C — test automation sub-tasks
}

// ── Step 4 — Development Plan types ──────────────────────────────────────────

export interface WorkflowStep {
  order: number;
  title: string;
  description: string;
  actor: string;
}

export interface DatabaseField {
  name: string;
  type: string;          // e.g. "uuid", "varchar(255)", "int", "boolean", "timestamp"
  isPrimaryKey: boolean;
  isNullable: boolean;
  description?: string;
}

export interface DatabaseEntity {
  name: string;
  tableName: string;
  fields: DatabaseField[];
}

export interface ApiParam {
  name: string;
  in: 'path' | 'query' | 'body';
  type: string;
  required: boolean;
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  params: ApiParam[];
  jsonResponse: string;  // JSON example as string, e.g. '{"id":"uuid","name":"string"}'
}

export interface BackendPlan {
  database: {
    entities: DatabaseEntity[];
    relationships: string[];
  };
  apiRoutes: ApiRoute[];
  folderStructure: string[];
}

export interface FrontendPlan {
  components: string[];   // "ComponentName — purpose"
  pages: string[];
  store: string[];
  hooks: string[];
  utils: string[];
  services: string[];
}

export interface TestingPlan {
  backendUnitTests: string[];
  frontendTests: string[];
}

export interface DevPlan {
  workflow:  WorkflowStep[];
  backend:   BackendPlan;
  frontend:  FrontendPlan;
  testing:   TestingPlan;
}

export type ScenarioType = 'happy_path' | 'edge_case' | 'error' | 'boundary' | 'security';

export interface TestScenario {
  title: string;
  type: ScenarioType;
  requirementRefs: string[];
}

/**
 * Builds the prompt for Layer 1 combined extraction (requirements + behaviors).
 * Shared across all provider implementations.
 *
 * @param baDocumentContent - Raw Markdown content (or a single chunk of it).
 * @param chunkInfo - When the document is split into multiple chunks, pass the
 *   current chunk index (0-based) and the total count so the AI knows it is
 *   seeing a partial view of a larger document.
 */
export function buildExtractAllPrompt(
  baDocumentContent: string,
  chunkInfo?: { index: number; total: number },
): string {
  const chunkHeader = chunkInfo && chunkInfo.total > 1
    ? `[Chunk ${chunkInfo.index + 1} of ${chunkInfo.total} — this is a partial section of a larger document. Extract every item present; similar items from other chunks will be merged later.]\n\n`
    : '';

  return `You are a senior business analyst and UX researcher. Read the following BA document and extract TWO things in a single pass.

LANGUAGE RULE: Detect the primary language of the BA document (English or Vietnamese). Write ALL extracted string values in that same language. Do not translate or mix languages within a single response.

Document format notes:
- The document is structured Markdown with ## section headings (e.g. ## Functional Requirements, ## Business Rules, ## Acceptance Criteria / ## Yêu cầu chức năng, ## Quy tắc nghiệp vụ, ## Tiêu chí chấp nhận).
- List items may carry ID prefixes such as FR-01, BR-03, AC-02, VR-01, US-01. Preserve these IDs verbatim in every extracted string so they can be cross-referenced downstream.
- Acceptance Criteria appear as Markdown tables (columns: ID | Given | When | Then). Extract each row as a single string in the format: "AC-01: Given [..], When [..], Then [..]".
- Data Entities appear as Markdown tables under ### sub-headings. Extract each entity name into the entities list.

1. DOMAIN REQUIREMENTS:
   - features: list of functional features/capabilities described
   - businessRules: constraints, validations, and business logic rules — preserve IDs (BR-xx)
   - acceptanceCriteria: specific conditions that must be met — preserve IDs (AC-xx), use Given/When/Then format
   - entities: key domain objects/models mentioned

2. BEHAVIOR MODEL:
   - feature: the primary feature name (from the # title)
   - actors: users or systems involved (from ## Actors table)
   - actions: atomic steps (Actor + Verb + Object), keep only business logic, remove UI/visual details
   - rules: full text of each functional/validation rule — format as "FR-01: [full rule text]" when an ID is present; never extract IDs without their accompanying description

Be thorough — missing a requirement or edge case means missing test coverage.

BA Document:
${chunkHeader}${baDocumentContent}

---

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "requirements": {
    "features": ["string"],
    "businessRules": ["string"],
    "acceptanceCriteria": ["string"],
    "entities": ["string"]
  },
  "behaviors": {
    "feature": "string",
    "actors": ["string"],
    "actions": ["string"],
    "rules": ["string"]
  }
}`;
}

/**
 * Builds the prompt for the Layer 1 synthesis step.
 * Called when a document was split into multiple chunks — merges near-duplicate
 * extraction results from all chunks into a single canonical set.
 */
export function buildSynthesisPrompt(merged: CombinedExtraction): string {
  return `You are a business analyst. The arrays below were extracted from multiple chunks of the same Markdown BA document and may contain near-duplicate or split entries.

LANGUAGE RULE: Preserve the language of each string value as-is (English or Vietnamese). Do not translate any text during consolidation.

Consolidation rules:
- Items carrying ID prefixes (FR-01, BR-01, AC-01, VR-01, US-01) are DISTINCT by definition — preserve each ID and its text unchanged. Never merge two items with different IDs.
- Items without IDs: merge only if they describe exactly the same concept; otherwise keep both.
- Remove exact string duplicates.
- Keep the result concise; do not reword or paraphrase.

${JSON.stringify(merged, null, 0)}

Return the same JSON structure with duplicates removed. Preserve all IDs verbatim.`;
}

/**
 * Builds the prompt for Layer 2 scenario planning.
 * Shared across all provider implementations.
 */
export function buildPlanScenariosPrompt(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
): string {
  return `You are a QA strategist. Using both the domain requirements and the normalized behaviors below, identify ALL test scenarios that need to be covered.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values — titles and requirementRefs phrases — in that same language. Do not translate or mix languages.

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
- requirementRefs: which requirements or actions this scenario covers — use the item's ID when one is present (e.g. "FR-01", "BR-03", "AC-02"); use a short phrase only when there is no ID

Ensure complete coverage across both layers. Return at most 15 scenarios. Prioritise happy_path and error scenarios. Be concise — one line per title.

---

Return ONLY valid JSON — a plain array matching this exact structure (no markdown, no explanation):
[
  {
    "title": "string",
    "type": "happy_path | edge_case | error | boundary | security",
    "requirementRefs": ["string"]
  }
]`;
}

/**
 * Builds the prompt for Layer 3 test case generation.
 * Shared across all provider implementations.
 */
export function buildGenerateTestCasesPrompt(
  scenarios: TestScenario[],
  requirements: ExtractedRequirements,
): string {
  return `You are a QA engineer. Write detailed, executable test cases for each of the following scenarios.

LANGUAGE RULE: Detect the primary language of the input scenarios and domain context (English or Vietnamese). Write ALL output string values — title, description, preconditions, action, expectedResult — in that same language. Do not translate or mix languages.

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
- steps: at most 6 steps, each action and expectedResult under 20 words

---

Return ONLY valid JSON — a plain array matching this exact structure (no markdown, no explanation):
[
  {
    "title": "string",
    "description": "string",
    "preconditions": "string",
    "priority": "HIGH | MEDIUM | LOW",
    "steps": [
      { "action": "string", "expectedResult": "string" }
    ]
  }
]`;
}

/**
 * Builds the input prompt for Layer 4 dev prompt generation.
 * Shared across all provider implementations.
 */
export function buildDevPromptInput(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  scenarios: TestScenario[],
  devPlan?: DevPlan,
): string {
  const scenarioCount = scenarios.length;
  const subTaskCount  = Math.min(Math.ceil(scenarioCount / 4), 5); // 1 for ≤4, up to 5 for large features

  const scenarioList = scenarios
    .map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}`)
    .join('\n');

  const architectureSection = devPlan ? `
## Development Architecture (from Step 4 — use these exact names in your prompts)

### Database Entities
${devPlan.backend.database.entities.map(e =>
  `**${e.name}** (table: \`${e.tableName}\`)\n` +
  e.fields.map(f =>
    `  - \`${f.name}\`: ${f.type}${f.isPrimaryKey ? ' PK' : ''}${f.isNullable ? ' nullable' : ' NOT NULL'}${f.description ? ` — ${f.description}` : ''}`
  ).join('\n')
).join('\n\n')}

### API Routes
${devPlan.backend.apiRoutes.map(r =>
  `${r.method} ${r.path} — ${r.description}` +
  (r.params?.length ? `\n  Params: ${r.params.map(p => `${p.name} (${p.in}, ${p.type}${p.required ? ', required' : ''})`).join('; ')}` : '') +
  (r.jsonResponse ? `\n  Response: ${r.jsonResponse}` : '')
).join('\n')}

### Frontend Components
${devPlan.frontend.components.join('\n')}
` : '';

  return `You are a senior software architect. Based on the feature analysis below, generate developer implementation prompts split into sub-tasks — one set for API/backend (4A), one for frontend/UI (4B), and one for test automation (4C).

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values — titles and prompts — in that same language. Do not translate or mix languages.


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

## Test Scenarios to Cover (${scenarioCount} total)
${scenarioList}
${architectureSection}
---

## Sub-Task Breakdown Rules

- Produce exactly **${subTaskCount} sub-task(s) per category** (api, frontend, testing).
- Group logically related scenarios together into each sub-task (e.g. "Authentication flows", "Data CRUD", "Error handling").
- Title pattern: \`"API — [theme]"\`, \`"Frontend — [theme]"\`, \`"Testing — [theme]"\`.
- Each sub-task prompt must be **fully self-contained** (embed all context needed to implement that slice).
- Keep each sub-task prompt under **400 words**. Use placeholders for boilerplate — do not write full implementations.
- Always return arrays — for simple features (1 sub-task), still return an array with one element.

## Prompt Quality Rules (apply to every sub-task prompt)

**ALWAYS include** (complete, working code):
- Function/method signatures with correct types
- API routes with HTTP methods, paths, and response shapes${devPlan ? '\n- Reference exact entity names, field names, and API paths from the Development Architecture section above' : ''}
- Input validation derived from the business rules relevant to this sub-task
- Error handling derived from the error/boundary scenarios relevant to this sub-task

**PARTIALLY include** (scaffold only):
- Business logic → stub with \`// TODO: implement [specific rule]\` for each rule

**NEVER skip** (testing sub-tasks):
- Each testing sub-task must produce fully implemented test cases, not stubs
- One test per scenario covered by that sub-task

Each prompt must start with "You are an expert [role]." and embed all relevant context.

---

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "api":      [{ "title": "API — [theme]",      "prompt": "string" }],
  "frontend": [{ "title": "Frontend — [theme]", "prompt": "string" }],
  "testing":  [{ "title": "Testing — [theme]",  "prompt": "string" }]
}`;
}

/**
 * Builds the prompt for Step 4 Call A — workflow steps + backend architecture.
 * Shared across all provider implementations.
 */
export function buildDevPlanWorkflowBackendPrompt(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  scenarios: TestScenario[],
): string {
  return `You are a senior software architect. Based on the feature analysis below, define the user workflow and design the backend architecture.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}

## Actors
${behaviors.actors.map(a => `- ${a}`).join('\n')}

## Actions (atomic flows)
${behaviors.actions.map(a => `- ${a}`).join('\n')}

## Business Rules
${behaviors.rules.map(r => `- ${r}`).join('\n')}

## Domain Entities
${requirements.entities.join(', ')}

## Acceptance Criteria
${requirements.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

## Test Scenarios
${scenarios.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}`).join('\n')}

---

## Output Requirements

### 1. Workflow Steps
Produce an ordered list of user-facing workflow steps (the happy path from start to finish).
Each step: order (1-based), title (short action name), description (one sentence), actor (who performs this step).
Limit to 8 steps maximum.

### 2. Backend Plan

**Database Entities**: For each entity define:
- name: PascalCase model name (e.g. "Feature")
- tableName: snake_case DB table name (e.g. "features")
- fields: array of all fields needed to implement the feature. Each field:
  - name: camelCase field name
  - type: SQL-style type (e.g. "uuid", "varchar(255)", "int", "boolean", "timestamp", "text")
  - isPrimaryKey: true only for the primary key field
  - isNullable: true if the field can be null
  - description: optional one-sentence note (omit if obvious)
Also include relationships as plain strings (e.g. "User has many Orders").

**API Routes**: For each endpoint define:
- method: GET/POST/PUT/PATCH/DELETE
- path: e.g. /api/features/:id
- description: one sentence
- params: array of parameters. Each param: name, in ("path"|"query"|"body"), type (e.g. "string", "uuid", "number"), required (boolean). Include path params, key query params, and body fields for POST/PUT/PATCH.
- jsonResponse: a short JSON example string showing the response shape (e.g. '{"id":"uuid","name":"string"}' or '[{"id":"uuid"}]'). For DELETE use '{"message":"string"}'.
Include all CRUD routes plus any special operations needed.

**Folder Structure**: List file paths for the NestJS module (controller, service, module, DTOs, constants, helpers).
Follow the pattern: src/modules/<name>/<name>.controller.ts, etc.

---

Return ONLY valid JSON (no markdown, no explanation):
{
  "workflow": [
    { "order": 1, "title": "string", "description": "string", "actor": "string" }
  ],
  "backend": {
    "database": {
      "entities": [
        {
          "name": "string",
          "tableName": "string",
          "fields": [
            { "name": "string", "type": "string", "isPrimaryKey": false, "isNullable": false, "description": "string" }
          ]
        }
      ],
      "relationships": ["string"]
    },
    "apiRoutes": [
      {
        "method": "GET|POST|PUT|PATCH|DELETE",
        "path": "string",
        "description": "string",
        "params": [{ "name": "string", "in": "path|query|body", "type": "string", "required": true }],
        "jsonResponse": "string"
      }
    ],
    "folderStructure": ["string"]
  }
}`;
}

/**
 * Builds the prompt for Step 4 Call B — frontend architecture.
 * Receives a condensed text summary from Call A to keep token count low.
 */
export function buildDevPlanFrontendPrompt(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  workflowSummary: string,
): string {
  return `You are a senior frontend architect. Based on the feature analysis and workflow below, design the frontend architecture.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}

## Actors
${behaviors.actors.map(a => `- ${a}`).join('\n')}

## Acceptance Criteria
${requirements.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

## User Workflow
${workflowSummary}

---

## Output Requirements

Design the React frontend for this feature. Use Vite + React + TanStack Query + Zustand conventions.

- **components**: list each component as "ComponentName — one-line purpose". Include all form, list, card, panel, and modal components.
- **pages**: list page component names (e.g. "FeatureListPage", "FeatureDetailPage").
- **store**: list Zustand store slices or atoms needed (e.g. "featureStore — holds selected feature and list").
- **hooks**: list custom hooks (e.g. "useFeature(id) — fetches and caches a single feature").
- **utils**: list utility/helper functions (e.g. "formatFeatureName(name: string) — trims and capitalises").
- **services**: list API service functions (e.g. "featureService.create(data) — POST /api/features").

---

Return ONLY valid JSON (no markdown, no explanation):
{
  "components": ["string"],
  "pages": ["string"],
  "store": ["string"],
  "hooks": ["string"],
  "utils": ["string"],
  "services": ["string"]
}`;
}

/**
 * Builds the prompt for Step 4 Call C — testing plan.
 * Receives only condensed lists from Calls A & B to keep token count low.
 */
export function buildDevPlanTestingPrompt(
  requirements: ExtractedRequirements,
  scenarios: TestScenario[],
  apiRoutes: ApiRoute[],
  components: string[],
): string {
  const routeList = apiRoutes.map(r => `${r.method} ${r.path} — ${r.description}`).join('\n');
  const componentList = components.join('\n');

  return `You are a senior QA engineer. Based on the feature analysis below, create a testing plan.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Test Scenarios
${scenarios.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}`).join('\n')}

## Business Rules
${requirements.businessRules.map(r => `- ${r}`).join('\n')}

## API Routes
${routeList}

## Frontend Components
${componentList}

---

## Output Requirements

### Backend Unit Tests (NestJS Jest)
For each service method that corresponds to an API route, define test cases as strings.
Format: "ServiceName.method — scenario description" (e.g. "FeatureService.create — returns 400 when name is empty").
Cover: success cases, validation errors, not-found errors, authorization errors.

### Frontend Tests (React Testing Library + Vitest)
For each page or key component, define test cases as strings.
Format: "ComponentName — scenario description" (e.g. "FeatureForm — shows validation error when submitted empty").
Cover: render tests, user interaction tests, API error display tests.

---

Return ONLY valid JSON (no markdown, no explanation):
{
  "backendUnitTests": ["string"],
  "frontendTests": ["string"]
}`;
}

/**
 * Abstract base class for all AI providers.
 * Concrete implementations: GeminiProvider, ClaudeProvider, OpenAIProvider.
 */
export abstract class AIProvider {
  abstract readonly providerName: string;
  abstract readonly modelVersion: string;

  /**
   * Returns a shallow clone of this provider with `modelVersion` overridden.
   * All method calls on the clone use the new model string since they reference
   * `this.modelVersion` at call time.
   */
  withModel(model: string): AIProvider {
    const clone = Object.create(Object.getPrototypeOf(this)) as this;
    Object.assign(clone, this);
    (clone as any).modelVersion = model;
    return clone;
  }

  /**
   * Layer 1 (combined) — Extract both domain requirements and behaviors in a single API call.
   * Preferred over the separate methods to avoid sending the BA document twice.
   */
  abstract extractAll(baDocumentContent: string): Promise<CombinedExtraction>;

  /**
   * Layer 1 (synthesis) — Consolidates near-duplicate items from multi-chunk merges.
   * Only called by PipelineService when the document was split into more than one chunk.
   */
  abstract synthesiseExtraction(merged: CombinedExtraction): Promise<CombinedExtraction>;

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
   * Step 4 Call A — Generate workflow steps + backend architecture plan.
   */
  abstract generateDevPlanWorkflowBackend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
  ): Promise<{ workflow: WorkflowStep[]; backend: BackendPlan }>;

  /**
   * Step 4 Call B — Generate frontend architecture plan.
   * Receives a condensed text summary of workflow from Call A.
   */
  abstract generateDevPlanFrontend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    workflowSummary: string,
  ): Promise<FrontendPlan>;

  /**
   * Step 4 Call C — Generate testing plan.
   * Receives condensed API routes and component lists from Calls A & B.
   */
  abstract generateDevPlanTesting(
    requirements: ExtractedRequirements,
    scenarios: TestScenario[],
    apiRoutes: ApiRoute[],
    components: string[],
  ): Promise<TestingPlan>;

  /**
   * Layer 4 (Step 5) — Synthesize all pipeline outputs into a ready-to-copy prompt
   * for AI coding tools (Cursor, Copilot, Claude, etc.).
   * Optionally receives the Step 4 DevPlan to include architectural context in prompts.
   */
  abstract generateDevPrompt(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
    devPlan?: DevPlan,
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
