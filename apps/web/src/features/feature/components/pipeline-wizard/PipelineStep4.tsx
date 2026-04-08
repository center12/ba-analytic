import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Play, RefreshCw } from 'lucide-react';
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
  runStep: (step: number) => void;
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
}: {
  label: string;
  section: Step4Section;
  featureId: string;
  disabled: boolean;
}) {
  const activeProvider = useAppStore(s => s.activeProvider);
  const activeModel = useAppStore(s => s.activeModel);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.testCases.runStep4Section(featureId, section, activeProvider ?? undefined, activeModel),
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
}: PipelineStep4Props) {
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
              onClick={() => runStep(4)}
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
              onClick={() => runStep(4)}
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
