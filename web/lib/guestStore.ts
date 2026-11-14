/**
 * Guest routines: ephemeral, owner-less routines a visitor authors without
 * an account (spec: web-guest-routines).
 *
 * They live in their own table so the account ownership rules, the legacy
 * adoption rule and every account query stay untouched. A guest workspace
 * holds at most one routine: every save replaces it, together with its
 * import codes.
 */

import { getDb } from './db'
import {
  CODE_TTL_PRESETS,
  type CodeTtlKey,
  generateCode,
  type RoutineStep,
} from './routine'
import type { StoredCode } from './store'

/** Lifetime of a guest routine: 24 h from its creation. */
export const GUEST_ROUTINE_TTL_MS = 24 * 60 * 60 * 1000

const CODE_CREATE_ATTEMPTS = 5

export interface StoredGuestRoutine {
  id: string
  /** Token of the anonymous workspace that owns this routine. */
  workspaceToken: string
  name: string
  steps: RoutineStep[]
  createdAt: number
  expiresAt: number
}

/** The guest routine of a workspace; null when missing or expired. */
export async function getGuestRoutineByWorkspace(
  workspaceToken: string
): Promise<StoredGuestRoutine | null> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT * FROM guest_routines WHERE workspace_token = ?',
    args: [workspaceToken],
  })
  if (!res.rows.length) return null
  const routine = rowToGuestRoutine(res.rows[0])
  if (!routine) {
    // Expired: drop it (and its codes) instead of leaving it behind.
    await deleteGuestRoutineById(String(res.rows[0].id))
    return null
  }
  return routine
}

/** A guest routine by id; null when missing or expired. */
export async function getGuestRoutineById(
  id: string
): Promise<StoredGuestRoutine | null> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT * FROM guest_routines WHERE id = ?',
    args: [id],
  })
  if (!res.rows.length) return null
  const routine = rowToGuestRoutine(res.rows[0])
  if (!routine) {
    // Expired: drop it (and its codes) instead of leaving it behind.
    await deleteGuestRoutineById(String(res.rows[0].id))
    return null
  }
  return routine
}

/** Delete a guest routine and its codes; true when a row was removed. */
export async function deleteGuestRoutineById(id: string): Promise<boolean> {
  const db = await getDb()
  const results = await db.batch(
    [
      { sql: 'DELETE FROM codes WHERE guest_routine_id = ?', args: [id] },
      { sql: 'DELETE FROM guest_routines WHERE id = ?', args: [id] },
    ],
    'write'
  )
  return (results[1].rowsAffected ?? 0) > 0
}

/**
 * Store a routine for a workspace, replacing the previous one.
 *
 * The previous definition and its active import codes are deleted before the
 * new routine is accepted: the guest keeps exactly one routine at a time.
 */
export async function replaceGuestRoutine(
  workspaceToken: string,
  name: string,
  steps: RoutineStep[]
): Promise<StoredGuestRoutine> {
  const db = await getDb()
  const now = Date.now()
  const routine: StoredGuestRoutine = {
    id: crypto.randomUUID(),
    workspaceToken,
    name,
    steps,
    createdAt: now,
    expiresAt: now + GUEST_ROUTINE_TTL_MS,
  }
  await db.batch(
    [
      {
        sql: 'DELETE FROM codes WHERE guest_routine_id IN (SELECT id FROM guest_routines WHERE workspace_token = ?)',
        args: [workspaceToken],
      },
      {
        sql: 'DELETE FROM guest_routines WHERE workspace_token = ?',
        args: [workspaceToken],
      },
      {
        sql: 'INSERT INTO guest_routines (id, workspace_token, name, steps, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          routine.id,
          workspaceToken,
          name,
          JSON.stringify(steps),
          routine.createdAt,
          routine.expiresAt,
        ],
      },
    ],
    'write'
  )
  return routine
}

/** Delete the routine of a workspace and its codes; true when one was removed. */
export async function deleteGuestRoutineByWorkspace(
  workspaceToken: string
): Promise<boolean> {
  const db = await getDb()
  const results = await db.batch(
    [
      {
        sql: 'DELETE FROM codes WHERE guest_routine_id IN (SELECT id FROM guest_routines WHERE workspace_token = ?)',
        args: [workspaceToken],
      },
      {
        sql: 'DELETE FROM guest_routines WHERE workspace_token = ?',
        args: [workspaceToken],
      },
    ],
    'write'
  )
  return (results[1].rowsAffected ?? 0) > 0
}

/**
 * Mint an import code for a guest routine. The code never outlives the
 * routine: its expiration is capped by the routine's remaining lifetime.
 */
export async function createGuestCode(
  guestRoutineId: string,
  ttlKey: CodeTtlKey
): Promise<StoredCode | null> {
  const routine = await getGuestRoutineById(guestRoutineId)
  if (!routine) return null

  const db = await getDb()
  const now = Date.now()
  const expiresAt = Math.min(now + CODE_TTL_PRESETS[ttlKey], routine.expiresAt)

  for (let attempt = 0; attempt < CODE_CREATE_ATTEMPTS; attempt++) {
    const record: StoredCode = {
      code: generateCode(),
      routineId: null,
      guestRoutineId,
      createdAt: now,
      expiresAt,
    }
    try {
      await db.execute({
        sql: 'INSERT INTO codes (code, routine_id, guest_routine_id, created_at, expires_at) VALUES (?, NULL, ?, ?, ?)',
        args: [record.code, guestRoutineId, now, expiresAt],
      })
      return record
    } catch {
      // PRIMARY KEY collision — retry with a new random code
    }
  }
  return null
}

/** Active codes of a guest routine, soonest expiry first. */
export async function listGuestCodes(
  guestRoutineId: string
): Promise<StoredCode[]> {
  const db = await getDb()
  await pruneExpiredGuestData(db)
  const res = await db.execute({
    sql: 'SELECT * FROM codes WHERE guest_routine_id = ? AND expires_at > ? ORDER BY expires_at ASC',
    args: [guestRoutineId, Date.now()],
  })
  return res.rows.map(rowToGuestCode)
}

/**
 * Lazy cleanup of expired guest data: the routines and their codes are
 * removed without any user or operator action.
 */
export async function pruneExpiredGuestData(
  db: Awaited<ReturnType<typeof getDb>>
): Promise<void> {
  const now = Date.now()
  await db.batch(
    [
      {
        sql: 'DELETE FROM codes WHERE guest_routine_id IN (SELECT id FROM guest_routines WHERE expires_at <= ?)',
        args: [now],
      },
      {
        sql: 'DELETE FROM guest_routines WHERE expires_at <= ?',
        args: [now],
      },
    ],
    'write'
  )
}

// ------------------------------------------------------------------ mapping

function rowToGuestRoutine(
  row: Record<string, unknown>
): StoredGuestRoutine | null {
  const routine: StoredGuestRoutine = {
    id: String(row.id),
    workspaceToken: String(row.workspace_token),
    name: String(row.name),
    steps: JSON.parse(String(row.steps)) as RoutineStep[],
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }
  // An expired routine behaves exactly as if it had been deleted.
  return routine.expiresAt <= Date.now() ? null : routine
}

function rowToGuestCode(row: Record<string, unknown>): StoredCode {
  return {
    code: String(row.code),
    routineId: null,
    guestRoutineId: String(row.guest_routine_id),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }
}
