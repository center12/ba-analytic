import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Project } from '@/lib/api';
import { DocumentEditor } from '@/components/ui/DocumentEditor';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { toast } from '@/hooks/use-toast';
import { Edit2, Save, X, Copy, Coins } from 'lucide-react';

const OVERVIEW_TEMPLATE = `# Project Overview

## Purpose
Describe the business goal and problem this project solves.

## Scope
What is included / excluded from this project.

## Stakeholders
- **Product Owner**: ...
- **Development Team**: ...

## Key Requirements
- Requirement 1
- Requirement 2

## System & Business Rules
- Rule 1
- Rule 2

## Constraints & Assumptions
- Constraint 1
- Assumption 1
`;

const CONVERT_PROMPT = `Convert the following document into a structured project overview in Markdown format.
Use these sections: Purpose, Scope, Stakeholders, Key Requirements, System & Business Rules, Constraints & Assumptions.
Be concise and specific. Output only the Markdown content.

Document:
[PASTE YOUR DOCUMENT HERE]`;

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.overview ?? '');

  const updateMutation = useMutation({
    mutationFn: (overview: string) => api.projects.update(project.id, { overview }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', project.id] });
      setEditing(false);
      toast({ variant: 'success', title: 'Overview saved' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Failed to save', description: err.message });
    },
  });

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CONVERT_PROMPT);
    toast({ variant: 'success', title: 'Conversion prompt copied' });
  };

  const handleUseTemplate = () => {
    setDraft(OVERVIEW_TEMPLATE);
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Edit Overview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1 text-xs border px-2 py-1 rounded hover:bg-muted"
              title="Copy AI conversion prompt"
            >
              <Copy size={12} /> Copy Conversion Prompt
            </button>
            <button
              onClick={handleUseTemplate}
              className="text-xs border px-2 py-1 rounded hover:bg-muted"
            >
              Use Template
            </button>
          </div>
        </div>
        <DocumentEditor
          markdown={draft}
          onChange={setDraft}
          placeholder="Write your project overview in Markdown..."
        />
        <div className="flex gap-2">
          <button
            onClick={() => updateMutation.mutate(draft)}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
          >
            <Save size={14} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setDraft(project.overview ?? ''); setEditing(false); }}
            className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Project Overview</span>
        <button
          onClick={() => { setDraft(project.overview ?? ''); setEditing(true); }}
          className="flex items-center gap-1 text-xs border px-2 py-1 rounded hover:bg-muted"
        >
          <Edit2 size={12} /> Edit
        </button>
      </div>
      {project.overview ? (
        <MarkdownPreview content={project.overview} className="text-sm" />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No overview yet.{' '}
          <button onClick={() => setEditing(true)} className="underline hover:text-foreground">
            Add one
          </button>
          {' '}or{' '}
          <button onClick={handleCopyPrompt} className="underline hover:text-foreground">
            copy the AI conversion prompt
          </button>
          {' '}to convert an existing document.
        </p>
      )}
      <ProjectTokenStats projectId={project.id} />
    </div>
  );
}

function ProjectTokenStats({ projectId }: { projectId: string }) {
  const { data } = useQuery({
    queryKey: ['project-token-usage', projectId],
    queryFn: () => api.projects.getTokenUsage(projectId),
    staleTime: 60_000,
  });

  if (!data || data.totals.totalTokens === 0) return null;

  const { features, totals } = data;

  return (
    <div className="mt-6 border rounded-lg bg-muted/30 text-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b">
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Token Usage</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{totals.totalTokens.toLocaleString()}</span>
        </span>
      </div>
      <div className="overflow-x-auto px-4 pb-3 pt-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1.5 pr-4 text-left font-medium">Feature</th>
              <th className="py-1.5 pr-4 text-right font-medium">Prompt</th>
              <th className="py-1.5 pr-4 text-right font-medium">Completion</th>
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {features.filter(f => f.totalTokens > 0).map(f => (
              <tr key={f.featureId} className="border-b border-border/50 hover:bg-muted/40">
                <td className="py-1.5 pr-4">{f.featureName}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{f.promptTokens.toLocaleString()}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{f.completionTokens.toLocaleString()}</td>
                <td className="py-1.5 text-right tabular-nums font-medium">{f.totalTokens.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-1.5 pr-4">Total</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{totals.promptTokens.toLocaleString()}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums">{totals.completionTokens.toLocaleString()}</td>
              <td className="py-1.5 text-right tabular-nums">{totals.totalTokens.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
