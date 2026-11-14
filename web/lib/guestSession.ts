/**
 * Anonymous guest workspaces.
 *
 * A workspace is a bearer token kept in a cookie: it identifies one
 * ephemeral routine and nothing else. It is not an account — it grants no
 * access to account data, is never listed anywhere, and cannot be recovered
 * once the guest leaves the page.
 */

import type { NextRequest } from 'next/server'

export const GUEST_COOKIE = 'rt_guest'

/** Cookie lifetime: matches the guest routine lifetime (24 h). */
export const GUEST_COOKIE_TTL_MS = 24 * 60 * 60 * 1000

const TOKEN_PATTERN = /^[0-9a-f]{64}$/

/** Cryptographically random workspace token (256 bits). */
export function generateGuestToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The workspace token of a request; null when missing or malformed. */
export function readGuestToken(req: NextRequest): string | null {
  const token = req.cookies.get(GUEST_COOKIE)?.value
  return token && TOKEN_PATTERN.test(token) ? token : null
}
