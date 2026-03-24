import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { useToastState } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToastState();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id); }}
          className={[
            'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4',
            'w-80 bg-background text-foreground',
            t.variant === 'destructive' && 'border-destructive bg-destructive text-destructive-foreground',
            t.variant === 'success' && 'border-green-500 bg-green-50 text-green-900',
          ].filter(Boolean).join(' ')}
        >
          <div className="flex-1 min-w-0">
            <ToastPrimitive.Title className="text-sm font-semibold">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="mt-0.5 text-xs opacity-80">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" />
    </ToastPrimitive.Provider>
  );
}
