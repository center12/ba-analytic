export const AI_CONFIG = {
  // --- Token Management ---
  MAX_DOC_CHARS: 120_000, // ~30k-32k tokens: Triggers Context Caching
  CHUNK_MAX_CHARS: 40_000, // Larger semantic blocks for better reasoning
  CHUNK_OVERLAP: 1_500, // High overlap for cross-requirement references
  CHUNK_DELAY_MS: 2_000, // Balanced for Free Tier RPM (Requests Per Minute)

  // --- Extraction Limits (Loosened for 'Thorough' mode) ---
  MAX_FEATURES: 25, // Allows for complex modular systems
  MAX_RULES: 40, // Essential for high-coverage test suites
  MAX_CRITERIA: 20,
  MAX_ENTITIES: 15,
  MAX_ACTORS: 8,
  MAX_ACTIONS: 50, // Allows for detailed step-by-step user flows
  MAX_BEH_RULES: 30,

  // --- Output Management ---
  SCENARIO_BATCH: 15, // Gemini 3 is fast; generate more cases per call
  TEMPERATURE: 0.2, // Keep low for BA analysis (high consistency)

  // --- Layer 1 (4-sublayer) Limits ---
  MAX_STORIES: 25,
  MAX_SSR_RULES: 40,
  MAX_CONSTRAINTS: 20,
  MAX_GLOBAL_POLICIES: 10,
} as const;
