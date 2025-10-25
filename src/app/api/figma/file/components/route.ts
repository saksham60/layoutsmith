import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized(msg = 'Unauthorized') {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // one route, 3 behaviors
  const kind = (sp.get('kind') || 'components').toLowerCase(); // 'components' | 'document' | 'nodes'
  const fileKey = sp.get('fileKey');
  if (!fileKey) return NextResponse.json({ error: 'Missing fileKey' }, { status: 400 });

  const raw = req.cookies.get('figma_session')?.value;
  if (!raw) return unauthorized();

  let at: string | undefined, exp: number | undefined;
  try {
    const s = JSON.parse(raw);
    at = s.at;
    exp = s.exp;
  } catch {
    return unauthorized('Bad session cookie');
  }
  if (!at) return unauthorized('Missing access token');
  if (typeof exp === 'number' && exp <= Date.now()) return unauthorized('Session expired');

  let upstreamUrl: string;
  switch (kind) {
    case 'components':
      upstreamUrl = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/components`;
      break;
    case 'document':
      upstreamUrl = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}`;
      break;
    case 'nodes': {
      const ids = sp.get('ids');
      if (!ids) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
      upstreamUrl = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(ids)}`;
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown kind: ${kind}` }, { status: 400 });
  }

  const upstream = await fetch(upstreamUrl, {
    headers: { Authorization: `Bearer ${at}` },
    cache: 'no-store',
  });

  const text = await upstream.text();
  const contentType = upstream.headers.get('content-type') || 'application/json';

  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'content-type': contentType },
    });
  }

  // Normalize responses where it helps the client
  if (kind === 'components') {
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    const components = data?.components ?? data?.meta?.components ?? [];
    return NextResponse.json({ components });
  }

  if (kind === 'nodes') {
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    const normalized: Record<string, any> = {};
    for (const [id, v] of Object.entries<any>(data?.nodes ?? {})) {
      normalized[id] = v?.document ?? v ?? null;
    }
    return NextResponse.json({ nodes: normalized });
  }

  // kind === 'document' → proxy as-is
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': contentType },
  });
}
