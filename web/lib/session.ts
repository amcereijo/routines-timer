/**
 * Signed session tokens.
 *
 * Format: `<expiryMs>.<base64url(username)>.<hexSignature>`
 *
 * The signature is an HMAC-SHA256 over `<expiryMs>.<base64url(username)>`, so
 * the username cannot be swapped without invalidating the token. Built on Web
 * Crypto so it runs in both Node route handlers and the edge proxy.
 */

import { decodeBase64Url, encodeBase64Url } from './base64'

export const SESSION_COOKIE = 'rt_session'
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 h

const encoder = new TextEncoder()

export interface SessionPayload {
  username: string
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison for equal-length strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Hex digest of a string (used for constant-time password comparison). */
export async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(message))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison of two strings via their SHA-256 hex digests. */
export async function secretsEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)])
  return safeEqual(ha, hb)
}

export async function createSessionToken(
  secret: string,
  username: string
): Promise<string> {
  const expiry = String(Date.now() + SESSION_TTL_MS)
  const user = encodeBase64Url(username)
  const signature = await hmacHex(secret, `${expiry}.${user}`)
  return `${expiry}.${user}.${signature}`
}

/**
 * Verify a session token and return its payload, or null when the token is
 * missing, malformed, tampered with, or expired.
 */
export async function readSessionToken(
  secret: string,
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [expiry, user, signature] = parts
  if (!/^\d+$/.test(expiry)) return null
  if (!/^[0-9a-f]{64}$/.test(signature)) return null
  if (Number(expiry) <= Date.now()) return null

  const expected = await hmacHex(secret, `${expiry}.${user}`)
  if (!safeEqual(signature, expected)) return null

  const username = decodeBase64Url(user)
  if (!username) return null
  return { username }
}

/** True when the token is a valid, unexpired session. */
export async function verifySessionToken(
  secret: string,
  token: string | undefined
): Promise<boolean> {
  return (await readSessionToken(secret, token)) !== null
}
