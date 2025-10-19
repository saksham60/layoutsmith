import { NextRequest, NextResponse } from 'next/server'

function b64url(ab: ArrayBuffer | Uint8Array) {
  const b = Buffer.from(ab as ArrayBuffer)
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'')
}
async function makePkce() {
  const rand = new Uint8Array(32)
  crypto.getRandomValues(rand)
  const verifier = b64url(rand)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = b64url(digest)
  return { verifier, challenge }
}

export async function GET(_req: NextRequest) {
  const { verifier, challenge } = await makePkce()
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: process.env.FIGMA_CLIENT_ID!,
    redirect_uri: process.env.FIGMA_REDIRECT_URI!, // http://localhost:3000/api/figma/callback
    response_type: 'code',
    scope: 'current_user:read projects:read file_content:read file_metadata:read file_versions:read file_comments:read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  const res = NextResponse.redirect(`https://www.figma.com/oauth?${params.toString()}`)

  // ⬇️ these two MUST be present in the 302 response headers as Set-Cookie:
  res.cookies.set('figma_oauth_state', state, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 600,
  })
  res.cookies.set('figma_pkce_verifier', verifier, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 600,
  })

  return res
}
