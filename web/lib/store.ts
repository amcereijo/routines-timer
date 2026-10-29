import { getDb } from './db'
import {
  CODE_TTL_PRESETS,
  CodeTtlKey,
  generateCode,
  RoutineStep,
} from './routine'

export interface StoredRoutine {
  id: string
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

const CODE_CREATE_ATTEMPTS = 5

// ---------------------------------------------------------------- routines

export async function listRoutines(): Promise<StoredRoutine[]> {
  const db = await getDb()
  const res = await db.execute('SELECT * FROM routines ORDER BY created_at ASC')
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
  steps: RoutineStep[]
): Promise<StoredRoutine> {
  const db = await getDb()
  const now = Date.now()
  const routine: StoredRoutine = {
    id: crypto.randomUUID(),
    name,
    steps,
    createdAt: now,
    updatedAt: now,
  }
  await db.execute({
    sql: 'INSERT INTO routines (id, name, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [routine.id, name, JSON.stringify(steps), now, now],
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
  await db.execute({
    sql: 'UPDATE routines SET name = ?, steps = ?, updated_at = ? WHERE id = ?',
    args: [name, JSON.stringify(steps), Date.now(), id],
  })
  return { ...existing, name, steps, updatedAt: Date.now() }
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
  return true
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

// ------------------------------------------------------------------ mapping

function rowToRoutine(row: Record<string, unknown>): StoredRoutine {
  return {
    id: String(row.id),
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
