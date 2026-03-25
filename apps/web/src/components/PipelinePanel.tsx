import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ExtractedBehaviors, ExtractedRequirements, TestScenario, ScenarioType } from '@/lib/api';

const SCENARIO_BADGE: Record<ScenarioType, { label: string; className: string }> = {
  happy_path: { label: 'Happy Path', className: 'bg-green-100 text-green-800' },
  edge_case:  { label: 'Edge Case',  className: 'bg-yellow-100 text-yellow-800' },
  error:      { label: 'Error',      className: 'bg-red-100 text-red-800' },
  boundary:   { label: 'Boundary',   className: 'bg-blue-100 text-blue-800' },
  security:   { label: 'Security',   className: 'bg-purple-100 text-purple-800' },
};

interface Props {
  extractedRequirements: ExtractedRequirements;
  extractedBehaviors?: ExtractedBehaviors;
  testScenarios: TestScenario[];
}

type Tab = 'requirements' | 'behaviors' | 'scenarios';

export function PipelinePanel({ extractedRequirements, extractedBehaviors, testScenarios }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('requirements');

  const reqCount =
    extractedRequirements.features.length +
    extractedRequirements.businessRules.length +
    extractedRequirements.acceptanceCriteria.length;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'requirements', label: `Requirements (${reqCount})` },
    ...(extractedBehaviors
      ? [{ id: 'behaviors' as Tab, label: `Behaviors (${extractedBehaviors.actions.length})` }]
      : []),
    { id: 'scenarios', label: `Scenarios (${testScenarios.length})` },
  ];

  return (
    <div className="border rounded-lg mx-6 mt-4 bg-card text-sm">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 rounded-lg text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium">AI Pipeline Results</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {reqCount} requirements · {extractedBehaviors ? `${extractedBehaviors.actions.length} actions · ` : ''}{testScenarios.length} scenarios
        </span>
      </button>

      {open && (
        <div className="border-t">
          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  'px-3 py-1 rounded text-xs font-medium',
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {tab === 'requirements' && (
              <>
                <Section title="Features" items={extractedRequirements.features} color="text-blue-700" />
                <Section title="Business Rules" items={extractedRequirements.businessRules} color="text-orange-700" />
                <Section title="Acceptance Criteria" items={extractedRequirements.acceptanceCriteria} color="text-green-700" />
                {extractedRequirements.entities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Entities</p>
                    <div className="flex flex-wrap gap-1">
                      {extractedRequirements.entities.map((e, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'behaviors' && extractedBehaviors && (
              <>
                <div>
                  <p className="text-xs font-semibold text-violet-700 mb-1">Feature</p>
                  <p className="text-xs text-muted-foreground">{extractedBehaviors.feature}</p>
                </div>
                {extractedBehaviors.actors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Actors</p>
                    <div className="flex flex-wrap gap-1">
                      {extractedBehaviors.actors.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <Section title="Actions" items={extractedBehaviors.actions} color="text-blue-700" />
                <Section title="Rules" items={extractedBehaviors.rules} color="text-orange-700" />
              </>
            )}

            {tab === 'scenarios' && (
              <ul className="space-y-1.5">
                {testScenarios.map((s, i) => {
                  const badge = SCENARIO_BADGE[s.type] ?? { label: s.type, className: 'bg-muted text-foreground' };
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs">{s.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold mb-1 ${color}`}>{title}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
            <span className="shrink-0">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
