import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Coins } from 'lucide-react';
import { api, StepTokenUsage } from '@/lib/api';

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1 — Analysis',
  2: 'Step 2 — Scenarios',
  3: 'Step 3 — Test Cases',
  4: 'Step 4 — Dev Plan',
  5: 'Step 5 — Dev Prompts',
};

const SECTION_LABELS: Record<string, string> = {
  'ssr-stories': '1A+1B: Stories',
  'mapping': '1C: Traceability',
  'validation': '1D: Validation',
  'workflow-backend': '4A: Workflow + Backend',
  'frontend': '4B: Frontend',
  'testing-backend': '4C: Backend Testing',
  'testing-frontend': '4C: Frontend Testing',
  'api': '5A: API Prompts',
  'testing': '5C: Testing Prompts',
};

function fmt(n: number) {
  return n.toLocaleString();
}

function stepLabel(row: StepTokenUsage) {
  if (row.section) return SECTION_LABELS[row.section] ?? row.section;
  return STEP_LABELS[row.step] ?? `Step ${row.step}`;
}

interface Props {
  featureId: string;
}

export function TokenUsagePanel({ featureId }: Props) {
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['feature-token-usage', featureId],
    queryFn: () => api.featureAnalysis.getTokenUsage(featureId),
    enabled: !!featureId,
    staleTime: 30_000,
  });

  if (!data || data.steps.length === 0) return null;

  const { steps, totals } = data;

  return (
    <div className="mx-6 mt-3 border rounded-lg bg-muted/30 text-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/50 rounded-lg transition-colors"
      >
        <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-muted-foreground">Token Usage</span>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Total: <span className="font-semibold text-foreground">{fmt(totals.totalTokens)}</span>
          </span>
          <span>
            Prompt: <span className="font-semibold">{fmt(totals.promptTokens)}</span>
          </span>
          <span>
            Completion: <span className="font-semibold">{fmt(totals.completionTokens)}</span>
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1.5 pr-4 text-left font-medium">Step</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Prompt</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Completion</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Total</th>
                  <th className="py-1.5 pr-4 text-left font-medium">Provider</th>
                  <th className="py-1.5 text-left font-medium">Model</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/40">
                    <td className="py-1.5 pr-4">{stepLabel(row)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(row.promptTokens)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(row.completionTokens)}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums font-medium">{fmt(row.totalTokens)}</td>
                    <td className="py-1.5 pr-4 text-muted-foreground">{row.provider}</td>
                    <td className="py-1.5 text-muted-foreground truncate max-w-[180px]">{row.model}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-1.5 pr-4">Total</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(totals.promptTokens)}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(totals.completionTokens)}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(totals.totalTokens)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
