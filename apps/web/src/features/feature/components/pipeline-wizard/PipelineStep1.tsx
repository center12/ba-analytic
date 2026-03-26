import { FileText, Loader2, Pencil, Play, RefreshCw, Save, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { Feature } from '@/lib/api';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { EditableList } from './EditableList';
import { ManualPanel } from './ManualPanel';

interface PipelineStep1Props {
  feature: Feature;
  featureId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  isRunning: boolean;
  isEditing: boolean;
  manualStep: number | null;
  manualJson: string;
  manualJsonError: string | null;
  manualIsSaving: boolean;
  saveIsPending: boolean;
  resumeIsPending: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
  openManual: (step: number) => void;
  closeManual: () => void;
  handleManualJsonChange: (v: string) => void;
  handleManualSave: (step: number) => void;
  runStep: (step: number) => void;
  resumeStep1: () => void;
  startEdit: (step: number, feature: Feature) => void;
  handleSave: (step: number, feature: Feature) => void;
  cancelEdit: () => void;
  setOpenStep: (step: number) => void;
}

export function PipelineStep1({
  feature,
  featureId,
  status,
  isRunning,
  isEditing,
  manualStep,
  manualJson,
  manualJsonError,
  manualIsSaving,
  saveIsPending,
  resumeIsPending,
  draft,
  setDraft,
  openManual,
  closeManual,
  handleManualJsonChange,
  handleManualSave,
  runStep,
  resumeStep1,
  startEdit,
  handleSave,
  cancelEdit,
  setOpenStep,
}: PipelineStep1Props) {
  const req = feature.extractedRequirements;
  const beh = feature.extractedBehaviors;
  const canRun = !!feature.baDocument && !isRunning;

  return (
    <div className="border-t px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {status === 'idle' && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(1)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
            >
              <Play size={13} /> Run Step 1
            </button>
            {manualStep !== 1 && (
              <button
                onClick={() => openManual(1)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Extracting...
          </span>
        )}
        {status === 'failed' && (
          <>
            <button
              disabled={!canRun}
              onClick={resumeStep1}
              className="flex items-center gap-1.5 border border-yellow-500 text-yellow-700 px-3 py-1.5 rounded text-sm hover:bg-yellow-50 disabled:opacity-50"
            >
              {resumeIsPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Resume Step 1
            </button>
            <button
              disabled={!canRun}
              onClick={() => runStep(1)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={13} /> Restart from scratch
            </button>
            {manualStep !== 1 && (
              <button
                onClick={() => openManual(1)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'completed' && !isEditing && (
          <>
            <button
              onClick={() => startEdit(1, feature)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              disabled={!canRun}
              onClick={() => runStep(1)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={13} /> Re-run
            </button>
          </>
        )}
        {isEditing && (
          <>
            <button
              disabled={saveIsPending}
              onClick={() => handleSave(1, feature)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saveIsPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save changes
            </button>
            <button onClick={cancelEdit} className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted">
              <X size={13} /> Cancel
            </button>
          </>
        )}
      </div>

      {req && beh && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Requirements</p>
            <EditableList label="Features" color="text-blue-700" items={req.features}
              editing={isEditing} fieldKey="features" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
            <EditableList label="Business Rules" color="text-orange-700" items={req.businessRules}
              editing={isEditing} fieldKey="businessRules" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
            <EditableList label="Acceptance Criteria" color="text-green-700" items={req.acceptanceCriteria}
              editing={isEditing} fieldKey="acceptanceCriteria" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
            <EditableList label="Entities" color="text-muted-foreground" items={req.entities}
              editing={isEditing} fieldKey="entities" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Behaviors</p>
            {isEditing ? (
              <div>
                <p className="text-xs font-semibold mb-1 text-violet-700">Feature name</p>
                <input
                  className="w-full text-xs border rounded p-1.5 bg-background"
                  value={draft.featureName ?? beh.feature}
                  onChange={(e) => setDraft((d) => ({ ...d, featureName: e.target.value }))}
                />
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold mb-1 text-violet-700">Feature</p>
                <p className="text-xs text-muted-foreground">{beh.feature}</p>
              </div>
            )}
            {beh.actors.length > 0 && !isEditing && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Actors</p>
                <div className="flex flex-wrap gap-1">
                  {beh.actors.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded text-xs">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {isEditing && (
              <EditableList label="Actors" color="text-violet-700" items={beh.actors}
                editing fieldKey="actors" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
            )}
            <EditableList label="Actions" color="text-blue-700" items={beh.actions}
              editing={isEditing} fieldKey="actions" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
            <EditableList label="Rules" color="text-orange-700" items={beh.rules}
              editing={isEditing} fieldKey="behaviorRules" draft={draft} onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
          </div>
        </div>
      )}

      {manualStep === 1 && (
        <ManualPanel
          step={1}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[1]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(1)}
          onCancel={closeManual}
        />
      )}

      {status === 'completed' && !isEditing && (
        <div className="flex justify-end">
          <button
            onClick={() => setOpenStep(2)}
            className="text-sm text-primary hover:underline"
          >
            Proceed to Step 2 →
          </button>
        </div>
      )}
    </div>
  );
}
