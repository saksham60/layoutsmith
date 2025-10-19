import { NextRequest, NextResponse } from 'next/server'

function basicAuth(id: string, secret: string) {
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  // Exchange code -> token (no PKCE)
  const body = new URLSearchParams({
    redirect_uri: process.env.FIGMA_REDIRECT_URI!, // http://localhost:3000/api/figma/callback
    code,
    grant_type: 'authorization_code',
  })

  const r = await fetch('https://api.figma.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(process.env.FIGMA_CLIENT_ID!, process.env.FIGMA_CLIENT_SECRET!),
    },
    body: body.toString(),
    cache: 'no-store',
  })

  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    return NextResponse.json({ error: 'Token exchange failed', detail }, { status: 500 })
  }

  const token = await r.json()
  const openerOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const safe = JSON.stringify(token).replace(/</g, '\\u003c')

  // Send token to opener and close popup
  const html = `<!doctype html><html><body><script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'figma:token', token: ${safe} }, '${openerOrigin}');
      }
    } catch (e) {}
    window.close();
  </script></body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
