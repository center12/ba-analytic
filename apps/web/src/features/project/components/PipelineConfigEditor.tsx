import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type AIProviderInfo, type ProjectStepConfig } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1 — Extract Requirements & Behaviors',
  2: 'Step 2 — Plan Test Scenarios',
  3: 'Step 3 — Generate Test Cases',
  4: 'Step 4 — Development Plan',
  5: 'Step 5 — Dev Prompt Generation',
};

type StepDraft = { provider: string; model: string } | null;
type DraftsState = Record<number, StepDraft>;

interface Props {
  projectId: string;
}

const EMPTY_DRAFTS: DraftsState = { 1: null, 2: null, 3: null, 4: null, 5: null };

function buildDrafts(saved: ProjectStepConfig[]): DraftsState {
  const next: DraftsState = { ...EMPTY_DRAFTS };
  for (const row of saved) {
    next[row.step] = { provider: row.provider, model: row.model ?? '' };
  }
  return next;
}

function draftsEqual(left: DraftsState, right: DraftsState): boolean {
  return ([1, 2, 3, 4, 5] as const).every((step) => {
    const leftDraft = left[step];
    const rightDraft = right[step];
    if (leftDraft === rightDraft) return true;
    if (!leftDraft || !rightDraft) return leftDraft === rightDraft;
    return leftDraft.provider === rightDraft.provider && leftDraft.model === rightDraft.model;
  });
}

export function PipelineConfigEditor({ projectId }: Props) {
  const qc = useQueryClient();

  const { data: providers = [] } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.ai.getProviders(),
    staleTime: Infinity,
  });

  const { data: saved } = useQuery({
    queryKey: ['project-pipeline-config', projectId],
    queryFn: () => api.projects.getPipelineConfig(projectId),
  });

  const [drafts, setDrafts] = useState<DraftsState>(EMPTY_DRAFTS);

  // Sync drafts when saved config loads
  useEffect(() => {
    if (!saved) return;
    const next = buildDrafts(saved);
    setDrafts((current) => (draftsEqual(current, next) ? current : next));
  }, [saved]);

  const savedRows = saved ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const toUpsert = ([1, 2, 3, 4, 5] as const)
        .filter((s) => drafts[s] !== null)
        .map((s) => ({
          step: s,
          provider: drafts[s]!.provider,
          model: drafts[s]!.model || undefined,
        }));

      const toDelete = ([1, 2, 3, 4, 5] as const).filter((s) => {
        const wasSaved = savedRows.some((r: ProjectStepConfig) => r.step === s);
        return wasSaved && drafts[s] === null;
      });

      await Promise.all([
        toUpsert.length ? api.projects.upsertPipelineConfig(projectId, toUpsert) : Promise.resolve(),
        ...toDelete.map((s) => api.projects.deletePipelineConfigStep(projectId, s)),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-pipeline-config', projectId] });
      toast({ variant: 'success', title: 'Pipeline config saved' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    },
  });

  function setStepProvider(step: number, provider: string) {
    setDrafts((d) => ({ ...d, [step]: { provider, model: '' } }));
  }

  function setStepModel(step: number, model: string) {
    setDrafts((d) => ({ ...d, [step]: { ...d[step]!, model } }));
  }

  function clearStep(step: number) {
    setDrafts((d) => ({ ...d, [step]: null }));
  }

  const isDirty = ([1, 2, 3, 4, 5] as const).some((s) => {
    const savedRow = savedRows.find((r: ProjectStepConfig) => r.step === s);
    const draft = drafts[s];
    if (!savedRow && !draft) return false;
    if (!savedRow && draft) return true;
    if (savedRow && !draft) return true;
    return savedRow?.provider !== draft?.provider || (savedRow?.model ?? '') !== draft?.model;
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Set default provider and model per pipeline step. These are used when no override is selected in the wizard.
      </p>

      <div className="space-y-2">
        {([1, 2, 3, 4, 5] as const).map((step) => {
          const draft = drafts[step];
          const isSaved = savedRows.some((r: ProjectStepConfig) => r.step === step);
          const selectedProvider = providers.find((p: AIProviderInfo) => p.provider === draft?.provider);
          const models = selectedProvider?.models ?? [];

          return (
            <div key={step} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="w-64 shrink-0 text-sm font-medium">{STEP_LABELS[step]}</span>

              {draft ? (
                <>
                  <select
                    value={draft.provider}
                    onChange={(e) => setStepProvider(step, e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  >
                    {providers.map((p: AIProviderInfo) => (
                      <option key={p.provider} value={p.provider}>{p.label}</option>
                    ))}
                  </select>

                  <select
                    value={draft.model}
                    onChange={(e) => setStepModel(step, e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                    disabled={models.length === 0}
                  >
                    <option value="">Default model</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => clearStep(step)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    title="Remove override — use env default"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground italic">
                    {isSaved ? 'Clearing on save…' : 'Using env default'}
                  </span>
                  <button
                    onClick={() => setStepProvider(step, providers[0]?.provider ?? 'gemini')}
                    className="text-xs text-primary hover:underline"
                    disabled={providers.length === 0}
                  >
                    Configure
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="rounded px-4 py-1.5 text-sm bg-primary text-primary-foreground disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
