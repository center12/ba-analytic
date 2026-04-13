import { readFile } from 'fs/promises';

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
    .map((line) => line.trimEnd())
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
