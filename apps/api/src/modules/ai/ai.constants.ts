export interface ModelInfo {
  id: string;
  label: string;
}

export const SUPPORTED_MODELS: Record<'gemini' | 'claude' | 'openai', ModelInfo[]> = {
  gemini: [
    { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
  ],
  claude: [
    { id: 'claude-sonnet-4-6',           label: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-6',             label: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5' },
    { id: 'claude-3-5-sonnet-20241022',  label: 'Claude 3.5 Sonnet' },
  ],
  openai: [
    { id: 'gpt-5',        label: 'GPT-5' },
    { id: 'gpt-5-mini',   label: 'GPT-5 Mini' },
    { id: 'gpt-4.1',      label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
    { id: 'o1',           label: 'o1' },
    { id: 'o3',           label: 'o3' },
    { id: 'o3-mini',      label: 'o3-mini' },
  ],
};
