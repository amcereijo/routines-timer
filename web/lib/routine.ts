/**
 * Shared routine-import contract (document version 1).
 *
 * These limits are the single source of truth for the web/API side; the watch
 * mirrors them in zepp_app/utils/constants.js (see the add-web-routine-import
 * design, decision 5). Keep both in sync when changing them.
 */

export const ROUTINE_DOC_VERSION = 1

/** Unambiguous alphabet (no 0, O, 1, I, L, U) used for import codes. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
export const CODE_LENGTH = 8

/** Expiration presets offered when generating an import code (ms). */
export const CODE_TTL_PRESETS = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
} as const
export type CodeTtlKey = keyof typeof CODE_TTL_PRESETS

export const LIMITS = {
  nameMin: 1,
  nameMax: 18,
  stepNameMax: 18,
  stepsMin: 1,
  stepsMax: 20,
  secondsMin: 5,
  secondsMax: 3599,
  repeatMin: 1,
  repeatMax: 99,
  restMin: 0,
  restMax: 3599,
} as const

export interface RoutineStep {
  name: string
  seconds: number
  repeat?: number
  rest?: number
}

export interface RoutineDoc {
  version: typeof ROUTINE_DOC_VERSION
  name: string
  steps: RoutineStep[]
}

const PRINTABLE_ASCII = /^[\x20-\x7E]*$/

function isIntInRange(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

export function isCodeFormat(code: unknown): code is string {
  return (
    typeof code === 'string' &&
    code.length === CODE_LENGTH &&
    [...code].every((c) => CODE_ALPHABET.includes(c))
  )
}

/** Cryptographically random code from CODE_ALPHABET (edge-compatible). */
export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  let out = ''
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return out
}

export type ValidationResult =
  | { ok: true; name: string; steps: RoutineStep[] }
  | { ok: false; errors: Record<string, string> }

/**
 * Validate a loose routine payload (from JSON). Returns normalized data with
 * per-field errors keyed as `name`, `steps`, `steps.<i>.name`, etc.
 */
export function validateRoutine(input: unknown): ValidationResult {
  const errors: Record<string, string> = {}
  const obj = (typeof input === 'object' && input !== null ? input : {}) as {
    name?: unknown
    steps?: unknown
  }

  // Routine name
  let name = ''
  if (typeof obj.name !== 'string') {
    errors.name = 'Name is required'
  } else {
    name = obj.name.trim()
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
      errors.name = `Name must be ${LIMITS.nameMin}–${LIMITS.nameMax} characters`
    } else if (!PRINTABLE_ASCII.test(name)) {
      errors.name = 'Name must use printable ASCII characters only'
    }
  }

  // Steps
  if (!Array.isArray(obj.steps)) {
    errors.steps = 'At least one step is required'
  } else {
    if (obj.steps.length < LIMITS.stepsMin || obj.steps.length > LIMITS.stepsMax) {
      errors.steps = `Routine must have ${LIMITS.stepsMin}–${LIMITS.stepsMax} steps`
    }
  }

  const rawSteps = Array.isArray(obj.steps) ? obj.steps : []
  const steps: RoutineStep[] = []
  rawSteps.forEach((raw, i) => {
    const step = (typeof raw === 'object' && raw !== null ? raw : {}) as {
      name?: unknown
      seconds?: unknown
      repeat?: unknown
      rest?: unknown
    }

    let stepName = ''
    if (typeof step.name !== 'string') {
      errors[`steps.${i}.name`] = 'Step name is required'
    } else {
      stepName = step.name.trim()
      if (stepName.length > LIMITS.stepNameMax) {
        errors[`steps.${i}.name`] = `Step name must be at most ${LIMITS.stepNameMax} characters`
      } else if (!PRINTABLE_ASCII.test(stepName)) {
        errors[`steps.${i}.name`] = 'Step name must use printable ASCII only'
      }
    }

    let seconds = 0
    if (!isIntInRange(step.seconds, LIMITS.secondsMin, LIMITS.secondsMax)) {
      errors[`steps.${i}.seconds`] = `Duration must be ${LIMITS.secondsMin}–${LIMITS.secondsMax} seconds`
    } else {
      seconds = step.seconds as number
    }

    const normalized: RoutineStep = { name: stepName, seconds }

    if (step.repeat !== undefined && step.repeat !== null && step.repeat !== '') {
      if (!isIntInRange(Number(step.repeat), LIMITS.repeatMin, LIMITS.repeatMax)) {
        errors[`steps.${i}.repeat`] = `Repeat must be ${LIMITS.repeatMin}–${LIMITS.repeatMax}`
      } else {
        normalized.repeat = Number(step.repeat)
      }
    }

    if (step.rest !== undefined && step.rest !== null && step.rest !== '') {
      if (!isIntInRange(Number(step.rest), LIMITS.restMin, LIMITS.restMax)) {
        errors[`steps.${i}.rest`] = `Rest must be ${LIMITS.restMin}–${LIMITS.restMax} seconds`
      } else {
        normalized.rest = Number(step.rest)
      }
    }

    steps.push(normalized)
  })

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, name, steps }
}
