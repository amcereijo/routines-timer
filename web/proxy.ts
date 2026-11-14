import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/users',
  '/api/routines/resolve',
  '/guest',
])

/** Public share pages (`/r/<token>`) and the anonymous guest flow. */
const PUBLIC_PREFIXES = ['/r/', '/guest/', '/api/guest/']

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const secret = process.env.SESSION_SECRET
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const authenticated = !!secret && (await verifySessionToken(secret, token))

  if (isPublic(pathname)) {
    // Already signed-in operators skip the login page.
    if (pathname === '/login' && authenticated) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (!authenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Remember where the user was heading (e.g. the routine builder opened
    // from the watch QR code) so the login can send them back there.
    const login = new URL('/login', req.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}
