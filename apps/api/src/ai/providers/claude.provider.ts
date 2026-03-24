import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { anthropic } from '@ai-sdk/anthropic';
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
export class ClaudeProvider extends AIProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  readonly providerName = 'claude';
  readonly modelVersion: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.modelVersion = config.get<string>('CLAUDE_MODEL', 'claude-sonnet-4-6');
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
      model: anthropic(this.modelVersion),
      schema: TestCaseSchema,
      // Claude prompt caching: mark the large document with cache_control
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a QA engineer. Analyze the following Business Analysis document and generate comprehensive test cases.

BA Document:
${baDocumentContent}
${screenshotNote}

Generate thorough test cases covering happy paths, edge cases, and error scenarios.`,
              experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
              },
            },
          ],
        },
      ],
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
      model: anthropic(this.modelVersion),
      system:
        'You are a helpful QA assistant. Help the user understand and refine test cases based on BA documents.',
      messages,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  /**
   * Claude prompt caching is applied inline via `cache_control` on message content
   * (see generateTestCases above). This method is a no-op for Claude.
   */
  async cacheContext(_content: string): Promise<string | null> {
    this.logger.log(
      'Claude uses inline cache_control on message content. No separate caching step needed.',
    );
    return null;
  }
}
