import { FileText, Loader2, Pencil, Play, RefreshCw, Save, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { Feature } from '@/lib/api';
import { BADGE, MANUAL_TEMPLATES } from '../../constants/pipelineWizard.constants';
import { ManualPanel } from './ManualPanel';

interface PipelineStep2Props {
  feature: Feature;
  featureId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  previousStepCompleted: boolean;
  isRunning: boolean;
  isEditing: boolean;
  manualStep: number | null;
  manualJson: string;
  manualJsonError: string | null;
  manualIsSaving: boolean;
  saveIsPending: boolean;
  runIsPendingForStep: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
  openManual: (step: number) => void;
  closeManual: () => void;
  handleManualJsonChange: (v: string) => void;
  handleManualSave: (step: number) => void;
  runStep: (step: number) => void;
  startEdit: (step: number, feature: Feature) => void;
  handleSave: (step: number, feature: Feature) => void;
  cancelEdit: () => void;
  setOpenStep: (step: number) => void;
}

export function PipelineStep2({
  feature,
  featureId,
  status,
  previousStepCompleted,
  isRunning,
  isEditing,
  manualStep,
  manualJson,
  manualJsonError,
  manualIsSaving,
  saveIsPending,
  runIsPendingForStep,
  draft,
  setDraft,
  openManual,
  closeManual,
  handleManualJsonChange,
  handleManualSave,
  runStep,
  startEdit,
  handleSave,
  cancelEdit,
  setOpenStep,
}: PipelineStep2Props) {
  const scenarios = feature.testScenarios ?? [];
  const canRun = previousStepCompleted && !isRunning;

  return (
    <div className="border-t px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(status === 'idle' || status === 'failed') && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(2)}
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
              {status === 'failed' ? 'Retry Step 2' : 'Run Step 2'}
            </button>
            {manualStep !== 2 && (
              <button
                disabled={!canRun}
                onClick={() => openManual(2)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Planning scenarios...
          </span>
        )}
        {status === 'completed' && !isEditing && (
          <>
            <button onClick={() => startEdit(2, feature)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted">
              <Pencil size={13} /> Edit
            </button>
            <button disabled={!canRun} onClick={() => runStep(2)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50">
              <RefreshCw size={13} /> Re-run
            </button>
          </>
        )}
        {isEditing && (
          <>
            <button disabled={saveIsPending} onClick={() => handleSave(2, feature)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
              {saveIsPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save changes
            </button>
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted">
              <X size={13} /> Cancel
            </button>
          </>
        )}
      </div>

      {scenarios.length > 0 && !isEditing && (
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {scenarios.map((s, i) => {
            const b = BADGE[s.type] ?? { label: s.type, cls: 'bg-muted text-foreground' };
            return (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.cls}`}>{b.label}</span>
                <span className="text-xs">{s.title}</span>
              </li>
            );
          })}
        </ul>
      )}

      {isEditing && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Edit as JSON - each item needs title, type, and requirementRefs.</p>
          <textarea
            className="w-full text-xs border rounded p-2 font-mono resize-y min-h-[200px] bg-background"
            value={draft.scenariosJson ?? JSON.stringify(scenarios, null, 2)}
            onChange={(e) => setDraft((d) => ({ ...d, scenariosJson: e.target.value }))}
          />
        </div>
      )}

      {manualStep === 2 && (
        <ManualPanel
          step={2}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[2]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(2)}
          onCancel={closeManual}
        />
      )}

      {status === 'completed' && !isEditing && (
        <div className="flex justify-end">
          <button onClick={() => setOpenStep(3)} className="text-sm text-primary hover:underline">
            Proceed to Step 3 →
          </button>
        </div>
      )}
    </div>
  );
}
