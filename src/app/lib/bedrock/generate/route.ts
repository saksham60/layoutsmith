// src/app/api/llm/bedrock/generate/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Minimal single-file Bedrock caller.
 * - No extra imports or zod
 * - Hardwired to us-east-1 converse endpoint (the one you verified via cURL)
 * - Returns a flat { ok, code } so the client can just use `data.code`
 */

const MODEL_ID = process.env.BEDROCK_MODEL_ID || '';
const BEARER   = process.env.AWS_BEARER_TOKEN_BEDROCK || '';

function assertEnv() {
  if (!MODEL_ID) throw new Error('BEDROCK_MODEL_ID missing');
  if (!BEARER)   throw new Error('AWS_BEARER_TOKEN_BEDROCK missing');
}

/** Build a concise prompt from the Figma brief */
function buildPromptFromBrief(brief: any): string {
  return `
You are a senior frontend engineer. Generate a single self-contained React component
using React.createElement (no JSX), Tailwind classes, and NO imports. Exactly one function.

Design brief (JSON):
${JSON.stringify(brief, null, 2)}

Strict output rules:
- Return ONLY one fenced code block like:
\`\`\`tsx
function ComponentName() {
  // ...
}

Example 
function Button() {
  return React.createElement(
    'button',
    { 
      className: 'px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition w-full text-white'
    },
    'Click me'
  );
}

\`\`\`



`.trim();
}

/** Extract the first fenced code block from model text */
function extractFirstCodeBlock(text: string): string {
  const m = /```(?:tsx|jsx|ts|js|javascript|react)?\s*([\s\S]*?)```/i.exec(text);
  return (m?.[1] ?? text).trim();
}

/** Safe way to read Bedrock's text block */
function readBedrockText(json: any): string {
  // Expected shape:
  // { output: { message: { content: [ { text: "..." } ] } } }
  const blocks = json?.output?.message?.content;
  if (Array.isArray(blocks)) {
    const firstText = blocks.find((b: any) => typeof b?.text === 'string')?.text;
    if (firstText) return firstText;
  }
  // Fallbacks if model shape ever differs
  return json?.output?.text ?? json?.text ?? '';
}

/** POST /api/llm/bedrock/generate */
export async function POST(req: Request) {
  try {
    assertEnv();

    const body = await req.json().catch(() => ({}));
    const brief = body?.brief;
    if (!brief) {
      return NextResponse.json({ ok: false, error: 'Missing brief' }, { status: 400 });
    }

    // Use the working us-east-1 runtime path you confirmed via curl
    const url = `https://bedrock-runtime.us-east-1.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/converse`;

    const payload = {
      messages: [{ role: 'user', content: [{ text: buildPromptFromBrief(brief) }] }],
      inferenceConfig: { maxTokens: 2000, temperature: 0.2, topP: 0.9 },
    };

    // Debug crumbs (safe)
    console.log('[bedrock] →', url);
    console.log('[bedrock] model:', MODEL_ID);
    console.log('[bedrock] bearer fp:', `${BEARER.slice(0, 6)}…${BEARER.slice(-4)}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${BEARER}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      console.error('[bedrock] HTTP error', res.status, errTxt);
      return NextResponse.json(
        { ok: false, error: `Bedrock HTTP ${res.status}: ${errTxt}` },
        { status: 500 }
      );
    }

    const json = await res.json();
    const rawText = readBedrockText(json);
    const code = extractFirstCodeBlock(rawText);

    // Return flat payload so the client can do: data.code
    return NextResponse.json({
      ok: true,
      code,            // ← your editor should pick THIS
      // debug fields if you want them:
      // model: MODEL_ID,
      // rawText,
      // raw: json,
    });
  } catch (err: any) {
    console.error('[bedrock] exception', err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
