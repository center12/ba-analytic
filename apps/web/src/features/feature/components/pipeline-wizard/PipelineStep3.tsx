import { FileText, Loader2, Play, RefreshCw } from 'lucide-react';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { ManualPanel } from './ManualPanel';
import { TestCaseDashboard } from '@/features/test-case/TestCaseDashboard';

interface PipelineStep3Props {
  featureId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  previousStepCompleted: boolean;
  isRunning: boolean;
  manualStep: number | null;
  manualJson: string;
  manualJsonError: string | null;
  manualIsSaving: boolean;
  runIsPendingForStep: boolean;
  testCasesCount: number;
  openManual: (step: number) => void;
  closeManual: () => void;
  handleManualJsonChange: (v: string) => void;
  handleManualSave: (step: number) => void;
  runStep: (step: number) => void;
  setOpenStep: (step: number) => void;
}

export function PipelineStep3({
  featureId,
  status,
  previousStepCompleted,
  isRunning,
  manualStep,
  manualJson,
  manualJsonError,
  manualIsSaving,
  runIsPendingForStep,
  testCasesCount,
  openManual,
  closeManual,
  handleManualJsonChange,
  handleManualSave,
  runStep,
  setOpenStep,
}: PipelineStep3Props) {
  const canRun = previousStepCompleted && !isRunning;

  return (
    <div className="border-t px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        {(status === 'idle' || status === 'failed') && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(3)}
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
              {status === 'failed' ? 'Retry Step 3' : 'Run Step 3'}
            </button>
            {manualStep !== 3 && (
              <button
                disabled={!canRun}
                onClick={() => openManual(3)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Generating test cases...
          </span>
        )}
        {status === 'completed' && (
          <>
            <span className="text-xs text-green-700">{testCasesCount} test cases generated</span>
            <button disabled={!canRun} onClick={() => runStep(3)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50 ml-2">
              <RefreshCw size={13} /> Re-run
            </button>
          </>
        )}
      </div>

      {manualStep === 3 && (
        <ManualPanel
          step={3}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[3]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(3)}
          onCancel={closeManual}
        />
      )}

      {status === 'completed' && (
        <>
          <TestCaseDashboard featureId={featureId} />
          <div className="flex justify-end">
            <button onClick={() => setOpenStep(4)} className="text-sm text-primary hover:underline">
              Proceed to Step 4 →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
