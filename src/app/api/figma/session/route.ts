// app/api/figma/session/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('figma_session')?.value; // ✅ no Promise here
  if (!raw) return NextResponse.json({ connected: false });

  try {
    const s = JSON.parse(raw);
    const connected = !!s?.at && (!s.exp || s.exp > Date.now());
    return NextResponse.json({ connected, expiresAt: s?.exp ?? null });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
