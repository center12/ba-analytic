import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feature, type FeatureType, type SSRData, type UserStories } from '@/lib/api';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/store';
import { Save, X, Upload, Eye, Edit2, Trash2, FileText, Copy, Play, RefreshCw, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  SSR_DOCUMENT_TEMPLATE,
  FEATURE_DOCUMENT_TEMPLATE,
  SSR_CONVERSION_PROMPT,
  FEATURE_CONVERSION_PROMPT,
} from '../constants/feature-content.constants';

interface FeatureContentEditorProps {
  feature: Feature;
  allFeatures: Feature[];
  onClose: () => void;
}

function parseJsonField<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function getLayer1Counts(feature: Feature): { rules: number; stories: number } | null {
  const ssr = parseJsonField<SSRData>(feature.layer1SSR);
  const storiesData = parseJsonField<UserStories>(feature.layer1Stories);
  if (!ssr && !storiesData) return null;
  const rules =
    (ssr?.functionalRequirements?.length ?? 0) +
    (ssr?.systemRules?.length ?? 0) +
    (ssr?.businessRules?.length ?? 0);
  const stories = storiesData?.stories?.length ?? 0;
  return { rules, stories };
}

export function FeatureContentEditor({ feature, allFeatures, onClose }: FeatureContentEditorProps) {
  const qc = useQueryClient();
  const imgRef = useRef<HTMLInputElement>(null);
  const activeProvider = useAppStore((s) => s.activeProvider);
  const activeModel = useAppStore((s) => s.activeModel);

  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [content, setContent] = useState(feature.content ?? '');
  const [featureType, setFeatureType] = useState<FeatureType>(feature.featureType ?? 'FEATURE');
  const [relatedIds, setRelatedIds] = useState<string[]>(feature.relatedFeatureIds ?? []);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.features.update(feature.id, { content, featureType, relatedFeatureIds: relatedIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', feature.projectId] });
      toast({ variant: 'success', title: 'Feature saved' });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Failed to save', description: err.message });
    },
  });

  const uploadImgMutation = useMutation({
    mutationFn: (file: File) => api.features.uploadScreenshot(feature.id, file),
    onSuccess: (screenshot) => {
      qc.invalidateQueries({ queryKey: ['features', feature.projectId] });
      const imgMd = `\n![image](${screenshot.storageKey})\n`;
      setContent((prev) => prev + imgMd);
      toast({ variant: 'success', title: 'Image uploaded' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    },
  });

  const deleteImgMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/projects/features/${feature.id}/screenshots/${id}`, { method: 'DELETE' }).then(() => {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['features', feature.projectId] }),
  });

  const step1Mutation = useMutation({
    mutationFn: () =>
      api.featureAnalysis.runStep(feature.id, 1, activeProvider ?? undefined, activeModel ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', feature.projectId] });
      toast({ variant: 'success', title: 'Step 1 complete', description: 'Requirements extracted successfully.' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Step 1 failed', description: err.message });
    },
  });

  const otherFeatures = allFeatures.filter((f) => f.id !== feature.id);

  const handleUseTemplate = () => {
    const template = featureType === 'SSR' ? SSR_DOCUMENT_TEMPLATE : FEATURE_DOCUMENT_TEMPLATE;
    if (content.trim()) {
      if (!window.confirm('Replace current content with the template?')) return;
    }
    setContent(template);
    setTab('edit');
  };

  const handleCopyPrompt = async () => {
    const prompt = featureType === 'SSR' ? SSR_CONVERSION_PROMPT : FEATURE_CONVERSION_PROMPT;
    await navigator.clipboard.writeText(prompt);
    toast({ variant: 'success', title: 'Copied!', description: 'AI conversion prompt copied to clipboard.' });
  };

  const layer1Counts = getLayer1Counts(feature);
  const hasLayer1 = !!layer1Counts;
  const hasContent = !!content.trim();

  return (
    <div className="space-y-4 pt-2">
      {/* Feature type selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Type:</span>
        {(['FEATURE', 'SSR'] as FeatureType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFeatureType(t)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              featureType === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted'
            }`}
          >
            {t === 'SSR' ? 'SSR Document' : 'Feature'}
          </button>
        ))}
      </div>

      {/* Content editor */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex border-b bg-muted/30">
          <button
            onClick={() => setTab('edit')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs ${tab === 'edit' ? 'bg-background font-medium' : 'hover:bg-muted/50'}`}
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs ${tab === 'preview' ? 'bg-background font-medium' : 'hover:bg-muted/50'}`}
          >
            <Eye size={12} /> Preview
          </button>
          <div className="flex-1" />
          <button
            onClick={handleUseTemplate}
            className="flex items-center gap-1 px-3 py-1.5 text-xs hover:bg-muted/50 text-muted-foreground"
            title="Insert document template"
          >
            <FileText size={12} /> Template
          </button>
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1 px-3 py-1.5 text-xs hover:bg-muted/50 text-muted-foreground"
            title="Copy AI conversion prompt to clipboard"
          >
            <Copy size={12} /> Copy AI Prompt
          </button>
          <button
            onClick={() => imgRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs hover:bg-muted/50 text-muted-foreground"
            title="Upload image"
          >
            <Upload size={12} /> Image
          </button>
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImgMutation.mutate(f);
              e.target.value = '';
            }}
          />
        </div>
        {tab === 'edit' ? (
          <textarea
            className="w-full px-3 py-2 bg-background font-mono text-sm resize-y min-h-[220px] outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              featureType === 'SSR'
                ? '# System Requirements Specification\n\nPaste or write your SSR document here, or click "Template" to start from a template...'
                : '# Feature Description\n\nDescribe the feature requirements here, or click "Template" to start from a template...'
            }
          />
        ) : (
          <div className="px-3 py-2 min-h-[220px]">
            {content ? (
              <MarkdownPreview content={content} className="text-sm" />
            ) : (
              <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Step 1 — Extract Requirements */}
      {hasContent && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Step 1 — Extract Requirements</span>
            {hasLayer1 && (
              <Link
                to={`/projects/${feature.projectId}/features/${feature.id}`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View full results <ExternalLink size={10} />
              </Link>
            )}
          </div>

          {hasLayer1 ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 size={13} />
                <span>
                  Step 1 complete —{' '}
                  {layer1Counts!.rules > 0 && `${layer1Counts!.rules} rules`}
                  {layer1Counts!.rules > 0 && layer1Counts!.stories > 0 && ' · '}
                  {layer1Counts!.stories > 0 && `${layer1Counts!.stories} user stories`}
                </span>
              </div>
              <button
                disabled={step1Mutation.isPending}
                onClick={() => step1Mutation.mutate()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 hover:bg-muted disabled:opacity-50"
              >
                {step1Mutation.isPending
                  ? <><Loader2 size={11} className="animate-spin" /> Running...</>
                  : <><RefreshCw size={11} /> Re-run Step 1</>}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={step1Mutation.isPending}
                onClick={() => step1Mutation.mutate()}
                className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {step1Mutation.isPending
                  ? <><Loader2 size={12} className="animate-spin" /> Extracting...</>
                  : <><Play size={12} /> Run Step 1</>}
              </button>
              <span className="text-xs text-muted-foreground">
                Extract rules and user stories from this document.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Uploaded images */}
      {feature.screenshots && feature.screenshots.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Uploaded images</p>
          <div className="flex flex-wrap gap-2">
            {feature.screenshots.map((s) => (
              <div key={s.id} className="relative group">
                <img
                  src={`/api/storage/${s.storageKey}`}
                  alt={s.originalName}
                  className="h-16 w-16 object-cover rounded border"
                />
                <button
                  onClick={() => deleteImgMutation.mutate(s.id)}
                  className="absolute top-0 right-0 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related features */}
      {otherFeatures.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Related features & rules (added as pipeline context)</p>
          <MultiSelect
            options={otherFeatures.map((f) => ({
              value: f.id,
              label: f.featureType === 'SSR' ? `${f.name} (SSR)` : f.name,
            }))}
            defaultValue={relatedIds}
            onValueChange={setRelatedIds}
            placeholder="Select related features..."
            maxCount={5}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
        >
          <Save size={14} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
