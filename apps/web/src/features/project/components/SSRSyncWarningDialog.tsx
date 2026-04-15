import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type SSRSyncWarningsResponse } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, RefreshCw, GitBranch, Trash2, FileText } from 'lucide-react';

type SyncAction = 'update' | 'keep' | 'remove' | null;

interface SSRSyncWarningDialogProps {
  projectId: string;
  warnings: SSRSyncWarningsResponse | null;
  onClose: () => void;
}

export function SSRSyncWarningDialog({ projectId, warnings, onClose }: SSRSyncWarningDialogProps) {
  const qc = useQueryClient();
  const [actions, setActions] = useState<Record<string, SyncAction>>({});

  // Populate default actions once warnings data arrives
  useEffect(() => {
    if (!warnings) return;
    setActions((prev) => {
      const next = { ...prev };
      warnings.outOfSyncFeatures.forEach((f) => {
        if (!(f.id in next)) next[f.id] = 'update';
      });
      return next;
    });
  }, [warnings]);

  const allDocumentPublished = !!warnings && warnings.outOfSyncFeatures.every(
    (f) => f.syncChangeReason === 'document_published',
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      for (const [featureId, action] of Object.entries(actions)) {
        if (!action) continue;
        if (action === 'update') {
          await api.featureAnalysis.syncUpdate(featureId);
        } else if (action === 'keep') {
          await api.featureAnalysis.syncKeep(featureId);
        } else if (action === 'remove') {
          await api.featureAnalysis.syncRemove(featureId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      toast({ variant: 'success', title: 'Sync actions applied', description: 'Affected features have been updated.' });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Sync failed', description: err.message });
    },
  });

  const setAction = (featureId: string, action: SyncAction) => {
    setActions((prev) => ({ ...prev, [featureId]: action }));
  };

  const actionLabel = (action: SyncAction) => {
    if (action === 'update') return { label: 'Update', icon: <RefreshCw size={12} />, color: 'bg-blue-500/10 text-blue-700 border-blue-200' };
    if (action === 'keep') return { label: 'Keep', icon: <GitBranch size={12} />, color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' };
    if (action === 'remove') return { label: 'Remove', icon: <Trash2 size={12} />, color: 'bg-red-500/10 text-red-700 border-red-200' };
    return { label: 'No action', icon: null, color: '' };
  };

  // Show dialog shell with spinner while query is loading
  if (!warnings) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border rounded-xl shadow-xl w-full max-w-2xl flex flex-col">
          <div className="px-6 py-4 border-b flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-500 mt-0.5 shrink-0" />
            <h2 className="font-semibold text-lg">SSR Updated — Features Out of Sync</h2>
          </div>
          <div className="flex items-center gap-2 px-6 py-8 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Loading affected features…
          </div>
          <div className="px-6 py-4 border-t flex justify-end">
            <button onClick={onClose} className="border px-4 py-2 rounded-md text-sm hover:bg-muted">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg">SSR Updated — Features Out of Sync</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {warnings.outOfSyncFeatures.length} extracted feature{warnings.outOfSyncFeatures.length !== 1 ? 's' : ''} may be affected by recent SSR changes.
              Choose an action for each.
            </p>
            {allDocumentPublished && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5">
                <FileText size={12} className="shrink-0" />
                <span>
                  The SSR document was republished. Re-run <strong>Step 1</strong> on the SSR first to detect which stories actually changed, then review affected features.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {warnings.outOfSyncFeatures.map((f) => {
            const current = actions[f.id];
            return (
              <div key={f.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{f.name}</p>
                    {f.code && <p className="text-xs text-muted-foreground">{f.code}</p>}
                    {f.extractedRequirementIds?.length ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requirements: {f.extractedRequirementIds.join(', ')}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {f.syncChangeReason === 'story_changed'
                        ? 'One or more linked stories changed after Step 1 re-run.'
                        : 'SSR document was republished — story impact unknown until Step 1 re-runs.'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shrink-0">
                    Out of Sync
                  </span>
                </div>

                <div className="flex gap-2">
                  {(['update', 'keep', 'remove'] as const).map((action) => {
                    const { label, icon, color } = actionLabel(action);
                    const isSelected = current === action;
                    return (
                      <button
                        key={action}
                        onClick={() => setAction(f.id, action)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all ${
                          isSelected
                            ? `${color} font-medium ring-1 ring-current`
                            : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                        }`}
                      >
                        {icon}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {current === 'update' && (
                  <p className="text-xs text-muted-foreground">
                    Feature content will be re-derived from the parent SSR's latest Step 1 output.
                  </p>
                )}
                {current === 'keep' && (
                  <p className="text-xs text-muted-foreground">
                    Feature content is kept as-is. Marked as Diverged — future SSR changes won't auto-warn for this feature.
                  </p>
                )}
                {current === 'remove' && (
                  <p className="text-xs text-destructive">
                    Feature and all its data will be permanently deleted.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="border px-4 py-2 rounded-md text-sm hover:bg-muted">
            Dismiss
          </button>
          <button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {applyMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Applying...</>
            ) : (
              'Apply Actions'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
