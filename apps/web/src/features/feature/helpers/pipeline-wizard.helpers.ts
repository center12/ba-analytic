import { Feature } from '@/lib/api';
import { StepStatus } from '../types/pipeline-wizard.types';

export function deriveStatus(
  stepNum: number,
  feature: Feature,
  testCaseCount: number,
  activeStep: number | null,
): StepStatus {
  const isDone =
    stepNum === 1 ? !!feature.extractedRequirements :
    stepNum === 2 ? !!feature.testScenarios :
    stepNum === 3 ? testCaseCount > 0 :
    !!feature.devPromptApi;

  if (isDone) return 'completed';
  if (activeStep === stepNum) return 'running';
  if (feature.pipelineStep === stepNum && feature.pipelineStatus === 'FAILED') return 'failed';
  return 'idle';
}

export function arrToText(arr: string[]) {
  return arr.join('\n');
}

export function textToArr(text: string) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
