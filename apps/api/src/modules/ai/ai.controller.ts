import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SUPPORTED_MODELS } from './ai.constants';
import { AIProviderInfoDto } from './dto/ai-provider-info.dto';

const PROVIDER_CATALOG: Omit<AIProviderInfoDto, 'models'>[] = [
  { provider: 'gemini', label: 'Google Gemini' },
  { provider: 'claude', label: 'Anthropic Claude' },
  { provider: 'openai', label: 'OpenAI' },
];

const KEY_MAP: Record<string, string> = {
  gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

@ApiTags('AI')
@Controller('ai')
export class AIController {
  constructor(private readonly config: ConfigService) {}

  /** GET /api/ai/providers — returns only providers with a configured API key, each with their supported models */
  @ApiOperation({ summary: 'List configured AI providers and supported models' })
  @ApiOkResponse({ description: 'Configured AI providers returned.', type: AIProviderInfoDto, isArray: true })
  @Get('providers')
  getAvailableProviders(): AIProviderInfoDto[] {
    return PROVIDER_CATALOG
      .filter((p) => !!this.config.get<string>(KEY_MAP[p.provider])?.trim())
      .map((p) => ({
        ...p,
        models: SUPPORTED_MODELS[p.provider as keyof typeof SUPPORTED_MODELS] ?? [],
      }));
  }
}
