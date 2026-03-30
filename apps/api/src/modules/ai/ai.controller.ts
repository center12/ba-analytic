import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SUPPORTED_MODELS, type ModelInfo } from './ai.constants';

interface AIProviderInfo {
  provider: string;
  label: string;
  models: ModelInfo[];
}

const PROVIDER_CATALOG: Omit<AIProviderInfo, 'models'>[] = [
  { provider: 'gemini', label: 'Google Gemini' },
  { provider: 'claude', label: 'Anthropic Claude' },
  { provider: 'openai', label: 'OpenAI' },
];

const KEY_MAP: Record<string, string> = {
  gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

@Controller('ai')
export class AIController {
  constructor(private readonly config: ConfigService) {}

  /** GET /api/ai/providers — returns only providers with a configured API key, each with their supported models */
  @Get('providers')
  getAvailableProviders(): AIProviderInfo[] {
    return PROVIDER_CATALOG
      .filter((p) => !!this.config.get<string>(KEY_MAP[p.provider])?.trim())
      .map((p) => ({
        ...p,
        models: SUPPORTED_MODELS[p.provider as keyof typeof SUPPORTED_MODELS] ?? [],
      }));
  }
}
