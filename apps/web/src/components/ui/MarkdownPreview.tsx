import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveMarkdownAssetUrl } from '@/lib/markdown';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            const resolvedSrc = resolveMarkdownAssetUrl(src);
            if (!resolvedSrc) return null;

            return <img src={resolvedSrc} alt={alt ?? ''} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
