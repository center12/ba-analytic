export function StringList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground italic">None</span>;

  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
