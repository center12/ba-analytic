import { Dispatch, SetStateAction } from 'react';
import { Feature, SSRData, UserStories } from '@/lib/api';
import { EditableList } from '../EditableList';

interface RulesSectionProps {
  feature: Feature;
  ssr?: SSRData;
  stories?: UserStories;
  isEditing: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
}

export function RulesSection({ feature, ssr, stories, isEditing, draft, setDraft }: RulesSectionProps) {
  return (
    <div className="space-y-3">
      {isEditing ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-violet-700">Feature name</p>
          <input
            className="w-full rounded border bg-background p-1.5 text-xs"
            value={draft.featureName ?? ssr?.featureName ?? stories?.featureName ?? feature.name}
            onChange={(e) => setDraft((d) => ({ ...d, featureName: e.target.value }))}
          />
        </div>
      ) : (
        <div>
          <p className="mb-1 text-xs font-semibold text-violet-700">Feature</p>
          <p className="text-xs text-muted-foreground">{ssr?.featureName ?? stories?.featureName ?? feature.name}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EditableList
          label="System Rules"
          color="text-sky-700"
          items={ssr?.systemRules ?? []}
          editing={isEditing}
          fieldKey="systemRules"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Business Rules"
          color="text-orange-700"
          items={ssr?.businessRules ?? []}
          editing={isEditing}
          fieldKey="businessRules"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Constraints"
          color="text-emerald-700"
          items={ssr?.constraints ?? []}
          editing={isEditing}
          fieldKey="constraints"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Global Policies"
          color="text-amber-700"
          items={ssr?.globalPolicies ?? []}
          editing={isEditing}
          fieldKey="globalPolicies"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Entities"
          color="text-slate-700"
          items={ssr?.entities ?? []}
          editing={isEditing}
          fieldKey="entities"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
      </div>
    </div>
  );
}
