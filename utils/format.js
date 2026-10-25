/**
 * Format seconds as m:ss (e.g. 90 -> "1:30")
 */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec < 10 ? '0' : ''}${sec}`
}

/**
 * Total seconds of a steps array: [{seconds}, ...]
 */
export function totalSeconds(steps) {
  return steps.reduce((acc, s) => acc + (s.seconds || 0), 0)
}

/**
 * Format step summary for list display.
 * Examples: "1:30" | "1:30 ×3" | "1:30 ×3 · 0:10"
 */
export function formatStepSummary(step) {
  const dur = formatDuration(step.seconds || 0)
  const repeat = step.repeat || 1
  if (repeat <= 1) return dur
  const rest = step.rest != null ? step.rest : 10
  if (rest > 0) return `${dur} ×${repeat} · ${formatDuration(rest)}`
  return `${dur} ×${repeat}`
}
