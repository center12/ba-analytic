import { FileText, Loader2, Pencil, Play, RefreshCw, Save, X } from 'lucide-react';
import { Dispatch, SetStateAction, useState } from 'react';
import { Feature } from '@/lib/api';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { getLayer1Data, step1ToMarkdown } from '../../helpers/pipeline-wizard.helpers';
import { CopyMarkdownButton } from './CopyMarkdownButton';
import { ManualPanel } from './ManualPanel';
import { LegacyStep1View } from './step1/LegacyStep1View';
import { RulesSection } from './step1/RulesSection';
import { SectionCard } from './step1/SectionCard';
import { TraceabilityMapSection } from './step1/TraceabilityMapSection';
import { UserStoriesSection } from './step1/UserStoriesSection';
import { ValidationSection } from './step1/ValidationSection';

interface PipelineStep1Props {
  feature: Feature;
  featureId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  isRunning: boolean;
  isEditing: boolean;
  manualStep: number | null;
  manualJson: string;
  manualJsonError: string | null;
  manualIsSaving: boolean;
  saveIsPending: boolean;
  resumeIsPending: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
  openManual: (step: number) => void;
  closeManual: () => void;
  handleManualJsonChange: (v: string) => void;
  handleManualSave: (step: number) => void;
  runStep: (step: number, promptAppend?: string) => void;
  promptAppend: string;
  onPromptAppendChange: (v: string) => void;
  resumeStep1: () => void;
  startEdit: (step: number, feature: Feature) => void;
  handleSave: (step: number, feature: Feature) => void;
  cancelEdit: () => void;
  setOpenStep: (step: number) => void;
}

type Step1SectionKey = 'rules' | 'stories' | 'mapping' | 'validation';

export function PipelineStep1({
  feature,
  featureId,
  status,
  isRunning,
  isEditing,
  manualStep,
  manualJson,
  manualJsonError,
  manualIsSaving,
  saveIsPending,
  resumeIsPending,
  draft,
  setDraft,
  openManual,
  closeManual,
  handleManualJsonChange,
  handleManualSave,
  runStep,
  promptAppend,
  onPromptAppendChange,
  resumeStep1,
  startEdit,
  handleSave,
  cancelEdit,
  setOpenStep,
}: PipelineStep1Props) {
  const [openSections, setOpenSections] = useState<Record<Step1SectionKey, boolean>>({
    rules: true,
    stories: true,
    mapping: true,
    validation: true,
  });
  const canRun = !!feature.content?.trim() && !isRunning;
  const { ssr, stories, mapping, validation } = getLayer1Data(feature);
  const hasLayer1 = !!(ssr || stories || mapping || validation);
  const legacyOnly = !hasLayer1 && !!(feature.extractedRequirements && feature.extractedBehaviors);

  const toggleSection = (section: Step1SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-4 border-t px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'idle' && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(1, promptAppend)}
              className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Play size={13} /> Run Step 1
            </button>
            {manualStep !== 1 && (
              <button
                onClick={() => openManual(1)}
                className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Extracting...
          </span>
        )}
        {status === 'failed' && (
          <>
            <button
              disabled={!canRun}
              onClick={resumeStep1}
              className="flex items-center gap-1.5 rounded border border-yellow-500 px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
            >
              {resumeIsPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Resume Step 1
            </button>
            <button
              disabled={!canRun}
              onClick={() => runStep(1, promptAppend)}
              className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={13} /> Restart from scratch
            </button>
            {manualStep !== 1 && (
              <button
                onClick={() => openManual(1)}
                className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'completed' && !isEditing && (
          <>
            <button
              onClick={() => startEdit(1, feature)}
              className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              disabled={!canRun}
              onClick={() => runStep(1, promptAppend)}
              className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={13} /> Re-run
            </button>
            <CopyMarkdownButton
              getText={() => step1ToMarkdown(feature)}
              filename={`step1-requirements-${feature.name}.md`}
            />
          </>
        )}
        {isEditing && (
          <>
            <button
              disabled={saveIsPending}
              onClick={() => handleSave(1, feature)}
              className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saveIsPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save changes
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <X size={13} /> Cancel
            </button>
          </>
        )}
      </div>

      {!isEditing && status !== 'running' && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Append instructions for next run (optional)</p>
          <textarea
            value={promptAppend}
            onChange={(e) => onPromptAppendChange(e.target.value)}
            placeholder="Example: Focus on edge cases around validation and error handling."
            className="min-h-[72px] w-full rounded border bg-background p-2 text-xs"
          />
        </div>
      )}

      {hasLayer1 && (
        <div className="space-y-4">
          <SectionCard
            title="1A — System & Business Rules"
            subtitle="Global rules, constraints, shared policies, and entities extracted from the BA document."
            open={openSections.rules}
            onToggle={() => toggleSection('rules')}
          >
            <RulesSection
              feature={feature}
              ssr={ssr ?? undefined}
              stories={stories ?? undefined}
              isEditing={isEditing}
              draft={draft}
              setDraft={setDraft}
            />
          </SectionCard>

          <SectionCard
            title="1B — User Stories"
            subtitle="Structured stories with actor, action, benefit, acceptance criteria, and linked rules."
            open={openSections.stories}
            onToggle={() => toggleSection('stories')}
          >
            <UserStoriesSection
              stories={stories ?? undefined}
              acceptanceCriteriaSource={feature.extractedRequirements?.acceptanceCriteria ?? []}
              isEditing={isEditing}
              draft={draft}
              setDraft={setDraft}
            />
          </SectionCard>

          <SectionCard
            title="1C — Traceability Map"
            subtitle="Rule-to-story coverage, uncovered rules, and stories that do not map back to rules."
            open={openSections.mapping}
            onToggle={() => toggleSection('mapping')}
          >
            <TraceabilityMapSection mapping={mapping ?? undefined} />
          </SectionCard>

          <SectionCard
            title="1D — Validation"
            subtitle="Quality score, validation summary, and issues raised by the final Layer 1 quality gate."
            open={openSections.validation}
            onToggle={() => toggleSection('validation')}
          >
            <ValidationSection validation={validation ?? undefined} />
          </SectionCard>
        </div>
      )}

      {legacyOnly && (
        <LegacyStep1View feature={feature} isEditing={isEditing} draft={draft} setDraft={setDraft} />
      )}

      {manualStep === 1 && (
        <ManualPanel
          step={1}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[1]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(1)}
          onCancel={closeManual}
        />
      )}

      {status === 'completed' && !isEditing && (
        <div className="flex justify-end">
          <button
            onClick={() => setOpenStep(2)}
            className="text-sm text-primary hover:underline"
          >
            Proceed to Step 2 →
          </button>
        </div>
      )}
    </div>
  );
}
