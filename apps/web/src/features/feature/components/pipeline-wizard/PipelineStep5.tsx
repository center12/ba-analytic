import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Play, RefreshCw } from 'lucide-react';
import { api, Feature } from '@/lib/api';
import { useAppStore } from '@/store';
import { toast } from '@/hooks/use-toast';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { step5ToMarkdown } from '../../helpers/pipeline-wizard.helpers';
import { ManualPanel } from './ManualPanel';
import { DevPromptPanel } from './DevPromptPanel';
import { CopyMarkdownButton } from './CopyMarkdownButton';

interface PipelineStep5Props {
  feature: Feature;
  featureId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  previousStepCompleted: boolean;
  isRunning: boolean;
  manualStep: number | null;
  manualJson: string;
  manualJsonError: string | null;
  manualIsSaving: boolean;
  runIsPendingForStep: boolean;
  openManual: (step: number) => void;
  closeManual: () => void;
  handleManualJsonChange: (v: string) => void;
  handleManualSave: (step: number) => void;
  runStep: (step: number) => void;
}

type Step5Section = 'backend' | 'frontend' | 'testing';

function SectionGenerateButton({
  label,
  section,
  featureId,
  disabled,
}: {
  label: string;
  section: Step5Section;
  featureId: string;
  disabled: boolean;
}) {
  const activeProvider = useAppStore(s => s.activeProvider);
  const activeModel = useAppStore(s => s.activeModel);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.testCases.runStep5Section(featureId, section, activeProvider ?? undefined, activeModel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      qc.invalidateQueries({ queryKey: ['dev-tasks', featureId] });
      toast({ variant: 'success', title: `${label} prompts generated` });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: `${label} generation failed`, description: err.message });
    },
  });

  return (
    <button
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate()}
      className="flex items-center gap-1.5 border px-2.5 py-1 rounded text-xs hover:bg-muted disabled:opacity-50"
    >
      {mutation.isPending
        ? <Loader2 size={12} className="animate-spin" />
        : <Play size={12} />
      }
      {mutation.isPending ? 'Generating…' : `Generate ${label}`}
    </button>
  );
}

export function PipelineStep5({
  feature,
  featureId,
  status,
  previousStepCompleted,
  isRunning,
  manualStep,
  manualJson,
  manualJsonError,
  manualIsSaving,
  runIsPendingForStep,
  openManual,
  closeManual,
  handleManualJsonChange,
  handleManualSave,
  runStep,
}: PipelineStep5Props) {
  const canRun = previousStepCompleted && !isRunning;
  const hasAnyPrompt = !!(feature.devPromptApi || feature.devPromptFrontend || feature.devPromptTesting);

  return (
    <div className="border-t px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(status === 'idle' || status === 'failed') && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(5)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-50 ${
                status === 'failed'
                  ? 'border border-yellow-500 text-yellow-700 hover:bg-yellow-50'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {runIsPendingForStep
                ? <Loader2 size={13} className="animate-spin" />
                : status === 'failed' ? <RefreshCw size={13} /> : <Play size={13} />
              }
              {status === 'failed' ? 'Retry All' : 'Generate All'}
            </button>
            {manualStep !== 5 && (
              <button
                disabled={!canRun}
                onClick={() => openManual(5)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Generating dev prompts...
          </span>
        )}
        {status === 'completed' && (
          <>
            <button disabled={!canRun} onClick={() => runStep(5)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50">
              <RefreshCw size={13} /> Re-run All
            </button>
            <CopyMarkdownButton
              getText={() => step5ToMarkdown(feature)}
              filename={`step5-dev-prompts-${feature.name}.md`}
            />
          </>
        )}
      </div>

      {previousStepCompleted && (
        <p className="text-xs text-muted-foreground">
          Manual flow: click <span className="font-medium">Manual</span> to copy the Step 5 prompt, refine it in an external chatbot, then paste JSON back to save. Step 5 sections are
          <span className="font-medium"> backend</span>, <span className="font-medium">frontend</span>, and <span className="font-medium">testing</span>. Backend maps to stored
          <span className="font-medium"> devPromptApi</span> / <span className="font-medium">API</span> for compatibility.
        </p>
      )}

      {previousStepCompleted && (
        <div className="flex items-center gap-2 flex-wrap">
          <SectionGenerateButton
            label="Backend"
            section="backend"
            featureId={featureId}
            disabled={!canRun}
          />
          <SectionGenerateButton
            label="Frontend"
            section="frontend"
            featureId={featureId}
            disabled={!canRun}
          />
          <SectionGenerateButton
            label="Testing"
            section="testing"
            featureId={featureId}
            disabled={!canRun}
          />
        </div>
      )}

      {manualStep === 5 && (
        <ManualPanel
          step={5}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[5]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(5)}
          onCancel={closeManual}
        />
      )}

      {hasAnyPrompt && (
        <DevPromptPanel
          api={feature.devPromptApi}
          frontend={feature.devPromptFrontend}
          testing={feature.devPromptTesting}
        />
      )}
    </div>
  );
}
