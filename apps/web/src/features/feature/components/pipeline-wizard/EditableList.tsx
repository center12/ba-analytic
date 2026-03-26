import { arrToText } from '../../helpers/pipeline-wizard.helpers';

interface EditableListProps {
  label: string;
  color: string;
  items: string[];
  editing: boolean;
  fieldKey: string;
  draft: Record<string, string>;
  onDraftChange: (k: string, v: string) => void;
}

export function EditableList({
  label,
  color,
  items,
  editing,
  fieldKey,
  draft,
  onDraftChange,
}: EditableListProps) {
  if (!editing) {
    if (!items.length) return null;
    return (
      <div>
        <p className={`text-xs font-semibold mb-1 ${color}`}>{label}</p>
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="shrink-0">·</span><span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div>
      <p className={`text-xs font-semibold mb-1 ${color}`}>{label}</p>
      <textarea
        className="w-full text-xs border rounded p-2 font-mono resize-y min-h-[80px] bg-background"
        value={draft[fieldKey] ?? arrToText(items)}
        onChange={(e) => onDraftChange(fieldKey, e.target.value)}
        placeholder="One item per line"
      />
    </div>
  );
}
