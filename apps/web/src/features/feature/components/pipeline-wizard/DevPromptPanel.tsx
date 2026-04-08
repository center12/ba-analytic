import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { type DevTaskItem } from '@/lib/api';

type Tab = 'api' | 'frontend' | 'testing';
type FieldValue = string | DevTaskItem[] | undefined;

const TABS: { id: Tab; label: string }[] = [
  { id: 'api',      label: '4A — Backend' },
  { id: 'frontend', label: '4B — Frontend' },
  { id: 'testing',  label: '4C — Testing' },
];

function parseField(val: FieldValue): DevTaskItem[] | string | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  // stored as JSON.stringify(DevTaskItem[]) from the backend
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed as DevTaskItem[];
  } catch { /* not JSON — legacy string prompt */ }
  return val;
}

interface Props {
  api:      FieldValue;
  frontend: FieldValue;
  testing:  FieldValue;
}

export function DevPromptPanel({ api, frontend, testing }: Props) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<Tab>('api');
  const [subIdx, setSubIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const fields = { api: parseField(api), frontend: parseField(frontend), testing: parseField(testing) };
  const current = fields[tab];

  // normalise to array of items for uniform rendering
  const items: DevTaskItem[] = !current
    ? []
    : Array.isArray(current)
    ? current
    : [{ title: tab.toUpperCase(), prompt: current }];

  const activeItem = items[Math.min(subIdx, items.length - 1)] ?? null;

  const handleTabChange = (t: Tab) => { setTab(t); setSubIdx(0); };

  const handleCopy = () => {
    if (!activeItem) return;
    navigator.clipboard.writeText(activeItem.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border rounded-lg mx-6 mt-3 bg-card text-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 rounded-lg text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium">Dev Prompts</span>
        <span className="ml-auto text-xs text-muted-foreground">4A Backend · 4B Frontend · 4C Testing</span>
      </button>

      {open && (
        <div className="border-t">
          {/* Category tabs + copy */}
          <div className="flex items-center gap-1 px-4 pt-2">
            {TABS.map((t) => {
              const f = fields[t.id];
              const count = Array.isArray(f) ? f.length : f ? 1 : 0;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={[
                    'px-3 py-1 rounded text-xs font-medium flex items-center gap-1',
                    tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  ].join(' ')}
                >
                  {t.label}
                  {count > 1 && (
                    <span className={`px-1 rounded-full text-[10px] ${tab === t.id ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={handleCopy}
              disabled={!activeItem}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-xs border hover:bg-muted disabled:opacity-40"
            >
              {copied ? (
                <><Check size={12} className="text-green-600" /> Copied!</>
              ) : (
                <><Copy size={12} /> Copy prompt</>
              )}
            </button>
          </div>

          {/* Sub-task selector (only shown when category has multiple tasks) */}
          {items.length > 1 && (
            <div className="flex gap-1 px-4 pt-2 overflow-x-auto">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSubIdx(i)}
                  className={[
                    'shrink-0 px-2.5 py-1 rounded text-xs border whitespace-nowrap',
                    subIdx === i ? 'bg-muted font-medium' : 'hover:bg-muted/50 text-muted-foreground',
                  ].join(' ')}
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}

          <div className="p-4">
            {activeItem ? (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/40 rounded p-3 max-h-72 overflow-y-auto leading-relaxed">
                {activeItem.prompt}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground italic">No content for this category.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
