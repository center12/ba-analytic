import { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionCardProps {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, open, onToggle, children }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border bg-background/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </span>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </section>
  );
}
