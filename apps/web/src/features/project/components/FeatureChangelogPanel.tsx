import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type FeatureChangelog } from '@/lib/api';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { History, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface FeatureChangelogPanelProps {
  featureId: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function FeatureChangelogPanel({ featureId }: FeatureChangelogPanelProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: changelog = [], isLoading } = useQuery({
    queryKey: ['feature-changelog', featureId],
    queryFn: () => api.features.getChangelog(featureId),
    enabled: open,
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <History size={12} /> View version history
      </button>
    );
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <History size={13} /> Version History
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Hide
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
          <Loader2 size={12} className="animate-spin" /> Loading...
        </div>
      ) : changelog.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No published versions yet.</p>
      ) : (
        <div className="space-y-1.5">
          {changelog.map((entry: FeatureChangelog) => (
            <div key={entry.id} className="border rounded-md overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 text-left"
              >
                {expandedId === entry.id
                  ? <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
                  : <ChevronRight size={12} className="shrink-0 text-muted-foreground" />}
                <span className="font-medium">v{entry.version}</span>
                <span className="text-muted-foreground">{formatDate(entry.publishedAt)}</span>
                {entry.changeSummary === null && (
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                    <Loader2 size={10} className="animate-spin" /> AI summarizing…
                  </span>
                )}
              </button>

              {expandedId === entry.id && (
                <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
                  {entry.changeSummary === null ? (
                    <p className="text-xs text-muted-foreground italic">
                      AI is generating the change summary…
                    </p>
                  ) : (
                    <MarkdownPreview content={entry.changeSummary} className="text-xs" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
