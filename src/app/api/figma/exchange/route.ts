import { NextRequest, NextResponse } from 'next/server'

function basicAuth(id: string, secret: string) {
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

export async function POST(req: NextRequest) {
  const { code, code_verifier, redirect_uri } = await req.json()
  if (!code || !code_verifier || !redirect_uri) {
    return NextResponse.json({ error: 'Missing code/code_verifier/redirect_uri' }, { status: 400 })
  }

  // const body = new URLSearchParams({
  //   code,
  //   grant_type: 'authorization_code',
  //   redirect_uri,         // must exactly match what you used in the auth URL
  //   code_verifier,        // PKCE
  // })


const body = new URLSearchParams({
  code,
  grant_type: 'authorization_code',
  redirect_uri: process.env.FIGMA_REDIRECT_URI!,  // <— use env, not client-provided
  code_verifier,
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
    const txt = await r.text()
    return NextResponse.json({ error: 'Token exchange failed', detail: txt }, { status: 500 })
  }
  const token = await r.json() // { access_token, refresh_token, expires_in, ... }
  return NextResponse.json(token)
}
