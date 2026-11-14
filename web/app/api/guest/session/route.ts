import { NextRequest, NextResponse } from 'next/server'
import {
  generateGuestToken,
  GUEST_COOKIE,
  GUEST_COOKIE_TTL_MS,
} from '@/lib/guestSession'
import { guestSessionRateLimited } from '@/lib/rateLimit'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * Start an anonymous guest workspace (spec: web-guest-routines).
 *
 * No account and no credentials: the workspace holds exactly one ephemeral
 * routine and nothing else.
 */
export async function POST(req: NextRequest) {
  if (await guestSessionRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const token = generateGuestToken()
  const res = NextResponse.json({
    ok: true,
    expiresAt: Date.now() + GUEST_COOKIE_TTL_MS,
  })
  res.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(GUEST_COOKIE_TTL_MS / 1000),
    path: '/',
  })
  return res
}
