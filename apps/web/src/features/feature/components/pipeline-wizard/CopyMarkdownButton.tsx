import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { downloadMarkdown } from '../../helpers/pipeline-wizard.helpers';

interface Props {
  getText: () => string;
  filename: string;
  disabled?: boolean;
}

export function CopyMarkdownButton({ getText, filename, disabled }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = getText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const text = getText();
    if (!text) return;
    downloadMarkdown(text, filename);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        disabled={disabled}
        title="Copy as Markdown"
        className="flex items-center gap-1.5 border px-2 py-1.5 rounded text-xs hover:bg-muted disabled:opacity-40"
      >
        {copied ? (
          <><Check size={12} className="text-green-600" /> Copied!</>
        ) : (
          <><Copy size={12} /> Copy MD</>
        )}
      </button>
      <button
        onClick={handleDownload}
        disabled={disabled}
        title="Download as Markdown"
        className="flex items-center gap-1 border px-2 py-1.5 rounded text-xs hover:bg-muted disabled:opacity-40"
      >
        <Download size={12} />
      </button>
    </div>
  );
}
