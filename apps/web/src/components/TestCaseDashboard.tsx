import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TestCase } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT: <Clock size={14} className="text-muted-foreground" />,
  APPROVED: <CheckCircle2 size={14} className="text-green-600" />,
  DEPRECATED: <XCircle size={14} className="text-red-500" />,
};

export function TestCaseDashboard({ featureId }: { featureId: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: testCases = [], isLoading } = useQuery({
    queryKey: ['test-cases', featureId],
    queryFn: () => api.testCases.list(featureId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.testCases.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-cases', featureId] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TestCase['status'] }) =>
      api.testCases.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-cases', featureId] }),
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return <p className="text-muted-foreground">Loading test cases...</p>;

  if (testCases.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="text-lg">No test cases yet.</p>
        <p className="text-sm mt-1">Upload a BA document and click Generate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">{testCases.length} Test Cases</h2>
      </div>

      {testCases.map((tc: TestCase) => (
        <div key={tc.id} className="bg-card border rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => toggle(tc.id)} className="text-muted-foreground">
              {expanded.has(tc.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_ICONS[tc.status]}
                <span className="font-medium text-sm truncate">{tc.title}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[tc.priority])}>
                  {tc.priority}
                </span>
                <span className="text-xs text-muted-foreground">{tc.status}</span>
              </div>
              {tc.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{tc.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {tc.status !== 'APPROVED' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: tc.id, status: 'APPROVED' })}
                  className="text-xs border px-2 py-1 rounded hover:bg-muted"
                >
                  Approve
                </button>
              )}
              <button
                onClick={() => deleteMutation.mutate(tc.id)}
                className="text-muted-foreground hover:text-destructive p-1 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {expanded.has(tc.id) && (
            <div className="border-t px-4 pb-4 pt-3 space-y-3">
              {tc.preconditions && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Preconditions</p>
                  <p className="text-sm">{tc.preconditions}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Steps</p>
                <ol className="space-y-2">
                  {tc.steps.map((step, i) => (
                    <li key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                      <p><span className="font-medium">Action:</span> {step.action}</p>
                      <p className="text-muted-foreground"><span className="font-medium">Expected:</span> {step.expectedResult}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                Generated by {tc.aiProvider} / {tc.modelVersion}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
