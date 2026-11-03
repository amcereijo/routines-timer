/**
 * Request-level authentication helpers.
 *
 * The proxy (`proxy.ts`) is the coarse guard; these helpers resolve *who* the
 * caller is so route handlers can scope data per account.
 */

import type { NextRequest } from 'next/server'
import { readSessionToken, SESSION_COOKIE } from './session'
import { findUser, normalizeLoginUsername, type AppUser } from './users'

/**
 * Resolve the signed-in user for a request.
 *
 * Returns null when there is no valid session, when `SESSION_SECRET` is not
 * configured, or when the account behind the session no longer exists (so
 * removing a user from `AUTH_USERS` logs them out immediately).
 */
export async function getRequestUser(
  req: NextRequest
): Promise<AppUser | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const payload = await readSessionToken(secret, token)
  if (!payload) return null

  return findUser(payload.username)
}

/** True when the user owns the routine or is an administrator. */
export function canAccessOwnedResource(
  user: AppUser | null,
  owner: string
): boolean {
  if (!user) return false
  if (user.admin) return true
  return user.username.toLowerCase() === owner.toLowerCase()
}

/** Owner value stored on routines: the username, lowercased for comparisons. */
export function ownerKey(username: string): string {
  return username.trim().toLowerCase()
}

/** Canonical username used when storing ownership. */
export function canonicalUsername(username: string): string {
  const user = findUser(normalizeLoginUsername(username))
  return user ? ownerKey(user.username) : ownerKey(username)
}
