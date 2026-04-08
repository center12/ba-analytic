import { WorkflowStep } from '@/lib/api';
import { Section } from './Section';

interface WorkflowPanelProps {
  workflow: WorkflowStep[];
}

export function WorkflowPanel({ workflow }: WorkflowPanelProps) {
  return (
    <Section title={`Workflow (${workflow.length} steps)`} defaultOpen>
      <div className="space-y-2">
        {workflow.map(step => (
          <div key={step.order} className="flex gap-3 items-start">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
              {step.order}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{step.title}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{step.actor}</span>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
