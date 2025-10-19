// Hardened Bedrock helper (always throws clean Errors, no HTML leaks)

const BEDROCK_URL =
  "https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-3-5-sonnet-20240620-v1:0/converse";

// IMPORTANT: set this in .env.local (server), no quotes or trailing spaces.
// AWS_BEARER_TOKEN_BEDROCK=eyJhbGciOiJ...
const RAW_BEARER = process.env.AWS_BEARER_TOKEN_BEDROCK || "";
const BEARER = RAW_BEARER.trim();

function requireEnv() {
  if (!BEARER) {
    throw new Error(
      "Missing AWS_BEARER_TOKEN_BEDROCK. Add it to .env.local and restart the dev server."
    );
  }
}

export function buildPrompt(brief: any) {
  return [
    "You are a senior React/TypeScript engineer.",
    "Generate a single self-contained React component from the Figma node brief below.",
    "- Use React.createElement (no JSX).",
    "- No imports. One function only.",
    "- Use Tailwind classes based on the design.",
    "",
    "Brief JSON:",
    "```json",
    JSON.stringify(brief, null, 2),
    "```",
    "",
    "Return ONLY one fenced block:",
    "```tsx",
    "// code here",
    "```",
  ].join("\n");
}

export function extractFirstCodeBlock(text: string): string {
  const re = /```(?:tsx|jsx|typescript|javascript|ts|js)?\s*([\s\S]*?)```/i;
  const m = re.exec(text);
  return (m?.[1] ?? text).trim();
}

export async function bedrockConverseRaw(prompt: string) {
  requireEnv();

  const payload = {
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 2000, temperature: 0.2, topP: 0.9 },
  };

  let res: Response;
  try {
    res = await fetch(BEDROCK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-amzn-bedrock-accept": "application/json",
        "x-amzn-bedrock-content-type": "application/json",
        Authorization: `Bearer ${BEARER}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    // Network/DNS/etc. -> throw a clean Error (caught by the API route)
    throw new Error(`Network error calling Bedrock: ${String(netErr?.message || netErr)}`);
  }

  const text = await res.text(); // read once; Bedrock returns JSON string
  if (!res.ok) {
    // Bubble up Bedrock’s JSON error message as a clean Error string
    throw new Error(`Bedrock HTTP ${res.status}: ${text}`);
  }

  // Try to parse JSON and extract content text
  try {
    const data = JSON.parse(text);
    const out =
      data?.output?.message?.content?.[0]?.text ??
      data?.output?.message?.content?.[0]?.content?.[0]?.text ??
      "";
    return String(out || "");
  } catch (parseErr: any) {
    // Unexpected shape -> return raw text so caller can see it
    throw new Error(`Bedrock response parse error: ${String(parseErr?.message || parseErr)} | RAW: ${text}`);
  }
}

export async function askBedrockForCode(brief: any): Promise<string> {
  const prompt = buildPrompt(brief);
  const raw = await bedrockConverseRaw(prompt);
  return extractFirstCodeBlock(raw);
}
