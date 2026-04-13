import { AI_CONFIG } from '../../constants/feature-analysis.constants';

const {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP,
} = AI_CONFIG;

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
    .map((section) => section.trim())
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
      continue;
    }

    flush();

    const standalone = header ? `${header}\n\n${section}` : section;
    if (standalone.length <= maxChars) {
      current = standalone;
      continue;
    }

    const headingMatch = section.match(/^(## [^\n]+)\n/);
    const sectionHeading = headingMatch ? headingMatch[1] : '';
    const sectionBody = headingMatch ? section.slice(headingMatch[0].length) : section;
    const paragraphs = sectionBody.split(/\n\n+/);
    let subChunk = header ? `${header}\n\n${sectionHeading}` : sectionHeading;

    for (const paragraph of paragraphs) {
      const next = subChunk ? `${subChunk}\n\n${paragraph}` : paragraph;
      if (next.length <= maxChars) {
        subChunk = next;
      } else {
        if (subChunk) chunks.push(subChunk.trim());
        subChunk = header
          ? `${header}\n\n${sectionHeading}\n\n${paragraph}`
          : `${sectionHeading}\n\n${paragraph}`;
      }
    }

    current = subChunk;
  }

  flush();
  return chunks.length ? chunks : [text];
}
