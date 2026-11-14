import { createClient, type Client } from '@libsql/client'

let initPromise: Promise<Client> | null = null

const DDL = `
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  steps TEXT NOT NULL,          -- JSON array of steps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  routine_id TEXT,              -- NULL for guest codes
  guest_routine_id TEXT,        -- NULL for account codes
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  -- A code belongs to exactly one routine: an account routine or a guest one.
  CHECK ((routine_id IS NULL) <> (guest_routine_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_codes_routine ON codes(routine_id);
CREATE TABLE IF NOT EXISTS guest_routines (
  id TEXT PRIMARY KEY,
  workspace_token TEXT NOT NULL UNIQUE,  -- one routine per guest workspace
  name TEXT NOT NULL,
  steps TEXT NOT NULL,          -- JSON array of steps
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guest_routines_expires ON guest_routines(expires_at);
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL    -- 0 = never expires
);
CREATE INDEX IF NOT EXISTS idx_shares_routine ON shares(routine_id);
CREATE TABLE IF NOT EXISTS rate_hits (
  scope TEXT NOT NULL,
  client TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_hits ON rate_hits(scope, client, ts);
`

/**
 * Columns added after the first release. `ALTER TABLE ... ADD COLUMN` is not
 * idempotent in SQLite, so each statement is applied at most once and a
 * "duplicate column" error is swallowed.
 */
const MIGRATIONS = [
  'ALTER TABLE routines ADD COLUMN owner TEXT NOT NULL DEFAULT \'\'',
]

function isAlreadyApplied(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error).toLowerCase()
  return (
    message.includes('duplicate column') ||
    message.includes('already exists')
  )
}

/**
 * Lazily created Turso/libSQL client with idempotent schema init.
 * Reads TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN for remote DBs).
 * For local development, point TURSO_DATABASE_URL at a file (file:./dev.db).
 * Throws only on first use, so build-time page prerendering stays safe.
 */
export function getDb(): Promise<Client> {
  if (!initPromise) {
    const url = process.env.TURSO_DATABASE_URL
    if (!url) {
      throw new Error('TURSO_DATABASE_URL must be configured')
    }
    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
    const statements = DDL.split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sql) => ({ sql, args: [] }))
    initPromise = client
      .batch(statements, 'write')
      .then(() => applyMigrations(client))
      .then(() => client)
  }
  return initPromise
}

/** Apply additive migrations, ignoring columns that already exist. */
async function applyMigrations(client: Client): Promise<void> {
  for (const sql of MIGRATIONS) {
    try {
      await client.execute(sql)
    } catch (error) {
      if (!isAlreadyApplied(error)) throw error
    }
  }
  await migrateCodesForGuests(client)
}

/** True when the table already has the column. */
async function hasColumn(
  client: Client,
  table: string,
  column: string
): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info(${table})`)
  return res.rows.some((row) => String(row.name) === column)
}

/**
 * `codes` used to require `routine_id`; guest codes bind to
 * `guest_routine_id` instead, so both columns are nullable and the table
 * carries a "exactly one binding" check. SQLite cannot relax a NOT NULL
 * constraint in place, so the table is rebuilt once (existing rows keep their
 * account binding). The rebuild runs inside one write transaction.
 */
async function migrateCodesForGuests(client: Client): Promise<void> {
  if (!(await hasColumn(client, 'codes', 'guest_routine_id'))) {
    await client.batch(
      [
        {
          sql: `CREATE TABLE codes_guest_migration (
            code TEXT PRIMARY KEY,
            routine_id TEXT,
            guest_routine_id TEXT,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            CHECK ((routine_id IS NULL) <> (guest_routine_id IS NULL))
          )`,
          args: [],
        },
        {
          sql: 'INSERT INTO codes_guest_migration (code, routine_id, guest_routine_id, created_at, expires_at) SELECT code, routine_id, NULL, created_at, expires_at FROM codes',
          args: [],
        },
        { sql: 'DROP TABLE codes', args: [] },
        { sql: 'ALTER TABLE codes_guest_migration RENAME TO codes', args: [] },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_codes_routine ON codes(routine_id)', args: [] },
      ],
      'write'
    )
  }

  // The guest index can only be created once the column exists, so it is
  // part of the migration and not of the schema bootstrap.
  await client.execute(
    'CREATE INDEX IF NOT EXISTS idx_codes_guest_routine ON codes(guest_routine_id)'
  )
}
