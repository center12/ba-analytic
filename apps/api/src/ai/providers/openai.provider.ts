import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ai-sdk/openai';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import {
  AIProvider,
  ChatHistoryItem,
  GeneratedTestCase,
} from '../ai-provider.abstract';

const TestCaseSchema = z.object({
  testCases: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      preconditions: z.string(),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      steps: z.array(
        z.object({
          action: z.string(),
          expectedResult: z.string(),
        }),
      ),
    }),
  ),
});

@Injectable()
export class OpenAIProvider extends AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  readonly providerName = 'openai';
  readonly modelVersion: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.modelVersion = config.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  async generateTestCases(
    baDocumentContent: string,
    screenshotPaths: string[],
  ): Promise<GeneratedTestCase[]> {
    const screenshotNote =
      screenshotPaths.length > 0
        ? `\n\nDesign screenshots are available at: ${screenshotPaths.join(', ')}`
        : '';

    const { object } = await generateObject({
      model: openai(this.modelVersion),
      schema: TestCaseSchema,
      prompt: `You are a QA engineer. Analyze the following Business Analysis document and generate comprehensive test cases.

BA Document:
${baDocumentContent}
${screenshotNote}

Generate thorough test cases covering happy paths, edge cases, and error scenarios.`,
    });

    return object.testCases as GeneratedTestCase[];
  }

  async *chat(
    history: ChatHistoryItem[],
    userMessage: string,
  ): AsyncIterable<string> {
    const messages = [
      ...history.map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const result = streamText({
      model: openai(this.modelVersion),
      system:
        'You are a helpful QA assistant. Help the user understand and refine test cases based on BA documents.',
      messages,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  /**
   * OpenAI does not have an explicit context caching API equivalent to Gemini/Claude.
   * Prompt caching is handled automatically by the API for repeated prefixes.
   */
  async cacheContext(_content: string): Promise<string | null> {
    this.logger.log('OpenAI handles prompt caching automatically — no explicit caching needed.');
    return null;
  }
}
