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

  getProvider(name?: ProviderName, model?: string): AIProvider {
    const target = name ?? this.defaultProvider;
    this.logger.log(`Using AI provider: ${target}${model ? ` (model: ${model})` : ''}`);

    let provider: AIProvider;
    switch (target) {
      case 'gemini':
        provider = this.gemini;
        break;
      case 'claude':
        provider = this.claude;
        break;
      case 'openai':
        provider = this.openAI;
        break;
      default:
        throw new Error(`Unknown AI provider: ${target}`);
    }

    return model ? provider.withModel(model) : provider;
  }
}
