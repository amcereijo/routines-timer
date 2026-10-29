import { getDb } from './db'

const RESOLVE_LIMIT = { limit: 10, windowMs: 60 * 1000 } // 10 attempts / min / IP
const LOGIN_LIMIT = { limit: 5, windowMs: 5 * 60 * 1000 } // 5 attempts / 5 min / IP

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
