import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Paperclip } from 'lucide-react';
import { api, type AppFeedback } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const ITEM_HEIGHT = 136;
const OVERSCAN = 4;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function openFeedbackMedia(feedback: AppFeedback) {
  const blob = await api.feedback.downloadMedia(feedback.id);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

interface RecentFeedbackListProps {
  viewportHeight?: number;
}

export function RecentFeedbackList({ viewportHeight = 640 }: RecentFeedbackListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['app-feedback'],
    queryFn: api.feedback.listRecent,
  });

  const { startIndex, endIndex, items, offsetTop, totalHeight } = useMemo(() => {
    const visibleCount = Math.ceil(viewportHeight / ITEM_HEIGHT);
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(feedback.length, start + visibleCount + OVERSCAN * 2);
    return {
      startIndex: start,
      endIndex: end,
      items: feedback.slice(start, end),
      offsetTop: start * ITEM_HEIGHT,
      totalHeight: feedback.length * ITEM_HEIGHT,
    };
  }, [feedback, scrollTop, viewportHeight]);

  return (
    <section className="bg-card border rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Recent Feedback</h2>
        <p className="text-sm text-muted-foreground">Latest feedback submitted across the app.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading feedback...</p>
      ) : feedback.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback yet.</p>
      ) : (
        <div
          className="overflow-y-auto rounded-lg border bg-background"
          style={{ height: viewportHeight }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: offsetTop,
                left: 0,
                right: 0,
              }}
            >
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="absolute left-0 right-0 px-3"
                  style={{ top: index * ITEM_HEIGHT, height: ITEM_HEIGHT }}
                >
                  <div className="mt-3 rounded-lg border p-4 h-[120px] bg-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <p
                          className="text-sm leading-6 overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Link to={item.routePath} className="hover:text-foreground underline-offset-2 hover:underline">
                            {item.contextLabel || item.pageTitle || item.routePath}
                          </Link>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>

                      {item.originalName && (
                        <button
                          type="button"
                          className="shrink-0 flex items-center gap-1 border px-2.5 py-1.5 rounded text-xs hover:bg-muted max-w-52"
                          disabled={downloadingId === item.id}
                          onClick={async () => {
                            try {
                              setDownloadingId(item.id);
                              await openFeedbackMedia(item);
                            } catch (err) {
                              toast({
                                variant: 'destructive',
                                title: 'Unable to open attachment',
                                description: err instanceof Error ? err.message : 'Unknown error',
                              });
                            } finally {
                              setDownloadingId(null);
                            }
                          }}
                        >
                          {downloadingId === item.id ? <Download size={12} /> : <Paperclip size={12} />}
                          <span className="truncate">{item.originalName}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="sr-only">
            Showing {startIndex + 1} to {endIndex} of {feedback.length}
          </div>
        </div>
      )}
    </section>
  );
}
