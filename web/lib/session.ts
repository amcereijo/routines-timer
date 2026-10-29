/**
 * Single-operator session: HMAC-SHA256 signed token of the form
 * `<expiryMs>.<hexSignature>`, carried in an HttpOnly cookie.
 * Built on Web Crypto so it runs in both Node routes and the edge proxy.
 */

export const SESSION_COOKIE = 'rt_session'
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 h

const encoder = new TextEncoder()

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

export async function createSessionToken(secret: string): Promise<string> {
  const expiry = String(Date.now() + SESSION_TTL_MS)
  const signature = await hmacHex(secret, expiry)
  return `${expiry}.${signature}`
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined
): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expiry = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!/^\d+$/.test(expiry) || !/^[0-9a-f]{64}$/.test(signature)) return false
  if (Number(expiry) <= Date.now()) return false
  const expected = await hmacHex(secret, expiry)
  return safeEqual(signature, expected)
}
