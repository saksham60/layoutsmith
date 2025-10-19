export async function askBedrockForCode(brief: any): Promise<string> {
  const res = await fetch('/api/llm/bedrock/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief }),
  });

  // Read text first so you see plain errors (not HTML) when something fails
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Bedrock API error (${res.status}): ${text}`);
  }
  try {
    const j = JSON.parse(text);
    return j.code as string;
  } catch {
    throw new Error(`Bedrock API returned non-JSON: ${text}`);
  }
}
