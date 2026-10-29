import { NextRequest, NextResponse } from 'next/server'
import { loginRateLimited } from '@/lib/rateLimit'
import {
  createSessionToken,
  secretsEqual,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from '@/lib/session'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD
  const secret = process.env.SESSION_SECRET
  if (!adminPassword || !secret) {
    return NextResponse.json({ error: 'Login unavailable' }, { status: 500 })
  }

  if (await loginRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  let password = ''
  try {
    const body = await req.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    password = ''
  }

  if (!password || !(await secretsEqual(password, adminPassword))) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await createSessionToken(secret)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: '/',
  })
  return res
}
