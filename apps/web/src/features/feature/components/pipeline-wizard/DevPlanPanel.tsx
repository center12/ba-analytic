import { DevPlan } from '@/lib/api';
import { BackendPanel } from './dev-plan-panel/BackendPanel';
import { FrontendPanel } from './dev-plan-panel/FrontendPanel';
import { TestingPanel } from './dev-plan-panel/TestingPanel';
import { WorkflowPanel } from './dev-plan-panel/WorkflowPanel';

type SectionKey = 'workflow' | 'backend' | 'frontend' | 'testing';

interface Props {
  devPlan: DevPlan;
  sectionsFilter?: SectionKey[];
}

export function DevPlanPanel({ devPlan, sectionsFilter }: Props) {
  const { workflow, backend, frontend, testing } = devPlan;
  const show = (key: SectionKey) => !sectionsFilter || sectionsFilter.includes(key);

  return (
    <div className="space-y-2">
      {show('workflow') && <WorkflowPanel workflow={workflow} />}
      {show('backend') && <BackendPanel backend={backend} />}
      {show('frontend') && <FrontendPanel frontend={frontend} />}
      {show('testing') && <TestingPanel testing={testing} />}
    </div>
  );
}
