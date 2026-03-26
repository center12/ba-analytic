import { CheckCircle2, ChevronDown, ChevronRight, Circle, Loader2, XCircle } from 'lucide-react';
import { StepStatus } from '../../types/pipeline-wizard.types';

interface StepHeaderProps {
  num: number;
  title: string;
  status: StepStatus;
  open: boolean;
  onToggle: () => void;
}

export function StepHeader({ num, title, status, open, onToggle }: StepHeaderProps) {
  const icon =
    status === 'completed' ? <CheckCircle2 size={16} className="text-green-600 shrink-0" /> :
    status === 'running' ? <Loader2 size={16} className="animate-spin text-primary shrink-0" /> :
    status === 'failed' ? <XCircle size={16} className="text-red-500 shrink-0" /> :
    <Circle size={16} className="text-muted-foreground shrink-0" />;

  const statusLabel =
    status === 'completed' ? 'Completed' :
    status === 'running' ? 'Running...' :
    status === 'failed' ? 'Failed' : 'Not started';

  const labelCls =
    status === 'completed' ? 'text-green-700' :
    status === 'running' ? 'text-primary' :
    status === 'failed' ? 'text-red-600' : 'text-muted-foreground';

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
