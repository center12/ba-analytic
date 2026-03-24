import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Sparkles, Upload } from 'lucide-react';
import { TestCaseDashboard } from '@/components/TestCaseDashboard';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ModelSelector } from '@/components/ModelSelector';
import { useAppStore } from '@/store';
import { useRef } from 'react';
import { toast } from '@/hooks/use-toast';

export function FeatureDetailPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();
  const activeProvider = useAppStore((s) => s.activeProvider);
  const qc = useQueryClient();
  const baInputRef = useRef<HTMLInputElement>(null);
  const ssInputRef = useRef<HTMLInputElement>(null);

  const { data: feature } = useQuery({
    queryKey: ['features', featureId],
    queryFn: () => api.features.get(featureId!),
    enabled: !!featureId,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.testCases.generate(featureId!, activeProvider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-cases', featureId] }),
  });

  const uploadBAMutation = useMutation({
    mutationFn: (file: File) => api.features.uploadBADocument(featureId!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features', featureId] }),
  });

  const uploadSSMutation = useMutation({
    mutationFn: (file: File) => api.features.uploadScreenshot(featureId!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features', featureId] }),
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

        {/* Upload controls */}
        <div className="flex items-center gap-2">
          <ModelSelector />
          <input
            ref={baInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
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

          <button
            onClick={() => generateMutation.mutate()}
            disabled={!feature?.baDocument || generateMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {generateMutation.isPending ? 'Generating...' : `Generate (${activeProvider})`}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <TestCaseDashboard featureId={featureId!} />
        </main>
        <aside className="w-96 border-l shrink-0 flex flex-col">
          <ChatSidebar featureId={featureId!} />
        </aside>
      </div>
    </div>
  );
}
