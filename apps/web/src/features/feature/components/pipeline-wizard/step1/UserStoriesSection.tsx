import { Dispatch, SetStateAction } from 'react';
import { UserStories } from '@/lib/api';
import { arrToText, textToArr } from '../../../helpers/pipeline-wizard.helpers';

interface UserStoriesSectionProps {
  stories?: UserStories;
  acceptanceCriteriaSource?: string[];
  isEditing: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
}

function getAcceptanceCriteriaId(value: string): string {
  const match = value.trim().match(/^(AC-\d+)\s*:/i);
  return match ? match[1].toUpperCase() : value.trim();
}

function getAcceptanceCriteriaText(value: string): string {
  const match = value.trim().match(/^(AC-\d+)\s*:\s*(.+)$/i);
  return match ? match[2].trim() : value.trim();
}

export function UserStoriesSection({
  stories,
  acceptanceCriteriaSource = [],
  isEditing,
  draft,
  setDraft,
}: UserStoriesSectionProps) {
  const storyDraftValue = draft.storiesJson ?? (stories ? JSON.stringify(stories.stories, null, 2) : '[]');
  const acceptanceCriteriaDraftValue = draft.acceptanceCriteria ?? arrToText(acceptanceCriteriaSource);
  const draftStories = (() => {
    try {
      return JSON.parse(storyDraftValue) as UserStories['stories'];
    } catch {
      return stories?.stories ?? [];
    }
  })();
  const acceptanceCriteriaLookup = new Map<string, string>();

  textToArr(acceptanceCriteriaDraftValue).forEach((criterion) => {
    acceptanceCriteriaLookup.set(getAcceptanceCriteriaId(criterion), criterion.trim());
  });
  draftStories.forEach((story) => {
    story.acceptanceCriteria.forEach((criterion) => {
      if (criterion.includes(':')) {
        acceptanceCriteriaLookup.set(getAcceptanceCriteriaId(criterion), criterion.trim());
      }
    });
  });

  const acceptanceCriteria = Array.from(
    new Set(draftStories.flatMap((story) => story.acceptanceCriteria ?? []).map((criterion) => getAcceptanceCriteriaId(criterion))),
  );
  const editableAcceptanceCriteria = textToArr(acceptanceCriteriaDraftValue);
  const hasInvalidAcceptanceCriteria = editableAcceptanceCriteria.some((criterion) => !/^(AC-\d+)\s*:/i.test(criterion));

  function renderAcceptanceCriterion(criterion: string) {
    const id = getAcceptanceCriteriaId(criterion);
    const resolved = acceptanceCriteriaLookup.get(id);
    const text = resolved ? getAcceptanceCriteriaText(resolved) : 'No matching acceptance criteria text.';

    return (
      <div key={`${id}-${text}`} className="rounded border bg-background px-2 py-1.5">
        <p className="text-[11px] font-semibold text-emerald-800">{id}</p>
        <p className="text-[11px] text-muted-foreground">{text}</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-dashed bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold text-green-700">Acceptance Criteria</p>
          <textarea
            className="min-h-[140px] w-full rounded border bg-background p-2 font-mono text-xs"
            value={acceptanceCriteriaDraftValue}
            onChange={(e) => setDraft((d) => ({ ...d, acceptanceCriteria: e.target.value }))}
            placeholder="One item per line. Example: AC-01: Given ..., When ..., Then ..."
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Edit full acceptance criteria text here. Keep each line in `AC-xx: Given ..., When ..., Then ...` format.
          </p>
          {hasInvalidAcceptanceCriteria && (
            <p className="mt-2 text-xs text-destructive">
              Each acceptance criteria row must start with an `AC-xx:` ID prefix before you save.
            </p>
          )}
          <p className="mt-3 mb-2 text-xs font-semibold text-green-700">Story References</p>
          {acceptanceCriteria.length > 0 ? (
            <div className="space-y-2">
              {acceptanceCriteria.map((criterion) => renderAcceptanceCriterion(criterion))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No acceptance criteria found in the current user stories draft.</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            User stories below should reference acceptance criteria by `AC-xx` IDs only. Missing matches are shown as unresolved.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Edit stories as JSON. Store `acceptanceCriteria` as AC IDs only, and preserve related rule IDs and priority.
        </p>
        <textarea
          className="min-h-[240px] w-full rounded border bg-background p-2 font-mono text-xs"
          value={storyDraftValue}
          onChange={(e) => setDraft((d) => ({ ...d, storiesJson: e.target.value }))}
          placeholder="Paste an array of user stories"
        />
      </div>
    );
  }

  if (!stories?.stories.length) {
    return <p className="text-xs text-muted-foreground">No user stories available.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-dashed bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold text-green-700">Acceptance Criteria</p>
        {acceptanceCriteria.length > 0 ? (
          <div className="space-y-2">
            {acceptanceCriteria.map((criterion) => renderAcceptanceCriterion(criterion))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No acceptance criteria available.</p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-xs">
        <thead className="border-b text-muted-foreground">
          <tr>
            <th className="px-2 py-2 font-medium">ID</th>
            <th className="px-2 py-2 font-medium">Actor</th>
            <th className="px-2 py-2 font-medium">Action</th>
            <th className="px-2 py-2 font-medium">Benefit</th>
            <th className="px-2 py-2 font-medium">Priority</th>
            <th className="px-2 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {stories.stories.map((story) => (
            <tr key={story.id} className="border-b align-top">
              <td className="px-2 py-2 font-medium">{story.id}</td>
              <td className="px-2 py-2 text-muted-foreground">{story.actor}</td>
              <td className="px-2 py-2 text-muted-foreground">{story.action}</td>
              <td className="px-2 py-2 text-muted-foreground">{story.benefit}</td>
              <td className="px-2 py-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {story.priority}
                </span>
              </td>
              <td className="px-2 py-2">
                {story.acceptanceCriteria.length > 0 || story.relatedRuleIds.length > 0 ? (
                  <div className="space-y-2 rounded border bg-muted/20 p-2">
                    {story.acceptanceCriteria.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Acceptance Criteria IDs</p>
                        <div className="flex flex-wrap gap-1">
                          {story.acceptanceCriteria.map((criterion) => (
                            <span
                              key={criterion}
                              className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800"
                            >
                              {getAcceptanceCriteriaId(criterion)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {story.relatedRuleIds.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Related Rules</p>
                        <div className="flex flex-wrap gap-1">
                          {story.relatedRuleIds.map((ruleId) => (
                            <span key={ruleId} className="rounded bg-blue-100 px-2 py-0.5 text-[11px] text-blue-800">
                              {ruleId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No additional details.</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
