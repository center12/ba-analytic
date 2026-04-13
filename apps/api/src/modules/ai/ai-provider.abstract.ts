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
  userStoryId?: string;  // US-xx ID inherited from the scenario
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

// ── New Layer 1 (4-sublayer) types ────────────────────────────────────────────

/** Layer 1A — System & Business Rules Extraction */
export interface SSRData {
  featureName: string;
  functionalRequirements: string[]; // FR-xx  — feature-specific functional requirements
  systemRules: string[];      // SYS-xx — cross-cutting system policies
  businessRules: string[];    // BR-xx  — domain business rules
  constraints: string[];      // VR-xx / AC-xx — data/input constraints
  globalPolicies: string[];   // auth, audit, rate-limit, multi-tenancy policies
  entities: string[];         // key domain objects
}

/** A single user story produced by Layer 1B */
export interface UserStory {
  id: string;                   // US-01, US-02, ...
  actor: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[]; // AC-xx IDs specific to this story
  relatedRuleIds: string[];     // FR-xx / BR-xx / VR-xx / SYS-xx that govern this story
  priority: 'MUST' | 'SHOULD' | 'COULD';
}

/** Layer 1B — User Story Extraction */
export interface UserStories {
  featureName: string;
  stories: UserStory[];
}

/** One rule-to-stories traceability link produced by Layer 1C */
export interface RuleStoryLink {
  ruleId: string;              // FR-xx, BR-xx, VR-xx, SYS-xx, AC-xx
  ruleText: string;
  storyIds: string[];          // US-xx IDs this rule applies to
  coverage: 'full' | 'partial' | 'none';
}

/** Layer 1C — Traceability Mapping (rules ↔ stories) */
export interface Mapping {
  links: RuleStoryLink[];
  uncoveredRules: string[];      // rule IDs with coverage === 'none'
  storiesWithNoRules: string[];  // story IDs that have no mapped rules
}

/** A single quality issue detected by Layer 1D */
export interface ValidationIssue {
  type: 'missing_coverage' | 'ambiguous_story' | 'conflicting_rules' | 'incomplete_criteria' | 'orphan_story';
  severity: 'error' | 'warning' | 'info';
  affectedIds: string[];
  message: string;
  suggestion?: string;
}

/** Layer 1D — Validation Result (quality gate) */
export interface ValidationResult {
  isValid: boolean;
  score: number;       // 0–100 quality score
  issues: ValidationIssue[];
  summary: string;
}

/** Combined 1A+1B output — used during chunking/merging */
export interface Layer1ABPartial {
  ssr: SSRData;
  stories: UserStories;
}

/** Full Layer 1 extraction — all 4 sublayers */
export interface Layer1Extraction extends Layer1ABPartial {
  mapping: Mapping;
  validation: ValidationResult;
}

/** A single focused developer sub-task produced by Layer 4 */
export interface DevTaskItem {
  title: string;        // e.g. "API — Authentication endpoints"
  prompt: string;       // self-contained implementation prompt for this sub-task
  userStoryIds?: string[];  // US-xx IDs this task implements
}

/** Layer 4 — Dev Prompts (4A API · 4B Frontend · 4C Testing), each broken into 1..N sub-tasks */
export interface DevPrompt {
  api:      DevTaskItem[];   // 4A — backend sub-tasks
  frontend: DevTaskItem[];   // 4B — frontend sub-tasks
  testing:  DevTaskItem[];   // 4C — test automation sub-tasks
}

export type DevPromptSection = 'api' | 'frontend' | 'testing';

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

export interface SubFeatureItem {
  name: string;
  description: string;
  content?: string;
}

export interface DatabaseEntity {
  name: string;
  tableName: string;
  fields: DatabaseField[];
  indexes?: string[];      // e.g. "idx_orders_user_id ON orders(user_id)"
  constraints?: string[];  // e.g. "UNIQUE(user_id, date)", "CHECK(amount > 0)"
  softDelete?: boolean;    // true if table uses deleted_at soft-delete pattern
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
  jsonResponse: string;   // JSON example as string, e.g. '{"id":"uuid","name":"string"}'
  requestBody?: string;   // JSON example for POST/PUT/PATCH request payload
  errorCases?: string[];  // e.g. "404 — resource not found", "422 — invalid input"
}

export interface QueryDesign {
  name: string;        // e.g. "List orders with cursor pagination"
  sql: string;         // The SQL query
  isPaginated: boolean;
}

export interface TransactionBoundary {
  where: string;  // operation / endpoint
  why: string;    // reason atomicity is needed
}

export interface CacheEntry {
  key: string;         // Redis key pattern, e.g. "order:{id}"
  ttl: string;         // e.g. "300s", "1h"
  description: string;
}

export interface BackendTask {
  title: string;
  description: string;     // Implementation detail, ≤ 1 day scope
  userStoryIds?: string[]; // US-xx IDs this task implements
}

export interface BackendPlan {
  database: {
    entities: DatabaseEntity[];
    relationships: string[];
  };
  apiRoutes: ApiRoute[];
  folderStructure: string[];
  featureOverview?: string;
  businessLogicFlow?: string[];
  queryDesign?: QueryDesign[];
  transactions?: TransactionBoundary[];
  cachingStrategy?: CacheEntry[];
  validationRules?: string[];
  security?: string[];
  backendTasks?: BackendTask[];
}

export interface FrontendTask {
  id: string;              // "FE-01", "FE-02", ...
  title: string;
  description: string;
  userStoryIds?: string[]; // US-xx IDs this task implements
}

export interface StateManagement {
  local: string[];    // "ComponentName — stateVar: type"
  global: string[];   // "storeName (Zustand) — fields"
  tool: string;       // e.g. "Zustand"
}

export interface ApiIntegration {
  services: string[];     // "service.method(params) — VERB /path"
  apiMapping: string[];   // "METHOD /path → Component — trigger"
  errorMapping: string[]; // "status → UI behavior"
}

export interface FrontendPlan {
  components: string[];   // "ComponentName — purpose"
  pages: string[];
  store: string[];
  hooks: string[];
  utils: string[];
  services: string[];
  stateManagement?: StateManagement;
  apiIntegration?: ApiIntegration;
  validation?: string[];    // "field — rule description"
  uxStates?: string[];      // "ComponentName[loading] — description"
  routing?: string[];       // "/path → PageComponent — guard"
  errorHandling?: string[]; // "scenario → UI behavior"
  frontendTasks?: FrontendTask[];
}

export interface TestingTask {
  id: string;              // "QA-BE-01" or "QA-FE-01"
  title: string;
  description: string;
  userStoryIds?: string[]; // US-xx IDs this task covers
}

export interface ApiTestScenario {
  name: string;        // "Valid request — happy path"
  steps: string[];
  expectedResponse: string;
  expectedStatus: number;
}

export interface ApiEndpointTests {
  endpoint: string;    // "POST /api/orders"
  scenarios: ApiTestScenario[];
}

export interface UiTestScenario {
  name: string;        // "Renders empty state"
  steps: string[];
  expectedBehavior: string;
}

export interface UiScreenTests {
  screen: string;      // "OrderList Page"
  scenarios: UiTestScenario[];
}

export interface BackendTestingPlan {
  testScenarios: string[];
  apiTestCases: ApiEndpointTests[];
  databaseTesting: string[];
  businessLogicTesting: string[];
  paginationQueryTesting: string[];
  performanceTesting: string[];
  securityTesting: string[];
  errorHandlingTesting: string[];
  tasks: TestingTask[];   // QA-BE-xx
}

export interface FrontendTestingPlan {
  testScenarios: string[];
  uiTestCases: UiScreenTests[];
  validationTesting: string[];
  uxStateTesting: string[];
  apiIntegrationTesting: string[];
  routingNavigationTesting: string[];
  crossBrowserTesting: string[];
  edgeCases: string[];
  tasks: TestingTask[];   // QA-FE-xx
}

export interface TestingPlan {
  backend: BackendTestingPlan;
  frontend: FrontendTestingPlan;
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
  userStoryId?: string;  // US-xx ID of the primary user story this scenario covers
}

export function appendPromptInstructions(basePrompt: string, promptAppend?: string): string {
  const extra = promptAppend?.trim();
  if (!extra) return basePrompt;
  return `${basePrompt}

---

Additional user instructions (must still follow every output schema and format rule above):
${extra}`;
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

TEXT CLEANUP RULE:
- Remove citation artifacts and formatting noise from extracted values, including tokens such as [cite_start], [cite: 12], markdown bold/italic markers, and stray footnote wrappers.
- Preserve the actual requirement text and IDs after cleanup.

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
 * Builds the prompt for the new Layer 1 combined SSR + User Stories extraction (1A+1B).
 * Replaces buildExtractAllPrompt for new pipeline runs.
 */
export function buildExtractSSRAndStoriesPrompt(
  baDocumentContent: string,
  chunkInfo?: { index: number; total: number },
): string {
  const chunkHeader = chunkInfo && chunkInfo.total > 1
    ? `[Chunk ${chunkInfo.index + 1} of ${chunkInfo.total} — partial section of a larger document. Extract every item present; items from other chunks will be merged later.]\n\n`
    : '';

  return `You are a senior business analyst. Read the following BA document and extract TWO things in a single pass.

LANGUAGE RULE: Detect the primary language of the document (English or Vietnamese). Write ALL extracted values in that same language. Do not translate or mix languages.

ID PRESERVATION RULE: Keep all prefixed IDs (FR-xx, BR-xx, AC-xx, VR-xx, SYS-xx, US-xx) verbatim.

TEXT CLEANUP RULE:
- Remove citation artifacts and formatting noise from extracted values, including tokens such as [cite_start], [cite: 12], markdown bold/italic markers, and stray wrappers around IDs.
- Preserve the actual requirement text and all IDs after cleanup.

CONTEXT BOUNDARY RULE:
- The main feature document is the primary extraction target.
- Supplemental sections appended under headings such as "## Project Overview Context", "## Related Features & Rules", or "### Related Feature:" are reference context only.
- Use supplemental context only to resolve ambiguity or note dependencies.
- Do NOT copy stories, rules, entities, or acceptance criteria from supplemental context unless they are explicitly restated in the primary feature content.

Document format notes:
- Structured Markdown with ## section headings.
- List items may carry ID prefixes — preserve them.
- Acceptance Criteria appear as Markdown tables (ID | Given | When | Then). Extract each row as: "AC-01: Given [...], When [...], Then [...]".
- Data Entities appear as Markdown tables under ### sub-headings.
- User Stories may appear as "As a [actor], I want [action], so that [benefit]" bullet items.

1. SYSTEM & BUSINESS RULES (SSR):
   - featureName: primary feature name from the # title
   - functionalRequirements: feature-specific functional requirements and capabilities (FR-xx). Preserve IDs verbatim.
   - Every requirement listed under headings such as "## Functional Requirements", "## Yêu cầu chức năng", or equivalent MUST be extracted into functionalRequirements.
   - Do NOT drop, summarize, merge away, or reclassify FR-xx items into systemRules just because similar user stories or actions exist elsewhere in the document.
   - systemRules: system-level constraints and global policies that apply across the feature (SYS-xx). Examples: auth requirements, audit logging, rate limiting, multi-tenancy isolation.
   - businessRules: domain rules governing business logic (BR-xx). Preserve IDs verbatim.
   - constraints: data validations, format rules, size limits, conditional requirements (VR-xx, AC-xx constraint items). Preserve IDs verbatim.
   - globalPolicies: cross-cutting concerns not already in systemRules (e.g. GDPR retention, currency handling, timezone rules).
   - entities: key domain objects / models mentioned.

2. USER STORIES:
   - For each distinct feature unit, produce one user story.
   - Stories must be narrower than the whole feature and focused on one concrete user goal.
   - Split broad combined actions into separate stories when the source describes different flows, UI triggers, or rule sets. Examples: split "thêm mới" vs "chỉnh sửa", and split "import" vs "export", unless the source clearly treats them as one inseparable capability.
   - id: sequential US-01, US-02, ... (preserve existing US-xx IDs if present in doc).
   - actor: the role or persona.
   - action: what the actor wants to do (verb phrase, under 15 words). Keep it specific and implementation-facing enough to distinguish nearby flows.
   - benefit: the "so that" rationale (under 15 words).
   - acceptanceCriteria: AC-xx IDs only that apply specifically to this story. Do NOT include Given/When/Then text here.
   - relatedRuleIds: FR-xx, BR-xx, VR-xx, SYS-xx IDs that govern this story (pre-fill from above).
   - When a story is clearly derived from or implements one or more FR-xx items, include those FR-xx IDs in relatedRuleIds.
   - Prefer explicit traceability: if a search story corresponds to FR-02, include FR-02; if an import/export story corresponds to FR-04 and FR-05, include both.
   - priority: MUST (core functional), SHOULD (important but not blocking), COULD (nice-to-have).

Be thorough — missing a story or rule means missing test coverage.

BA Document:
${chunkHeader}${baDocumentContent}

---

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "ssr": {
    "featureName": "string",
    "functionalRequirements": ["string"],
    "systemRules": ["string"],
    "businessRules": ["string"],
    "constraints": ["string"],
    "globalPolicies": ["string"],
    "entities": ["string"]
  },
  "stories": {
    "featureName": "string",
    "stories": [
      {
        "id": "US-01",
        "actor": "string",
        "action": "string",
        "benefit": "string",
        "acceptanceCriteria": ["AC-01"],
        "relatedRuleIds": ["string"],
        "priority": "MUST | SHOULD | COULD"
      }
    ]
  }
}`;
}

/**
 * Builds the Layer 1A prompt for extracting SSR data only.
 */
export function buildExtractSSRPrompt(
  baDocumentContent: string,
  chunkInfo?: { index: number; total: number },
): string {
  const chunkHeader = chunkInfo && chunkInfo.total > 1
    ? `[Chunk ${chunkInfo.index + 1} of ${chunkInfo.total} — partial section of a larger document. Extract every SSR item present; items from other chunks will be merged later.]\n\n`
    : '';

  return `You are a senior business analyst. Read the following BA document and extract ONLY the structured SSR rule inventory.

LANGUAGE RULE: Detect the primary language of the document (English or Vietnamese). Write ALL extracted values in that same language. Do not translate or mix languages.

ID PRESERVATION RULE: Keep all prefixed IDs (FR-xx, BR-xx, AC-xx, VR-xx, SYS-xx, US-xx) verbatim.

TEXT CLEANUP RULE:
- Remove citation artifacts and formatting noise from extracted values, including tokens such as [cite_start], [cite: 12], markdown bold/italic markers, and stray wrappers around IDs.
- Preserve the actual requirement text and all IDs after cleanup.

CONTEXT BOUNDARY RULE:
- The main feature document is the primary extraction target.
- Supplemental sections appended under headings such as "## Project Overview Context", "## Related Features & Rules", or "### Related Feature:" are reference context only.
- Use supplemental context only to resolve ambiguity or note dependencies.
- Do NOT copy stories, rules, entities, or acceptance criteria from supplemental context unless they are explicitly restated in the primary feature content.

Document format notes:
- Structured Markdown with ## section headings.
- List items may carry ID prefixes — preserve them.
- Acceptance Criteria appear as Markdown tables (ID | Given | When | Then). These are supporting context for constraints/story traceability and should not be emitted directly in SSR output unless an AC item is acting as a constraint in the source.
- Data Entities appear as Markdown tables under ### sub-headings.

Extract ONLY this SSR structure:
- featureName: primary feature name from the # title
- functionalRequirements: feature-specific functional requirements and capabilities (FR-xx). Preserve IDs verbatim.
- Every requirement listed under headings such as "## Functional Requirements", "## Yêu cầu chức năng", or equivalent MUST be extracted into functionalRequirements.
- Do NOT drop, summarize, merge away, or reclassify FR-xx items into systemRules just because similar user stories or actions exist elsewhere in the document.
- systemRules: system-level constraints and global policies that apply across the feature (SYS-xx). Examples: auth requirements, audit logging, rate limiting, multi-tenancy isolation.
- businessRules: domain rules governing business logic (BR-xx). Preserve IDs verbatim.
- constraints: data validations, format rules, size limits, conditional requirements (VR-xx, AC-xx constraint items). Preserve IDs verbatim.
- globalPolicies: cross-cutting concerns not already in systemRules (e.g. GDPR retention, currency handling, timezone rules).
- entities: key domain objects / models mentioned.

Be thorough — missing a rule means missing downstream traceability and test coverage.

BA Document:
${chunkHeader}${baDocumentContent}

---

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "featureName": "string",
  "functionalRequirements": ["string"],
  "systemRules": ["string"],
  "businessRules": ["string"],
  "constraints": ["string"],
  "globalPolicies": ["string"],
  "entities": ["string"]
}`;
}

/**
 * Builds the Layer 1B prompt for extracting user stories using SSR as canonical context.
 */
export function buildExtractUserStoriesPrompt(
  baDocumentContent: string,
  ssr: SSRData,
  chunkInfo?: { index: number; total: number },
): string {
  const chunkHeader = chunkInfo && chunkInfo.total > 1
    ? `[Chunk ${chunkInfo.index + 1} of ${chunkInfo.total} — partial section of a larger document. Extract every user story present; stories from other chunks will be merged later.]\n\n`
    : '';

  return `You are a senior business analyst. Read the following BA document and extract ONLY user stories.

LANGUAGE RULE: Detect the primary language of the document (English or Vietnamese). Write ALL extracted values in that same language. Do not translate or mix languages.

ID PRESERVATION RULE: Keep all prefixed IDs (FR-xx, BR-xx, AC-xx, VR-xx, SYS-xx, US-xx) verbatim.

TEXT CLEANUP RULE:
- Remove citation artifacts and formatting noise from extracted values, including tokens such as [cite_start], [cite: 12], markdown bold/italic markers, and stray wrappers around IDs.
- Preserve the actual requirement text and all IDs after cleanup.

CONTEXT BOUNDARY RULE:
- The main feature document is the primary extraction target.
- Supplemental sections appended under headings such as "## Project Overview Context", "## Related Features & Rules", or "### Related Feature:" are reference context only.
- Use supplemental context only to resolve ambiguity or note dependencies.
- Do NOT copy stories or requirements from supplemental context unless they are explicitly restated in the primary feature content.

Canonical SSR context (already extracted from the same primary feature document):
${JSON.stringify(ssr, null, 0)}

USER STORY RULES:
- Produce stories that are narrower than the whole feature and focused on one concrete user goal.
- Split broad combined actions into separate stories when the source describes different flows, UI triggers, or rule sets.
- Especially split "thêm mới" vs "chỉnh sửa", and split "import" vs "export", unless the source clearly treats them as one inseparable capability.
- Do NOT restate the full SSR inventory as stories.
- Do NOT create umbrella stories that merely summarize many FR-xx items at once.
- Stories must stay scoped to the primary feature document, not related-feature context.

For each story:
- id: sequential US-01, US-02, ... (preserve existing US-xx IDs if present in doc)
- actor: the role or persona
- action: what the actor wants to do (verb phrase, under 15 words). Keep it specific and implementation-facing enough to distinguish nearby flows.
- benefit: the "so that" rationale (under 15 words)
- acceptanceCriteria: AC-xx IDs only that apply specifically to this story. Do NOT include Given/When/Then text here.
- relatedRuleIds: FR-xx, BR-xx, VR-xx, SYS-xx IDs that govern this story
- When a story is clearly derived from or implements one or more FR-xx items, include those FR-xx IDs in relatedRuleIds.
- Prefer explicit traceability: if a search story corresponds to FR-02, include FR-02; if separate import and export stories correspond to FR-04 and FR-05, include them separately.
- Only include rules that truly govern the story; avoid attaching unrelated rules just to increase coverage.
- priority: MUST (core functional), SHOULD (important but not blocking), COULD (nice-to-have)

BA Document:
${chunkHeader}${baDocumentContent}

---

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "featureName": "string",
  "stories": [
    {
      "id": "US-01",
      "actor": "string",
      "action": "string",
      "benefit": "string",
      "acceptanceCriteria": ["AC-01"],
      "relatedRuleIds": ["string"],
      "priority": "MUST | SHOULD | COULD"
    }
  ]
}`;
}

/**
 * Builds the Layer 1A synthesis prompt for deduplicating merged SSR chunks.
 */
export function buildSSRSynthesisPrompt(merged: SSRData): string {
  return `You are a business analyst. The SSR data below was extracted from multiple chunks of the same BA document and may contain near-duplicate or split entries.

LANGUAGE RULE: Preserve the language of each string value as-is. Do not translate.

Consolidation rules:
- Items carrying ID prefixes (FR-xx, BR-xx, VR-xx, SYS-xx, AC-xx) are DISTINCT — preserve each ID and text unchanged. Never merge items with different IDs.
- Never remove a functional requirement from functionalRequirements just because a similar action or story exists elsewhere.
- Remove citation artifacts and markdown formatting noise from every string while preserving the underlying text and IDs.
- Items without IDs: merge only if they describe exactly the same concept; otherwise keep both.
- Remove exact string duplicates.
- Keep concise; do not reword.

${JSON.stringify(merged, null, 0)}

Return the same JSON structure with duplicates removed. Preserve all IDs verbatim.`;
}

/**
 * Builds the Layer 1B synthesis prompt for deduplicating merged user story chunks.
 */
export function buildUserStoriesSynthesisPrompt(merged: UserStories, ssr: SSRData): string {
  return `You are a business analyst. The user stories below were extracted from multiple chunks of the same BA document and may contain near-duplicate or overlapping stories.

LANGUAGE RULE: Preserve the language of each string value as-is. Do not translate.

Canonical SSR context:
${JSON.stringify(ssr, null, 0)}

Consolidation rules:
- User stories must remain narrower than the full feature and represent one concrete user goal each.
- Split broad combined stories when the source clearly separates the flows or the SSR maps them to different FR-xx items.
- Remove citation artifacts and markdown formatting noise from every string while preserving the underlying text and IDs.
- Deduplicate by id when the same story ID appears more than once.
- If IDs differ but two stories describe the same concrete user goal, keep the more specific one and drop the broader duplicate.
- Preserve AC IDs only in acceptanceCriteria arrays.
- Preserve relatedRuleIds only when they truly govern the story; keep them traceable to the canonical SSR above.
- Do not invent stories that are not supported by the primary feature document.

${JSON.stringify(merged, null, 0)}

Return the same JSON structure with duplicates removed and story granularity improved. Preserve all IDs verbatim.`;
}

/**
 * Builds the Layer 1 synthesis prompt for deduplicating merged 1A+1B chunks.
 */
export function buildLayer1SynthesisPrompt(merged: Layer1ABPartial): string {
  return `You are a business analyst. The data below was extracted from multiple chunks of the same BA document and may contain near-duplicate or split entries.

LANGUAGE RULE: Preserve the language of each string value as-is. Do not translate.

Consolidation rules:
- Items carrying ID prefixes (FR-xx, BR-xx, VR-xx, SYS-xx, US-xx, AC-xx) are DISTINCT — preserve each ID and text unchanged. Never merge items with different IDs.
- Never remove a functional requirement from ssr.functionalRequirements just because a similar user story or action appears elsewhere.
- Remove citation artifacts and markdown formatting noise from every string while preserving the underlying text and IDs.
- Items without IDs: merge only if they describe exactly the same concept; otherwise keep both.
- For user stories: deduplicate by id field. If two stories share the same id, keep the more detailed one.
- For story acceptanceCriteria arrays: preserve AC IDs only. Remove any criterion text and keep unique AC-xx IDs.
- Remove exact string duplicates.
- Keep concise; do not reword.

${JSON.stringify(merged, null, 0)}

Return the same JSON structure (ssr + stories) with duplicates removed. Preserve all IDs verbatim.`;
}

/**
 * Builds the Layer 1C mapping prompt — links rules to user stories.
 */
export function buildMappingPrompt(ssr: SSRData, stories: UserStories): string {
  const allRules = [
    ...ssr.functionalRequirements.map(r => ({ id: extractAnyRuleId(r, 'FR'), text: r })),
    ...ssr.systemRules.map(r => ({ id: extractAnyRuleId(r, 'SYS'), text: r })),
    ...ssr.businessRules.map(r => ({ id: extractAnyRuleId(r, 'BR'), text: r })),
    ...ssr.constraints.map(r => ({ id: extractAnyRuleId(r, 'VR'), text: r })),
    ...ssr.globalPolicies.map((r, i) => ({ id: `GP-${String(i + 1).padStart(2, '0')}`, text: r })),
  ];

  const storyList = stories.stories.map(s =>
    `${s.id}: As a ${s.actor}, I want ${s.action} (priority: ${s.priority}) | AC IDs: ${s.acceptanceCriteria.join(', ') || 'none'} | Related rules: ${s.relatedRuleIds.join(', ') || 'none'}`
  ).join('\n');

  const ruleList = allRules.map(r => `${r.id}: ${r.text}`).join('\n');

  return `You are a business analyst creating a requirements traceability matrix.

LANGUAGE RULE: Preserve input language. Do not translate.
ID PRESERVATION RULE: For every rule, copy the exact source ID prefix and number into ruleId. Do not rename AC-xx to VR-xx, and do not invent fallback IDs when an ID already exists in ruleText.
TRACEABILITY RULE: If a user story clearly implements an FR-xx functional requirement, map that FR-xx to the story even when the story phrasing is shorter or paraphrased.

Given the rules and user stories below, map which rules apply to which stories.

## Rules
${ruleList}

## User Stories
${storyList}

STRICT COMPLETENESS RULES:
- Return exactly one link entry for every rule listed in ## Rules.
- Never omit a rule from links, even if no story matches it.
- If no story covers a rule, return that rule with storyIds: [] and coverage: "none".

For each rule, determine:
- storyIds: which US-xx IDs this rule applies to
- coverage: 'full' (story explicitly addresses the rule), 'partial' (story is related but doesn't fully cover it), 'none' (no story covers this rule)

Also identify:
- uncoveredRules: rule IDs where coverage === 'none'
- storiesWithNoRules: US-xx IDs that no rule maps to

Return ONLY valid JSON (no markdown, no explanation):
{
  "links": [
    {
      "ruleId": "string",
      "ruleText": "string",
      "storyIds": ["US-01"],
      "coverage": "full | partial | none"
    }
  ],
  "uncoveredRules": ["string"],
  "storiesWithNoRules": ["string"]
}`;
}

/**
 * Builds the Layer 1D validation prompt — quality gate for the extraction.
 */
export function buildValidationPrompt(ssr: SSRData, stories: UserStories, mapping: Mapping): string {
  const storyCount = stories.stories.length;
  const ruleCount =
    ssr.functionalRequirements.length +
    ssr.businessRules.length +
    ssr.systemRules.length +
    ssr.constraints.length;
  const uncoveredCount = mapping.uncoveredRules.length;
  const orphanCount = mapping.storiesWithNoRules.length;
  const storiesWithNoAC = stories.stories.filter(s => s.acceptanceCriteria.length === 0).map(s => s.id);
  const ambiguousStories = stories.stories
    .filter(s => !s.actor || !s.action || !s.benefit || s.actor.trim() === '' || s.action.trim() === '')
    .map(s => s.id);

  return `You are a QA architect reviewing extracted requirements for quality.

LANGUAGE RULE: Write all issue messages and summary in the same language as the input data.

Evaluate the Layer 1 extraction for quality issues:

## Summary Statistics
- Total user stories: ${storyCount}
- Total rules: ${ruleCount}
- Uncovered rules (no story maps to them): ${uncoveredCount} — IDs: ${mapping.uncoveredRules.join(', ') || 'none'}
- Orphan stories (no rules map to them): ${orphanCount} — IDs: ${mapping.storiesWithNoRules.join(', ') || 'none'}
- Stories missing acceptance criteria: ${storiesWithNoAC.length} — IDs: ${storiesWithNoAC.join(', ') || 'none'}
- Potentially ambiguous stories: ${ambiguousStories.length} — IDs: ${ambiguousStories.join(', ') || 'none'}

## User Stories
${stories.stories.map(s => `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit} | AC: ${s.acceptanceCriteria.length} | Rules: ${s.relatedRuleIds.join(', ') || 'none'}`).join('\n')}

## Mapping Coverage
${mapping.links.filter(l => l.coverage !== 'full').map(l => `${l.ruleId} → ${l.coverage}: stories [${l.storyIds.join(', ') || 'none'}]`).join('\n') || 'All rules fully covered'}

---

Issue types to check:
- missing_coverage: rules with no story covering them
- ambiguous_story: story with missing/vague actor, action, or benefit
- conflicting_rules: contradictory constraints or rules
- incomplete_criteria: story has no acceptance criteria
- orphan_story: story with no mapped rules

Severity:
- error: blocks test generation (missing_coverage for critical rules, ambiguous_story)
- warning: degrades quality but doesn't block
- info: improvement suggestion

Score formula: start at 100, subtract 10 per error issue, 3 per warning issue, 1 per info issue. Floor at 0.

Return ONLY valid JSON (no markdown, no explanation):
{
  "isValid": true,
  "score": 85,
  "issues": [
    {
      "type": "missing_coverage | ambiguous_story | conflicting_rules | incomplete_criteria | orphan_story",
      "severity": "error | warning | info",
      "affectedIds": ["string"],
      "message": "string",
      "suggestion": "string"
    }
  ],
  "summary": "string"
}`;
}

/** Extract any recognized prefixed ID while preserving its original prefix. */
export function extractAnyRuleId(text: string, fallbackPrefix: string): string {
  const match = text.match(/\b([A-Z]{2,}-\d+)\b/i);
  return match ? match[1] : `${fallbackPrefix}-??`;
}

export function extractAcceptanceCriteriaIds(items: string[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    const matches = item.match(/\bAC-\d+\b/gi) ?? [];
    matches.forEach((match) => ids.push(match.toUpperCase()));
  }
  return [...new Set(ids)];
}

/**
 * Builds the prompt for Layer 2 scenario planning.
 * Shared across all provider implementations.
 */
export function buildPlanScenariosPrompt(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  userStories?: UserStory[],
): string {
  const userStoriesSection = userStories && userStories.length > 0 ? `
## User Stories (Layer 1B — primary input)
${userStories.map(s =>
  `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}` +
  (s.acceptanceCriteria.length ? `\n   AC: ${s.acceptanceCriteria.join('; ')}` : '') +
  (s.relatedRuleIds.length ? `\n   Rules: ${s.relatedRuleIds.join(', ')}` : '')
).join('\n')}
` : '';

  const userStoryInstruction = userStories && userStories.length > 0
    ? `- userStoryId: the US-xx ID of the user story this scenario primarily verifies (must match one of the US-xx IDs above)`
    : '';

  const schemaUserStoryField = userStories && userStories.length > 0
    ? `,\n    "userStoryId": "US-xx"`
    : '';

  return `You are a QA strategist. Using the user stories and domain context below, identify ALL test scenarios that need to be covered.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values — titles and requirementRefs phrases — in that same language. Do not translate or mix languages.
${userStoriesSection}
## Domain Requirements (Layer 1A — supporting context)
Features: ${requirements.features.join('\n- ')}
Business Rules: ${requirements.businessRules.join('\n- ')}
Acceptance Criteria: ${requirements.acceptanceCriteria.join('\n- ')}
Entities: ${requirements.entities.join(', ')}

## Behaviors
Feature: ${behaviors.feature}
Actors: ${behaviors.actors.join(', ')}
Actions:
- ${behaviors.actions.join('\n- ')}
Rules:
- ${behaviors.rules.join('\n- ')}

For each scenario specify:
- title: short descriptive name
- type: one of happy_path | edge_case | error | boundary | security
- requirementRefs: which requirements or actions this scenario covers — use the item's ID when one is present (e.g. "FR-01", "BR-03", "AC-02", "US-01"); use a short phrase only when there is no ID
${userStoryInstruction}

${userStories && userStories.length > 0 ? 'Generate at least one scenario per user story. ' : ''}Ensure complete coverage. Return at most 15 scenarios. Prioritise happy_path and error scenarios. Be concise — one line per title.

---

Return ONLY valid JSON — a plain array matching this exact structure (no markdown, no explanation):
[
  {
    "title": "string",
    "type": "happy_path | edge_case | error | boundary | security",
    "requirementRefs": ["string"]${schemaUserStoryField}
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
  userStories?: UserStory[],
): string {
  const userStoriesSection = userStories && userStories.length > 0 ? `
## User Stories (primary intent)
${userStories.map(s =>
  `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}` +
  (s.acceptanceCriteria.length ? `\n   AC: ${s.acceptanceCriteria.join('; ')}` : '') +
  (s.relatedRuleIds.length ? `\n   Rules: ${s.relatedRuleIds.join(', ')}` : '')
).join('\n')}
` : '';

  return `You are a QA engineer. Write detailed, executable test cases for each of the following scenarios.

LANGUAGE RULE: Detect the primary language of the input scenarios and domain context (English or Vietnamese). Write ALL output string values — title, description, preconditions, action, expectedResult — in that same language. Do not translate or mix languages.

${userStoriesSection}
Domain context:
Entities: ${requirements.entities.join(', ')}
Business Rules: ${requirements.businessRules.join('\n- ')}

Scenarios to cover:
${scenarios.map((s, i) =>
  `${i + 1}. [${s.type.toUpperCase()}] ${s.title}` +
  (s.userStoryId ? `\n   Primary story: ${s.userStoryId}` : '') +
  `\n   Covers: ${s.requirementRefs.join('; ')}`
).join('\n')}

For each scenario write a concise test case:
- title: copy exactly from the scenario title
- description: one sentence describing what is being tested
- preconditions: one sentence describing the required system state
- priority: HIGH (critical path/security), MEDIUM (important features), LOW (edge cases)
- steps: at most 6 steps, each action and expectedResult under 20 words
- When a scenario has userStoryId, use that user story's actor, action, benefit, acceptance criteria, and related rules as the primary testing intent
- Use requirementRefs as supporting traceability context, not the primary planning unit

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
  targetSection?: DevPromptSection,
  userStories?: UserStory[],
): string {
  const scenarioCount = scenarios.length;

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
  (r.requestBody ? `\n  Request: ${r.requestBody}` : '') +
  (r.jsonResponse ? `\n  Response: ${r.jsonResponse}` : '') +
  (r.errorCases?.length ? `\n  Errors: ${r.errorCases.join(' | ')}` : '')
).join('\n')}
${devPlan.backend.security?.length ? `
### Security Requirements
${devPlan.backend.security.map(s => `- ${s}`).join('\n')}` : ''}${devPlan.backend.cachingStrategy?.length ? `
### Caching (Redis)
${devPlan.backend.cachingStrategy.map(c => `- key \`${c.key}\` (TTL ${c.ttl}): ${c.description}`).join('\n')}` : ''}${devPlan.backend.backendTasks?.length ? `
### Pre-scoped Backend Tasks
${devPlan.backend.backendTasks.map((t, i) => `${i + 1}. **${t.title}** — ${t.description}`).join('\n')}` : ''}
### Frontend Components
${devPlan.frontend.components.join('\n')}
${devPlan.frontend.frontendTasks?.length ? `
### Pre-scoped Frontend Tasks
${devPlan.frontend.frontendTasks.map(t => `${t.id}. **${t.title}** — ${t.description}`).join('\n')}` : ''}${devPlan.testing?.backend?.tasks?.length ? `
### Pre-scoped Backend Testing Tasks
${devPlan.testing.backend.tasks.map(t => `${t.id}. **${t.title}** — ${t.description}`).join('\n')}` : ''}${devPlan.testing?.frontend?.tasks?.length ? `
### Pre-scoped Frontend Testing Tasks
${devPlan.testing.frontend.tasks.map(t => `${t.id}. **${t.title}** — ${t.description}`).join('\n')}` : ''}
` : '';

  const sectionScope = targetSection
    ? `Generate prompts for **${targetSection.toUpperCase()} section only**.`
    : 'Generate prompts for all three sections: api, frontend, testing.';

  const outputInstruction = targetSection
    ? `Return all keys (\`api\`, \`frontend\`, \`testing\`). Populate only \`${targetSection}\`; all other keys must be empty arrays.`
    : 'Return all keys with generated arrays for api, frontend, and testing.';

  const userStoriesSection = userStories && userStories.length > 0 ? `
## User Stories (implement all of these)
${userStories.map(s => `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}`).join('\n')}
` : '';

  return `You are a senior software architect. Based on the feature analysis below, generate developer implementation prompts split into sub-tasks — one set for API/backend (4A), one for frontend/UI (4B), and one for test automation (4C).

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values — titles and prompts — in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}
${userStoriesSection}
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

## Section Scope
${sectionScope}

## Sub-Task Breakdown Rules

- Generate **as many sub-task(s) as needed per category** (api, frontend, testing) to cover all required implementation and verification work.
- Split tasks by clear vertical slices and keep each task independently deliverable in **<= 8 hours**.
- Group logically related scenarios together into each sub-task (e.g. "Authentication flows", "Data CRUD", "Error handling"), but do not overload one task beyond the 8-hour scope.
- Title pattern: \`"API — [theme]"\`, \`"Frontend — [theme]"\`, \`"Testing — [theme]"\`.
- Each sub-task prompt must be **fully self-contained** (embed all context needed to implement that slice).
- Keep each sub-task prompt under **400 words**. Use placeholders for boilerplate — do not write full implementations.
- Always return arrays — for simple features (1 sub-task), still return an array with one element.
${userStories && userStories.length > 0 ? '- userStoryIds: list the US-xx IDs that this sub-task implements.\n' : ''}
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
${outputInstruction}
{
  "api":      [{ "title": "API — [theme]",      "prompt": "string"${userStories && userStories.length > 0 ? ', "userStoryIds": ["US-01"]' : ''} }],
  "frontend": [{ "title": "Frontend — [theme]", "prompt": "string"${userStories && userStories.length > 0 ? ', "userStoryIds": ["US-01"]' : ''} }],
  "testing":  [{ "title": "Testing — [theme]",  "prompt": "string"${userStories && userStories.length > 0 ? ', "userStoryIds": ["US-01"]' : ''} }]
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
  userStories?: UserStory[],
): string {
  const userStoriesSection = userStories && userStories.length > 0 ? `
## User Stories
${userStories.map(s => `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}`).join('\n')}
` : '';

  return `You are a senior software architect. Based on the feature analysis below, define the user workflow and produce a comprehensive, highly technical backend plan.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}
${userStoriesSection}
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
${scenarios.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] ${s.title}${s.userStoryId ? ` (US: ${s.userStoryId})` : ''}`).join('\n')}

---

## Output Requirements

### 1. Workflow Steps
Produce an ordered list of user-facing workflow steps (the happy path from start to finish).
Each step: order (1-based), title (short action name), description (one sentence), actor (who performs this step).
Limit to 8 steps maximum.

### 2. Feature Overview
One paragraph summarising what this feature does from a technical perspective.

### 3. Database Design (PostgreSQL)
For each entity define:
- name: PascalCase model name (e.g. "Order")
- tableName: snake_case table name (e.g. "orders")
- fields: all columns. Each field: name (camelCase), type (SQL-style: "uuid", "varchar(255)", "int", "boolean", "timestamp", "text", "jsonb"), isPrimaryKey, isNullable, description (optional).
  Prefer UUID primary keys. Include created_at / updated_at timestamps on every table.
- indexes: CREATE INDEX statements for query-pattern-driven indexes (e.g. "CREATE INDEX idx_orders_user_id ON orders(user_id)"). List only meaningful indexes.
- constraints: UNIQUE or CHECK constraints (e.g. "UNIQUE(user_id, date)", "CHECK(amount > 0)").
- softDelete: true if the table should support soft-delete via a deleted_at column.

### 4. Relationships
Plain-text relationship descriptions (e.g. "User has many Orders", "Order belongs to User").

### 5. API Design
For each endpoint define:
- method: GET / POST / PUT / PATCH / DELETE
- path: e.g. /api/orders/:id
- description: one sentence
- params: path params, key query params, body fields for POST/PUT/PATCH. Each param: name, in ("path"|"query"|"body"), type, required.
- requestBody: JSON example string for POST/PUT/PATCH (e.g. '{"userId":"uuid","amount":100}'). Empty string for GET/DELETE.
- jsonResponse: JSON example string of the success response shape.
- errorCases: list of possible error responses (e.g. "404 — order not found", "422 — amount must be positive", "409 — duplicate entry").
Include all CRUD routes plus any special operations (e.g. status transitions, bulk actions).

### 6. Business Logic Flow
Step-by-step description of the core processing logic (not the user workflow — this is the server-side logic). Each item is one sentence describing what happens inside the service layer.

### 7. Query Design
For each significant query (list endpoints, searches, reports) provide:
- name: descriptive name (e.g. "List orders by user with cursor pagination")
- sql: the SQL query (use cursor-based pagination with WHERE id > :cursor LIMIT :limit for list queries; include relevant JOINs and WHERE clauses)
- isPaginated: true if the query uses pagination
MUST include cursor-based pagination for any list/search query that could return more than 20 rows.

### 8. Transactions
List operations that must be wrapped in a database transaction:
- where: the operation or endpoint (e.g. "POST /api/orders — create order + deduct stock")
- why: reason atomicity is needed (e.g. "Both writes must succeed or neither should persist")

### 9. Caching Strategy (Redis)
For each cacheable resource:
- key: Redis key pattern (e.g. "order:{id}", "user:{userId}:orders:page:{cursor}")
- ttl: expiry (e.g. "300s", "1h", "24h")
- description: what is cached and when to invalidate

### 10. Validation & Business Rules
List all input validation and business rule checks that must be enforced server-side (e.g. "amount must be > 0", "user must be in ACTIVE status to place an order").

### 11. Security
List security controls to implement (e.g. "JWT bearer auth required on all routes", "Rate limit: 100 req/min per user on POST /api/orders", "Validate that the requesting user owns the resource before returning or mutating it").

### 12. Backend Tasks
Break implementation into atomic tasks, each completable in ≤ 1 day:
- title: short task name
- description: exactly what to implement (specific, not vague)
No more than 12 tasks total. Order by implementation dependency.

### 13. Folder Structure
List file paths for the NestJS module. Follow the pattern: src/modules/<name>/<name>.controller.ts, etc.

---

Rules:
- Be highly technical. No vague descriptions.
- All SQL must be valid PostgreSQL.
- Optimize for performance and scalability.

Return ONLY valid JSON (no markdown, no explanation):
{
  "workflow": [
    { "order": 1, "title": "string", "description": "string", "actor": "string" }
  ],
  "backend": {
    "featureOverview": "string",
    "database": {
      "entities": [
        {
          "name": "string",
          "tableName": "string",
          "fields": [
            { "name": "string", "type": "string", "isPrimaryKey": false, "isNullable": false, "description": "string" }
          ],
          "indexes": ["string"],
          "constraints": ["string"],
          "softDelete": false
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
        "requestBody": "string",
        "jsonResponse": "string",
        "errorCases": ["string"]
      }
    ],
    "businessLogicFlow": ["string"],
    "queryDesign": [
      { "name": "string", "sql": "string", "isPaginated": true }
    ],
    "transactions": [
      { "where": "string", "why": "string" }
    ],
    "cachingStrategy": [
      { "key": "string", "ttl": "string", "description": "string" }
    ],
    "validationRules": ["string"],
    "security": ["string"],
    "backendTasks": [
      { "title": "string", "description": "string", "userStoryIds": ["US-01"] }
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
  backendPlan?: BackendPlan | null,
  userStories?: UserStory[],
): string {
  const backendContractSection = backendPlan ? `
## Backend Contract

### API Routes
${backendPlan.apiRoutes.map(r =>
  `${r.method} ${r.path} — ${r.description}` +
  (r.params?.length ? `\n  Params: ${r.params.map(p => `${p.name} (${p.in}, ${p.type}${p.required ? ', required' : ''})`).join('; ')}` : '') +
  (r.requestBody ? `\n  Request body: ${r.requestBody}` : '') +
  (r.jsonResponse ? `\n  Response: ${r.jsonResponse}` : '') +
  (r.errorCases?.length ? `\n  Errors: ${r.errorCases.join(' | ')}` : '')
).join('\n')}
${backendPlan.validationRules?.length ? `
### Validation Rules
${backendPlan.validationRules.map(r => `- ${r}`).join('\n')}` : ''}${backendPlan.security?.length ? `
### Security
${backendPlan.security.map(s => `- ${s}`).join('\n')}` : ''}` : '';

  const userStoriesSection4B = userStories && userStories.length > 0 ? `
## User Stories
${userStories.map(s => `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}`).join('\n')}
` : '';

  return `You are a senior frontend architect. Based on the feature analysis, workflow, and backend contract below, design the complete frontend architecture.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}
${userStoriesSection4B}
## Actors
${behaviors.actors.map(a => `- ${a}`).join('\n')}

## Acceptance Criteria
${requirements.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

## Business Rules
${requirements.businessRules.map(r => `- ${r}`).join('\n')}

## User Workflow
${workflowSummary}
${backendContractSection}
---

## Output Requirements

Design the React frontend using Vite + React + TanStack Query + Zustand conventions.

### Rules:
- Do NOT invent APIs — follow the Backend Contract exactly
- Focus on real UI behavior, not just layout
- Include edge cases (empty state, loading, error, success)
- Frontend tasks must be atomic (≤ 1 day each) with FE-xx IDs

### 1. Screens & Components
- **pages**: page-level components ("PageName — purpose")
- **components**: all reusable components ("ComponentName — one-line purpose"; include forms, lists, cards, panels, modals)

### 2. State Management
- **store**: Zustand store slices ("storeName — fields")
- **hooks**: custom TanStack Query hooks ("hookName(params) — description")
- **utils**: helper/utility functions ("functionName(params) — description")
- **stateManagement.local**: per-component local state ("ComponentName — stateVar: type")
- **stateManagement.global**: global Zustand slices ("storeName — fields managed")
- **stateManagement.tool**: state management library used

### 3. API Integration
- **services**: API service layer ("service.method(params) — VERB /path")
- **apiIntegration.apiMapping**: map each API route to the UI that calls it ("METHOD /path → Component — trigger event")
- **apiIntegration.errorMapping**: map error responses to UI behavior ("status/error → UI behavior")

### 4. Validation
- **validation**: field-level validation rules derived from business rules ("fieldName — rule description")

### 5. UX States
- **uxStates**: describe loading/error/empty/success state for each key component ("ComponentName[state] — description")

### 6. Routing
- **routing**: list all routes with guard info ("/path → PageComponent — guard (e.g. auth required)")

### 7. Error Handling
- **errorHandling**: global and component-level error scenarios ("scenario → UI behavior")

### 8. Frontend Tasks
- **frontendTasks**: atomic implementable tasks, each with id (FE-01, FE-02, ...), title, and description

---

Return ONLY valid JSON (no markdown, no explanation):
{
  "components": ["string"],
  "pages": ["string"],
  "store": ["string"],
  "hooks": ["string"],
  "utils": ["string"],
  "services": ["string"],
  "stateManagement": {
    "local": ["ComponentName — stateVar: type, ..."],
    "global": ["storeName — fields"],
    "tool": "Zustand"
  },
  "apiIntegration": {
    "services": ["service.method(params) — VERB /path"],
    "apiMapping": ["METHOD /path → Component — trigger"],
    "errorMapping": ["status → UI behavior"]
  },
  "validation": ["fieldName — rule description"],
  "uxStates": ["ComponentName[loading|error|empty|success] — description"],
  "routing": ["/path → PageComponent — guard"],
  "errorHandling": ["scenario → UI behavior"],
  "frontendTasks": [{ "id": "FE-01", "title": "...", "description": "...", "userStoryIds": ["US-01"] }]
}`;
}

/**
 * Builds the prompt for Step 4C Backend — comprehensive backend testing plan.
 */
export function buildDevPlanBackendTestingPrompt(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  backendPlan: BackendPlan,
  userStories?: UserStory[],
): string {
  const routeList = backendPlan.apiRoutes.map(r =>
    `${r.method} ${r.path} — ${r.description}` +
    (r.params?.length ? `\n  Params: ${r.params.map(p => `${p.name} (${p.in}, ${p.type}${p.required ? ', required' : ''})`).join('; ')}` : '') +
    (r.requestBody ? `\n  Request body: ${r.requestBody}` : '') +
    (r.jsonResponse ? `\n  Response: ${r.jsonResponse}` : '') +
    (r.errorCases?.length ? `\n  Errors: ${r.errorCases.join(' | ')}` : '')
  ).join('\n');

  const entityList = backendPlan.database.entities.map(e =>
    `**${e.name}** (table: \`${e.tableName}\`)` +
    (e.constraints?.length ? ` — constraints: ${e.constraints.join(', ')}` : '') +
    (e.softDelete ? ' [soft-delete]' : '')
  ).join('\n');

  const userStoriesSection4C = userStories && userStories.length > 0 ? `
## User Stories
${userStories.map(s => `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}`).join('\n')}
` : '';

  return `You are a senior QA engineer. Using the BA document analysis and backend design below, create a comprehensive backend testing plan.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}
${userStoriesSection4C}
## Business Rules
${requirements.businessRules.map(r => `- ${r}`).join('\n')}

## Acceptance Criteria
${requirements.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

## Backend API Routes
${routeList}

## Database Entities
${entityList}

## Relationships
${backendPlan.database.relationships.map(r => `- ${r}`).join('\n')}
${backendPlan.validationRules?.length ? `
## Validation Rules
${backendPlan.validationRules.map(r => `- ${r}`).join('\n')}` : ''}${backendPlan.security?.length ? `
## Security Requirements
${backendPlan.security.map(s => `- ${s}`).join('\n')}` : ''}${backendPlan.transactions?.length ? `
## Transactions
${backendPlan.transactions.map(t => `- ${t.where}: ${t.why}`).join('\n')}` : ''}

---

## Output Requirements

### 1. Test Scenarios
Group by feature area (e.g. "Auth — Login success with valid credentials").
Cover all backend functionalities from the API routes.

### 2. API Test Cases
For each endpoint, provide test cases covering:
- Valid request (happy path)
- Invalid input / missing fields
- Unauthorized access
- Edge cases and error conditions
Each test case must have: name, steps (array of strings), expectedResponse (JSON example), expectedStatus (HTTP code).

### 3. Database Testing
Test data integrity, unique constraints, NOT NULL constraints, soft-delete behavior, FK cascades.

### 4. Business Logic Testing
Validate all rules from BA document. Include edge cases and failure scenarios.

### 5. Pagination & Query Testing
Cursor-based pagination correctness, no duplicate/missing data, sorting consistency.

### 6. Performance Testing
Load scenarios (concurrent requests), slow query identification, index impact.

### 7. Security Testing
Authentication & authorization checks, rate limiting, injection attack prevention.

### 8. Error Handling Testing
Validate error response format consistency, proper HTTP status codes.

### 9. Backend Testing Tasks (QA-BE-xx)
Atomic, actionable tasks each completable in ≤ 1 day.

---

Rules:
- Be highly technical — reference real NestJS/Prisma/PostgreSQL patterns
- Focus on real backend failure cases
- Do NOT include frontend/UI testing

Return ONLY valid JSON (no markdown, no explanation):
{
  "testScenarios": ["Feature Area — scenario description"],
  "apiTestCases": [
    {
      "endpoint": "METHOD /path",
      "scenarios": [
        {
          "name": "string",
          "steps": ["string"],
          "expectedResponse": "string",
          "expectedStatus": 200
        }
      ]
    }
  ],
  "databaseTesting": ["string"],
  "businessLogicTesting": ["string"],
  "paginationQueryTesting": ["string"],
  "performanceTesting": ["string"],
  "securityTesting": ["string"],
  "errorHandlingTesting": ["string"],
  "tasks": [{ "id": "QA-BE-01", "title": "string", "description": "string", "userStoryIds": ["US-01"] }]
}`;
}

/**
 * Builds the prompt for Step 4C Frontend — comprehensive frontend testing plan.
 */
export function buildDevPlanFrontendTestingPrompt(
  requirements: ExtractedRequirements,
  behaviors: ExtractedBehaviors,
  backendPlan: BackendPlan,
  frontendPlan: FrontendPlan,
  userStories?: UserStory[],
): string {
  const routeList = backendPlan.apiRoutes.map(r =>
    `${r.method} ${r.path} — ${r.description}` +
    (r.errorCases?.length ? ` | errors: ${r.errorCases.join(', ')}` : '')
  ).join('\n');

  const pageList = frontendPlan.pages.join('\n');
  const componentList = frontendPlan.components.join('\n');
  const routingList = frontendPlan.routing?.join('\n') ?? '';
  const uxStatesList = frontendPlan.uxStates?.join('\n') ?? '';
  const validationList = frontendPlan.validation?.join('\n') ?? '';
  const userStoriesSection4CF = userStories && userStories.length > 0 ? `
## User Stories
${userStories.map(s => `${s.id} [${s.priority}]: As a ${s.actor}, I want ${s.action}, so that ${s.benefit}`).join('\n')}
` : '';

  return `You are a senior frontend QA engineer. Using the BA document analysis, backend API contract, and frontend plan below, create a comprehensive frontend testing plan.

LANGUAGE RULE: Detect the primary language of the input data (English or Vietnamese). Write ALL output string values in that same language. Do not translate or mix languages.

## Feature: ${behaviors.feature}
${userStoriesSection4CF}
## Acceptance Criteria
${requirements.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

## Business Rules
${requirements.businessRules.map(r => `- ${r}`).join('\n')}

## Backend API Routes (for integration testing context)
${routeList}

## Frontend Pages
${pageList}

## Frontend Components
${componentList}
${routingList ? `
## Routing
${routingList}` : ''}${uxStatesList ? `
## UX States
${uxStatesList}` : ''}${validationList ? `
## Validation Rules
${validationList}` : ''}

---

## Output Requirements

### 1. Test Scenarios
Group by screen/page (e.g. "OrderList Page — user sees paginated orders").
Cover all UI interactions.

### 2. UI Test Cases
For each screen, provide test cases covering:
- Correct rendering
- Input handling
- Button actions
- Error display
Each test case must have: name, steps (array of strings), expectedBehavior.

### 3. Validation Testing
Field validation (format, required, length), error messages, timing (onBlur, onSubmit).

### 4. UX State Testing
Loading state, error state (API failure), empty state, success state.

### 5. API Integration Testing (Frontend perspective)
Correct API calls triggered, success/error handling, mock API behavior.

### 6. Routing & Navigation Testing
Page navigation, protected route guards, redirect behavior.

### 7. Cross-Browser / Responsive Testing
Key layouts and interactions across browsers and screen sizes.

### 8. Edge Cases
Network failure, slow API response, unexpected/malformed API responses.

### 9. Frontend Testing Tasks (QA-FE-xx)
Atomic, actionable tasks each completable in ≤ 1 day.

---

Rules:
- Focus on UI behavior and user experience
- Do NOT test backend logic directly
- Assume backend API is already defined

Return ONLY valid JSON (no markdown, no explanation):
{
  "testScenarios": ["PageName — scenario description"],
  "uiTestCases": [
    {
      "screen": "string",
      "scenarios": [
        {
          "name": "string",
          "steps": ["string"],
          "expectedBehavior": "string"
        }
      ]
    }
  ],
  "validationTesting": ["string"],
  "uxStateTesting": ["string"],
  "apiIntegrationTesting": ["string"],
  "routingNavigationTesting": ["string"],
  "crossBrowserTesting": ["string"],
  "edgeCases": ["string"],
  "tasks": [{ "id": "QA-FE-01", "title": "string", "description": "string", "userStoryIds": ["US-01"] }]
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

  // ── New Layer 1 (4-sublayer) methods ────────────────────────────────────────

  /**
   * Layer 1A — Extract SSR (rules/entities) only.
   */
  abstract extractSSR(baDocumentContent: string, promptAppend?: string): Promise<SSRData>;

  /**
   * Layer 1A synthesis — Consolidates near-duplicate SSR items from multi-chunk merges.
   */
  abstract synthesiseSSR(merged: SSRData): Promise<SSRData>;

  /**
   * Layer 1B — Extract user stories only, using SSR as canonical context.
   */
  abstract extractUserStories(baDocumentContent: string, ssr: SSRData, promptAppend?: string): Promise<UserStories>;

  /**
   * Layer 1B synthesis — Consolidates near-duplicate user stories from multi-chunk merges.
   */
  abstract synthesiseUserStories(merged: UserStories, ssr: SSRData): Promise<UserStories>;

  /**
   * Layer 1A+1B (combined) — Extract SSR (global rules) + User Stories in one pass.
   * Used for chunked pipeline processing.
   */
  abstract extractSSRAndStories(baDocumentContent: string, promptAppend?: string): Promise<Layer1ABPartial>;

  /**
   * Layer 1 synthesis — Consolidates near-duplicate 1A+1B items from multi-chunk merges.
   */
  abstract synthesiseLayer1AB(merged: Layer1ABPartial): Promise<Layer1ABPartial>;

  /**
   * Layer 1C — Map rules to user stories, producing a traceability matrix.
   */
  abstract extractMapping(ssr: SSRData, stories: UserStories): Promise<Mapping>;

  /**
   * Layer 1D — Validate extraction quality and produce a scored report.
   */
  abstract extractValidation(ssr: SSRData, stories: UserStories, mapping: Mapping): Promise<ValidationResult>;

  // ── Legacy Layer 1 methods (kept for backward compatibility) ─────────────────

  /**
   * Layer 1 (combined) — Extract both domain requirements and behaviors in a single API call.
   * @deprecated Use extractSSRAndStories instead for new pipeline runs.
   */
  abstract extractAll(baDocumentContent: string, promptAppend?: string): Promise<CombinedExtraction>;

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
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<TestScenario[]>;

  /**
   * Layer 3 — Generate detailed test cases for each scenario.
   */
  abstract generateTestCasesFromScenarios(
    scenarios: TestScenario[],
    requirements: ExtractedRequirements,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<GeneratedTestCase[]>;

  /**
   * Step 4 Call A — Generate workflow steps + backend architecture plan.
   */
  abstract generateDevPlanWorkflowBackend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    scenarios: TestScenario[],
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<{ workflow: WorkflowStep[]; backend: BackendPlan }>;

  /**
   * Step 4 Call B — Generate frontend architecture plan.
   * Receives a condensed text summary of workflow from Call A.
   */
  abstract generateDevPlanFrontend(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    workflowSummary: string,
    backendPlan?: BackendPlan | null,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<FrontendPlan>;

  /**
   * Step 4C Backend — Generate comprehensive backend testing plan.
   */
  abstract generateDevPlanBackendTesting(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    backendPlan: BackendPlan,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<BackendTestingPlan>;

  /**
   * Step 4C Frontend — Generate comprehensive frontend testing plan.
   */
  abstract generateDevPlanFrontendTesting(
    requirements: ExtractedRequirements,
    behaviors: ExtractedBehaviors,
    backendPlan: BackendPlan,
    frontendPlan: FrontendPlan,
    promptAppend?: string,
    userStories?: UserStory[],
  ): Promise<FrontendTestingPlan>;

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
    targetSection?: DevPromptSection,
    promptAppend?: string,
    userStories?: UserStory[],
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

  /**
   * Parse SSR (System/Software Requirements Specification) content and extract
   * a list of discrete features/user stories from it.
   */
  abstract extractSubFeaturesFromSSR(ssrContent: string): Promise<SubFeatureItem[]>;
}
