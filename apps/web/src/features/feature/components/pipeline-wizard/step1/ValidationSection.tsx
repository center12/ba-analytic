import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ValidationIssue, ValidationResult } from '@/lib/api';

function SeverityBadge({ severity }: { severity: ValidationIssue['severity'] }) {
  const cls =
    severity === 'error'
      ? 'bg-red-100 text-red-800'
      : severity === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';

  return <span className={`rounded px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>{severity}</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? 'bg-emerald-100 text-emerald-800'
      : score >= 50
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>Score {score}</span>;
}

interface ValidationSectionProps {
  validation?: ValidationResult;
}

export function ValidationSection({ validation }: ValidationSectionProps) {
  if (!validation) {
    return <p className="text-xs text-muted-foreground">No validation result available.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ScoreBadge score={validation.score} />
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${validation.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {validation.isValid ? 'Valid' : 'Needs review'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{validation.summary}</p>
      {validation.issues.length ? (
        <div className="space-y-2">
          {validation.issues.map((issue, index) => (
            <div key={`${issue.type}-${index}`} className="rounded border px-3 py-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {issue.severity === 'error' ? (
                  <AlertTriangle size={14} className="text-red-600" />
                ) : (
                  <CheckCircle2 size={14} className="text-amber-600" />
                )}
                <SeverityBadge severity={issue.severity} />
                <span className="text-xs font-medium text-slate-700">{issue.type}</span>
              </div>
              <p className="text-xs text-muted-foreground">{issue.message}</p>
              {issue.affectedIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {issue.affectedIds.map((id) => (
                    <span key={id} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                      {id}
                    </span>
                  ))}
                </div>
              )}
              {issue.suggestion && (
                <p className="mt-2 text-xs text-slate-700">
                  Suggestion: {issue.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No validation issues reported.</p>
      )}
    </div>
  );
}
