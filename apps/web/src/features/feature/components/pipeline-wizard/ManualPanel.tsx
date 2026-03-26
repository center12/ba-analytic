import { useState } from 'react';
import { Check, Copy, Loader2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ManualPanelProps {
  step: number;
  featureId: string;
  templateJson: string;
  manualJson: string;
  jsonError: string | null;
  isSaving: boolean;
  onJsonChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ManualPanel({
  step,
  featureId,
  templateJson,
  manualJson,
  jsonError,
  isSaving,
  onJsonChange,
  onSave,
  onCancel,
}: ManualPanelProps) {
  const [copied, setCopied] = useState(false);
  const [copyingPrompt, setCopyingPrompt] = useState(false);

  async function copyPrompt() {
    setCopyingPrompt(true);
    try {
      const { prompt } = await api.testCases.getStepPrompt(featureId, step);
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not get prompt', description: (err as Error).message });
    } finally {
      setCopyingPrompt(false);
    }
  }

  return (
    <div className="border rounded-lg bg-muted/30 p-4 space-y-4 mt-2">
      <div className="flex items-start gap-3">
        <button
          onClick={copyPrompt}
          disabled={copyingPrompt}
          className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50 shrink-0"
        >
          {copyingPrompt
            ? <Loader2 size={13} className="animate-spin" />
            : copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
        <p className="text-xs text-muted-foreground pt-1.5">
          Paste this prompt into Claude, ChatGPT, or any AI tool, then paste the JSON response below.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground">Expected output format</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(templateJson);
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Copy size={11} /> Copy template
          </button>
        </div>
        <pre className="text-[11px] bg-muted/60 rounded p-2 overflow-x-auto max-h-36 font-mono leading-relaxed">
          {templateJson}
        </pre>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1">Paste AI response here</p>
        <textarea
          className={`w-full text-xs border rounded p-2 font-mono resize-y min-h-[180px] bg-background ${jsonError ? 'border-red-400' : ''}`}
          value={manualJson}
          onChange={(e) => onJsonChange(e.target.value)}
          placeholder="Paste the JSON result from your AI tool..."
          spellCheck={false}
        />
        {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={!!jsonError || isSaving}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 border px-3 py-1.5 rounded text-sm hover:bg-muted"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
