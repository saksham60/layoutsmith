// src/app/lib/figmaUrl.ts
export function extractFileKey(input: string): string | null {
  if (!input) return null;
  // Accept raw key
  if (/^[A-Za-z0-9_-]{10,}$/.test(input)) return input;

  try {
    const url = new URL(input);
    // /design/:fileKey or /file/:fileKey
    const parts = url.pathname.split('/').filter(Boolean);
    const ix = parts.findIndex(p => p === 'design' || p === 'file');
    if (ix >= 0 && parts[ix + 1]) return parts[ix + 1];
  } catch {
    // not a URL
  }
  return null;
}


