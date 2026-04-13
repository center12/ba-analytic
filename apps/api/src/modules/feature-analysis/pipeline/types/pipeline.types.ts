import type {
  CombinedExtraction,
  DevPrompt,
  DevTaskItem,
  DevPlan,
  ExtractedBehaviors,
  ExtractedRequirements,
  GeneratedTestCase,
  Mapping,
  SSRData,
  TestScenario,
  UserStories,
  ValidationResult,
} from '../../../ai/ai-provider.abstract';

export interface PipelineRunOptions {
  providerName?: string;
  model?: string;
  promptAppend?: string;
}

export type Step1Section = 'ssr-stories' | 'mapping' | 'validation';
export type Step4Section = 'workflow-backend' | 'frontend' | 'testing' | 'testing-backend' | 'testing-frontend';
export type Step5Section = 'api' | 'backend' | 'frontend' | 'testing';

export interface SaveStepResultsPayload {
  step: 1 | 2 | 3 | 4 | 5;
  extractedRequirements?: ExtractedRequirements;
  extractedBehaviors?: ExtractedBehaviors;
  ssrData?: SSRData;
  userStories?: UserStories;
  acceptanceCriteriaText?: string[];
  mapping?: Mapping;
  validationResult?: ValidationResult;
  testScenarios?: TestScenario[];
  generatedTestCases?: GeneratedTestCase[];
  devPlan?: DevPlan;
  devPrompt?: DevPrompt;
}

export interface Step2Override extends CombinedExtraction {}

export interface Step5SectionApplyInput {
  section: 'api' | 'frontend' | 'testing';
  tasks: DevTaskItem[];
}
