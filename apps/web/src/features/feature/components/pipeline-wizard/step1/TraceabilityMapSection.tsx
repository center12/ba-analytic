import { Mapping } from '@/lib/api';

interface TraceabilityMapSectionProps {
  mapping?: Mapping;
}

export function TraceabilityMapSection({ mapping }: TraceabilityMapSectionProps) {
  if (!mapping?.links.length) {
    return <p className="text-xs text-muted-foreground">No traceability mapping available.</p>;
  }

  return (
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
  );
}
