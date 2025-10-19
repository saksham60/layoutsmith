export async function generateReactFromBriefs(briefs: any[], designLanguage?: string) {
  const res = await fetch('/api/llm/bedrock/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ briefs, designLanguage }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
  const j = await res.json();
  return j as { ok: true; results: { name: string; code: string }[]; raw?: string };
}
