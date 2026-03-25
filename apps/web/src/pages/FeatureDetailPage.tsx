import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Sparkles, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { TestCaseDashboard } from '@/components/TestCaseDashboard';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ModelSelector } from '@/components/ModelSelector';
import { PipelinePanel } from '@/components/PipelinePanel';
import { DevPromptPanel } from '@/components/DevPromptPanel';
import { useAppStore } from '@/store';
import { useRef, useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

const PIPELINE_STEPS = [
  'Extracting requirements...',
  'Planning scenarios...',
  'Writing test cases...',
  'Composing dev prompts...',
];

export function FeatureDetailPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();
  const activeProvider = useAppStore((s) => s.activeProvider);
  const qc = useQueryClient();
  const baInputRef = useRef<HTMLInputElement>(null);
  const ssInputRef = useRef<HTMLInputElement>(null);
  const [pipelineStep, setPipelineStep] = useState<number>(-1);

  const { data: feature } = useQuery({
    queryKey: ['features', featureId],
    queryFn: () => api.features.get(featureId!),
    enabled: !!featureId,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.testCases.generate(featureId!, activeProvider),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['test-cases', featureId] });
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      toast({
        variant: 'success',
        title: 'Test cases generated',
        description: `${data.generated} test case(s) from ${data.pipeline.scenariosCount} scenarios.`,
      });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Generation failed', description: err.message });
    },
  });

  // Advance progress steps on a timer while the single POST is in-flight
  useEffect(() => {
    if (!generateMutation.isPending) {
      setPipelineStep(-1);
      return;
    }
    setPipelineStep(0);
    const t1 = setTimeout(() => setPipelineStep(1), 8000);
    const t2 = setTimeout(() => setPipelineStep(2), 18000);
    const t3 = setTimeout(() => setPipelineStep(3), 28000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [generateMutation.isPending]);

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

        {/* Upload + generate controls */}
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

      {/* 3-step pipeline progress */}
      {generateMutation.isPending && (
        <div className="border-b bg-muted/30 px-6 py-2 flex items-center gap-6">
          {PIPELINE_STEPS.map((label, i) => {
            const done = i < pipelineStep;
            const active = i === pipelineStep;
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                {done ? (
                  <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                ) : active ? (
                  <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                )}
                <span className={done ? 'text-green-700' : active ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pipeline results panel */}
      {feature?.extractedRequirements && feature.testScenarios && (
        <PipelinePanel
          extractedRequirements={feature.extractedRequirements}
          extractedBehaviors={feature.extractedBehaviors}
          testScenarios={feature.testScenarios}
        />
      )}

      {/* Dev prompts panel */}
      {feature?.devPromptApi && feature.devPromptFrontend && feature.devPromptTesting && (
        <DevPromptPanel
          api={feature.devPromptApi}
          frontend={feature.devPromptFrontend}
          testing={feature.devPromptTesting}
        />
      )}

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
