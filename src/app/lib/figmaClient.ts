// src/app/lib/figmaClient.ts

/**
 * Minimal Figma REST client helpers for your Next.js app (client-side fetch).
 * Assumes OAuth token is stored in sessionStorage under "figma_token"
 * as { access_token, ... } (you already set this in ConnectFigmaCard).
 */

type FigmaPaint = any;
type FigmaEffect = any;
type FigmaConstraint = any;

export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: string;
  strokeDashes?: number[];
  effects?: FigmaEffect[];
  exportSettings?: any[];

  // Text node bits
  characters?: string;
  style?: any;

  // Auto layout + layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  counterAxisSpacing?: number;

  // Misc styling/geometry
  constraints?: FigmaConstraint;
  layoutGrids?: any[];
  clipContent?: boolean;
  clipsContent?: boolean;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  cornerSmoothing?: number;
  opacity?: number;
  blendMode?: string;
};

export type FigmaDocumentResponse = {
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  version?: string;
  document: FigmaNode; // the root FILE node -> PAGES -> FRAMES/COMPONENTS/etc.
};

export type FigmaComponentMeta = {
  key: string;          // file key (not node id)
  name: string;         // component name
  description?: string;
  node_id: string;      // THIS is what you pass to /nodes
  thumbnail_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

function getAccessTokenOrThrow(): string {
  if (typeof window === 'undefined') {
    throw new Error('Figma token is only available client-side');
  }
  const tokenJson = sessionStorage.getItem('figma_token');
  if (!tokenJson) {
    throw new Error('Missing Figma token in sessionStorage. Connect to Figma first.');
  }
  const token = JSON.parse(tokenJson)?.access_token;
  if (!token) {
    throw new Error('Invalid token shape in sessionStorage.figma_token');
  }
  return token;
}

async function figmaGET<T = any>(url: string): Promise<T> {
  const token = getAccessTokenOrThrow();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    const msg = body?.err || body?.message || (await res.text());
    throw new Error(`Figma GET failed ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Return full FILE document (root). Useful fallback when a file has no explicit Components.
 * GET /v1/files/:fileKey
 */
export async function getFileDocument(fileKey: string): Promise<FigmaDocumentResponse> {
  const json = await figmaGET<{ document: FigmaNode; name: string; lastModified: string; thumbnailUrl?: string; version?: string }>(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}`
  );
  return {
    name: json.name,
    lastModified: json.lastModified,
    thumbnailUrl: json.thumbnailUrl,
    version: json.version,
    document: json.document,
  };
}

/**
 * Return the flat list of Components defined in a file (if any).
 * GET /v1/files/:fileKey/components
 * NOTE: Many design files won’t define Components; they may just have Frames (screens).
 */
export async function getFigmaFileComponents(fileKey: string): Promise<FigmaComponentMeta[]> {
  const json = await figmaGET<{ meta?: { components?: any[] } }>(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/components`
  );
  const comps = json?.meta?.components || [];
  // Normalize to FigmaComponentMeta shape
  return comps.map((c: any) => ({
    key: fileKey,
    name: c.name,
    description: c.description,
    node_id: c.node_id || c.nodeId || c.nodeIdString,
    thumbnail_url: c.thumbnail_url ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));
}

/**
 * Fetch full node payloads for a set of node IDs in a file.
 * GET /v1/files/:fileKey/nodes?ids=A,B,C
 * - The response includes `nodes` map keyed by nodeId. We return an object { [id]: documentNode }.
 * - Figma handles ~300 ids per request; this helper will chunk automatically for large sets.
 */
export async function getFileNodes(fileKey: string, nodeIds: string[]): Promise<Record<string, FigmaNode>> {
  const MAX = 300;
  const out: Record<string, FigmaNode> = {};
  for (let i = 0; i < nodeIds.length; i += MAX) {
    const chunk = nodeIds.slice(i, i + MAX);
    const ids = encodeURIComponent(chunk.join(','));
    const json = await figmaGET<{ nodes: Record<string, { document: FigmaNode }> }>(
      `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${ids}`
    );
    const entries = json?.nodes || {};
    for (const [id, payload] of Object.entries(entries)) {
      if (payload?.document) out[id] = payload.document;
    }
  }
  return out;
}

/**
 * Walk the full document and collect:
 *  - top-level FRAMES (screens) that are direct children of a PAGE
 *  - any COMPONENT or COMPONENT_SET anywhere
 * This is a good fallback when /components returns empty.
 */
export function collectInterestingNodes(fileDoc: FigmaDocumentResponse): Array<{ id: string; name: string; type: string }> {
  const root = fileDoc.document;
  const results: Array<{ id: string; name: string; type: string }> = [];

  // Figma file root typically has type "DOCUMENT" with children of type "CANVAS" (pages).
  const pages = (root?.children || []).filter((n) => n.type === 'CANVAS');

  for (const page of pages) {
    // Add top-level FRAMES on the page (screens).
    const topLevel = (page.children || []);
    for (const n of topLevel) {
      if (n.visible === false) continue;
      if (n.type === 'FRAME') {
        results.push({ id: n.id, name: n.name, type: n.type });
      }
    }

    // Also collect components/component sets anywhere within the page.
    const stack = [...topLevel];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur.visible !== false) {
        if (cur.type === 'COMPONENT' || cur.type === 'COMPONENT_SET') {
          results.push({ id: cur.id, name: cur.name, type: cur.type });
        }
        if (Array.isArray(cur.children)) {
          stack.push(...cur.children);
        }
      }
    }
  }

  // De-dupe by id (in case something appears multiple times)
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return unique;
}

/* -------------------------------------------------------------------------- */
/* OPTIONAL: If you later want thumbnails of nodes for LLM-vision, add this:  */
/* -------------------------------------------------------------------------- */
// export async function getNodeImages(fileKey: string, nodeIds: string[], scale = 2): Promise<Record<string, string>> {
//   const token = getAccessTokenOrThrow();
//   const MAX = 300;
//   const urls: Record<string, string> = {};

//   for (let i = 0; i < nodeIds.length; i += MAX) {
//     const chunk = nodeIds.slice(i, i + MAX);
//    const ids = encodeURIComponent(chunk.join(','));
//     const u = `https://api.figma.com/v1/images/${encodeURIComponent(fileKey)}?ids=${ids}&format=png&scale=${scale}`;
//     const res = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
//     if (!res.ok) {
//       const t = await res.text();
//       throw new Error(`getNodeImages failed: ${res.status} ${t}`);
//     }
//     const json = await res.json();
//     Object.assign(urls, json.images || {});
//   }
//   return urls; // map: nodeId -> PNG URL
// }
