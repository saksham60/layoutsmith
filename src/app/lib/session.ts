import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'figma_session'
const SECRET = new TextEncoder().encode(process.env.FIGMA_COOKIE_SECRET)

export type FigmaSession = {
  access_token: string
  refresh_token?: string
  expires_at: number // epoch seconds
}

/**
 * Build the session cookie fields. Call `res.cookies.set(...)` in your route.
 */
export async function buildSessionCookie(sess: FigmaSession) {
  const token = await new SignJWT(sess)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)

  return {
    name: COOKIE,
    value: token,
    options: {
      httpOnly: true as const,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    },
  }
}

/**
 * Read session from a NextRequest (recommended inside route handlers).
 */
export async function getFigmaSessionFromRequest(req: NextRequest): Promise<FigmaSession | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as FigmaSession
  } catch {
    return null
  }
}

/**
 * Verify a raw token string (useful in middleware or edge code if needed).
 */
export async function parseFigmaSession(token: string | undefined): Promise<FigmaSession | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as FigmaSession
  } catch {
    return null
  }
}

/**
 * Clear cookie on a NextResponse (do NOT use cookies().set()).
 */
export function clearSessionOnResponse(res: NextResponse) {
  res.cookies.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}
