// src/app/lib/figmaClient.ts
// Cookie-safe client helpers that call your server proxies.
// No sessionStorage, no tokens in the browser.

class UnauthorizedError extends Error {}

async function fetchJSON(url: string) {
  const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!r.ok) {
    const msg = data?.error || data?.message || data?.raw || r.statusText;
    if (r.status === 401) throw new UnauthorizedError(msg);
    throw new Error(`(${r.status}) ${msg}`);
  }
  return data;
}

/** Components in a file */
export async function getFigmaFileComponents(fileKey: string) {
  const data = await fetchJSON(
    `/api/figma/file/components?fileKey=${encodeURIComponent(fileKey)}`
  );
  // Normalized by the proxy to { components: [...] }
  return (data?.components ?? []) as Array<{ node_id: string; name: string; type?: string }>;
}

/** Whole file document */
export async function getFileDocument(fileKey: string) {
  return await fetchJSON(
    `/api/figma/file/document?fileKey=${encodeURIComponent(fileKey)}`
  );
}

/** Specific nodes by id in a file */
export async function getFileNodes(fileKey: string, ids: string[]) {
  const url = `/api/figma/file/nodes?fileKey=${encodeURIComponent(fileKey)}&ids=${encodeURIComponent(ids.join(','))}`;
  const data = await fetchJSON(url);
  // Normalized by the proxy to { nodes: { [id]: <document node> } }
  return (data?.nodes ?? {}) as Record<string, any>;
}

/** Utility: pick interesting nodes (frames, components, sets) from a document */
export function collectInterestingNodes(doc: any): Array<{ id: string; name: string; type: string }> {
  const out: Array<{ id: string; name: string; type: string }> = [];
  const stack = Array.isArray(doc?.document?.children) ? [...doc.document.children] : [];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (['FRAME', 'SECTION', 'COMPONENT_SET', 'COMPONENT'].includes(n.type)) {
      out.push({ id: n.id, name: n.name, type: n.type });
    }
    if (Array.isArray(n.children)) stack.push(...n.children);
  }
  return out;
}
