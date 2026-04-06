import { FileText, Loader2, Play, RefreshCw } from 'lucide-react';
import { Feature, DevPlan } from '@/lib/api';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { step4ToMarkdown } from '../../helpers/pipeline-wizard.helpers';
import { ManualPanel } from './ManualPanel';
import { DevPlanPanel } from './DevPlanPanel';
import { CopyMarkdownButton } from './CopyMarkdownButton';

interface PipelineStep4Props {
  feature: Feature;
  featureId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  previousStepCompleted: boolean;
  isRunning: boolean;
  manualStep: number | null;
  manualJson: string;
  manualJsonError: string | null;
  manualIsSaving: boolean;
  runIsPendingForStep: boolean;
  openManual: (step: number) => void;
  closeManual: () => void;
  handleManualJsonChange: (v: string) => void;
  handleManualSave: (step: number) => void;
  runStep: (step: number) => void;
}

export function PipelineStep4({
  feature,
  featureId,
  status,
  previousStepCompleted,
  isRunning,
  manualStep,
  manualJson,
  manualJsonError,
  manualIsSaving,
  runIsPendingForStep,
  openManual,
  closeManual,
  handleManualJsonChange,
  handleManualSave,
  runStep,
}: PipelineStep4Props) {
  const canRun = previousStepCompleted && !isRunning;

  let devPlan: DevPlan | null = null;
  if (feature.devPlanWorkflow && feature.devPlanBackend && feature.devPlanFrontend && feature.devPlanTesting) {
    try {
      devPlan = {
        workflow: JSON.parse(feature.devPlanWorkflow),
        backend:  JSON.parse(feature.devPlanBackend),
        frontend: JSON.parse(feature.devPlanFrontend),
        testing:  JSON.parse(feature.devPlanTesting),
      };
    } catch {
      // malformed JSON — show nothing
    }
  }

  return (
    <div className="border-t px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        {(status === 'idle' || status === 'failed') && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(4)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-50 ${
                status === 'failed'
                  ? 'border border-yellow-500 text-yellow-700 hover:bg-yellow-50'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {runIsPendingForStep
                ? <Loader2 size={13} className="animate-spin" />
                : status === 'failed' ? <RefreshCw size={13} /> : <Play size={13} />
              }
              {status === 'failed' ? 'Retry Step 4' : 'Run Step 4'}
            </button>
            {manualStep !== 4 && (
              <button
                disabled={!canRun}
                onClick={() => openManual(4)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Generating development plan...
          </span>
        )}
        {status === 'completed' && (
          <>
            <button disabled={!canRun} onClick={() => runStep(4)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50">
              <RefreshCw size={13} /> Re-run
            </button>
            <CopyMarkdownButton
              getText={() => step4ToMarkdown(feature)}
              filename={`step4-dev-plan-${feature.name}.md`}
            />
          </>
        )}
      </div>

      {manualStep === 4 && (
        <ManualPanel
          step={4}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[4]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(4)}
          onCancel={closeManual}
        />
      )}

      {devPlan && <DevPlanPanel devPlan={devPlan} />}
    </div>
  );
}
