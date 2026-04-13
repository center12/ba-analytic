import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { ModelSelector } from '@/features/ai/ModelSelector';
import { DeveloperTaskPanel } from '@/features/dev-task/DeveloperTaskPanel';
import { PipelineWizard } from './PipelineWizard';
import { AppFeedbackDialog } from '@/features/feedback/components/AppFeedbackDialog';

export function FeatureDetailPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();

  const { data: feature } = useQuery({
    queryKey: ['features', featureId],
    queryFn: () => api.features.get(featureId!),
    enabled: !!featureId,
  });

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center gap-4 bg-card shrink-0">
        <Link
          to={`/projects/${projectId}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">{feature?.name ?? '...'}</h1>
          {feature?.description && (
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AppFeedbackDialog
            pageTitle="Feature Detail"
            contextLabel={feature?.name || 'Feature'}
            className="py-1.5"
          />
          <ModelSelector />
        </div>
      </header>

      {/* No content warning */}
      {feature && !feature.content?.trim() && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle size={14} />
          No requirements content yet. Go to the{' '}
          <Link to={`/projects/${projectId}`} className="underline font-medium">
            project page
          </Link>{' '}
          and add content to this feature before running the pipeline.
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {featureId && (
            <PipelineWizard featureId={featureId} />
          )}
          <DeveloperTaskPanel featureId={featureId!} />
        </main>
      </div>
    </div>
  );
}
