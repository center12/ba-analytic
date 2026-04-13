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
  const legacyRequirements = feature.extractedRequirements;
  const legacyBehaviors = feature.extractedBehaviors;

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
      {legacyRequirements && !isEditing && (
        <div className="rounded border bg-background p-3">
          <p className="mb-3 text-xs font-semibold text-slate-700">Extracted Requirements</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EditableList
              label="Features"
              color="text-blue-700"
              items={legacyRequirements.features}
              editing={false}
              fieldKey="legacyFeatures"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
            <EditableList
              label="Business Rules"
              color="text-orange-700"
              items={legacyRequirements.businessRules}
              editing={false}
              fieldKey="legacyBusinessRules"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
            <EditableList
              label="Acceptance Criteria"
              color="text-green-700"
              items={legacyRequirements.acceptanceCriteria}
              editing={false}
              fieldKey="legacyAcceptanceCriteria"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
            <EditableList
              label="Entities"
              color="text-slate-700"
              items={legacyRequirements.entities}
              editing={false}
              fieldKey="legacyEntities"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
          </div>
        </div>
      )}
      {legacyBehaviors && !isEditing && (
        <div className="rounded border bg-background p-3">
          <p className="mb-3 text-xs font-semibold text-slate-700">Extracted Behaviors</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EditableList
              label="Actors"
              color="text-violet-700"
              items={legacyBehaviors.actors}
              editing={false}
              fieldKey="actors"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
            <EditableList
              label="Actions"
              color="text-blue-700"
              items={legacyBehaviors.actions}
              editing={false}
              fieldKey="actions"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
            <EditableList
              label="Rules"
              color="text-orange-700"
              items={legacyBehaviors.rules}
              editing={false}
              fieldKey="behaviorRules"
              draft={draft}
              onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
