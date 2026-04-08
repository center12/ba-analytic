import { FrontendPlan } from '@/lib/api';
import { Section } from './Section';
import { StringList } from './StringList';

interface FrontendPanelProps {
  frontend: FrontendPlan;
}

export function FrontendPanel({ frontend }: FrontendPanelProps) {
  return (
    <Section title="Frontend Architecture">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Components', items: frontend.components },
            { label: 'Pages', items: frontend.pages },
            { label: 'Store', items: frontend.store },
            { label: 'Hooks', items: frontend.hooks },
            { label: 'Utils', items: frontend.utils },
            { label: 'Services', items: frontend.services },
            { label: 'Validation', items: frontend.validation ?? [] },
            { label: 'UX States', items: frontend.uxStates ?? [] },
            { label: 'Routing', items: frontend.routing ?? [] },
            { label: 'Error Handling', items: frontend.errorHandling ?? [] },
          ].map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
              <StringList items={items} />
            </div>
          ))}
        </div>

        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">State Management</p>
          {frontend.stateManagement ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Local</p>
                <StringList items={frontend.stateManagement.local ?? []} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Global</p>
                <StringList items={frontend.stateManagement.global ?? []} />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Tool</p>
                <p className="text-xs">{frontend.stateManagement.tool || 'None'}</p>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>

        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">API Integration</p>
          {frontend.apiIntegration ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Services</p>
                <StringList items={frontend.apiIntegration.services ?? []} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">API Mapping</p>
                <StringList items={frontend.apiIntegration.apiMapping ?? []} />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Error Mapping</p>
                <StringList items={frontend.apiIntegration.errorMapping ?? []} />
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>

        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Frontend Tasks</p>
          {frontend.frontendTasks && frontend.frontendTasks.length > 0 ? (
            <div className="space-y-1.5">
              {frontend.frontendTasks.map(task => (
                <div key={task.id} className="border rounded px-2 py-1.5">
                  <p className="text-xs font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
      </div>
    </Section>
  );
}
