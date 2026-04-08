import { TestingPlan } from '@/lib/api';
import { Section } from './Section';
import { StringList } from './StringList';

interface TestingPanelProps {
  testing: TestingPlan;
}

export function TestingPanel({ testing }: TestingPanelProps) {
  return (
    <Section title="Testing Plan">
      <div className="space-y-3">
        {testing.backend && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Backend Test Scenarios</p>
            <StringList items={testing.backend.testScenarios ?? []} />
          </div>
        )}
        {testing.backend && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">API Test Cases</p>
            {testing.backend.apiTestCases && testing.backend.apiTestCases.length > 0 ? (
              <div className="space-y-1.5">
                {testing.backend.apiTestCases.map((endpoint, i) => (
                  <div key={`${endpoint.endpoint}-${i}`} className="border rounded px-2 py-1.5">
                    <p className="text-xs font-medium">{endpoint.endpoint}</p>
                    {endpoint.scenarios.map((scenario, si) => (
                      <div key={`${scenario.name}-${si}`} className="mt-1 border-t pt-1">
                        <p className="text-xs font-medium">{scenario.name}</p>
                        <p className="text-xs text-muted-foreground">Expected status: {scenario.expectedStatus}</p>
                        <p className="text-xs text-muted-foreground">Expected response: {scenario.expectedResponse}</p>
                        <p className="text-xs font-medium mt-0.5">Steps</p>
                        <StringList items={scenario.steps} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic">None</span>
            )}
          </div>
        )}
        {testing.backend && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Database Testing</p>
              <StringList items={testing.backend.databaseTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Business Logic Testing</p>
              <StringList items={testing.backend.businessLogicTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Pagination/Query Testing</p>
              <StringList items={testing.backend.paginationQueryTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Performance Testing</p>
              <StringList items={testing.backend.performanceTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Security Testing</p>
              <StringList items={testing.backend.securityTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Error Handling Testing</p>
              <StringList items={testing.backend.errorHandlingTesting ?? []} />
            </div>
          </div>
        )}
        {testing.backend && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Backend Testing Tasks</p>
            {testing.backend.tasks && testing.backend.tasks.length > 0 ? (
              <div className="space-y-1.5">
                {testing.backend.tasks.map(task => (
                  <div key={task.id} className="border rounded px-2 py-1.5">
                    <p className="text-xs font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic">None</span>
            )}
          </div>
        )}
        {testing.frontend && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Frontend Test Scenarios</p>
            <StringList items={testing.frontend.testScenarios ?? []} />
          </div>
        )}
        {testing.frontend && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">UI Test Cases</p>
            {testing.frontend.uiTestCases && testing.frontend.uiTestCases.length > 0 ? (
              <div className="space-y-1.5">
                {testing.frontend.uiTestCases.map((screen, i) => (
                  <div key={`${screen.screen}-${i}`} className="border rounded px-2 py-1.5">
                    <p className="text-xs font-medium">{screen.screen}</p>
                    {screen.scenarios.map((scenario, si) => (
                      <div key={`${scenario.name}-${si}`} className="mt-1 border-t pt-1">
                        <p className="text-xs font-medium">{scenario.name}</p>
                        <p className="text-xs text-muted-foreground">Expected behavior: {scenario.expectedBehavior}</p>
                        <p className="text-xs font-medium mt-0.5">Steps</p>
                        <StringList items={scenario.steps} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic">None</span>
            )}
          </div>
        )}
        {testing.frontend && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Validation Testing</p>
              <StringList items={testing.frontend.validationTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">UX State Testing</p>
              <StringList items={testing.frontend.uxStateTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">API Integration Testing</p>
              <StringList items={testing.frontend.apiIntegrationTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Routing/Navigation Testing</p>
              <StringList items={testing.frontend.routingNavigationTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Cross Browser Testing</p>
              <StringList items={testing.frontend.crossBrowserTesting ?? []} />
            </div>
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Edge Cases</p>
              <StringList items={testing.frontend.edgeCases ?? []} />
            </div>
          </div>
        )}
        {testing.frontend && (
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Frontend Testing Tasks</p>
            {testing.frontend.tasks && testing.frontend.tasks.length > 0 ? (
              <div className="space-y-1.5">
                {testing.frontend.tasks.map(task => (
                  <div key={task.id} className="border rounded px-2 py-1.5">
                    <p className="text-xs font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic">None</span>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
