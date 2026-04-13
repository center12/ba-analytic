import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Project } from '@/lib/api';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { toast } from '@/hooks/use-toast';
import { Edit2, Save, X, Copy } from 'lucide-react';

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
        <textarea
          className="w-full border rounded-md px-3 py-2 bg-background font-mono text-sm resize-y min-h-[240px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
    </div>
  );
}
