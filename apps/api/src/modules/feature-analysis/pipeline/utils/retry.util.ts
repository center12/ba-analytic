import { Logger } from '@nestjs/common';

const retryLogger = new Logger('withRetry');

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 30_000,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isQuota =
        error instanceof Error &&
        (error.message.includes('429') || error.message.toLowerCase().includes('quota'));

      if (!isQuota || attempt === retries) throw error;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      retryLogger.warn(
        `Rate-limit / quota hit (attempt ${attempt}/${retries}) - waiting ${delay / 1000}s before retry. ` +
          `Error: ${error instanceof Error ? error.message.slice(0, 120) : String(error)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('unreachable');
}
