import { getDb } from './db'

const RESOLVE_LIMIT = { limit: 10, windowMs: 60 * 1000 } // 10 attempts / min / IP
const LOGIN_LIMIT = { limit: 5, windowMs: 5 * 60 * 1000 } // 5 attempts / 5 min / IP

// Guest workspaces are anonymous, so their limits are the only thing keeping
// a single client from filling the store.
const GUEST_SESSION_MIN_LIMIT = { limit: 10, windowMs: 60 * 1000 } // 10 / min / IP
const GUEST_SESSION_DAY_LIMIT = { limit: 30, windowMs: 24 * 60 * 60 * 1000 } // 30 / day / IP
const GUEST_SAVE_LIMIT = { limit: 10, windowMs: 60 * 1000 } // 10 saves / min / IP
const GUEST_CODE_LIMIT = { limit: 10, windowMs: 60 * 1000 } // 10 codes / min / IP

/**
 * Sliding-window rate counter in SQL. Deletes stale hits, records the
 * current attempt, and reports whether the caller is now over the limit.
 * Keyed per scope + client.
 */
async function hitAndCheck(
  scope: string,
  client: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const db = await getDb()
  const now = Date.now()
  const cutoff = now - windowMs

  const [, , countRes] = await db.batch(
    [
      { sql: 'DELETE FROM rate_hits WHERE scope = ? AND client = ? AND ts < ?', args: [scope, client, cutoff] },
      { sql: 'INSERT INTO rate_hits (scope, client, ts) VALUES (?, ?, ?)', args: [scope, client, now] },
      { sql: 'SELECT COUNT(*) AS n FROM rate_hits WHERE scope = ? AND client = ?', args: [scope, client] },
    ],
    'write'
  )
  const count = Number(countRes.rows[0].n)
  return count > limit
}

/** True when the resolve attempts from this client exceed 10/min. */
export function resolveRateLimited(client: string): Promise<boolean> {
  return hitAndCheck('resolve', client, RESOLVE_LIMIT.limit, RESOLVE_LIMIT.windowMs)
}

/** True when the login attempts from this client exceed 5/5min. */
export function loginRateLimited(client: string): Promise<boolean> {
  return hitAndCheck('login', client, LOGIN_LIMIT.limit, LOGIN_LIMIT.windowMs)
}

/**
 * True when this client exceeds the guest workspace creation limits
 * (10/min and 30/day).
 */
export async function guestSessionRateLimited(client: string): Promise<boolean> {
  if (
    await hitAndCheck(
      'guest-session-min',
      client,
      GUEST_SESSION_MIN_LIMIT.limit,
      GUEST_SESSION_MIN_LIMIT.windowMs
    )
  ) {
    return true
  }
  return hitAndCheck(
    'guest-session-day',
    client,
    GUEST_SESSION_DAY_LIMIT.limit,
    GUEST_SESSION_DAY_LIMIT.windowMs
  )
}

/** True when the guest routine saves from this client exceed 10/min. */
export function guestSaveRateLimited(client: string): Promise<boolean> {
  return hitAndCheck(
    'guest-save',
    client,
    GUEST_SAVE_LIMIT.limit,
    GUEST_SAVE_LIMIT.windowMs
  )
}

/** True when the guest import codes from this client exceed 10/min. */
export function guestCodeRateLimited(client: string): Promise<boolean> {
  return hitAndCheck(
    'guest-code',
    client,
    GUEST_CODE_LIMIT.limit,
    GUEST_CODE_LIMIT.windowMs
  )
}
