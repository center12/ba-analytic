import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, FileText, Loader2, Play, RefreshCw } from 'lucide-react';
import {
  api,
  Feature,
  WorkflowStep,
  BackendPlan,
  FrontendPlan,
  TestingPlan,
  BackendTestingPlan,
  FrontendTestingPlan,
  DevPlan,
} from '@/lib/api';
import { useAppStore } from '@/store';
import { toast } from '@/hooks/use-toast';
import { MANUAL_TEMPLATES } from '../../constants/pipeline-wizard.constants';
import { step4ToMarkdown } from '../../helpers/pipeline-wizard.helpers';
import { ManualPanel } from './ManualPanel';
import { DevPlanPanel } from './DevPlanPanel';
import { CopyMarkdownButton } from './CopyMarkdownButton';

interface PipelineStep4Props {
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
  runStep: (step: number, promptAppend?: string) => void;
  promptAppend: string;
  onPromptAppendChange: (v: string) => void;
  sectionPromptAppend: Record<Step4Section, string>;
  onSectionPromptAppendChange: (section: Step4Section, v: string) => void;
  relatedFeaturesWithPlan?: Feature[];
}

type Step4Section = 'workflow-backend' | 'frontend' | 'testing-backend' | 'testing-frontend';
type PartialTestingPlan = Partial<TestingPlan>;

const EMPTY_BACKEND: BackendPlan = {
  database: { entities: [], relationships: [] },
  apiRoutes: [],
  folderStructure: [],
};

const EMPTY_FRONTEND: FrontendPlan = {
  components: [],
  pages: [],
  store: [],
  hooks: [],
  utils: [],
  services: [],
};

const EMPTY_BACKEND_TESTING: BackendTestingPlan = {
  testScenarios: [],
  apiTestCases: [],
  databaseTesting: [],
  businessLogicTesting: [],
  paginationQueryTesting: [],
  performanceTesting: [],
  securityTesting: [],
  errorHandlingTesting: [],
  tasks: [],
};

const EMPTY_FRONTEND_TESTING: FrontendTestingPlan = {
  testScenarios: [],
  uiTestCases: [],
  validationTesting: [],
  uxStateTesting: [],
  apiIntegrationTesting: [],
  routingNavigationTesting: [],
  crossBrowserTesting: [],
  edgeCases: [],
  tasks: [],
};

function buildDevPlan(
  workflow: WorkflowStep[] | null,
  backend: BackendPlan | null,
  frontend: FrontendPlan | null,
  testing: PartialTestingPlan | null,
): DevPlan {
  return {
    workflow: workflow ?? [],
    backend: backend ?? EMPTY_BACKEND,
    frontend: frontend ?? EMPTY_FRONTEND,
    testing: {
      backend: testing?.backend ?? EMPTY_BACKEND_TESTING,
      frontend: testing?.frontend ?? EMPTY_FRONTEND_TESTING,
    },
  };
}

function SectionGenerateButton({
  label,
  section,
  featureId,
  disabled,
  promptAppend,
}: {
  label: string;
  section: Step4Section;
  featureId: string;
  disabled: boolean;
  promptAppend?: string;
}) {
  const activeProvider = useAppStore(s => s.activeProvider);
  const activeModel = useAppStore(s => s.activeModel);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.featureAnalysis.runStep4Section(featureId, section, activeProvider ?? undefined, activeModel, promptAppend),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', featureId] });
      toast({ variant: 'success', title: `${label} generated` });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: `${label} failed`, description: err.message });
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

export function PipelineStep4({
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
  promptAppend,
  onPromptAppendChange,
  sectionPromptAppend,
  onSectionPromptAppendChange,
  relatedFeaturesWithPlan = [],
}: PipelineStep4Props) {
  const [expandedRelated, setExpandedRelated] = useState<Record<string, boolean>>({});
  const canRun = previousStepCompleted && !isRunning;

  // Parse whichever sections are already available
  let workflow: WorkflowStep[] | null = null;
  let backend: BackendPlan | null = null;
  let frontend: FrontendPlan | null = null;
  let testing: PartialTestingPlan | null = null;

  try { if (feature.devPlanWorkflow) workflow = JSON.parse(feature.devPlanWorkflow); } catch {}
  try { if (feature.devPlanBackend)  backend  = JSON.parse(feature.devPlanBackend);  } catch {}
  try { if (feature.devPlanFrontend) frontend = JSON.parse(feature.devPlanFrontend); } catch {}
  try { if (feature.devPlanTesting)  testing  = JSON.parse(feature.devPlanTesting);  } catch {}

  const hasWorkflowBackend = !!(workflow && backend);
  const hasFrontend = !!frontend;
  const hasBackendTesting = !!testing?.backend;
  const hasFrontendTesting = !!testing?.frontend;

  return (
    <div className="border-t px-4 py-4 space-y-4">
      {/* Top action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(status === 'idle' || status === 'failed') && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(4, promptAppend)}
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
            {manualStep !== 4 && (
              <button
                disabled={!canRun}
                onClick={() => openManual(4)}
                className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
              >
                <FileText size={13} /> Manual
              </button>
            )}
          </>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Generating development plan...
          </span>
        )}
        {status === 'completed' && (
          <>
            <button
              disabled={!canRun}
              onClick={() => runStep(4, promptAppend)}
              className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={13} /> Re-run All
            </button>
            <CopyMarkdownButton
              getText={() => step4ToMarkdown(feature)}
              filename={`step4-dev-plan-${feature.name}.md`}
            />
          </>
        )}
      </div>

      {status !== 'running' && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Append instructions for Step 4 re-run (optional)</p>
          <textarea
            value={promptAppend}
            onChange={(e) => onPromptAppendChange(e.target.value)}
            placeholder="Example: Keep the architecture pragmatic for existing module boundaries."
            className="w-full text-xs border rounded p-2 bg-background min-h-[72px]"
          />
        </div>
      )}

      {previousStepCompleted && (
        <p className="text-xs text-muted-foreground">
          Manual flow: click <span className="font-medium">Manual</span> to copy the Step 4 prompt, refine it in an external chatbot, then paste JSON back to save. Step 4 sections are
          <span className="font-medium"> workflow-backend</span>, <span className="font-medium">frontend</span>, <span className="font-medium">testing-backend</span>, and
          <span className="font-medium">testing-frontend</span>.
        </p>
      )}

      {manualStep === 4 && (
        <ManualPanel
          step={4}
          featureId={featureId}
          templateJson={MANUAL_TEMPLATES[4]}
          manualJson={manualJson}
          jsonError={manualJsonError}
          isSaving={manualIsSaving}
          onJsonChange={handleManualJsonChange}
          onSave={() => handleManualSave(4)}
          onCancel={closeManual}
        />
      )}

      {/* Shared architecture from related SSR features */}
      {relatedFeaturesWithPlan.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Shared architecture context — injected into generation prompt
          </p>
          {relatedFeaturesWithPlan.map((rf) => {
            let rfWorkflow: WorkflowStep[] | null = null;
            let rfBackend: BackendPlan | null = null;
            let rfFrontend: FrontendPlan | null = null;
            try { if (rf.devPlanWorkflow) rfWorkflow = JSON.parse(rf.devPlanWorkflow); } catch {}
            try { if (rf.devPlanBackend)  rfBackend  = JSON.parse(rf.devPlanBackend);  } catch {}
            try { if (rf.devPlanFrontend) rfFrontend = JSON.parse(rf.devPlanFrontend); } catch {}
            const isOpen = expandedRelated[rf.id] ?? false;
            const rfDevPlan = buildDevPlan(rfWorkflow, rfBackend, rfFrontend, null);
            const entityCount = rfBackend?.database?.entities?.length ?? 0;
            const routeCount = rfBackend?.apiRoutes?.length ?? 0;
            const componentCount = rfFrontend?.components?.length ?? 0;
            return (
              <div key={rf.id} className="border rounded-md overflow-hidden">
                <button
                  onClick={() => setExpandedRelated((prev) => ({ ...prev, [rf.id]: !isOpen }))}
                  className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 text-left"
                >
                  <span className="text-xs font-medium">
                    [{rf.code}] {rf.name}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {[
                        entityCount && `${entityCount} entities`,
                        routeCount  && `${routeCount} routes`,
                        componentCount && `${componentCount} components`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {isOpen && (
                  <div className="px-3 py-3">
                    <DevPlanPanel devPlan={rfDevPlan} sectionsFilter={['workflow', 'backend', 'frontend']} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-section panels — always visible when previousStepCompleted */}
      {previousStepCompleted && (
        <div className="space-y-3">
          {/* Workflow + Backend */}
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
              <span className="text-sm font-medium">
                Workflow + Backend
                {workflow && backend && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {workflow.length} steps · {backend.apiRoutes?.length ?? 0} routes
                  </span>
                )}
              </span>
              <SectionGenerateButton
                label="Workflow + Backend"
                section="workflow-backend"
                featureId={featureId}
                disabled={!canRun}
                promptAppend={sectionPromptAppend['workflow-backend']}
              />
            </div>
            <div className="px-3 py-2 border-t bg-background/40">
              <textarea
                value={sectionPromptAppend['workflow-backend']}
                onChange={(e) => onSectionPromptAppendChange('workflow-backend', e.target.value)}
                placeholder="Append instructions for Workflow + Backend generation..."
                className="w-full text-xs border rounded p-2 bg-background min-h-[60px]"
              />
            </div>
            {workflow && backend && (
              <div className="px-3 py-3">
                <DevPlanPanel
                  devPlan={buildDevPlan(workflow, backend, frontend, testing)}
                  sectionsFilter={['workflow', 'backend']}
                />
              </div>
            )}
          </div>

          {/* Frontend */}
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
              <span className="text-sm font-medium">
                Frontend Architecture
                {frontend && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {frontend.components?.length ?? 0} components
                  </span>
                )}
              </span>
              <SectionGenerateButton
                label="Frontend"
                section="frontend"
                featureId={featureId}
                disabled={!canRun || !hasWorkflowBackend}
                promptAppend={sectionPromptAppend.frontend}
              />
            </div>
            <div className="px-3 py-2 border-t bg-background/40">
              <textarea
                value={sectionPromptAppend.frontend}
                onChange={(e) => onSectionPromptAppendChange('frontend', e.target.value)}
                placeholder="Append instructions for Frontend architecture generation..."
                className="w-full text-xs border rounded p-2 bg-background min-h-[60px]"
              />
            </div>
            {!hasWorkflowBackend && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">
                Generate Workflow + Backend first.
              </p>
            )}
            {frontend && (
              <div className="px-3 py-3">
                <DevPlanPanel
                  devPlan={buildDevPlan(workflow, backend, frontend, testing)}
                  sectionsFilter={['frontend']}
                />
              </div>
            )}
          </div>

          {/* Backend Testing */}
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
              <span className="text-sm font-medium">
                Backend Testing
                {hasBackendTesting && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {testing?.backend?.tasks?.length ?? 0} tasks
                  </span>
                )}
              </span>
              <SectionGenerateButton
                label="Backend Testing"
                section="testing-backend"
                featureId={featureId}
                disabled={!canRun || !hasWorkflowBackend}
                promptAppend={sectionPromptAppend['testing-backend']}
              />
            </div>
            <div className="px-3 py-2 border-t bg-background/40">
              <textarea
                value={sectionPromptAppend['testing-backend']}
                onChange={(e) => onSectionPromptAppendChange('testing-backend', e.target.value)}
                placeholder="Append instructions for Backend Testing generation..."
                className="w-full text-xs border rounded p-2 bg-background min-h-[60px]"
              />
            </div>
            {!hasWorkflowBackend && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">
                Generate Workflow + Backend first.
              </p>
            )}
            {hasBackendTesting && (
              <div className="px-3 py-3">
                <DevPlanPanel
                  devPlan={buildDevPlan(workflow, backend, frontend, { backend: testing?.backend })}
                  sectionsFilter={['testing']}
                />
              </div>
            )}
          </div>

          {/* Frontend Testing */}
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
              <span className="text-sm font-medium">
                Frontend Testing
                {hasFrontendTesting && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {testing?.frontend?.tasks?.length ?? 0} tasks
                  </span>
                )}
              </span>
              <SectionGenerateButton
                label="Frontend Testing"
                section="testing-frontend"
                featureId={featureId}
                disabled={!canRun || !hasWorkflowBackend || !hasFrontend}
                promptAppend={sectionPromptAppend['testing-frontend']}
              />
            </div>
            <div className="px-3 py-2 border-t bg-background/40">
              <textarea
                value={sectionPromptAppend['testing-frontend']}
                onChange={(e) => onSectionPromptAppendChange('testing-frontend', e.target.value)}
                placeholder="Append instructions for Frontend Testing generation..."
                className="w-full text-xs border rounded p-2 bg-background min-h-[60px]"
              />
            </div>
            {(!hasWorkflowBackend || !hasFrontend) && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">
                Generate Workflow + Backend and Frontend first.
              </p>
            )}
            {hasFrontendTesting && (
              <div className="px-3 py-3">
                <DevPlanPanel
                  devPlan={buildDevPlan(workflow, backend, frontend, { frontend: testing?.frontend })}
                  sectionsFilter={['testing']}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
