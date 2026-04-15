import { type Feature } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FileText, Layers } from 'lucide-react';
import { ProjectFeatureStatusBadges } from './ProjectFeatureStatusBadges';

interface ProjectWorkspaceSidebarProps {
  features: Feature[];
  selectedFeatureId?: string | null;
  onSelectFeature: (featureId: string) => void;
  onSelectOverview: () => void;
  className?: string;
}

export function ProjectWorkspaceSidebar({
  features,
  selectedFeatureId,
  onSelectFeature,
  onSelectOverview,
  className,
}: ProjectWorkspaceSidebarProps) {
  const overviewSelected = !selectedFeatureId;

  return (
    <div className={cn('rounded-xl border bg-card', className)}>
      <div className="border-b px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Project Menu
        </p>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onSelectOverview}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
            overviewSelected
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-transparent hover:border-border hover:bg-muted/60',
          )}
        >
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Overview</p>
            <p className="text-xs text-muted-foreground">
              Project summary and pipeline settings
            </p>
          </div>
        </button>
      </div>

      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Features
          </p>
          <span className="text-xs text-muted-foreground">{features.length}</span>
        </div>
      </div>

      {features.length === 0 ? (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          No features yet. Create one to start the document workspace.
        </div>
      ) : (
        <div className="space-y-1 px-2 pb-2">
          {features.map((feature) => {
            const selected = selectedFeatureId === feature.id;

            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onSelectFeature(feature.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border hover:bg-muted/60',
                )}
              >
                <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                  <Layers size={16} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="truncate font-medium">{feature.name}</p>
                    {feature.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    )}
                  </div>
                  <ProjectFeatureStatusBadges feature={feature} className="gap-1.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
