import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DevPlan, WorkflowStep, ApiRoute } from '@/lib/api';

interface Props {
  devPlan: DevPlan;
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted text-sm font-medium"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="px-3 py-3 text-sm space-y-2">{children}</div>}
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground italic">None</span>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function WorkflowSection({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step) => (
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
  );
}

function ApiRoutesTable({ routes }: { routes: ApiRoute[] }) {
  const methodColor: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-green-100 text-green-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    PATCH: 'bg-orange-100 text-orange-800',
    DELETE: 'bg-red-100 text-red-800',
  };
  return (
    <div className="space-y-1.5">
      {routes.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`shrink-0 text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${methodColor[r.method] ?? 'bg-muted'}`}>
            {r.method}
          </span>
          <span className="font-mono text-xs text-muted-foreground shrink-0">{r.path}</span>
          <span className="text-xs text-muted-foreground">— {r.description}</span>
        </div>
      ))}
    </div>
  );
}

export function DevPlanPanel({ devPlan }: Props) {
  const { workflow, backend, frontend, testing } = devPlan;

  return (
    <div className="space-y-2">
      {/* Workflow */}
      <Section title={`Workflow (${workflow.length} steps)`} defaultOpen>
        <WorkflowSection steps={workflow} />
      </Section>

      {/* Backend */}
      <Section title="Backend Architecture">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Database</p>
            <div className="space-y-1">
              <p className="text-xs font-medium">Entities</p>
              <StringList items={backend.database.entities} />
              <p className="text-xs font-medium mt-2">Relationships</p>
              <StringList items={backend.database.relationships} />
            </div>
          </div>
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">API Routes</p>
            <ApiRoutesTable routes={backend.apiRoutes} />
          </div>
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Folder Structure</p>
            <ul className="space-y-0.5">
              {backend.folderStructure.map((path, i) => (
                <li key={i} className="font-mono text-xs text-muted-foreground">{path}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Frontend */}
      <Section title="Frontend Architecture">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Components', items: frontend.components },
            { label: 'Pages', items: frontend.pages },
            { label: 'Store', items: frontend.store },
            { label: 'Hooks', items: frontend.hooks },
            { label: 'Utils', items: frontend.utils },
            { label: 'Services', items: frontend.services },
          ].map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <StringList items={items} />
            </div>
          ))}
        </div>
      </Section>

      {/* Testing */}
      <Section title="Testing Plan">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Backend Unit Tests</p>
            <StringList items={testing.backendUnitTests} />
          </div>
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Frontend Tests</p>
            <StringList items={testing.frontendTests} />
          </div>
        </div>
      </Section>
    </div>
  );
}
