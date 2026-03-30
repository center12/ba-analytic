import { useQuery } from '@tanstack/react-query';
import { api, type AIProviderInfo } from '@/lib/api';
import { useAppStore } from '@/store';

export function ModelSelector() {
  const activeProvider = useAppStore((s) => s.activeProvider);
  const setActiveProvider = useAppStore((s) => s.setActiveProvider);
  const activeModel = useAppStore((s) => s.activeModel);
  const setActiveModel = useAppStore((s) => s.setActiveModel);

  const { data: providers = [] } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.ai.getProviders(),
    staleTime: Infinity,
  });

  if (providers.length === 0) return null;

  const currentProvider = providers.find((p: AIProviderInfo) => p.provider === activeProvider);
  const models = currentProvider?.models ?? [];

  return (
    <div className="flex items-center gap-2">
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

      {models.length > 0 && (
        <select
          value={activeModel ?? ''}
          onChange={(e) => setActiveModel(e.target.value || undefined)}
          className="border rounded px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Default model</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
