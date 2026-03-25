import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './ai-provider.abstract';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';

export type ProviderName = 'gemini' | 'claude' | 'openai';

@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);
  private readonly defaultProvider: ProviderName;

  constructor(
    private readonly gemini: GeminiProvider,
    private readonly claude: ClaudeProvider,
    private readonly openAI: OpenAIProvider,
    private readonly config: ConfigService,
  ) {
    this.defaultProvider = (config.get<string>('AI_PROVIDER', 'gemini') as ProviderName);
  }

  getProvider(name?: ProviderName): AIProvider {
    const target = name ?? this.defaultProvider;
    this.logger.log(`Using AI provider: ${target}`);

    switch (target) {
      case 'gemini':
        return this.gemini;
      case 'claude':
        return this.claude;
      case 'openai':
        return this.openAI;
      default:
        throw new Error(`Unknown AI provider: ${target}`);
    }
  }
}
