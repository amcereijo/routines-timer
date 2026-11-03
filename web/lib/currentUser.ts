import { cookies } from 'next/headers'
import { readSessionToken, SESSION_COOKIE } from './session'
import { findUser, type AppUser } from './users'

/**
 * The signed-in account of a server component (reads the session cookie).
 * Returns null when nobody is signed in or the account no longer exists.
 */
export async function getServerUser(): Promise<AppUser | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const payload = await readSessionToken(secret, token)
  if (!payload) return null
  return findUser(payload.username)
}
