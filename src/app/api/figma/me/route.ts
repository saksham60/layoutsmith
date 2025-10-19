// src/app/api/figma/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getFigmaSessionFromRequest } from '@/app/lib/session'

export async function GET(req: NextRequest) {
  const sess = await getFigmaSessionFromRequest(req)
  if (!sess) return NextResponse.json({ connected: false }, { status: 200 })

  const r = await fetch('https://api.figma.com/v1/me', {
    headers: { Authorization: `Bearer ${sess.access_token}` },
    cache: 'no-store',
  })
  const ok = r.ok ? await r.json() : null
  return NextResponse.json({ connected: !!ok, me: ok ?? null })
}
