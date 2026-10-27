import {
  ROUTINE_DOC_VERSION,
  NAME_MAX_LEN,
  STEP_NAME_MAX_LEN,
  MIN_STEP_SECONDS,
  MAX_STEP_SECONDS,
  MIN_REPEAT,
  MAX_REPEAT,
  MAX_STEPS,
} from './constants'

const PRINTABLE_ASCII = /^[\x20-\x7E]*$/

function isIntInRange(v, min, max) {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
}

/**
 * Parse and validate a routine document received from the resolve endpoint.
 * NEVER touches storage — callers save only when result.ok is true.
 *
 * Mirror of web/lib/routine.ts validateRoutine (contract version 1):
 * { version: 1, name: string(1..18 ascii), steps: [{ name: string(<=18 ascii),
 * seconds: int(5..3599), repeat?: int(1..99), rest?: int(0..3599) }] } (1..20 steps)
 *
 * @returns {{ ok: true, name: string, steps: Array } | { ok: false }}
 */
export function parseRoutineDoc(body) {
  let doc = body
  if (typeof body === 'string') {
    try {
      doc = JSON.parse(body)
    } catch (e) {
      return { ok: false }
    }
  }
  if (!doc || typeof doc !== 'object') return { ok: false }

  // Version gate: only v1 documents are understood.
  if (doc.version !== ROUTINE_DOC_VERSION) return { ok: false }

  // Routine name: 1–18 printable ASCII.
  if (typeof doc.name !== 'string') return { ok: false }
  const name = doc.name.trim()
  if (name.length < 1 || name.length > NAME_MAX_LEN) return { ok: false }
  if (!PRINTABLE_ASCII.test(name)) return { ok: false }

  // Steps: 1–MAX_STEPS.
  if (!Array.isArray(doc.steps)) return { ok: false }
  if (doc.steps.length < 1 || doc.steps.length > MAX_STEPS) return { ok: false }

  const steps = []
  for (const raw of doc.steps) {
    if (!raw || typeof raw !== 'object') return { ok: false }

    // Step name may be empty (same as manually created steps).
    if (typeof raw.name !== 'string') return { ok: false }
    const stepName = raw.name.trim()
    if (stepName.length > STEP_NAME_MAX_LEN) return { ok: false }
    if (!PRINTABLE_ASCII.test(stepName)) return { ok: false }

    if (!isIntInRange(raw.seconds, MIN_STEP_SECONDS, MAX_STEP_SECONDS)) {
      return { ok: false }
    }
    const step = { seconds: raw.seconds, name: stepName }

    if (raw.repeat !== undefined && raw.repeat !== null) {
      if (!isIntInRange(raw.repeat, MIN_REPEAT, MAX_REPEAT)) return { ok: false }
      step.repeat = raw.repeat
    }
    if (raw.rest !== undefined && raw.rest !== null) {
      if (!isIntInRange(raw.rest, 0, MAX_STEP_SECONDS)) return { ok: false }
      step.rest = raw.rest
    }
    steps.push(step)
  }

  return { ok: true, name, steps }
}
