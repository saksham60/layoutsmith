// app/api/figma/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'figma_session';
const COOKIE_HINT = 'figma_connected'; // non-httpOnly, optional for client gating

function basicAuth(id: string, secret: string) {
  // Works in Node; if you later move to edge, swap to btoa fallback.
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  // Exchange code -> token
  const body = new URLSearchParams({
    redirect_uri: process.env.FIGMA_REDIRECT_URI!, // e.g. https://your.app/api/figma/callback
    code,
    grant_type: 'authorization_code',
  });

  const r = await fetch('https://api.figma.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(process.env.FIGMA_CLIENT_ID!, process.env.FIGMA_CLIENT_SECRET!),
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return NextResponse.json({ error: 'Token exchange failed', detail }, { status: 500 });
  }

  const token = await r.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number; // seconds
    [k: string]: any;
  };

  // Build a minimal session (keep cookie under 4KB)
  const session = {
    at: token.access_token,
    rt: token.refresh_token ?? null,
    exp: Date.now() + token.expires_in * 1000,
  };

  const openerOrigin = process.env.NEXT_PUBLIC_APP_URL || `${url.origin}`;
  const res = new NextResponse(
    // keep your popup close + postMessage
    `<!doctype html><html><body><script>
      try {
        if (window.opener) {
          window.opener.postMessage({ type: 'figma:connected' }, '${openerOrigin}');
        }
      } catch (e) {}
      window.close();
    </script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

  // httpOnly cookie for the real session (server-readable, client JS cannot read)
  res.cookies.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days (you can shorten)
  });

  // Optional: a tiny non-httpOnly hint cookie so client can instantly gate UI
  res.cookies.set(COOKIE_HINT, '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}