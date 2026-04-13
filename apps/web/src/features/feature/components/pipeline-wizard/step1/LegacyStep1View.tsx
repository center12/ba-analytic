import { Dispatch, SetStateAction } from 'react';
import { Feature } from '@/lib/api';
import { EditableList } from '../EditableList';

interface LegacyStep1ViewProps {
  feature: Feature;
  isEditing: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
}

export function LegacyStep1View({ feature, isEditing, draft, setDraft }: LegacyStep1ViewProps) {
  const req = feature.extractedRequirements;
  const beh = feature.extractedBehaviors;

  if (!req || !beh) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Requirements</p>
        <EditableList
          label="Features"
          color="text-blue-700"
          items={req.features}
          editing={isEditing}
          fieldKey="features"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Business Rules"
          color="text-orange-700"
          items={req.businessRules}
          editing={isEditing}
          fieldKey="businessRules"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Acceptance Criteria"
          color="text-green-700"
          items={req.acceptanceCriteria}
          editing={isEditing}
          fieldKey="acceptanceCriteria"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Entities"
          color="text-muted-foreground"
          items={req.entities}
          editing={isEditing}
          fieldKey="entities"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
      </div>
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Behaviors</p>
        {isEditing ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-violet-700">Feature name</p>
            <input
              className="w-full rounded border bg-background p-1.5 text-xs"
              value={draft.featureName ?? beh.feature}
              onChange={(e) => setDraft((d) => ({ ...d, featureName: e.target.value }))}
            />
          </div>
        ) : (
          <div>
            <p className="mb-1 text-xs font-semibold text-violet-700">Feature</p>
            <p className="text-xs text-muted-foreground">{beh.feature}</p>
          </div>
        )}
        {beh.actors.length > 0 && !isEditing && (
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Actors</p>
            <div className="flex flex-wrap gap-1">
              {beh.actors.map((actor, i) => (
                <span key={i} className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                  {actor}
                </span>
              ))}
            </div>
          </div>
        )}
        {isEditing && (
          <EditableList
            label="Actors"
            color="text-violet-700"
            items={beh.actors}
            editing
            fieldKey="actors"
            draft={draft}
            onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
          />
        )}
        <EditableList
          label="Actions"
          color="text-blue-700"
          items={beh.actions}
          editing={isEditing}
          fieldKey="actions"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
        <EditableList
          label="Rules"
          color="text-orange-700"
          items={beh.rules}
          editing={isEditing}
          fieldKey="behaviorRules"
          draft={draft}
          onDraftChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
        />
      </div>
    </div>
  );
}
