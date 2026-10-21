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
