import { ChatMessageRole } from '@prisma/client';

export interface TestCaseStep {
  action: string;
  expectedResult: string;
}

export interface GeneratedTestCase {
  title: string;
  description: string;
  preconditions: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TestCaseStep[];
}

export interface ChatHistoryItem {
  role: ChatMessageRole;
  content: string;
}

/**
 * Abstract base class for all AI providers.
 * Concrete implementations: GeminiProvider, ClaudeProvider, OpenAIProvider.
 */
export abstract class AIProvider {
  abstract readonly providerName: string;
  abstract readonly modelVersion: string;

  /**
   * Analyze a BA document (text content) and optional screenshot file paths,
   * then return a list of generated test cases as structured JSON.
   */
  abstract generateTestCases(
    baDocumentContent: string,
    screenshotPaths: string[],
  ): Promise<GeneratedTestCase[]>;

  /**
   * Stream a chat response given prior history and a new user message.
   * Yields text chunks as they arrive from the provider.
   */
  abstract chat(
    history: ChatHistoryItem[],
    userMessage: string,
  ): AsyncIterable<string>;

  /**
   * Optionally cache a large context (e.g. BA document) with the provider
   * to reduce token costs on repeated calls.
   *
   * Returns a cache key/ID if the provider supports caching, or null otherwise.
   * Callers should store the cache key and pass it back via the concrete provider
   * if they want to reuse the cached context.
   */
  abstract cacheContext(content: string): Promise<string | null>;
}
