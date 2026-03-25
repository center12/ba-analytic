import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

type Tab = 'api' | 'frontend' | 'testing';

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: 'api',      label: '4A — API',      color: 'text-blue-700' },
  { id: 'frontend', label: '4B — Frontend', color: 'text-violet-700' },
  { id: 'testing',  label: '4C — Testing',  color: 'text-green-700' },
];

interface Props {
  api: string;
  frontend: string;
  testing: string;
}

export function DevPromptPanel({ api, frontend, testing }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('api');
  const [copied, setCopied] = useState(false);

  const content = { api, frontend, testing }[tab];

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
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
        <span className="ml-auto text-xs text-muted-foreground">4A API · 4B Frontend · 4C Testing</span>
      </button>

      {open && (
        <div className="border-t">
          {/* Tabs + copy button */}
          <div className="flex items-center gap-1 px-4 pt-2">
            {TABS.map((t) => (
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
            <button
              onClick={handleCopy}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-xs border hover:bg-muted"
            >
              {copied ? (
                <><Check size={12} className="text-green-600" /> Copied!</>
              ) : (
                <><Copy size={12} /> Copy prompt</>
              )}
            </button>
          </div>

          <div className="p-4">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/40 rounded p-3 max-h-72 overflow-y-auto leading-relaxed">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
