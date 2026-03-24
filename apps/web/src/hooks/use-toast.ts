import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let externalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  externalSetToasts = setToasts;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss };
}

export function toast(options: Omit<Toast, 'id'>) {
  if (!externalSetToasts) return;
  const id = Math.random().toString(36).slice(2);
  externalSetToasts((prev) => [...prev, { ...options, id }]);
  setTimeout(() => {
    externalSetToasts?.((prev) => prev.filter((t) => t.id !== id));
  }, 4000);
}
