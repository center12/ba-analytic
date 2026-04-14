import type {
  BackendPlan,
  CombinedExtraction,
  DevPlan,
  ExtractedBehaviors,
  ExtractedRequirements,
  FrontendPlan,
  Mapping,
  RelatedFeatureDevPlan,
  SSRData,
  TestScenario,
  UserStories,
  UserStory,
  ValidationResult,
  WorkflowStep,
} from '../../../ai/ai-provider.abstract';

export interface LoadedFeatureContext {
  feature: any;
}

export interface Step2Context extends LoadedFeatureContext {
  requirements: ExtractedRequirements;
  behaviors: ExtractedBehaviors;
  compressedRequirements: ExtractedRequirements;
  compressedBehaviors: ExtractedBehaviors;
  userStories?: UserStory[];
  compressedStories?: UserStory[];
}

export interface Step3Context extends LoadedFeatureContext {
  requirements: ExtractedRequirements;
  testScenarios: TestScenario[];
  userStories?: UserStory[];
  compressedRequirements: ExtractedRequirements;
  compressedStories?: UserStory[];
}

export interface Step4Context extends LoadedFeatureContext {
  requirements: ExtractedRequirements;
  behaviors: ExtractedBehaviors;
  testScenarios: TestScenario[];
  userStories?: UserStory[];
  compressedRequirements: ExtractedRequirements;
  compressedBehaviors: ExtractedBehaviors;
  compressedStories?: UserStory[];
  relatedFeatures?: RelatedFeatureDevPlan[];
}

export interface Step5Context extends LoadedFeatureContext {
  requirements: ExtractedRequirements;
  behaviors: ExtractedBehaviors;
  testScenarios: TestScenario[];
  userStories?: UserStory[];
  compressedRequirements: ExtractedRequirements;
  compressedBehaviors: ExtractedBehaviors;
  compressedStories?: UserStory[];
  devPlan?: DevPlan;
}

export interface ParsedLayer1Fields {
  ssr?: SSRData;
  stories?: UserStories;
  mapping?: Mapping;
  validation?: ValidationResult;
}

export interface ParsedStep4Fields {
  workflow?: WorkflowStep[];
  backend?: BackendPlan;
  frontend?: FrontendPlan;
  testing?: Record<string, unknown>;
}

export interface Layer1ResumeState {
  failedPhase?: string;
  resumeFromChunk: number;
  partial: Layer1ResumePartial | null;
}

export interface Layer1ResumePartial {
  ssr?: SSRData;
  stories?: UserStories;
}

export interface PromptStep5Context {
  requirements: ExtractedRequirements;
  behaviors: ExtractedBehaviors;
  testScenarios: TestScenario[];
  devPlan?: DevPlan;
}

export interface LegacyPipelineContext {
  combinedExtraction: CombinedExtraction | null;
}
