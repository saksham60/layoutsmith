import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('figma_session')?.value;
  if (!raw) return NextResponse.json({ ok: false, reason: 'no_cookie' }, { status: 200 });

  let at: string | undefined;
  try { at = JSON.parse(raw).at; } catch {}
  if (!at) return NextResponse.json({ ok: false, reason: 'bad_cookie' }, { status: 200 });

  const r = await fetch('https://api.figma.com/v1/me', {
    headers: { Authorization: `Bearer ${at}` },
    cache: 'no-store',
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
  });
}
