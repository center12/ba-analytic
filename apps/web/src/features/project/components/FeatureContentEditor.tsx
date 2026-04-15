import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getStorageUrl, type Feature, type FeatureType, type SSRData, type UserStories } from '@/lib/api';
import { DocumentEditor } from '@/components/ui/DocumentEditor';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/store';
import { Save, X, Trash2, FileText, Copy, Play, RefreshCw, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';
import { FeatureChangelogPanel } from './FeatureChangelogPanel';
import { PublishButton } from './PublishButton';
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
  onClose?: () => void;
  /** Called after the publish changelog is reviewed and confirmed. */
  onPublish?: (featureId: string) => void;
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

export function FeatureContentEditor({ feature, allFeatures, onClose, onPublish }: FeatureContentEditorProps) {
  const qc = useQueryClient();
  const activeProvider = useAppStore((s) => s.activeProvider);
  const activeModel = useAppStore((s) => s.activeModel);

  const [content, setContent] = useState(feature.content ?? '');
  const [featureType, setFeatureType] = useState<FeatureType>(feature.featureType ?? 'FEATURE');
  const [relatedIds, setRelatedIds] = useState<string[]>(feature.relatedFeatureIds ?? []);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setContent(feature.content ?? '');
    setFeatureType(feature.featureType ?? 'FEATURE');
    setRelatedIds(feature.relatedFeatureIds ?? []);
    setLightboxIndex(null);
  }, [feature.id]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.features.update(feature.id, { content, featureType, relatedFeatureIds: relatedIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', feature.projectId] });
      toast({ variant: 'success', title: 'Feature saved' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Failed to save', description: err.message });
    },
  });


  const uploadImgMutation = useMutation({
    mutationFn: (file: File) => api.features.uploadScreenshot(feature.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', feature.projectId] });
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
  };

  const handleCopyPrompt = async () => {
    const prompt = featureType === 'SSR' ? SSR_CONVERSION_PROMPT : FEATURE_CONVERSION_PROMPT;
    await navigator.clipboard.writeText(prompt);
    toast({ variant: 'success', title: 'Copied!', description: 'AI conversion prompt copied to clipboard.' });
  };

  const layer1Counts = getLayer1Counts(feature);
  const hasLayer1 = !!layer1Counts;
  const hasContent = !!content.trim();
  const isPublished = feature.contentStatus === 'PUBLISHED';
  const canRunStep1First = isPublished && hasContent;

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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={handleUseTemplate}
            className="flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs hover:bg-muted"
            title="Insert document template"
          >
            <FileText size={12} /> Template
          </button>
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs hover:bg-muted"
            title="Copy AI conversion prompt to clipboard"
          >
            <Copy size={12} /> Copy AI Prompt
          </button>
        </div>
        <DocumentEditor
          markdown={content}
          onChange={setContent}
          placeholder={
            featureType === 'SSR'
              ? '# System Requirements Specification\n\nPaste or write your SSR document here, or use "Template" to start from a structured SSR document.'
              : '# Feature Description\n\nDescribe the feature requirements here, or use "Template" to start from a structured feature document.'
          }
          uploadImage={async (file) => {
            const screenshot = await uploadImgMutation.mutateAsync(file);
            return screenshot.storageKey;
          }}
        />
        {uploadImgMutation.isPending && (
          <p className="text-xs text-muted-foreground">Uploading image...</p>
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
                disabled={step1Mutation.isPending || !canRunStep1First}
                onClick={() => step1Mutation.mutate()}
                className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
                title={!canRunStep1First ? 'Publish the document first to enable pipeline' : undefined}
              >
                {step1Mutation.isPending
                  ? <><Loader2 size={12} className="animate-spin" /> Extracting...</>
                  : <><Play size={12} /> Run Step 1</>}
              </button>
              <span className="text-xs text-muted-foreground">
                {canRunStep1First
                  ? 'Extract rules and user stories from this document.'
                  : 'Publish the document first to enable the pipeline.'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Version history */}
      {(feature.contentStatus === 'PUBLISHED' || (feature.publishedVersion ?? 0) > 0) && (
        <FeatureChangelogPanel featureId={feature.id} />
      )}

      {/* Uploaded images */}
      {feature.screenshots && feature.screenshots.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Uploaded images</p>
          <div className="flex flex-wrap gap-2">
            {feature.screenshots.map((s, i) => (
              <div key={s.id} className="relative group">
                <img
                  src={getStorageUrl(s.storageKey)}
                  alt={s.originalName}
                  className="h-16 w-16 object-cover rounded border cursor-zoom-in"
                  onClick={() => setLightboxIndex(i)}
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

      {lightboxIndex !== null && feature.screenshots && (
        <ImageLightbox
          images={feature.screenshots.map((s) => ({ src: getStorageUrl(s.storageKey), alt: s.originalName }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
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
      <div className="flex items-center gap-2 pt-1">
        <PublishButton
          feature={feature}
          projectId={feature.projectId}
          content={content}
          featureType={featureType}
          relatedFeatureIds={relatedIds}
          disabled={updateMutation.isPending}
          onPublishSuccess={() => {
            if (onPublish) {
              onPublish(feature.id);
              return;
            }
            onClose?.();
          }}
        />
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted disabled:opacity-50"
        >
          {updateMutation.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
            : <><Save size={14} /> Save draft</>}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted"
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
