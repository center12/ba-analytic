import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

/** Fetch sync warnings for an SSR feature (all OUT_OF_SYNC extracted children). */
export function useSSRSyncWarnings(ssrId: string | undefined) {
  return useQuery({
    queryKey: ['ssr-sync-warnings', ssrId],
    queryFn: () => api.featureAnalysis.getSSRSyncWarnings(ssrId!),
    enabled: !!ssrId,
    staleTime: 0, // Always re-fetch — status can change when step 1 re-runs
  });
}

/** Fetch sync status for a single extracted feature. */
export function useFeatureSyncStatus(featureId: string | undefined) {
  return useQuery({
    queryKey: ['feature-sync-status', featureId],
    queryFn: () => api.featureAnalysis.getSyncStatus(featureId!),
    enabled: !!featureId,
  });
}

/** Re-sync an extracted feature from its parent SSR. Sets syncStatus = IN_SYNC. */
export function useSyncFeatureUpdate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => api.featureAnalysis.syncUpdate(featureId),
    onSuccess: (_, featureId) => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      qc.invalidateQueries({ queryKey: ['feature-sync-status', featureId] });
      toast({ variant: 'success', title: 'Feature synced', description: 'Content updated from parent SSR.' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Sync failed', description: err.message });
    },
  });
}

/** Keep a feature's current content and mark it as DIVERGED. */
export function useDivergeFeature(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => api.featureAnalysis.syncKeep(featureId),
    onSuccess: (_, featureId) => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      qc.invalidateQueries({ queryKey: ['feature-sync-status', featureId] });
      toast({ variant: 'success', title: 'Feature marked as diverged' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    },
  });
}

/** Permanently delete an extracted feature. */
export function useRemoveFeature(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (featureId: string) => api.featureAnalysis.syncRemove(featureId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['features', projectId] });
      toast({ variant: 'success', title: 'Feature removed' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Failed to remove feature', description: err.message });
    },
  });
}
