import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Copy, Check, Trash2 } from 'lucide-react';
import { api, type DeveloperTask, type DevTaskCategory } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const CATEGORY_STYLES: Record<DevTaskCategory, { label: string; badge: string }> = {
  API:      { label: '4A — API',      badge: 'bg-blue-100 text-blue-700' },
  FRONTEND: { label: '4B — Frontend', badge: 'bg-violet-100 text-violet-700' },
  TESTING:  { label: '4C — Testing',  badge: 'bg-green-100 text-green-700' },
};

function TaskCard({ task, onDeleted }: { task: DeveloperTask; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(task.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const deleteMutation = useMutation({
    mutationFn: () => api.devTasks.remove(task.id),
    onSuccess: () => {
      onDeleted();
      toast({ variant: 'success', title: 'Task deleted' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Delete failed', description: err.message });
    },
  });

  const style = CATEGORY_STYLES[task.category];

  return (
    <div className="border rounded-lg bg-card text-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
          {style.label}
        </span>
        <span className="font-medium flex-1 truncate">{task.title}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted"
          >
            {copied ? <><Check size={11} className="text-green-600" /> Copied!</> : <><Copy size={11} /> Copy</>}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/40 rounded p-3 max-h-72 overflow-y-auto leading-relaxed">
            {task.prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

export function DeveloperTaskPanel({ featureId }: { featureId: string }) {
  const [open, setOpen] = useState(true);
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['dev-tasks', featureId],
    queryFn: () => api.devTasks.list(featureId),
    enabled: !!featureId,
  });

  if (tasks.length === 0) return null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dev-tasks', featureId] });

  return (
    <div className="border rounded-lg mx-6 mt-3 bg-card text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 rounded-lg text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium">Developer Tasks</span>
        <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">API · Frontend · Testing</span>
      </button>

      {open && (
        <div className="border-t p-4 flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDeleted={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}
