import {
  Vibrator,
  VIBRATOR_SCENE_DURATION,
  VIBRATOR_SCENE_DURATION_LONG,
  SystemSounds,
} from '@zos/sensor'
import { getSystemInfo } from '@zos/settings'

// Feedback patterns for the run page.
// - Step ending (last 3 s): one short vibration + one soft sound per second.
// - Step end: single long vibration + double sound.
// - Routine end: triple long vibration + triple long sound.

const WARNING_VIBRATION_MS = 300
const END_VIBRATION_MS = 1000
const DONE_VIBRATION_MS = 1000
const DONE_GAP_MS = 300

const SOUND_REPEAT_STEP_END = 1
const SOUND_REPEAT_DONE = 2

// How long the alarm sound is allowed to play before being stopped (ms).
const SOUND_STOP_WARNING_MS = 2500
const SOUND_STOP_STEP_END_MS = 5000
const SOUND_STOP_DONE_MS = 9000

let vibrator = null
let sounds = null
let apiLevel = 0

function getApiLevel() {
  if (!apiLevel) {
    try {
      const info = getSystemInfo()
      // minAPI is a string like "3.7" (see @zos/settings typings)
      apiLevel = parseFloat((info && info.minAPI) || '0') || 0
    } catch (e) {
      apiLevel = 0
    }
  }
  return apiLevel
}

function getVibrator() {
  if (!vibrator) vibrator = new Vibrator()
  return vibrator
}

function getSounds() {
  if (!sounds && getApiLevel() >= 3.6) {
    try {
      sounds = new SystemSounds()
    } catch (e) {
      sounds = null
    }
  }
  return sounds
}

// Continuous vibration for `ms` via the API 3.6 action array; falls back to
// the closest fixed scene mode on older firmware.
function vibrateMs(ms, fallbackMode) {
  const v = getVibrator()
  try {
    v.stop()
  } catch (e) {}
  try {
    const types = v.getType()
    if (types && typeof types.CONTINUOUS === 'number') {
      v.start([{ type: types.CONTINUOUS, duration: ms }])
      return
    }
  } catch (e) {}
  try {
    v.setMode({ mode: fallbackMode })
    v.start()
  } catch (e) {}
}

// Sequence of `count` vibrations of `ms` each, separated by `gapMs`.
function vibratePattern(ms, gapMs, count, fallbackMode) {
  const v = getVibrator()
  try {
    v.stop()
  } catch (e) {}
  try {
    const types = v.getType()
    if (types && typeof types.CONTINUOUS === 'number') {
      const actions = []
      for (let i = 0; i < count; i++) {
        actions.push({ type: types.CONTINUOUS, duration: ms })
        if (i < count - 1) actions.push({ type: types.PAUSE, duration: gapMs })
      }
      v.start(actions)
      return
    }
  } catch (e) {}
  // Fallback: fire the fixed scene `count` times with timers.
  const fire = (n) => {
    if (n <= 0) return
    try {
      v.stop()
      v.setMode({ mode: fallbackMode })
      v.start()
    } catch (e) {}
    if (n > 1) {
      setTimeout(() => fire(n - 1), ms + gapMs)
    }
  }
  fire(count)
}

// Play a system sound. `typeName` is a key of SystemSounds.getSourceType()
// (e.g. 'MESSAGE', 'ALARM'), `repeats` extra repetitions, `stopAfter` a
// safety stop in case the clip keeps ringing. No-op when unsupported/off.
function playSound(typeName, repeats, stopAfter) {
  const s = getSounds()
  if (!s) return
  try {
    if (!s.getEnabled()) return
    const type = s.getSourceType()[typeName]
    if (typeof type !== 'number') return
    s.stop()
    s.start(type, repeats)
    if (stopAfter > 0) {
      setTimeout(() => {
        try {
          s.stop()
        } catch (e) {}
      }, stopAfter)
    }
  } catch (e) {}
}

export function initAlerts() {
  try {
    getVibrator()
  } catch (e) {}
  try {
    getSounds()
  } catch (e) {}
}

export function destroyAlerts() {
  try {
    if (vibrator) vibrator.stop()
  } catch (e) {}
  try {
    if (sounds) sounds.stop()
  } catch (e) {}
}

// Last 3 seconds of a step: single short vibration + single soft sound.
export function alertStepWarning() {
  vibrateMs(WARNING_VIBRATION_MS, VIBRATOR_SCENE_DURATION)
  playSound('MESSAGE', 0, SOUND_STOP_WARNING_MS)
}

// Step reached 0: single long vibration + double sound.
export function alertStepEnd() {
  vibrateMs(END_VIBRATION_MS, VIBRATOR_SCENE_DURATION_LONG)
  playSound('ALARM', SOUND_REPEAT_STEP_END, SOUND_STOP_STEP_END_MS)
}

// Whole routine finished: triple long vibration + triple long sound.
// Fallback scene is a single long pulse so repeating it keeps the count exact.
export function alertRoutineDone() {
  vibratePattern(
    DONE_VIBRATION_MS,
    DONE_GAP_MS,
    3,
    VIBRATOR_SCENE_DURATION_LONG
  )
  playSound('ALARM', SOUND_REPEAT_DONE, SOUND_STOP_DONE_MS)
}
