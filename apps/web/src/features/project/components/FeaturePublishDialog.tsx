import { useState, useEffect } from 'react';
import { api, type FeatureChangelog } from '@/lib/api';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FeaturePublishDialogProps {
  featureId: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const POLL_INTERVAL = 2000; // 2 seconds
const POLL_TIMEOUT = 120000; // 2 minutes

export function FeaturePublishDialog({ featureId, open, onClose, onConfirm }: FeaturePublishDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [changelog, setChangelog] = useState<FeatureChangelog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!open || !featureId) return;

    setIsLoading(true);
    setError(null);
    setChangelog(null);

    const startTime = Date.now();
    let pollInterval: ReturnType<typeof setInterval> | undefined;

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = undefined;
      }
    };

    const poll = async () => {
      try {
        const changelogs = await api.features.getChangelog(featureId);
        if (!changelogs || changelogs.length === 0) {
          // No changelog yet, keep polling
          return;
        }

        const latest = changelogs[0];
        if (latest.changeSummary) {
          // AI diff is ready
          setChangelog(latest);
          setIsLoading(false);
          stopPolling();
        } else {
          // Still waiting for AI diff
          const elapsed = Date.now() - startTime;
          if (elapsed > POLL_TIMEOUT) {
            setError('Changelog generation timed out. Please check the feature and try again.');
            setIsLoading(false);
            stopPolling();
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch changelog:', err);
        const elapsed = Date.now() - startTime;
        if (elapsed > POLL_TIMEOUT) {
          setError('Failed to retrieve changelog. Please check the feature and try again.');
          setIsLoading(false);
          stopPolling();
        }
      }
    };

    // Poll immediately
    void poll();

    // Then poll at intervals
    pollInterval = setInterval(poll, POLL_INTERVAL);

    return () => {
      stopPolling();
    };
  }, [open, featureId]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Confirm failed:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Published</DialogTitle>
          <DialogDescription>
            {isLoading ? 'Processing changes and analyzing differences...' : 'Review the changelog'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Running Step 1 extraction and generating AI changelog...
            </p>
            <p className="text-xs text-muted-foreground">This typically takes 10-30 seconds</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-8 px-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle size={24} className="text-destructive" />
            <p className="text-sm text-destructive font-medium text-center">{error}</p>
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded border border-destructive text-destructive hover:bg-destructive/5"
            >
              Close
            </button>
          </div>
        ) : changelog?.changeSummary ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Version {changelog.version}</p>
              <MarkdownPreview content={changelog.changeSummary} />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No changes detected</p>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-input hover:bg-muted"
            disabled={isConfirming}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !!error || isConfirming}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? (
              <>
                <Loader2 size={14} className="animate-spin inline mr-2" />
                Confirming...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
