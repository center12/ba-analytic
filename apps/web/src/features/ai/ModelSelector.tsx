import { useQuery } from '@tanstack/react-query';
import { api, type AIProviderInfo } from '@/lib/api';
import { useAppStore } from '@/store';

export function ModelSelector() {
  const activeProvider = useAppStore((s) => s.activeProvider);
  const setActiveProvider = useAppStore((s) => s.setActiveProvider);

  const { data: providers = [] } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.ai.getProviders(),
    staleTime: Infinity,
  });

  if (providers.length === 0) return null;

  return (
    <select
      value={activeProvider}
      onChange={(e) => setActiveProvider(e.target.value as 'gemini' | 'claude' | 'openai')}
      className="border rounded px-2 py-1.5 text-sm bg-background"
    >
      {providers.map((p: AIProviderInfo) => (
        <option key={p.provider} value={p.provider}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
