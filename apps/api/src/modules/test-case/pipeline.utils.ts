import { readFile } from 'fs/promises';
import { Logger } from '@nestjs/common';
import {
  CombinedExtraction,
  ExtractedBehaviors,
  ExtractedRequirements,
} from '../ai/ai-provider.abstract';
import { AI_CONFIG } from './constants';

const {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP,
  MAX_FEATURES,
  MAX_RULES,
  MAX_CRITERIA,
  MAX_ENTITIES,
  MAX_ACTORS,
  MAX_ACTIONS,
  MAX_BEH_RULES,
} = AI_CONFIG;

const retryLogger = new Logger('withRetry');

/**
 * Read a BA document file and return clean, LLM-safe text.
 */
export async function readDocumentContent(filePath: string): Promise<string> {
  const buf = await readFile(filePath);

  let text: string;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    text = buf.subarray(3).toString('utf-8');
  } else if (buf[0] === 0xff && buf[1] === 0xfe) {
    text = buf.subarray(2).toString('utf16le');
  } else if (buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buf.length - 2);
    for (let i = 2; i < buf.length - 1; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    text = swapped.toString('utf16le');
  } else {
    const utf8 = buf.toString('utf-8');
    text = utf8.includes('\ufffd') ? buf.toString('latin1') : utf8;
  }

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();

  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /you\s+are\s+now\s+(?:a|an)\s+/gi,
    /act\s+as\s+(?:a|an)\s+/gi,
    /new\s+system\s+prompt\s*:/gi,
    /\[system\]/gi,
    /<\s*system\s*>/gi,
    /#{1,6}\s*system\s*$/gim,
  ];
  for (const pattern of injectionPatterns) {
    text = text.replace(pattern, (match) => `[REDACTED: ${match.slice(0, 20)}...]`);
  }

  return text;
}

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function chunkText(
  text: string,
  maxChars = CHUNK_MAX_CHARS,
  overlap = CHUNK_OVERLAP,
): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n', end);
      if (breakAt > start) end = breakAt;
    }
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }
  return chunks;
}

export function chunkMarkdown(text: string, maxChars = CHUNK_MAX_CHARS): string[] {
  const lines = text.split('\n');
  let header = '';
  let bodyStart = 0;
  if (lines[0]?.startsWith('# ')) {
    header = lines[0];
    bodyStart = 1;
  }
  const body = lines.slice(bodyStart).join('\n');

  const rawSections = body
    .split(/(?=^## )/m)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawSections.length === 0) return chunkText(text, maxChars);

  const chunks: string[] = [];
  let current = header;

  const flush = () => {
    if (current && current !== header) {
      chunks.push(current.trim());
      current = header;
    }
  };

  for (const section of rawSections) {
    const candidate = current ? `${current}\n\n${section}` : section;

    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      flush();

      const standalone = header ? `${header}\n\n${section}` : section;
      if (standalone.length <= maxChars) {
        current = standalone;
      } else {
        const headingMatch = section.match(/^(## [^\n]+)\n/);
        const sectionHeading = headingMatch ? headingMatch[1] : '';
        const sectionBody = headingMatch ? section.slice(headingMatch[0].length) : section;
        const paragraphs = sectionBody.split(/\n\n+/);
        let subChunk = header ? `${header}\n\n${sectionHeading}` : sectionHeading;
        for (const para of paragraphs) {
          const next = subChunk ? `${subChunk}\n\n${para}` : para;
          if (next.length <= maxChars) {
            subChunk = next;
          } else {
            if (subChunk) chunks.push(subChunk.trim());
            subChunk = header
              ? `${header}\n\n${sectionHeading}\n\n${para}`
              : `${sectionHeading}\n\n${para}`;
          }
        }
        current = subChunk;
      }
    }
  }
  flush();
  return chunks.length ? chunks : [text];
}

export function mergeExtractions(extractions: CombinedExtraction[]): CombinedExtraction {
  const dedup = (arr: string[]) => [...new Set(arr)];
  return {
    requirements: {
      features: dedup(extractions.flatMap((e) => e.requirements.features)).slice(0, MAX_FEATURES),
      businessRules: dedup(extractions.flatMap((e) => e.requirements.businessRules)).slice(0, MAX_RULES),
      acceptanceCriteria: dedup(extractions.flatMap((e) => e.requirements.acceptanceCriteria)).slice(0, MAX_CRITERIA),
      entities: dedup(extractions.flatMap((e) => e.requirements.entities)).slice(0, MAX_ENTITIES),
    },
    behaviors: {
      feature: extractions[0].behaviors.feature,
      actors: dedup(extractions.flatMap((e) => e.behaviors.actors)).slice(0, MAX_ACTORS),
      actions: dedup(extractions.flatMap((e) => e.behaviors.actions)).slice(0, MAX_ACTIONS),
      rules: dedup(extractions.flatMap((e) => e.behaviors.rules)).slice(0, MAX_BEH_RULES),
    },
  };
}

export function compressForDownstream(
  req: ExtractedRequirements,
  beh: ExtractedBehaviors,
): { req: ExtractedRequirements; beh: ExtractedBehaviors } {
  return {
    req: {
      features: req.features.slice(0, MAX_FEATURES),
      businessRules: req.businessRules.slice(0, MAX_RULES),
      acceptanceCriteria: req.acceptanceCriteria.slice(0, MAX_CRITERIA),
      entities: req.entities.slice(0, MAX_ENTITIES),
    },
    beh: {
      feature: beh.feature,
      actors: beh.actors.slice(0, MAX_ACTORS),
      actions: beh.actions.slice(0, MAX_ACTIONS),
      rules: beh.rules.slice(0, MAX_BEH_RULES),
    },
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 30_000,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isQuota =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('quota'));
      if (!isQuota || attempt === retries) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      retryLogger.warn(
        `Rate-limit / quota hit (attempt ${attempt}/${retries}) - waiting ${delay / 1000}s before retry. ` +
          `Error: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
