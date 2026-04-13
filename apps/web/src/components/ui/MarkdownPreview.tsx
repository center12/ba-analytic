import ReactMarkdown from 'react-markdown';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
