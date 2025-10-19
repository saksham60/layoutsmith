// src/app/lib/figmaLLMPayload.ts
import { nodeToLLMSummary, summarizeChildren } from './figmaSummarize';

// Get token from sessionStorage (client) or inject from server-side
export function getBearer(): string {
  const raw = typeof window !== 'undefined' ? sessionStorage.getItem('figma_token') : null;
  if (!raw) throw new Error('No Figma token in sessionStorage. Connect first.');
  const tok = JSON.parse(raw || '{}');
  return tok?.access_token;
}

async function fetchNodes(fileKey: string, ids: string[]): Promise<Record<string, any>> {
  const token = getBearer();
  // Figma allows many IDs, but keep batches reasonable (e.g. 50–100)
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 60) batches.push(ids.slice(i, i + 60));

  const out: Record<string, any> = {};
  for (const b of batches) {
    const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(b.join(','))}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.nodes) Object.assign(out, json.nodes);
  }
  return out;
}

/**
 * Given fileKey and the array returned by your getFigmaFileComponents(fileKey)
 * (each item should at least have {node_id, name}), produce an LLM-friendly
 * payload and log it to the console (plus per-component logs).
 */
export async function logLLMComponentPayload(
  fileKey: string,
  components: Array<{ node_id: string; name?: string }>
) {
  const ids = components.map(c => c.node_id);
  const nodeMap = await fetchNodes(fileKey, ids);

  const payload = components.map(c => {
    const doc = nodeMap[c.node_id]?.document;
    if (!doc) {
      return { nodeId: c.node_id, name: c.name ?? null, error: 'Missing node in response' };
    }

    const summary = nodeToLLMSummary(doc);
    const childrenBrief = summarizeChildren(doc.children, 30);

    return {
      nodeId: c.node_id,
      name: c.name ?? doc.name,
      summary,
      childrenBrief, // small list describing the immediate children
      // (Optional) include raw node if you want — but it can be very large:
      // raw: doc
    };
  });

  // Big payload for your LLM
  // (You can send this to your API, save to file, etc.)
  console.log('🧠 LLM PAYLOAD (all components):', payload);

  // Also log each component separately for quick debugging
  for (const item of payload) {
    console.log(`🧩 Component: ${item.name} (${item.nodeId})`, item);
  }

  return payload;
}
