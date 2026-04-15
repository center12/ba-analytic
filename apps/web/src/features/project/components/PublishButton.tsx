import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Feature, type FeatureType } from '@/lib/api';
import { FeaturePublishDialog } from './FeaturePublishDialog';
import { toast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

interface PublishButtonProps {
  feature: Feature;
  projectId: string;
  content: string;
  featureType: FeatureType;
  relatedFeatureIds?: string[];
  disabled?: boolean;
  onPublishSuccess?: () => void;
}

export function PublishButton({
  feature,
  projectId,
  content,
  featureType,
  relatedFeatureIds = [],
  disabled = false,
  onPublishSuccess,
}: PublishButtonProps) {
  const qc = useQueryClient();
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const publishMutation = useMutation({
    mutationFn: async () => {
      // Save content first (in case featureType/relatedIds changed), then publish
      await api.features.update(feature.id, { content, featureType, relatedFeatureIds });
      return api.features.publish(feature.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      qc.invalidateQueries({ queryKey: ['feature-changelog', feature.id] });
      toast({
        variant: 'success',
        title: 'Published',
        description: 'Document saved and published successfully.',
      });
      setShowPublishDialog(true);
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to publish',
        description: err.message,
      });
    },
  });

  const handlePublishDialogConfirm = async () => {
    await onPublishSuccess?.();
  };

  return (
    <>
      <button
        onClick={() => publishMutation.mutate()}
        disabled={disabled || publishMutation.isPending || !content?.trim()}
        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:opacity-90 disabled:opacity-50"
        title={featureType === 'SSR' ? 'Save and notify affected extracted features' : 'Save and mark as published'}
      >
        {publishMutation.isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Send size={14} />
            Publish
          </>
        )}
      </button>

      <FeaturePublishDialog
        featureId={feature.id}
        open={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        onConfirm={handlePublishDialogConfirm}
      />
    </>
  );
}
