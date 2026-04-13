import { Dispatch, SetStateAction } from 'react';
import { UserStories } from '@/lib/api';

interface UserStoriesSectionProps {
  stories?: UserStories;
  isEditing: boolean;
  draft: Record<string, string>;
  setDraft: Dispatch<SetStateAction<Record<string, string>>>;
}

export function UserStoriesSection({ stories, isEditing, draft, setDraft }: UserStoriesSectionProps) {
  const storyDraftValue = draft.storiesJson ?? (stories ? JSON.stringify(stories.stories, null, 2) : '[]');

  if (isEditing) {
    return (
      <div className="space-y-2">
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
                          {story.acceptanceCriteria.map((criterionId) => (
                            <span
                              key={criterionId}
                              className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800"
                            >
                              {criterionId}
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
  );
}
