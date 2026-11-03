/**
 * Operator accounts.
 *
 * There is no user database: the accounts live in a single JSON environment
 * variable so the app can be deployed to Vercel without extra services.
 *
 *   AUTH_USERS='[
 *     {"username":"angel","password":"s3cret","name":"Angel","admin":true},
 *     {"username":"sam","password":"hunter2","name":"Sam"}
 *   ]'
 *
 * The object form is accepted as well:
 *
 *   AUTH_USERS='{"angel":{"password":"s3cret","admin":true},"sam":"hunter2"}'
 *
 * Legacy fallback: when `AUTH_USERS` is absent but `ADMIN_PASSWORD` is set, a
 * single operator named `admin` is configured (see LEGACY_USERNAME).
 */

export interface AppUser {
  username: string
  password: string
  displayName: string
  admin: boolean
}

export type AuthMode = 'users' | 'legacy' | 'none'

/** Usernames are used in URLs and cookies, so keep them boring. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,32}$/

/** Username of the single operator configured through `ADMIN_PASSWORD`. */
export const LEGACY_USERNAME = 'admin'

interface AuthConfig {
  mode: AuthMode
  users: AppUser[]
}

let cached: AuthConfig | null = null

function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePassword(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeDisplayName(value: unknown, username: string): string {
  const name = typeof value === 'string' ? value.trim() : ''
  return name || username
}

function isAdmin(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'string') return value.toLowerCase() === 'admin'
  return false
}

function makeUser(
  username: string,
  password: string,
  displayName: unknown,
  admin: unknown
): AppUser | null {
  if (!USERNAME_PATTERN.test(username)) return null
  if (!password) return null
  return {
    username,
    password,
    displayName: normalizeDisplayName(displayName, username),
    admin: isAdmin(admin),
  }
}

/** Parse the `AUTH_USERS` JSON (array or object form) into a user list. */
export function parseUsersJson(raw: string): AppUser[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const users: AppUser[] = []
  const seen = new Set<string>()

  const add = (user: AppUser | null) => {
    if (!user || seen.has(user.username)) return
    seen.add(user.username)
    users.push(user)
  }

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue
      const o = entry as Record<string, unknown>
      add(
        makeUser(
          normalizeUsername(o.username ?? o.user),
          normalizePassword(o.password),
          o.name ?? o.displayName,
          o.admin ?? o.role
        )
      )
    }
    return users
  }

  if (parsed && typeof parsed === 'object') {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') {
        add(makeUser(normalizeUsername(key), value, undefined, undefined))
        continue
      }
      if (!value || typeof value !== 'object') continue
      const o = value as Record<string, unknown>
      add(
        makeUser(
          normalizeUsername(o.username ?? key),
          normalizePassword(o.password),
          o.name ?? o.displayName,
          o.admin ?? o.role
        )
      )
    }
    return users
  }

  return users
}

function computeConfig(): AuthConfig {
  const raw = process.env.AUTH_USERS?.trim()
  if (raw) {
    const users = parseUsersJson(raw)
    if (users.length > 0) return { mode: 'users', users }
    // Misconfigured JSON must not silently disable the login; fall back to the
    // legacy password if there is one, otherwise the app stays locked.
  }

  const legacyPassword = process.env.ADMIN_PASSWORD
  if (legacyPassword) {
    return {
      mode: 'legacy',
      users: [
        {
          username: LEGACY_USERNAME,
          password: legacyPassword,
          displayName: 'Operator',
          admin: true,
        },
      ],
    }
  }

  return { mode: 'none', users: [] }
}

/** Current auth configuration (parsed once per process). */
export function getAuthConfig(): AuthConfig {
  if (!cached) cached = computeConfig()
  return cached
}

/** Test seam: forces the next `getAuthConfig()` call to re-read the env. */
export function resetAuthConfig(): void {
  cached = null
}

export function getUsers(): AppUser[] {
  return getAuthConfig().users
}

export function getAuthMode(): AuthMode {
  return getAuthConfig().mode
}

export function findUser(username: string): AppUser | null {
  const wanted = normalizeUsername(username).toLowerCase()
  if (!wanted) return null
  return (
    getUsers().find((u) => u.username.toLowerCase() === wanted) ?? null
  )
}

/**
 * Normalize the username coming from a login form: in legacy mode an empty
 * username means the single operator account.
 */
export function normalizeLoginUsername(username: string): string {
  const name = normalizeUsername(username)
  if (name) return name
  return getAuthMode() === 'legacy' ? LEGACY_USERNAME : ''
}

/** Public (password-free) view of an account, safe to send to the browser. */
export function publicUser(user: AppUser) {
  return { username: user.username, name: user.displayName, admin: user.admin }
}
