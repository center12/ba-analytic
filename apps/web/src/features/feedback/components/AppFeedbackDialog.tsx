import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, Paperclip } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AppFeedbackDialogProps {
  pageTitle: string;
  contextLabel?: string;
  triggerLabel?: string;
  className?: string;
}

export function AppFeedbackDialog({
  pageTitle,
  contextLabel,
  triggerLabel = 'Feedback',
  className,
}: AppFeedbackDialogProps) {
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | undefined>();

  const mutation = useMutation({
    mutationFn: () =>
      api.feedback.create({
        content: content.trim(),
        routePath: location.pathname,
        pageTitle,
        contextLabel,
        file,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-feedback'] });
      setContent('');
      setFile(undefined);
      setOpen(false);
      toast({ variant: 'success', title: 'Feedback submitted' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Unable to submit feedback', description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 border px-3 py-2 rounded-md hover:bg-muted text-sm',
            className,
          )}
        >
          <MessageSquarePlus size={16} />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription>
            Leave feedback about this page and attach one file if it helps explain the issue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p>{pageTitle}</p>
            <p>{contextLabel || location.pathname}</p>
          </div>

          <textarea
            className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="What should be improved, fixed, or clarified?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm hover:bg-muted/50">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Paperclip size={14} />
              {file ? file.name : 'Attach media or file'}
            </span>
            <span className="text-xs text-muted-foreground">Optional</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </label>
        </div>

        <DialogFooter>
          <button
            type="button"
            className="border px-4 py-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!content.trim() || mutation.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit feedback'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
