/**
 * Shared routine-import contract (document version 1).
 *
 * These limits are the single source of truth for the web/API side; the watch
 * mirrors them in zepp_app/utils/constants.js (see the add-web-routine-import
 * design, decision 5). Keep both in sync when changing them.
 *
 * Version 1 documents carry the timing fields the watch understands
 * (`name`, `seconds`, `repeat`, `rest`). The optional `images` and `links`
 * arrays are web-only extras: they are stored with the routine, shown on the
 * public share page and stripped from the watch resolve endpoint, so the
 * watch contract stays byte-for-byte compatible.
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

/** Expiration presets offered when creating a public share link. */
export const SHARE_TTL_PRESETS = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  never: 0,
} as const
export type ShareTtlKey = keyof typeof SHARE_TTL_PRESETS

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
  /** Images per step. */
  imagesMax: 3,
  /** Links per step. */
  linksMax: 3,
  /** Maximum length of a single link. */
  linkMaxLen: 500,
  /** Maximum length of a step description. */
  descriptionMax: 500,
  /** Maximum decoded size of a single embedded image. */
  imageMaxBytes: 200 * 1024,
  /** Maximum size of the whole routine payload (JSON, base64 included). */
  routineMaxBytes: 2 * 1024 * 1024,
} as const

/** Rest applied by the watch when a step does not define one. */
export const DEFAULT_REST_SECONDS = 10

export interface RoutineStep {
  name: string
  seconds: number
  repeat?: number
  rest?: number
  /**
   * Free-form notes about the step. Web-only extra: it never reaches the
   * watch, so it may hold any text (accents, line breaks, emoji).
   */
  description?: string
  /** Up to 3 embedded images (`data:` URLs), shown on the public share page. */
  images?: string[]
  /** Up to 3 http(s) links, shown on the public share page. */
  links?: string[]
}

export interface RoutineDoc {
  version: typeof ROUTINE_DOC_VERSION
  name: string
  steps: RoutineStep[]
}

const PRINTABLE_ASCII = /^[\x20-\x7E]*$/

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/

const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:'])

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

/** Alphabet for public share tokens (URL safe). */
const SHARE_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
export const SHARE_TOKEN_LENGTH = 24

/** Cryptographically random, URL-safe share token. */
export function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SHARE_TOKEN_LENGTH))
  let out = ''
  for (const b of bytes) out += SHARE_ALPHABET[b % SHARE_ALPHABET.length]
  return out
}

/** Decoded byte length of a base64 payload (without decoding it). */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

/** True when the string is an embedded image we accept and can render. */
export function isValidImageDataUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = IMAGE_DATA_URL.exec(value)
  if (!match) return false
  const bytes = base64ByteLength(match[2])
  return bytes > 0 && bytes <= LIMITS.imageMaxBytes
}

/** True when the string is an http(s) link we accept. */
export function isValidLink(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!value || value.length > LIMITS.linkMaxLen) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return ALLOWED_LINK_PROTOCOLS.has(url.protocol)
}

/**
 * Remove the web-only extras from a step list. Used by the watch resolve
 * endpoint so the document stays exactly the v1 contract the watch expects.
 */
export function stripStepExtras(steps: RoutineStep[]): RoutineStep[] {
  return steps.map((step) => ({
    name: step.name,
    seconds: step.seconds,
    ...(step.repeat !== undefined ? { repeat: step.repeat } : {}),
    ...(step.rest !== undefined ? { rest: step.rest } : {}),
  }))
}
/**
 * Total running time of a routine, using the watch semantics: a step runs
 * `repeat` times with `rest` seconds between repetitions (no rest after the
 * last repetition, none between steps).
 */
export function estimateRoutineSeconds(steps: RoutineStep[]): number {
  return steps.reduce((total, step) => {
    const repeat = step.repeat && step.repeat > 0 ? step.repeat : 1
    const rest = step.rest ?? 0
    return total + repeat * step.seconds + Math.max(0, repeat - 1) * rest
  }, 0)
}

/** Total work time of a routine, ignoring rests. */
export function estimateWorkSeconds(steps: RoutineStep[]): number {
  return steps.reduce((total, step) => {
    const repeat = step.repeat && step.repeat > 0 ? step.repeat : 1
    return total + repeat * step.seconds
  }, 0)
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
      description?: unknown
      images?: unknown
      links?: unknown
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

    // Description (optional, web-only extra)
    if (step.description !== undefined && step.description !== null) {
      if (typeof step.description !== 'string') {
        errors[`steps.${i}.description`] = 'Description must be text'
      } else {
        const description = step.description.trim()
        if (description.length > LIMITS.descriptionMax) {
          errors[`steps.${i}.description`] = `Description must be at most ${LIMITS.descriptionMax} characters`
        } else if (description.length > 0) {
          normalized.description = description
        }
      }
    }

    // Images (optional, web-only extra)
    if (step.images !== undefined && step.images !== null) {
      if (!Array.isArray(step.images)) {
        errors[`steps.${i}.images`] = 'Images must be a list'
      } else if (step.images.length > LIMITS.imagesMax) {
        errors[`steps.${i}.images`] = `At most ${LIMITS.imagesMax} images per step`
      } else {
        const images: string[] = []
        for (const image of step.images) {
          if (image === '' || image === null || image === undefined) continue
          if (!isValidImageDataUrl(image)) {
            errors[`steps.${i}.images`] = `Images must be embedded PNG/JPEG/WebP/GIF files under ${Math.round(
              LIMITS.imageMaxBytes / 1024
            )} KB`
            break
          }
          images.push(image)
        }
        if (images.length > 0) normalized.images = images
      }
    }

    // Links (optional, web-only extra)
    if (step.links !== undefined && step.links !== null) {
      if (!Array.isArray(step.links)) {
        errors[`steps.${i}.links`] = 'Links must be a list'
      } else if (step.links.length > LIMITS.linksMax) {
        errors[`steps.${i}.links`] = `At most ${LIMITS.linksMax} links per step`
      } else {
        const links: string[] = []
        for (const link of step.links) {
          if (link === '' || link === null || link === undefined) continue
          if (!isValidLink(link)) {
            errors[`steps.${i}.links`] = 'Links must be http(s) URLs'
            break
          }
          links.push(link)
        }
        if (links.length > 0) normalized.links = links
      }
    }

    steps.push(normalized)
  })

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  // Guard the payload size (embedded images are base64, so they add up).
  const payloadSize = JSON.stringify({ name, steps }).length
  if (payloadSize > LIMITS.routineMaxBytes) {
    return {
      ok: false,
      errors: {
        steps: `Routine is too large (${Math.round(
          payloadSize / 1024
        )} KB). Remove some images and try again.`,
      },
    }
  }

  return { ok: true, name, steps }
}
