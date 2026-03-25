import { Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AIProviderFactory } from './ai-provider.factory';
import { AIController } from './ai.controller';

@Module({
  controllers: [AIController],
  providers: [GeminiProvider, ClaudeProvider, OpenAIProvider, AIProviderFactory],
  exports: [AIProviderFactory],
})
export class AIModule {}
