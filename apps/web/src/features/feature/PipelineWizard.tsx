import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Loader2, XCircle, Circle, ChevronDown, ChevronRight,
  Pencil, Save, X, RefreshCw, Play, FileText, Copy, Check,
} from 'lucide-react';
import {
  api, Feature, ExtractedRequirements, ExtractedBehaviors, TestScenario,
  ScenarioType, GeneratedTestCase, DevPrompt,
} from '@/lib/api';
import { useAppStore } from '@/store';
import { toast } from '@/hooks/use-toast';
import { TestCaseDashboard } from '@/features/test-case/TestCaseDashboard';
import { DevPromptPanel } from './DevPromptPanel';

// ── Scenario type badges ──────────────────────────────────────────────────────

const BADGE: Record<ScenarioType, { label: string; cls: string }> = {
  happy_path: { label: 'Happy',    cls: 'bg-green-100 text-green-800' },
  edge_case:  { label: 'Edge',     cls: 'bg-yellow-100 text-yellow-800' },
  error:      { label: 'Error',    cls: 'bg-red-100 text-red-800' },
  boundary:   { label: 'Boundary', cls: 'bg-blue-100 text-blue-800' },
  security:   { label: 'Security', cls: 'bg-purple-100 text-purple-800' },
};

// ── Step state derivation ─────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'completed' | 'failed';

function deriveStatus(
  stepNum: number,
  feature: Feature,
  testCaseCount: number,
  activeStep: number | null, // which step has an in-flight mutation right now
): StepStatus {
  const isDone =
    stepNum === 1 ? !!feature.extractedRequirements :
    stepNum === 2 ? !!feature.testScenarios :
    stepNum === 3 ? testCaseCount > 0 :
    /* 4 */         !!feature.devPromptApi;

  if (isDone) return 'completed';
  // 'running' only when WE fired the mutation — never from stale DB state
  if (activeStep === stepNum) return 'running';
  // 'failed' is persistent and safe to read from DB
  if (feature.pipelineStep === stepNum && feature.pipelineStatus === 'FAILED') return 'failed';
  return 'idle';
}

// ── Manual mode JSON templates ────────────────────────────────────────────────

const MANUAL_TEMPLATES: Record<number, string> = {
  1: JSON.stringify({
    extractedRequirements: {
      features: ['Feature description 1', 'Feature description 2'],
      businessRules: ['Rule 1', 'Rule 2'],
      acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
      entities: ['Entity1', 'Entity2'],
    },
    extractedBehaviors: {
      feature: 'Feature name',
      actors: ['User', 'Admin'],
      actions: ['User submits form', 'System validates input'],
      rules: ['Field X is required', 'Value must be positive'],
    },
  }, null, 2),
  2: JSON.stringify([
    { title: 'User successfully completes happy path', type: 'happy_path', requirementRefs: ['Feature description 1'] },
    { title: 'User submits with missing required field', type: 'error', requirementRefs: ['Field X is required'] },
  ], null, 2),
  3: JSON.stringify([
    {
      title: 'User successfully completes happy path',
      description: 'Verifies that a valid user can complete the flow end-to-end',
      preconditions: 'User is logged in and all required data is present',
      priority: 'HIGH',
      steps: [
        { action: 'User navigates to the page', expectedResult: 'Page loads successfully' },
        { action: 'User submits the form', expectedResult: 'Success message is shown' },
      ],
    },
  ], null, 2),
  4: JSON.stringify({
    api:      [{ title: 'API — Core endpoints',    prompt: 'You are an expert backend engineer. Implement the API for...' }],
    frontend: [{ title: 'Frontend — Core UI',      prompt: 'You are an expert frontend engineer. Implement the UI for...' }],
    testing:  [{ title: 'Testing — Core flows',    prompt: 'You are an expert QA engineer. Write automated tests for...' }],
  }, null, 2),
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function arrToText(arr: string[]) { return arr.join('\n'); }
function textToArr(text: string)  { return text.split('\n').map(s => s.trim()).filter(Boolean); }

// ── Manual input panel ────────────────────────────────────────────────────────

function ManualPanel({
  step, featureId, templateJson, manualJson, jsonError, isSaving,
  onJsonChange, onSave, onCancel,
}: {
  step: number; featureId: string; templateJson: string;
  manualJson: string; jsonError: string | null; isSaving: boolean;
  onJsonChange: (v: string) => void; onSave: () => void; onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyingPrompt, setCopyingPrompt] = useState(false);

  async function copyPrompt() {
    setCopyingPrompt(true);
    try {
      const { prompt } = await api.testCases.getStepPrompt(featureId, step);
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not get prompt', description: (err as Error).message });
    } finally {
      setCopyingPrompt(false);
    }
  }

  return (
    <div className="border rounded-lg bg-muted/30 p-4 space-y-4 mt-2">
      {/* Copy prompt button */}
      <div className="flex items-start gap-3">
        <button
          onClick={copyPrompt}
          disabled={copyingPrompt}
          className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50 shrink-0"
        >
          {copyingPrompt
            ? <Loader2 size={13} className="animate-spin" />
            : copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
        <p className="text-xs text-muted-foreground pt-1.5">
          Paste this prompt into Claude, ChatGPT, or any AI tool, then paste the JSON response below.
        </p>
      </div>

      {/* Expected format reference */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground">Expected output format</p>
          <button
            onClick={() => { navigator.clipboard.writeText(templateJson); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Copy size={11} /> Copy template
          </button>
        </div>
        <pre className="text-[11px] bg-muted/60 rounded p-2 overflow-x-auto max-h-36 font-mono leading-relaxed">
          {templateJson}
        </pre>
      </div>

      {/* Editable JSON input */}
      <div>
        <p className="text-xs font-semibold mb-1">Paste AI response here</p>
        <textarea
          className={`w-full text-xs border rounded p-2 font-mono resize-y min-h-[180px] bg-background ${jsonError ? 'border-red-400' : ''}`}
          value={manualJson}
          onChange={e => onJsonChange(e.target.value)}
          placeholder="Paste the JSON result from your AI tool…"
          spellCheck={false}
        />
        {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={!!jsonError || isSaving}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ── Step header component ─────────────────────────────────────────────────────

function StepHeader({
  num, title, status, open, onToggle,
}: {
  num: number; title: string; status: StepStatus; open: boolean; onToggle: () => void;
}) {
  const icon =
    status === 'completed' ? <CheckCircle2 size={16} className="text-green-600 shrink-0" /> :
    status === 'running'   ? <Loader2 size={16} className="animate-spin text-primary shrink-0" /> :
    status === 'failed'    ? <XCircle size={16} className="text-red-500 shrink-0" /> :
                             <Circle size={16} className="text-muted-foreground shrink-0" />;

  const statusLabel =
    status === 'completed' ? 'Completed' :
    status === 'running'   ? 'Running…'  :
    status === 'failed'    ? 'Failed'    : 'Not started';

  const labelCls =
    status === 'completed' ? 'text-green-700' :
    status === 'running'   ? 'text-primary'   :
    status === 'failed'    ? 'text-red-600'   : 'text-muted-foreground';

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-lg text-left"
    >
      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
        {num}
      </span>
      {icon}
      <span className="font-medium text-sm flex-1">{title}</span>
      <span className={`text-xs ${labelCls}`}>{statusLabel}</span>
      {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
    </button>
  );
}

// ── Editable string list ──────────────────────────────────────────────────────

function EditableList({
  label, color, items, editing, fieldKey, draft, onDraftChange,
}: {
  label: string; color: string; items: string[]; editing: boolean;
  fieldKey: string; draft: Record<string, string>; onDraftChange: (k: string, v: string) => void;
}) {
  if (!editing) {
    if (!items.length) return null;
    return (
      <div>
        <p className={`text-xs font-semibold mb-1 ${color}`}>{label}</p>
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="shrink-0">·</span><span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div>
      <p className={`text-xs font-semibold mb-1 ${color}`}>{label}</p>
      <textarea
        className="w-full text-xs border rounded p-2 font-mono resize-y min-h-[80px] bg-background"
        value={draft[fieldKey] ?? arrToText(items)}
        onChange={e => onDraftChange(fieldKey, e.target.value)}
        placeholder="One item per line"
      />
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

interface Props {
  featureId: string;
}

export function PipelineWizard({ featureId }: Props) {
  const activeProvider = useAppStore(s => s.activeProvider);
  const qc = useQueryClient();

  const { data: feature } = useQuery({
    queryKey: ['features', featureId],
    queryFn: () => api.features.get(featureId),
    enabled: !!featureId,
  });

  const { data: testCases = [] } = useQuery({
    queryKey: ['test-cases', featureId],
    queryFn: () => api.testCases.list(featureId),
    enabled: !!featureId,
  });

  // Which steps are open
  const [openStep, setOpenStep] = useState<number>(1);
  // Edit mode per step
  const [editingStep, setEditingStep] = useState<number | null>(null);
  // Draft values for editing
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Manual input mode
  const [manualStep, setManualStep] = useState<number | null>(null);
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);

  function toggleStep(n: number) {
    setOpenStep(v => v === n ? 0 : n);
  }

  function openManual(step: number) {
    setEditingStep(null);
    setDraft({});
    setManualStep(step);
    setManualJson(MANUAL_TEMPLATES[step] ?? '');
    setManualJsonError(null);
  }

  function closeManual() {
    setManualStep(null);
    setManualJson('');
    setManualJsonError(null);
  }

  function handleManualJsonChange(v: string) {
    setManualJson(v);
    try { JSON.parse(v); setManualJsonError(null); }
    catch (e) { setManualJsonError((e as Error).message); }
  }

  function handleManualSave(step: number) {
    try {
      const parsed = JSON.parse(manualJson);
      if (step === 1) {
        manualSaveMutation.mutate({ step: 1, extractedRequirements: parsed.extractedRequirements as ExtractedRequirements, extractedBehaviors: parsed.extractedBehaviors as ExtractedBehaviors });
      } else if (step === 2) {
        manualSaveMutation.mutate({ step: 2, testScenarios: parsed as TestScenario[] });
      } else if (step === 3) {
        manualSaveMutation.mutate({ step: 3, generatedTestCases: parsed as GeneratedTestCase[] });
      } else if (step === 4) {
        manualSaveMutation.mutate({ step: 4, devPrompt: parsed as DevPrompt });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON' });
    }
  }

  function startEdit(step: number, feature: Feature) {
    const req = feature.extractedRequirements;
    const beh = feature.extractedBehaviors;
    const scn = feature.testScenarios ?? [];
    if (step === 1 && req && beh) {
      setDraft({
        features:           arrToText(req.features),
        businessRules:      arrToText(req.businessRules),
        acceptanceCriteria: arrToText(req.acceptanceCriteria),
        entities:           arrToText(req.entities),
        actors:             arrToText(beh.actors),
        actions:            arrToText(beh.actions),
        behaviorRules:      arrToText(beh.rules),
        featureName:        beh.feature,
      });
    }
    if (step === 2) {
      setDraft({ scenariosJson: JSON.stringify(scn, null, 2) });
    }
    setEditingStep(step);
  }

  function cancelEdit() { setEditingStep(null); setDraft({}); setManualStep(null); setManualJson(''); setManualJsonError(null); }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['features', featureId] });
    qc.invalidateQueries({ queryKey: ['test-cases', featureId] });
    qc.invalidateQueries({ queryKey: ['dev-tasks', featureId] });
  };

  const runMutation = useMutation({
    mutationFn: ({ step }: { step: number }) =>
      api.testCases.runStep(featureId, step, activeProvider ?? undefined),
    onSuccess: (_, { step }) => {
      invalidate();
      toast({ variant: 'success', title: `Step ${step} completed` });
      setOpenStep(step + 1);
    },
    onError: (err: Error, { step }) => {
      invalidate(); // refresh to show FAILED state
      toast({ variant: 'destructive', title: `Step ${step} failed`, description: err.message });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.testCases.resumeStep1(featureId, activeProvider ?? undefined),
    onSuccess: () => {
      invalidate();
      toast({ variant: 'success', title: 'Step 1 resumed' });
      setOpenStep(2);
    },
    onError: (err: Error) => {
      invalidate();
      toast({ variant: 'destructive', title: 'Resume failed', description: err.message });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.testCases.saveStepResults>[1]) =>
      api.testCases.saveStepResults(featureId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      toast({ variant: 'success', title: 'Changes saved' });
      setEditingStep(null);
      setDraft({});
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    },
  });

  const manualSaveMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.testCases.saveStepResults>[1]) =>
      api.testCases.saveStepResults(featureId, data),
    onSuccess: (_, vars) => {
      invalidate();
      toast({ variant: 'success', title: `Step ${vars.step} saved manually` });
      closeManual();
      setOpenStep((vars.step as number) + 1);
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    },
  });

  function handleSave(step: number, f: Feature) {
    if (step === 1 && f.extractedRequirements && f.extractedBehaviors) {
      saveMutation.mutate({
        step: 1,
        extractedRequirements: {
          features:           textToArr(draft.features           ?? arrToText(f.extractedRequirements.features)),
          businessRules:      textToArr(draft.businessRules      ?? arrToText(f.extractedRequirements.businessRules)),
          acceptanceCriteria: textToArr(draft.acceptanceCriteria ?? arrToText(f.extractedRequirements.acceptanceCriteria)),
          entities:           textToArr(draft.entities           ?? arrToText(f.extractedRequirements.entities)),
        } as ExtractedRequirements,
        extractedBehaviors: {
          feature: draft.featureName ?? f.extractedBehaviors.feature,
          actors:  textToArr(draft.actors        ?? arrToText(f.extractedBehaviors.actors)),
          actions: textToArr(draft.actions       ?? arrToText(f.extractedBehaviors.actions)),
          rules:   textToArr(draft.behaviorRules ?? arrToText(f.extractedBehaviors.rules)),
        } as ExtractedBehaviors,
      });
    }
    if (step === 2) {
      try {
        const parsed = JSON.parse(draft.scenariosJson ?? '[]') as TestScenario[];
        saveMutation.mutate({ step: 2, testScenarios: parsed });
      } catch {
        toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix the scenarios JSON and try again.' });
      }
    }
  }

  const isRunning = runMutation.isPending || resumeMutation.isPending;

  if (!feature) return null;

  const activeStep: number | null =
    runMutation.isPending    ? (runMutation.variables?.step ?? null) :
    resumeMutation.isPending ? 1 :
    null;

  const statuses = [1, 2, 3, 4].map(n => deriveStatus(n, feature, testCases.length, activeStep));

  // ── Step panels ───────────────────────────────────────────────────────────

  function renderStep1() {
    const st = statuses[0];
    const req = feature!.extractedRequirements;
    const beh = feature!.extractedBehaviors;
    const isEditing = editingStep === 1;
    const canRun = !!feature!.baDocument && !isRunning;

    return (
      <div className="border-t px-4 py-4 space-y-4">
        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {st === 'idle' && (
            <>
              <button
                disabled={!canRun}
                onClick={() => runMutation.mutate({ step: 1 })}
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
          {st === 'running' && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Extracting…
            </span>
          )}
          {st === 'failed' && (
            <>
              <button
                disabled={!canRun}
                onClick={() => resumeMutation.mutate()}
                className="flex items-center gap-1.5 border border-yellow-500 text-yellow-700 px-3 py-1.5 rounded text-sm hover:bg-yellow-50 disabled:opacity-50"
              >
                {resumeMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Resume Step 1
              </button>
              <button
                disabled={!canRun}
                onClick={() => runMutation.mutate({ step: 1 })}
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
          {st === 'completed' && !isEditing && (
            <>
              <button
                onClick={() => startEdit(1, feature!)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                disabled={!canRun}
                onClick={() => runMutation.mutate({ step: 1 })}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw size={13} /> Re-run
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                disabled={saveMutation.isPending}
                onClick={() => handleSave(1, feature!)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save changes
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted">
                <X size={13} /> Cancel
              </button>
            </>
          )}
        </div>

        {/* Results */}
        {req && beh && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Requirements</p>
              <EditableList label="Features" color="text-blue-700" items={req.features}
                editing={isEditing} fieldKey="features" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
              <EditableList label="Business Rules" color="text-orange-700" items={req.businessRules}
                editing={isEditing} fieldKey="businessRules" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
              <EditableList label="Acceptance Criteria" color="text-green-700" items={req.acceptanceCriteria}
                editing={isEditing} fieldKey="acceptanceCriteria" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
              <EditableList label="Entities" color="text-muted-foreground" items={req.entities}
                editing={isEditing} fieldKey="entities" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Behaviors</p>
              {isEditing ? (
                <div>
                  <p className="text-xs font-semibold mb-1 text-violet-700">Feature name</p>
                  <input
                    className="w-full text-xs border rounded p-1.5 bg-background"
                    value={draft.featureName ?? beh.feature}
                    onChange={e => setDraft(d => ({...d, featureName: e.target.value}))}
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
                  editing fieldKey="actors" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
              )}
              <EditableList label="Actions" color="text-blue-700" items={beh.actions}
                editing={isEditing} fieldKey="actions" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
              <EditableList label="Rules" color="text-orange-700" items={beh.rules}
                editing={isEditing} fieldKey="behaviorRules" draft={draft} onDraftChange={(k,v) => setDraft(d => ({...d,[k]:v}))} />
            </div>
          </div>
        )}

        {/* Manual input panel */}
        {manualStep === 1 && (
          <ManualPanel
            step={1} featureId={featureId}
            templateJson={MANUAL_TEMPLATES[1]}
            manualJson={manualJson} jsonError={manualJsonError}
            isSaving={manualSaveMutation.isPending}
            onJsonChange={handleManualJsonChange}
            onSave={() => handleManualSave(1)}
            onCancel={closeManual}
          />
        )}

        {/* Proceed button */}
        {st === 'completed' && !isEditing && (
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

  function renderStep2() {
    const st = statuses[1];
    const scenarios = feature!.testScenarios ?? [];
    const isEditing = editingStep === 2;
    const canRun = statuses[0] === 'completed' && !isRunning;

    return (
      <div className="border-t px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(st === 'idle' || st === 'failed') && (
            <>
              <button
                disabled={!canRun}
                onClick={() => runMutation.mutate({ step: 2 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-50 ${
                  st === 'failed'
                    ? 'border border-yellow-500 text-yellow-700 hover:bg-yellow-50'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {runMutation.isPending && runMutation.variables?.step === 2
                  ? <Loader2 size={13} className="animate-spin" />
                  : st === 'failed' ? <RefreshCw size={13} /> : <Play size={13} />
                }
                {st === 'failed' ? 'Retry Step 2' : 'Run Step 2'}
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
          {st === 'running' && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Planning scenarios…
            </span>
          )}
          {st === 'completed' && !isEditing && (
            <>
              <button onClick={() => startEdit(2, feature!)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted">
                <Pencil size={13} /> Edit
              </button>
              <button disabled={!canRun} onClick={() => runMutation.mutate({ step: 2 })}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50">
                <RefreshCw size={13} /> Re-run
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button disabled={saveMutation.isPending} onClick={() => handleSave(2, feature!)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50">
                {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
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
            <p className="text-xs text-muted-foreground mb-1">Edit as JSON — each item needs title, type, and requirementRefs.</p>
            <textarea
              className="w-full text-xs border rounded p-2 font-mono resize-y min-h-[200px] bg-background"
              value={draft.scenariosJson ?? JSON.stringify(scenarios, null, 2)}
              onChange={e => setDraft(d => ({...d, scenariosJson: e.target.value}))}
            />
          </div>
        )}

        {manualStep === 2 && (
          <ManualPanel
            step={2} featureId={featureId}
            templateJson={MANUAL_TEMPLATES[2]}
            manualJson={manualJson} jsonError={manualJsonError}
            isSaving={manualSaveMutation.isPending}
            onJsonChange={handleManualJsonChange}
            onSave={() => handleManualSave(2)}
            onCancel={closeManual}
          />
        )}

        {st === 'completed' && !isEditing && (
          <div className="flex justify-end">
            <button onClick={() => setOpenStep(3)} className="text-sm text-primary hover:underline">
              Proceed to Step 3 →
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    const st = statuses[2];
    const canRun = statuses[1] === 'completed' && !isRunning;

    return (
      <div className="border-t px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          {(st === 'idle' || st === 'failed') && (
            <>
              <button
                disabled={!canRun}
                onClick={() => runMutation.mutate({ step: 3 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-50 ${
                  st === 'failed'
                    ? 'border border-yellow-500 text-yellow-700 hover:bg-yellow-50'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {runMutation.isPending && runMutation.variables?.step === 3
                  ? <Loader2 size={13} className="animate-spin" />
                  : st === 'failed' ? <RefreshCw size={13} /> : <Play size={13} />
                }
                {st === 'failed' ? 'Retry Step 3' : 'Run Step 3'}
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
          {st === 'running' && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Generating test cases…
            </span>
          )}
          {st === 'completed' && (
            <>
              <span className="text-xs text-green-700">{testCases.length} test cases generated</span>
              <button disabled={!canRun} onClick={() => runMutation.mutate({ step: 3 })}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50 ml-2">
                <RefreshCw size={13} /> Re-run
              </button>
            </>
          )}
        </div>

        {manualStep === 3 && (
          <ManualPanel
            step={3} featureId={featureId}
            templateJson={MANUAL_TEMPLATES[3]}
            manualJson={manualJson} jsonError={manualJsonError}
            isSaving={manualSaveMutation.isPending}
            onJsonChange={handleManualJsonChange}
            onSave={() => handleManualSave(3)}
            onCancel={closeManual}
          />
        )}

        {st === 'completed' && (
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

  function renderStep4() {
    const st = statuses[3];
    const canRun = statuses[2] === 'completed' && !isRunning;

    return (
      <div className="border-t px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          {(st === 'idle' || st === 'failed') && (
            <>
              <button
                disabled={!canRun}
                onClick={() => runMutation.mutate({ step: 4 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-50 ${
                  st === 'failed'
                    ? 'border border-yellow-500 text-yellow-700 hover:bg-yellow-50'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {runMutation.isPending && runMutation.variables?.step === 4
                  ? <Loader2 size={13} className="animate-spin" />
                  : st === 'failed' ? <RefreshCw size={13} /> : <Play size={13} />
                }
                {st === 'failed' ? 'Retry Step 4' : 'Run Step 4'}
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
          {st === 'running' && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Generating dev prompts…
            </span>
          )}
          {st === 'completed' && (
            <button disabled={!canRun} onClick={() => runMutation.mutate({ step: 4 })}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50">
              <RefreshCw size={13} /> Re-run
            </button>
          )}
        </div>

        {manualStep === 4 && (
          <ManualPanel
            step={4} featureId={featureId}
            templateJson={MANUAL_TEMPLATES[4]}
            manualJson={manualJson} jsonError={manualJsonError}
            isSaving={manualSaveMutation.isPending}
            onJsonChange={handleManualJsonChange}
            onSave={() => handleManualSave(4)}
            onCancel={closeManual}
          />
        )}

        {feature!.devPromptApi && feature!.devPromptFrontend && feature!.devPromptTesting && (
          <DevPromptPanel
            api={feature!.devPromptApi}
            frontend={feature!.devPromptFrontend}
            testing={feature!.devPromptTesting}
          />
        )}
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Step 1 — Extract Requirements & Behaviors', render: renderStep1 },
    { num: 2, title: 'Step 2 — Plan Test Scenarios',              render: renderStep2 },
    { num: 3, title: 'Step 3 — Generate Test Cases',              render: renderStep3 },
    { num: 4, title: 'Step 4 — Generate Dev Prompts',             render: renderStep4 },
  ];

  return (
    <div className="space-y-2 px-6 py-4">
      {steps.map(({ num, title, render }) => (
        <div key={num} className="border rounded-lg bg-card text-sm">
          <StepHeader
            num={num}
            title={title}
            status={statuses[num - 1]}
            open={openStep === num}
            onToggle={() => toggleStep(num)}
          />
          {openStep === num && render()}
        </div>
      ))}
    </div>
  );
}
