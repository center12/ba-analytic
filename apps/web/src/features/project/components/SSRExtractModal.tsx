import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feature, type SubFeatureItem, type UserStories, type UserStory } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { parseLayer1Field } from '@/features/feature/helpers/pipeline-wizard.helpers';
import { Loader2, Sparkles, Plus, Trash2, Check, ChevronDown } from 'lucide-react';

interface SSRExtractModalProps {
  feature: Feature;
  featureId?: string;
  projectId?: string;
  featureName?: string;
  provider?: string;
  model?: string;
  onClose: () => void;
}

function storyToContent(story: UserStory): string {
  const acceptanceCriteria = story.acceptanceCriteria?.length
    ? story.acceptanceCriteria.map((criterion) => `- ${criterion}`).join('\n')
    : '- None specified';
  const relatedRules = story.relatedRuleIds?.length
    ? story.relatedRuleIds.join(', ')
    : 'None';

  return [
    `**Actor:** ${story.actor}`,
    '',
    `**Action:** ${story.action}`,
    '',
    `**Benefit:** ${story.benefit}`,
    '',
    `**Priority:** ${story.priority}`,
    '',
    '**Acceptance Criteria:**',
    acceptanceCriteria,
    '',
    `**Related Rules:** ${relatedRules}`,
  ].join('\n');
}

function deriveItemsFromFeature(feature: Feature): SubFeatureItem[] {
  const storiesData = parseLayer1Field<UserStories>(feature.layer1Stories);
  const stories = storiesData?.stories ?? [];

  return stories.map((story) => ({
    name: `${story.id}: ${story.action}`,
    description: story.benefit,
    content: storyToContent(story),
  }));
}

export function SSRExtractModal({
  feature,
  featureId,
  projectId,
  featureName,
  provider,
  model,
  onClose,
}: SSRExtractModalProps) {
  const qc = useQueryClient();
  const resolvedFeatureId = feature.id || featureId || '';
  const resolvedProjectId = feature.projectId || projectId || '';
  const resolvedFeatureName = feature.name || featureName || 'this SSR';
  const [extracted, setExtracted] = useState<SubFeatureItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'required' | 'extracted'>('required');

  useEffect(() => {
    const items = deriveItemsFromFeature(feature);
    setExtracted(items);
    setSelected(new Set(items.map((_, i) => i)));
    setStep(items.length > 0 ? 'extracted' : 'required');
  }, [feature.id, feature.layer1Stories]);

  const step1Mutation = useMutation({
    mutationFn: () => api.featureAnalysis.runStep(resolvedFeatureId, 1, provider, model),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['features', resolvedProjectId] });

      const updatedFeature = qc
        .getQueryData<Feature[]>(['features', resolvedProjectId])
        ?.find((item) => item.id === resolvedFeatureId);

      const items = deriveItemsFromFeature(updatedFeature ?? feature);
      if (items.length > 0) {
        setExtracted(items);
        setSelected(new Set(items.map((_, i) => i)));
        setStep('extracted');
        toast({ variant: 'success', title: 'Step 1 complete', description: 'User stories extracted successfully.' });
        return;
      }

      setExtracted([]);
      setSelected(new Set());
      setStep('required');
      toast({
        variant: 'destructive',
        title: 'Step 1 incomplete',
        description: 'No user stories were found. Re-run Step 1 from the SSR editor or review the source document.',
      });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Step 1 failed', description: err.message });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const toCreate = extracted.filter((_, i) => selected.has(i));
      for (const item of toCreate) {
        await api.features.create(resolvedProjectId, {
          name: item.name,
          description: item.description,
          content: item.content,
        });
      }
      return toCreate.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['features', resolvedProjectId] });
      toast({ variant: 'success', title: `${count} feature(s) created` });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Failed to create features', description: err.message });
    },
  });

  const toggleItem = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateItem = (index: number, field: keyof SubFeatureItem, value: string) => {
    setExtracted((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeItem = (index: number) => {
    setExtracted((prev) => prev.filter((_, i) => i !== index));
    setSelected((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">Extract Features from SSR</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review the Step 1 user stories for <span className="font-medium">{resolvedFeatureName}</span> and choose which features to create.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 'required' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Sparkles size={40} className="text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Step 1 has not been run yet for this SSR.
                Run Step 1 first to extract structured user stories, then review the generated features here.
              </p>
              <button
                onClick={() => step1Mutation.mutate()}
                disabled={step1Mutation.isPending}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {step1Mutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Extracting...</>
                ) : (
                  <><Sparkles size={16} /> Run Step 1</>
                )}
              </button>
            </div>
          )}

          {step === 'extracted' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{extracted.length} features derived from Step 1 user stories:</p>
              </div>
              {extracted.map((item, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-3 space-y-2 transition-colors ${selected.has(i) ? 'border-primary/50 bg-primary/5' : 'opacity-50'}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleItem(i)}
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center ${selected.has(i) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}
                    >
                      {selected.has(i) && <Check size={10} className="text-white" />}
                    </button>
                    <div className="flex-1 space-y-1">
                      <input
                        className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-muted focus:border-primary outline-none"
                        value={item.name}
                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                      />
                      <textarea
                        className="w-full text-xs text-muted-foreground bg-transparent resize-none outline-none hover:border-b hover:border-muted focus:border-b focus:border-primary"
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                      />
                      <details className="rounded-md border bg-background/70">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground">
                          <span>Content</span>
                          <ChevronDown size={12} className="shrink-0" />
                        </summary>
                        <div className="border-t px-3 py-3">
                          <textarea
                            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-xs outline-none focus:border-primary min-h-[180px]"
                            value={item.content ?? ''}
                            onChange={(e) => updateItem(i, 'content', e.target.value)}
                          />
                        </div>
                      </details>
                    </div>
                    <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setExtracted((prev) => [...prev, { name: 'New Feature', description: '', content: '' }])}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={12} /> Add feature manually
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="border px-4 py-2 rounded-md text-sm hover:bg-muted">
            Cancel
          </button>
          {step === 'extracted' && (
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || selected.size === 0}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Creating...</>
              ) : (
                `Create ${selected.size} Feature${selected.size !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
