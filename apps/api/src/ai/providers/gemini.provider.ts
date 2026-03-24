import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from '@ai-sdk/google';
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
export class GeminiProvider extends AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  readonly providerName = 'gemini';
  readonly modelVersion: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.modelVersion = config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
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
      model: google(this.modelVersion),
      schema: TestCaseSchema,
      prompt: `You are a QA engineer. Analyze the following Business Analysis document and generate comprehensive test cases.
Return a JSON object with a "testCases" array.

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
      model: google(this.modelVersion),
      system:
        'You are a helpful QA assistant. Help the user understand and refine test cases based on BA documents.',
      messages,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  /**
   * Gemini supports context caching via the `cachedContent` API.
   * This is a simplified implementation — for production use the
   * @google/generative-ai SDK's CachedContent API with a TTL.
   * Returns null here to signal no caching performed via this method.
   */
  async cacheContext(_content: string): Promise<string | null> {
    this.logger.warn(
      'Gemini context caching requires the native @google/generative-ai SDK. ' +
        'Implement using CachedContent API for production use.',
    );
    return null;
  }
}
