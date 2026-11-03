import { getDb } from './db'
import {
  CODE_TTL_PRESETS,
  CodeTtlKey,
  generateCode,
  generateShareToken,
  RoutineStep,
  SHARE_TTL_PRESETS,
  ShareTtlKey,
} from './routine'

export interface StoredRoutine {
  id: string
  /** Username (lowercased) that owns the routine. */
  owner: string
  name: string
  steps: RoutineStep[]
  createdAt: number
  updatedAt: number
}

export interface StoredCode {
  code: string
  routineId: string
  createdAt: number
  expiresAt: number
}

export interface StoredShare {
  token: string
  routineId: string
  createdBy: string
  createdAt: number
  /** Unix ms; 0 means the link never expires. */
  expiresAt: number
}

const CODE_CREATE_ATTEMPTS = 5
const SHARE_CREATE_ATTEMPTS = 5

// ---------------------------------------------------------------- routines

/**
 * List routines visible to an account. `owner` scopes the list to a single
 * account; `null` lists every routine (administrators).
 */
export async function listRoutines(owner: string | null): Promise<StoredRoutine[]> {
  const db = await getDb()
  const res =
    owner === null
      ? await db.execute('SELECT * FROM routines ORDER BY created_at ASC')
      : await db.execute({
          sql: 'SELECT * FROM routines WHERE owner = ? ORDER BY created_at ASC',
          args: [owner],
        })
  return res.rows.map(rowToRoutine)
}

export async function getRoutine(id: string): Promise<StoredRoutine | null> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT * FROM routines WHERE id = ?',
    args: [id],
  })
  return res.rows.length ? rowToRoutine(res.rows[0]) : null
}

export async function createRoutine(
  name: string,
  steps: RoutineStep[],
  owner: string
): Promise<StoredRoutine> {
  const db = await getDb()
  const now = Date.now()
  const routine: StoredRoutine = {
    id: crypto.randomUUID(),
    owner,
    name,
    steps,
    createdAt: now,
    updatedAt: now,
  }
  await db.execute({
    sql: 'INSERT INTO routines (id, owner, name, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [routine.id, owner, name, JSON.stringify(steps), now, now],
  })
  return routine
}

export async function updateRoutine(
  id: string,
  name: string,
  steps: RoutineStep[]
): Promise<StoredRoutine | null> {
  const existing = await getRoutine(id)
  if (!existing) return null
  const db = await getDb()
  const now = Date.now()
  await db.execute({
    sql: 'UPDATE routines SET name = ?, steps = ?, updated_at = ? WHERE id = ?',
    args: [name, JSON.stringify(steps), now, id],
  })
  return { ...existing, name, steps, updatedAt: now }
}

export async function deleteRoutine(id: string): Promise<boolean> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'DELETE FROM routines WHERE id = ?',
    args: [id],
  })
  if (!res.rowsAffected) return false
  // Codes bound to the deleted routine stop resolving immediately.
  await db.execute({ sql: 'DELETE FROM codes WHERE routine_id = ?', args: [id] })
  // Public share links die with the routine.
  await db.execute({ sql: 'DELETE FROM shares WHERE routine_id = ?', args: [id] })
  return true
}

/**
 * Adopt routines created before accounts existed (they have no owner).
 * Called when an account signs in so a legacy deployment keeps working.
 */
export async function claimLegacyRoutines(owner: string): Promise<number> {
  const db = await getDb()
  const res = await db.execute({
    sql: "UPDATE routines SET owner = ? WHERE owner = '' OR owner IS NULL",
    args: [owner],
  })
  return res.rowsAffected ?? 0
}

// -------------------------------------------------------------------- codes

/**
 * Create a code for a routine. Uniqueness is enforced by the primary key;
 * (unlikely) collisions retry. Expired rows are pruned opportunistically.
 */
export async function createCode(
  routineId: string,
  ttlKey: CodeTtlKey
): Promise<StoredCode | null> {
  const db = await getDb()
  const ttlMs = CODE_TTL_PRESETS[ttlKey]
  await pruneExpiredCodes(db)

  for (let attempt = 0; attempt < CODE_CREATE_ATTEMPTS; attempt++) {
    const record: StoredCode = {
      code: generateCode(),
      routineId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    }
    try {
      await db.execute({
        sql: 'INSERT INTO codes (code, routine_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
        args: [record.code, routineId, record.createdAt, record.expiresAt],
      })
      return record
    } catch {
      // PRIMARY KEY collision — retry with a new random code
    }
  }
  return null
}

/** Active (unexpired) codes bound to a routine, soonest expiry first. */
export async function listCodesForRoutine(routineId: string): Promise<StoredCode[]> {
  const db = await getDb()
  await pruneExpiredCodes(db)
  const res = await db.execute({
    sql: 'SELECT * FROM codes WHERE routine_id = ? AND expires_at > ? ORDER BY expires_at ASC',
    args: [routineId, Date.now()],
  })
  return res.rows.map(rowToCode)
}

/** Resolve a code to its record; null when unknown, expired, or orphaned. */
export async function resolveCode(code: string): Promise<StoredCode | null> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT * FROM codes WHERE code = ?',
    args: [code],
  })
  if (!res.rows.length) return null
  const record = rowToCode(res.rows[0])
  if (record.expiresAt <= Date.now()) return null
  const routine = await getRoutine(record.routineId)
  if (!routine) return null // orphaned: routine deleted
  return record
}

/** Lazy cleanup of expired grants (no TTL in SQL; done on activity). */
async function pruneExpiredCodes(db: Awaited<ReturnType<typeof getDb>>) {
  await db.execute({ sql: 'DELETE FROM codes WHERE expires_at <= ?', args: [Date.now()] })
}

// ------------------------------------------------------------------- shares

/**
 * Create a public share link for a routine. The token is the URL slug of the
 * public page (`/r/<token>`).
 */
export async function createShare(
  routineId: string,
  createdBy: string,
  ttlKey: ShareTtlKey
): Promise<StoredShare | null> {
  const db = await getDb()
  const ttlMs = SHARE_TTL_PRESETS[ttlKey]
  const now = Date.now()

  for (let attempt = 0; attempt < SHARE_CREATE_ATTEMPTS; attempt++) {
    const record: StoredShare = {
      token: generateShareToken(),
      routineId,
      createdBy,
      createdAt: now,
      expiresAt: ttlMs === 0 ? 0 : now + ttlMs,
    }
    try {
      await db.execute({
        sql: 'INSERT INTO shares (token, routine_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
        args: [
          record.token,
          routineId,
          createdBy,
          record.createdAt,
          record.expiresAt,
        ],
      })
      return record
    } catch {
      // PRIMARY KEY collision — retry with a new random token
    }
  }
  return null
}

/** Active share links of a routine, newest first. */
export async function listShares(routineId: string): Promise<StoredShare[]> {
  const db = await getDb()
  await pruneExpiredShares(db)
  const res = await db.execute({
    sql: 'SELECT * FROM shares WHERE routine_id = ? ORDER BY created_at DESC',
    args: [routineId],
  })
  return res.rows.map(rowToShare)
}

/** A share link by token; null when unknown or expired. */
export async function getShare(token: string): Promise<StoredShare | null> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT * FROM shares WHERE token = ?',
    args: [token],
  })
  if (!res.rows.length) return null
  const record = rowToShare(res.rows[0])
  if (record.expiresAt !== 0 && record.expiresAt <= Date.now()) return null
  return record
}

/** Discard a share link. Returns true when a row was removed. */
export async function deleteShare(token: string): Promise<boolean> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'DELETE FROM shares WHERE token = ?',
    args: [token],
  })
  return (res.rowsAffected ?? 0) > 0
}

/** Lazy cleanup of expired share links. */
async function pruneExpiredShares(db: Awaited<ReturnType<typeof getDb>>) {
  await db.execute({
    sql: 'DELETE FROM shares WHERE expires_at != 0 AND expires_at <= ?',
    args: [Date.now()],
  })
}

// ------------------------------------------------------------------ mapping

function rowToRoutine(row: Record<string, unknown>): StoredRoutine {
  return {
    id: String(row.id),
    owner: String(row.owner ?? ''),
    name: String(row.name),
    steps: JSON.parse(String(row.steps)) as RoutineStep[],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function rowToCode(row: Record<string, unknown>): StoredCode {
  return {
    code: String(row.code),
    routineId: String(row.routine_id),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }
}

function rowToShare(row: Record<string, unknown>): StoredShare {
  return {
    token: String(row.token),
    routineId: String(row.routine_id),
    createdBy: String(row.created_by ?? ''),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }
}
