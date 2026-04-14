import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  DevPlan,
  Feature,
  ExtractedRequirements,
  ExtractedBehaviors,
  TestScenario,
  GeneratedTestCase,
  FeatureAnalysis,
  DevPrompt,
  Mapping,
  SSRData,
  UserStories,
  ValidationResult,
} from '@/lib/api';
import { useAppStore } from '@/store';
import { toast } from '@/hooks/use-toast';
import { MANUAL_TEMPLATES } from './constants/pipeline-wizard.constants';
import { arrToText, deriveStatus, getLayer1Data, textToArr } from './helpers/pipeline-wizard.helpers';
import { StepHeader } from './components/pipeline-wizard/StepHeader';
import { PipelineStep1 } from './components/pipeline-wizard/PipelineStep1';
import { PipelineStep2 } from './components/pipeline-wizard/PipelineStep2';
import { PipelineStep3 } from './components/pipeline-wizard/PipelineStep3';
import { PipelineStep4 } from './components/pipeline-wizard/PipelineStep4';
import { PipelineStep5 } from './components/pipeline-wizard/PipelineStep5';

type Step4Section = 'workflow-backend' | 'frontend' | 'testing-backend' | 'testing-frontend';
type Step5Section = 'backend' | 'frontend' | 'testing';

// ── Main wizard ───────────────────────────────────────────────────────────────

interface Props {
  featureId: string;
}

export function PipelineWizard({ featureId }: Props) {
  const activeProvider = useAppStore(s => s.activeProvider);
  const activeModel = useAppStore(s => s.activeModel);
  const qc = useQueryClient();

  const { data: feature } = useQuery({
    queryKey: ['features', featureId],
    queryFn: () => api.features.get(featureId),
    enabled: !!featureId,
  });

  const { data: featureAnalyses = [] } = useQuery({
    queryKey: ['feature-analysis', featureId],
    queryFn: () => api.featureAnalysis.list(featureId),
    enabled: !!featureId,
  });

  const { data: siblingFeatures = [] } = useQuery({
    queryKey: ['features', feature?.projectId],
    queryFn: () => api.features.list(feature!.projectId),
    enabled: !!feature?.projectId,
  });

  const relatedFeaturesWithPlan = siblingFeatures.filter(
    (f) =>
      f.id !== featureId &&
      feature?.relatedFeatureIds?.includes(f.id) &&
      (f.devPlanWorkflow || f.devPlanBackend || f.devPlanFrontend),
  );

  // Which steps are open
  const [openStep, setOpenStep] = useState<number>(1);
  // Edit mode per step
  const [editingStep, setEditingStep] = useState<number | null>(null);
  // Draft values for editing
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Manual input mode
  const [manualStep, setManualStep] = useState<number | null>(null);
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);
  const [stepPromptAppend, setStepPromptAppend] = useState<Record<number, string>>({});
  const [step4SectionPromptAppend, setStep4SectionPromptAppend] = useState<Record<Step4Section, string>>({
    'workflow-backend': '',
    frontend: '',
    'testing-backend': '',
    'testing-frontend': '',
  });
  const [step5SectionPromptAppend, setStep5SectionPromptAppend] = useState<Record<Step5Section, string>>({
    backend: '',
    frontend: '',
    testing: '',
  });

  function toggleStep(n: number) {
    setOpenStep(v => v === n ? 0 : n);
  }

  function openManual(step: number) {
    setEditingStep(null);
    setDraft({});
    setManualStep(step);
    setManualJson(MANUAL_TEMPLATES[step] ?? '');
    setManualJsonError(null);
  }

  function closeManual() {
    setManualStep(null);
    setManualJson('');
    setManualJsonError(null);
  }

  function handleManualJsonChange(v: string) {
    setManualJson(v);
    try { JSON.parse(v); setManualJsonError(null); }
    catch (e) { setManualJsonError((e as Error).message); }
  }

  function handleManualSave(step: number) {
    try {
      const parsed = JSON.parse(manualJson);
      if (step === 1) {
        manualSaveMutation.mutate({
          step: 1,
          ssrData: parsed.ssr as SSRData,
          userStories: parsed.stories as UserStories,
          mapping: parsed.mapping as Mapping,
          validationResult: parsed.validation as ValidationResult,
        });
      } else if (step === 2) {
        manualSaveMutation.mutate({ step: 2, testScenarios: parsed as TestScenario[] });
      } else if (step === 3) {
        manualSaveMutation.mutate({ step: 3, generatedTestCases: parsed as GeneratedTestCase[] });
      } else if (step === 4) {
        manualSaveMutation.mutate({ step: 4, devPlan: parsed as DevPlan });
      } else if (step === 5) {
        manualSaveMutation.mutate({ step: 5, devPrompt: parsed as DevPrompt });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON' });
    }
  }

  function startEdit(step: number, feature: Feature) {
    const req = feature.extractedRequirements;
    const beh = feature.extractedBehaviors;
    const scn = feature.testScenarios ?? [];
    const { ssr, stories } = getLayer1Data(feature);
    if (step === 1 && ssr && stories) {
      setDraft({
        featureName: ssr.featureName,
        functionalRequirements: arrToText(ssr.functionalRequirements ?? []),
        systemRules: arrToText(ssr.systemRules),
        businessRules: arrToText(ssr.businessRules),
        constraints: arrToText(ssr.constraints),
        globalPolicies: arrToText(ssr.globalPolicies),
        entities: arrToText(ssr.entities),
        acceptanceCriteria: arrToText(req?.acceptanceCriteria ?? []),
        storiesJson: JSON.stringify(stories.stories, null, 2),
      });
    } else if (step === 1 && req && beh) {
      setDraft({
        features:           arrToText(req.features),
        businessRules:      arrToText(req.businessRules),
        acceptanceCriteria: arrToText(req.acceptanceCriteria),
        entities:           arrToText(req.entities),
        actors:             arrToText(beh.actors),
        actions:            arrToText(beh.actions),
        behaviorRules:      arrToText(beh.rules),
        featureName:        beh.feature,
      });
    }
    if (step === 2) {
      setDraft({ scenariosJson: JSON.stringify(scn, null, 2) });
    }
    setEditingStep(step);
  }

  function cancelEdit() { setEditingStep(null); setDraft({}); setManualStep(null); setManualJson(''); setManualJsonError(null); }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['features', featureId] });
    qc.invalidateQueries({ queryKey: ['feature-analysis', featureId] });
    qc.invalidateQueries({ queryKey: ['dev-tasks', featureId] });
  };

  const runMutation = useMutation({
    mutationFn: ({ step, promptAppend }: { step: number; promptAppend?: string }) =>
      api.featureAnalysis.runStep(featureId, step, activeProvider ?? undefined, activeModel, undefined, promptAppend),
    onSuccess: (_, { step }) => {
      invalidate();
      toast({ variant: 'success', title: `Step ${step} completed` });
      setOpenStep(step + 1);
    },
    onError: (err: Error, { step }) => {
      invalidate(); // refresh to show FAILED state
      toast({ variant: 'destructive', title: `Step ${step} failed`, description: err.message });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.featureAnalysis.resumeStep1(featureId, activeProvider ?? undefined, activeModel),
    onSuccess: () => {
      invalidate();
      toast({ variant: 'success', title: 'Step 1 resumed' });
      setOpenStep(2);
    },
    onError: (err: Error) => {
      invalidate();
      toast({ variant: 'destructive', title: 'Resume failed', description: err.message });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.featureAnalysis.saveStepResults>[1]) =>
      api.featureAnalysis.saveStepResults(featureId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      toast({ variant: 'success', title: 'Changes saved' });
      setEditingStep(null);
      setDraft({});
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    },
  });

  const manualSaveMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.featureAnalysis.saveStepResults>[1]) =>
      api.featureAnalysis.saveStepResults(featureId, data),
    onSuccess: (_, vars) => {
      invalidate();
      toast({ variant: 'success', title: `Step ${vars.step} saved manually` });
      closeManual();
      setOpenStep((vars.step as number) + 1);
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    },
  });

  function handleSave(step: number, f: Feature) {
    const { ssr, stories, mapping, validation } = getLayer1Data(f);
    if (step === 1 && ssr && stories) {
      try {
        const parsedStories = JSON.parse(draft.storiesJson ?? JSON.stringify(stories.stories)) as UserStories['stories'];
        const acceptanceCriteriaText = textToArr(draft.acceptanceCriteria ?? arrToText(f.extractedRequirements?.acceptanceCriteria ?? []));
        const invalidAcceptanceCriteria = acceptanceCriteriaText.find((criterion) => !/^(AC-\d+)\s*:/i.test(criterion));
        if (invalidAcceptanceCriteria) {
          toast({
            variant: 'destructive',
            title: 'Invalid Acceptance Criteria',
            description: `Each line must start with an AC ID. Invalid row: ${invalidAcceptanceCriteria}`,
          });
          return;
        }
        saveMutation.mutate({
          step: 1,
          ssrData: {
            featureName: draft.featureName ?? ssr.featureName,
            functionalRequirements: textToArr(draft.functionalRequirements ?? arrToText(ssr.functionalRequirements ?? [])),
            systemRules: textToArr(draft.systemRules ?? arrToText(ssr.systemRules)),
            businessRules: textToArr(draft.businessRules ?? arrToText(ssr.businessRules)),
            constraints: textToArr(draft.constraints ?? arrToText(ssr.constraints)),
            globalPolicies: textToArr(draft.globalPolicies ?? arrToText(ssr.globalPolicies)),
            entities: textToArr(draft.entities ?? arrToText(ssr.entities)),
          },
          userStories: {
            featureName: draft.featureName ?? stories.featureName,
            stories: parsedStories,
          },
          acceptanceCriteriaText,
          mapping: mapping ?? { links: [], uncoveredRules: [], storiesWithNoRules: [] },
          validationResult: validation ?? { isValid: true, score: 0, issues: [], summary: '' },
        });
      } catch {
        toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix the user stories JSON and try again.' });
      }
      return;
    }

    if (step === 1 && f.extractedRequirements && f.extractedBehaviors) {
      saveMutation.mutate({
        step: 1,
        extractedRequirements: {
          features:           textToArr(draft.features           ?? arrToText(f.extractedRequirements.features)),
          businessRules:      textToArr(draft.businessRules      ?? arrToText(f.extractedRequirements.businessRules)),
          acceptanceCriteria: textToArr(draft.acceptanceCriteria ?? arrToText(f.extractedRequirements.acceptanceCriteria)),
          entities:           textToArr(draft.entities           ?? arrToText(f.extractedRequirements.entities)),
        } as ExtractedRequirements,
        extractedBehaviors: {
          feature: draft.featureName ?? f.extractedBehaviors.feature,
          actors:  textToArr(draft.actors        ?? arrToText(f.extractedBehaviors.actors)),
          actions: textToArr(draft.actions       ?? arrToText(f.extractedBehaviors.actions)),
          rules:   textToArr(draft.behaviorRules ?? arrToText(f.extractedBehaviors.rules)),
        } as ExtractedBehaviors,
      });
      return;
    }
    if (step === 2) {
      try {
        const parsed = JSON.parse(draft.scenariosJson ?? '[]') as TestScenario[];
        saveMutation.mutate({ step: 2, testScenarios: parsed });
      } catch {
        toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix the scenarios JSON and try again.' });
      }
    }
  }

  const isRunning = runMutation.isPending || resumeMutation.isPending;

  if (!feature) return null;

  const activeStep: number | null =
    runMutation.isPending    ? (runMutation.variables?.step ?? null) :
    resumeMutation.isPending ? 1 :
    null;

  const statuses = [1, 2, 3, 4, 5].map(n => deriveStatus(n, feature, featureAnalyses.length, activeStep));

  const runStep = (step: number, promptAppend?: string) => runMutation.mutate({ step, promptAppend });
  const runIsPendingStep = runMutation.isPending ? (runMutation.variables?.step ?? null) : null;

  const steps = [
    {
      num: 1,
      title: 'Step 1 — Extract Requirements & Behaviors',
      render: () => (
        <PipelineStep1
          feature={feature}
          featureId={featureId}
          status={statuses[0]}
          isRunning={isRunning}
          runIsPendingForStep={runIsPendingStep === 1}
          isEditing={editingStep === 1}
          manualStep={manualStep}
          manualJson={manualJson}
          manualJsonError={manualJsonError}
          manualIsSaving={manualSaveMutation.isPending}
          saveIsPending={saveMutation.isPending}
          resumeIsPending={resumeMutation.isPending}
          draft={draft}
          setDraft={setDraft}
          openManual={openManual}
          closeManual={closeManual}
          handleManualJsonChange={handleManualJsonChange}
          handleManualSave={handleManualSave}
          runStep={runStep}
          promptAppend={stepPromptAppend[1] ?? ''}
          onPromptAppendChange={(v) => setStepPromptAppend((prev) => ({ ...prev, 1: v }))}
          resumeStep1={() => resumeMutation.mutate()}
          startEdit={startEdit}
          handleSave={handleSave}
          cancelEdit={cancelEdit}
          setOpenStep={setOpenStep}
        />
      ),
    },
    {
      num: 2,
      title: 'Step 2 — Plan Test Scenarios',
      render: () => (
        <PipelineStep2
          feature={feature}
          featureId={featureId}
          status={statuses[1]}
          previousStepCompleted={statuses[0] === 'completed'}
          isRunning={isRunning}
          isEditing={editingStep === 2}
          manualStep={manualStep}
          manualJson={manualJson}
          manualJsonError={manualJsonError}
          manualIsSaving={manualSaveMutation.isPending}
          saveIsPending={saveMutation.isPending}
          runIsPendingForStep={runIsPendingStep === 2}
          draft={draft}
          setDraft={setDraft}
          openManual={openManual}
          closeManual={closeManual}
          handleManualJsonChange={handleManualJsonChange}
          handleManualSave={handleManualSave}
          runStep={runStep}
          promptAppend={stepPromptAppend[2] ?? ''}
          onPromptAppendChange={(v) => setStepPromptAppend((prev) => ({ ...prev, 2: v }))}
          startEdit={startEdit}
          handleSave={handleSave}
          cancelEdit={cancelEdit}
          setOpenStep={setOpenStep}
        />
      ),
    },
    {
      num: 3,
      title: 'Step 3 — Generate Test Cases',
      render: () => (
        <PipelineStep3
          featureId={featureId}
          featureName={feature.name}
          testCases={featureAnalyses as FeatureAnalysis[]}
          status={statuses[2]}
          previousStepCompleted={statuses[1] === 'completed'}
          isRunning={isRunning}
          manualStep={manualStep}
          manualJson={manualJson}
          manualJsonError={manualJsonError}
          manualIsSaving={manualSaveMutation.isPending}
          runIsPendingForStep={runIsPendingStep === 3}
          testCasesCount={featureAnalyses.length}
          openManual={openManual}
          closeManual={closeManual}
          handleManualJsonChange={handleManualJsonChange}
          handleManualSave={handleManualSave}
          runStep={runStep}
          promptAppend={stepPromptAppend[3] ?? ''}
          onPromptAppendChange={(v) => setStepPromptAppend((prev) => ({ ...prev, 3: v }))}
          setOpenStep={setOpenStep}
        />
      ),
    },
    {
      num: 4,
      title: 'Step 4 — Generate Development Plan',
      render: () => (
        <PipelineStep4
          feature={feature}
          featureId={featureId}
          status={statuses[3]}
          previousStepCompleted={statuses[2] === 'completed'}
          isRunning={isRunning}
          manualStep={manualStep}
          manualJson={manualJson}
          manualJsonError={manualJsonError}
          manualIsSaving={manualSaveMutation.isPending}
          runIsPendingForStep={runIsPendingStep === 4}
          openManual={openManual}
          closeManual={closeManual}
          handleManualJsonChange={handleManualJsonChange}
          handleManualSave={handleManualSave}
          runStep={runStep}
          promptAppend={stepPromptAppend[4] ?? ''}
          onPromptAppendChange={(v) => setStepPromptAppend((prev) => ({ ...prev, 4: v }))}
          sectionPromptAppend={step4SectionPromptAppend}
          onSectionPromptAppendChange={(section, v) =>
            setStep4SectionPromptAppend((prev) => ({ ...prev, [section]: v }))
          }
          relatedFeaturesWithPlan={relatedFeaturesWithPlan}
        />
      ),
    },
    {
      num: 5,
      title: 'Step 5 — Generate Dev Prompts',
      render: () => (
        <PipelineStep5
          feature={feature}
          featureId={featureId}
          status={statuses[4]}
          previousStepCompleted={statuses[3] === 'completed'}
          isRunning={isRunning}
          manualStep={manualStep}
          manualJson={manualJson}
          manualJsonError={manualJsonError}
          manualIsSaving={manualSaveMutation.isPending}
          runIsPendingForStep={runIsPendingStep === 5}
          openManual={openManual}
          closeManual={closeManual}
          handleManualJsonChange={handleManualJsonChange}
          handleManualSave={handleManualSave}
          runStep={runStep}
          promptAppend={stepPromptAppend[5] ?? ''}
          onPromptAppendChange={(v) => setStepPromptAppend((prev) => ({ ...prev, 5: v }))}
          sectionPromptAppend={step5SectionPromptAppend}
          onSectionPromptAppendChange={(section, v) =>
            setStep5SectionPromptAppend((prev) => ({ ...prev, [section]: v }))
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-2 px-6 py-4">
      {steps.map(({ num, title, render }) => (
        <div key={num} className="border rounded-lg bg-card text-sm">
          <StepHeader
            num={num}
            title={title}
            status={statuses[num - 1]}
            open={openStep === num}
            onToggle={() => toggleStep(num)}
          />
          {openStep === num && render()}
        </div>
      ))}
    </div>
  );
}
