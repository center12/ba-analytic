export class StepConfigDto {
  step: number;      // 1 | 2 | 3 | 4
  provider: string;  // 'gemini' | 'claude' | 'openai'
  model?: string;    // null/undefined = provider default
}

export class UpsertPipelineConfigDto {
  configs: StepConfigDto[];
}
