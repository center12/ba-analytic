import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Upload } from 'lucide-react';
import { ChatSidebar } from '@/features/chat/ChatSidebar';
import { ModelSelector } from '@/features/ai/ModelSelector';
import { DeveloperTaskPanel } from '@/features/dev-task/DeveloperTaskPanel';
import { PipelineWizard } from './PipelineWizard';
import { BADocFormatGuide } from './components/feature-detail/BADocFormatGuide';
import { useRef } from 'react';
import { toast } from '@/hooks/use-toast';

export function FeatureDetailPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();
  const qc = useQueryClient();
  const baInputRef = useRef<HTMLInputElement>(null);
  const ssInputRef = useRef<HTMLInputElement>(null);

  const { data: feature } = useQuery({
    queryKey: ['features', featureId],
    queryFn: () => api.features.get(featureId!),
    enabled: !!featureId,
  });

  const uploadBAMutation = useMutation({
    mutationFn: (file: File) => api.features.uploadBADocument(featureId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      toast({ variant: 'success', title: 'BA document uploaded' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    },
  });

  const uploadSSMutation = useMutation({
    mutationFn: (file: File) => api.features.uploadScreenshot(featureId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      toast({ variant: 'success', title: 'Screenshot uploaded' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    },
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
          <ModelSelector />

          <input
            ref={baInputRef}
            type="file"
            accept=".md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadBAMutation.mutate(f);
            }}
          />
          <button
            onClick={() => baInputRef.current?.click()}
            className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted"
          >
            <Upload size={14} />
            {feature?.baDocument ? 'Replace BA Doc' : 'Upload BA Doc'}
          </button>
          <BADocFormatGuide />

          <input
            ref={ssInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadSSMutation.mutate(f);
            }}
          />
          <button
            onClick={() => ssInputRef.current?.click()}
            className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted"
          >
            <Upload size={14} /> Screenshot
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {featureId && (
            <PipelineWizard featureId={featureId} />
          )}
          <DeveloperTaskPanel featureId={featureId!} />
        </main>
        <aside className="w-96 border-l shrink-0 flex flex-col">
          <ChatSidebar featureId={featureId!} />
        </aside>
      </div>
    </div>
  );
}
