import { useState } from 'react';
import { ApiRoute, BackendPlan, DatabaseEntity } from '@/lib/api';
import { Section } from './Section';
import { StringList } from './StringList';

function DatabaseEntitiesSection({ entities }: { entities: DatabaseEntity[] }) {
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  if (!entities.length) return <span className="text-muted-foreground italic">None</span>;

  return (
    <div className="space-y-1.5">
      {entities.map(entity => (
        <div key={entity.name} className="border rounded">
          <button
            onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">{entity.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{entity.tableName}</span>
            </div>
            <span className="text-xs text-muted-foreground">{entity.fields?.length ?? 0} fields</span>
          </button>
          {expandedEntity === entity.name && (
            <div className="border-t px-2 pb-2">
              <table className="w-full text-xs mt-1.5 border-collapse">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-0.5 pr-2">Field</th>
                    <th className="text-left pb-0.5 pr-2">Type</th>
                    <th className="text-left pb-0.5 pr-2">Flags</th>
                    <th className="text-left pb-0.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(entity.fields ?? []).map((f, fi) => (
                    <tr key={fi} className={f.isPrimaryKey ? 'font-medium' : ''}>
                      <td className="pr-2 font-mono py-0.5">{f.name}</td>
                      <td className="pr-2 text-muted-foreground py-0.5">{f.type}</td>
                      <td className="pr-2 py-0.5">
                        {f.isPrimaryKey && (
                          <span className="bg-primary/10 text-primary text-[10px] px-1 rounded mr-1">PK</span>
                        )}
                        {!f.isNullable && (
                          <span className="bg-muted text-muted-foreground text-[10px] px-1 rounded">NOT NULL</span>
                        )}
                      </td>
                      <td className="text-muted-foreground py-0.5">{f.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ApiRoutesTable({ routes }: { routes: ApiRoute[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const methodColor: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-green-100 text-green-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    PATCH: 'bg-orange-100 text-orange-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-1.5">
      {routes.map((r, i) => (
        <div key={i} className="border rounded">
          <button
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            className="w-full flex items-start gap-2 px-2 py-1.5 hover:bg-muted/50 text-left"
          >
            <span className={`shrink-0 text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${methodColor[r.method] ?? 'bg-muted'}`}>
              {r.method}
            </span>
            <span className="font-mono text-xs text-muted-foreground shrink-0">{r.path}</span>
            <span className="text-xs text-muted-foreground">- {r.description}</span>
          </button>
          {expandedIndex === i && (
            <div className="px-3 pb-2 space-y-2 border-t">
              {r.params?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mt-1.5 mb-1">Parameters</p>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left pb-0.5 pr-2">Name</th>
                        <th className="text-left pb-0.5 pr-2">In</th>
                        <th className="text-left pb-0.5 pr-2">Type</th>
                        <th className="text-left pb-0.5">Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.params.map((p, pi) => (
                        <tr key={pi}>
                          <td className="pr-2 font-mono py-0.5">{p.name}</td>
                          <td className="pr-2 text-muted-foreground py-0.5">{p.in}</td>
                          <td className="pr-2 text-muted-foreground py-0.5">{p.type}</td>
                          <td className="py-0.5">{p.required ? 'yes' : 'no'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.jsonResponse && (
                <div>
                  <p className="text-xs font-medium mb-0.5">Response</p>
                  <pre className="text-xs bg-muted/50 rounded px-2 py-1 overflow-x-auto">{r.jsonResponse}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface BackendPanelProps {
  backend: BackendPlan;
}

export function BackendPanel({ backend }: BackendPanelProps) {
  return (
    <Section title="Backend Architecture">
      <div className="space-y-3">
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Feature Overview</p>
          {backend.featureOverview ? (
            <p className="text-xs whitespace-pre-wrap">{backend.featureOverview}</p>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Database</p>
          <div className="space-y-1">
            <p className="text-xs font-medium">Entities</p>
            <DatabaseEntitiesSection entities={backend.database.entities} />
            <p className="text-xs font-medium mt-2">Relationships</p>
            <StringList items={backend.database.relationships} />
          </div>
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">API Routes</p>
          <ApiRoutesTable routes={backend.apiRoutes} />
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Folder Structure</p>
          <ul className="space-y-0.5">
            {backend.folderStructure.map((path, i) => (
              <li key={i} className="font-mono text-xs text-muted-foreground">{path}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Business Logic Flow</p>
          <StringList items={backend.businessLogicFlow ?? []} />
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Query Design</p>
          {backend.queryDesign && backend.queryDesign.length > 0 ? (
            <div className="space-y-1.5">
              {backend.queryDesign.map((q, i) => (
                <div key={`${q.name}-${i}`} className="border rounded px-2 py-1.5">
                  <p className="text-xs font-medium">{q.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Paginated: {q.isPaginated ? 'yes' : 'no'}</p>
                  <pre className="text-xs bg-muted/50 rounded px-2 py-1 mt-1 overflow-x-auto">{q.sql}</pre>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Transactions</p>
          {backend.transactions && backend.transactions.length > 0 ? (
            <div className="space-y-1.5">
              {backend.transactions.map((t, i) => (
                <div key={`${t.where}-${i}`} className="border rounded px-2 py-1.5">
                  <p className="text-xs font-medium">{t.where}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.why}</p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Caching Strategy</p>
          {backend.cachingStrategy && backend.cachingStrategy.length > 0 ? (
            <div className="space-y-1.5">
              {backend.cachingStrategy.map((c, i) => (
                <div key={`${c.key}-${i}`} className="border rounded px-2 py-1.5">
                  <p className="text-xs font-medium">{c.key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">TTL: {c.ttl}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Validation Rules</p>
            <StringList items={backend.validationRules ?? []} />
          </div>
          <div>
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Security</p>
            <StringList items={backend.security ?? []} />
          </div>
        </div>
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Backend Tasks</p>
          {backend.backendTasks && backend.backendTasks.length > 0 ? (
            <div className="space-y-1.5">
              {backend.backendTasks.map((task, i) => (
                <div key={`${task.title}-${i}`} className="border rounded px-2 py-1.5">
                  <p className="text-xs font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground italic">None</span>
          )}
        </div>
      </div>
    </Section>
  );
}
