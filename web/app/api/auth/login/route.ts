import { NextRequest, NextResponse } from 'next/server'
import { ownerKey } from '@/lib/auth'
import { loginRateLimited } from '@/lib/rateLimit'
import {
  createSessionToken,
  secretsEqual,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from '@/lib/session'
import { claimLegacyRoutines } from '@/lib/store'
import {
  findUser,
  getAuthMode,
  normalizeLoginUsername,
} from '@/lib/users'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Login unavailable' }, { status: 500 })
  }
  if (getAuthMode() === 'none') {
    return NextResponse.json({ error: 'Login unavailable' }, { status: 500 })
  }

  if (await loginRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  let username = ''
  let password = ''
  try {
    const body = await req.json()
    username = typeof body?.username === 'string' ? body.username : ''
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    username = ''
    password = ''
  }

  const user = findUser(normalizeLoginUsername(username))
  if (!user || !password || !(await secretsEqual(password, user.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createSessionToken(secret, user.username)
  // Routines saved before accounts existed are adopted by the first account
  // that signs in, so old data does not disappear.
  await claimLegacyRoutines(ownerKey(user.username))
  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, name: user.displayName, admin: user.admin },
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: '/',
  })
  return res
}
