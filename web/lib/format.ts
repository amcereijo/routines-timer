/** Small formatting helpers shared by the UI and the API. */

/** `90` → `1:30`, `3661` → `1:01:01`. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

/** `90` → `1m 30s`, used where the exact number matters less than speed. */
export function formatDurationWords(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

/**
 * Parse a duration typed by the user: plain seconds (`90`) or `m:ss`
 * (`1:30`). Returns null when the input cannot be understood.
 */
export function parseDuration(text: string): number | null {
  const value = text.trim()
  if (!value) return null
  if (/^\d+$/.test(value)) return Number(value)
  const match = /^(\d{1,3}):([0-5]?\d)$/.exec(value)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  return minutes * 60 + seconds
}

/** `90` → `1:30` for the duration input. */
export function formatDurationInput(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(total)
}

/** Human friendly expiry, e.g. `in 42 min` or `expired`. */
export function formatExpiry(expiresAt: number, now = Date.now()): string {
  if (expiresAt === 0) return 'never expires'
  const ms = expiresAt - now
  if (ms <= 0) return 'expired'
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'in less than a minute'
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `in ${hours} h`
  return `in ${Math.round(hours / 24)} days`
}
