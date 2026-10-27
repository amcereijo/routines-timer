export const DEVICE_WIDTH = 480
export const DEVICE_HEIGHT = 480

// Safe drawing area (excludes rounded corners on Amazfit Balance)
export const SAFE_MARGIN = 70
export const SAFE_WIDTH = DEVICE_WIDTH - 2 * SAFE_MARGIN  // 340
export const SAFE_HEIGHT = DEVICE_HEIGHT - 2 * SAFE_MARGIN  // 340

export const COLOR_BG = 0x000000
export const COLOR_TEXT = 0xffffff
export const COLOR_SUBTEXT = 0x9e9e9e
export const COLOR_ACCENT = 0x03a9f4
export const COLOR_GREEN = 0x00c853
export const COLOR_RED = 0xff1744
export const COLOR_ORANGE = 0xff9100
export const COLOR_DARK_BTN = 0x222222
export const COLOR_DARK_BTN_PRESS = 0x3a3a3a
// Disabled key: shown but not tappable (e.g. characters excluded from the
// import-code alphabet).
export const COLOR_DISABLED_BTN = 0x101010
export const COLOR_DISABLED_TEXT = 0x4d4d4d

export const MAX_STEPS = 20
export const MAX_SAVED = 10
export const DEFAULT_REST_SECONDS = 10

// ---- Routine import (web import codes) ----
// Base URL of the deployed web app: injected at build time via
// RESOLVE_BASE_URL (see scripts/write-config.js). No trailing path.
export { RESOLVE_BASE_URL } from './generatedConfig'
// Import-code contract, mirrored from web/lib/routine.ts (design decision 5).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789' // 30 chars, no 0/O/1/I/L/U
export const CODE_LENGTH = 8
export const ROUTINE_DOC_VERSION = 1
export const NAME_MAX_LEN = 18
export const STEP_NAME_MAX_LEN = 18
export const MIN_STEP_SECONDS = 5
export const MAX_STEP_SECONDS = 3599
export const MIN_REPEAT = 1
export const MAX_REPEAT = 99
