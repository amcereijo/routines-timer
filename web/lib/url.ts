import type { NextRequest } from 'next/server'

/**
 * Absolute origin of the incoming request.
 *
 * On Vercel the app runs behind a proxy, so the public scheme and host come
 * from `x-forwarded-proto` / `x-forwarded-host`; the request URL is used as
 * the fallback (local development, direct hits).
 */
export function requestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost?.split(',')[0]?.trim() || req.headers.get('host')
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto =
    forwardedProto || (req.nextUrl.protocol === 'https:' ? 'https' : 'http')
  if (host) return `${proto}://${host}`
  return req.nextUrl.origin
}

/** Absolute URL of a public share page. */
export function shareUrl(req: NextRequest, token: string): string {
  return new URL(`/r/${token}`, requestOrigin(req)).toString()
}
