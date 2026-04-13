import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { Feature, ValidationIssue } from '@/lib/api';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { getLayer1Data, step1ToMarkdown } from '../../helpers/pipeline-wizard.helpers';
import { EditableList } from './EditableList';
import { ManualPanel } from './ManualPanel';
import { CopyMarkdownButton } from './CopyMarkdownButton';

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

function SectionCard({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-background/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </span>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </section>
  );
}

function SeverityBadge({ severity }: { severity: ValidationIssue['severity'] }) {
  const cls =
    severity === 'error'
      ? 'bg-red-100 text-red-800'
      : severity === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';

  return <span className={`rounded px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>{severity}</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? 'bg-emerald-100 text-emerald-800'
      : score >= 50
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>Score {score}</span>;
}

function LegacyStep1View({
  feature,
  isEditing,
  draft,
  setDraft,
}: {
  feature: Feature;
  isEditing: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const req = feature.extractedRequirements;
  const beh = feature.extractedBehaviors;

  if (!req || !beh) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Requirements</p>
        <EditableList
          label="Features"
          color="text-blue-700"
          items={req.features}
          editing={isEditing}
          fieldKey="features"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Business Rules"
          color="text-orange-700"
          items={req.businessRules}
          editing={isEditing}
          fieldKey="businessRules"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Acceptance Criteria"
          color="text-green-700"
          items={req.acceptanceCriteria}
          editing={isEditing}
          fieldKey="acceptanceCriteria"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Entities"
          color="text-muted-foreground"
          items={req.entities}
          editing={isEditing}
          fieldKey="entities"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Behaviors</p>
        {isEditing ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-violet-700">Feature name</p>
            <input
              className="w-full rounded border bg-background p-1.5 text-xs"
              value={draft.featureName ?? beh.feature}
              onChange={(e) => setDraft((d) => ({ ...d, featureName: e.target.value }))}
            />
          </div>
        ) : (
          <div>
            <p className="mb-1 text-xs font-semibold text-violet-700">Feature</p>
            <p className="text-xs text-muted-foreground">{beh.feature}</p>
          </div>
        )}
        {beh.actors.length > 0 && !isEditing && (
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Actors</p>
            <div className="flex flex-wrap gap-1">
              {beh.actors.map((actor, i) => (
                <span key={i} className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                  {actor}
                </span>
              ))}
            </div>
          </div>
        )}
        {isEditing && (
          <EditableList
            label="Actors"
            color="text-violet-700"
            items={beh.actors}
            editing
            fieldKey="actors"
            draft={draft}
            onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
          />
        )}
        <EditableList
          label="Actions"
          color="text-blue-700"
          items={beh.actions}
          editing={isEditing}
          fieldKey="actions"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Rules"
          color="text-orange-700"
          items={beh.rules}
          editing={isEditing}
          fieldKey="behaviorRules"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
      </div>
    </div>
  );
}

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
  const canRun = !!feature.baDocument && !isRunning;
  const { ssr, stories, mapping, validation } = getLayer1Data(feature);
  const hasLayer1 = !!(ssr || stories || mapping || validation);
  const legacyOnly = !hasLayer1 && !!(feature.extractedRequirements && feature.extractedBehaviors);
  const storyDraftValue =
    draft.storiesJson ?? (stories ? JSON.stringify(stories.stories, null, 2) : '[]');
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
            <div className="space-y-3">
              {isEditing ? (
                <div>
                  <p className="mb-1 text-xs font-semibold text-violet-700">Feature name</p>
                  <input
                    className="w-full rounded border bg-background p-1.5 text-xs"
                    value={draft.featureName ?? ssr?.featureName ?? stories?.featureName ?? feature.name}
                    onChange={(e) => setDraft((d) => ({ ...d, featureName: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-xs font-semibold text-violet-700">Feature</p>
                  <p className="text-xs text-muted-foreground">{ssr?.featureName ?? stories?.featureName ?? feature.name}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <EditableList
                  label="System Rules"
                  color="text-sky-700"
                  items={ssr?.systemRules ?? []}
                  editing={isEditing}
                  fieldKey="systemRules"
                  draft={draft}
                  onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                />
                <EditableList
                  label="Business Rules"
                  color="text-orange-700"
                  items={ssr?.businessRules ?? []}
                  editing={isEditing}
                  fieldKey="businessRules"
                  draft={draft}
                  onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                />
                <EditableList
                  label="Constraints"
                  color="text-emerald-700"
                  items={ssr?.constraints ?? []}
                  editing={isEditing}
                  fieldKey="constraints"
                  draft={draft}
                  onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                />
                <EditableList
                  label="Global Policies"
                  color="text-amber-700"
                  items={ssr?.globalPolicies ?? []}
                  editing={isEditing}
                  fieldKey="globalPolicies"
                  draft={draft}
                  onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                />
                <EditableList
                  label="Entities"
                  color="text-slate-700"
                  items={ssr?.entities ?? []}
                  editing={isEditing}
                  fieldKey="entities"
                  draft={draft}
                  onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="1B — User Stories"
            subtitle="Structured stories with actor, action, benefit, acceptance criteria, and linked rules."
            open={openSections.stories}
            onToggle={() => toggleSection('stories')}
          >
            {isEditing ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Edit stories as JSON. This preserves acceptance criteria, related rule IDs, and priority per story.
                </p>
                <textarea
                  className="min-h-[240px] w-full rounded border bg-background p-2 font-mono text-xs"
                  value={storyDraftValue}
                  onChange={(e) => setDraft((d) => ({ ...d, storiesJson: e.target.value }))}
                  placeholder="Paste an array of user stories"
                />
              </div>
            ) : stories?.stories.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-left text-xs">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">ID</th>
                      <th className="px-2 py-2 font-medium">Actor</th>
                      <th className="px-2 py-2 font-medium">Action</th>
                      <th className="px-2 py-2 font-medium">Benefit</th>
                      <th className="px-2 py-2 font-medium">Priority</th>
                      <th className="px-2 py-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stories.stories.map((story) => (
                      <tr key={story.id} className="border-b align-top">
                        <td className="px-2 py-2 font-medium">{story.id}</td>
                        <td className="px-2 py-2 text-muted-foreground">{story.actor}</td>
                        <td className="px-2 py-2 text-muted-foreground">{story.action}</td>
                        <td className="px-2 py-2 text-muted-foreground">{story.benefit}</td>
                        <td className="px-2 py-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {story.priority}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          {story.acceptanceCriteria.length > 0 || story.relatedRuleIds.length > 0 ? (
                            <div className="space-y-2 rounded border bg-muted/20 p-2">
                              {story.acceptanceCriteria.length > 0 && (
                                <div>
                                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Acceptance Criteria</p>
                                  <ul className="space-y-1">
                                    {story.acceptanceCriteria.map((criterion, index) => (
                                      <li key={index} className="flex gap-1.5 text-[11px] text-muted-foreground">
                                        <span className="shrink-0">•</span>
                                        <span>{criterion}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {story.relatedRuleIds.length > 0 && (
                                <div>
                                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Related Rules</p>
                                  <div className="flex flex-wrap gap-1">
                                    {story.relatedRuleIds.map((ruleId) => (
                                      <span key={ruleId} className="rounded bg-blue-100 px-2 py-0.5 text-[11px] text-blue-800">
                                        {ruleId}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">No additional details.</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No user stories available.</p>
            )}
          </SectionCard>

          <SectionCard
            title="1C — Traceability Map"
            subtitle="Rule-to-story coverage, uncovered rules, and stories that do not map back to rules."
            open={openSections.mapping}
            onToggle={() => toggleSection('mapping')}
          >
            {mapping?.links.length ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 font-medium">Rule ID</th>
                        <th className="px-2 py-2 font-medium">Text</th>
                        <th className="px-2 py-2 font-medium">Linked Stories</th>
                        <th className="px-2 py-2 font-medium">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapping.links.map((link) => (
                        <tr key={`${link.ruleId}-${link.ruleText}`} className="border-b align-top">
                          <td className="px-2 py-2 font-medium">{link.ruleId}</td>
                          <td className="px-2 py-2 text-muted-foreground">{link.ruleText}</td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              {link.storyIds.length ? link.storyIds.map((storyId) => (
                                <span key={storyId} className="rounded bg-blue-100 px-2 py-0.5 text-[11px] text-blue-800">
                                  {storyId}
                                </span>
                              )) : <span className="text-muted-foreground">None</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-medium uppercase ${
                                link.coverage === 'full'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : link.coverage === 'partial'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {link.coverage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded border border-red-200 bg-red-50 px-3 py-3">
                    <p className="mb-2 text-xs font-semibold text-red-800">Uncovered Rules</p>
                    {mapping.uncoveredRules.length ? (
                      <div className="flex flex-wrap gap-1">
                        {mapping.uncoveredRules.map((ruleId) => (
                          <span key={ruleId} className="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-800">
                            {ruleId}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-700">No uncovered rules.</p>
                    )}
                  </div>
                  <div className="rounded border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="mb-2 text-xs font-semibold text-amber-800">Stories With No Rules</p>
                    {mapping.storiesWithNoRules.length ? (
                      <div className="flex flex-wrap gap-1">
                        {mapping.storiesWithNoRules.map((storyId) => (
                          <span key={storyId} className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                            {storyId}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700">Every story maps to at least one rule.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No traceability mapping available.</p>
            )}
          </SectionCard>

          <SectionCard
            title="1D — Validation"
            subtitle="Quality score, validation summary, and issues raised by the final Layer 1 quality gate."
            open={openSections.validation}
            onToggle={() => toggleSection('validation')}
          >
            {validation ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreBadge score={validation.score} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${validation.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {validation.isValid ? 'Valid' : 'Needs review'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{validation.summary}</p>
                {validation.issues.length ? (
                  <div className="space-y-2">
                    {validation.issues.map((issue, index) => (
                      <div key={`${issue.type}-${index}`} className="rounded border px-3 py-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {issue.severity === 'error' ? (
                            <AlertTriangle size={14} className="text-red-600" />
                          ) : (
                            <CheckCircle2 size={14} className="text-amber-600" />
                          )}
                          <SeverityBadge severity={issue.severity} />
                          <span className="text-xs font-medium text-slate-700">{issue.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{issue.message}</p>
                        {issue.affectedIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {issue.affectedIds.map((id) => (
                              <span key={id} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                {id}
                              </span>
                            ))}
                          </div>
                        )}
                        {issue.suggestion && (
                          <p className="mt-2 text-xs text-slate-700">
                            Suggestion: {issue.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No validation issues reported.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No validation result available.</p>
            )}
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
