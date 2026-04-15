import { getStorageUrl } from '@/lib/api';

function hasProtocol(src: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(src);
}

export function resolveMarkdownAssetUrl(src: string | undefined | null): string | undefined {
  if (!src) return undefined;
  if (hasProtocol(src) || src.startsWith('//') || src.startsWith('/')) return src;
  return getStorageUrl(src);
}
