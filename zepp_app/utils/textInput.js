import { createKeyboard, deleteKeyboard, inputType } from '@zos/ui'
import { getSystemInfo } from '@zos/settings'
import { openMiniKeyboard } from './keyboard'

/**
 * Opens a text input UI. Uses the system keyboard on API_LEVEL >= 4.0,
 * otherwise falls back to a built-in mini keyboard overlay.
 *
 * promptText({ title, text, onDone, onCancel })
 */
export function promptText({ title, text, onDone, onCancel }) {
  let useSystem = false
  try {
    const { minAPI } = getSystemInfo()
    useSystem = parseFloat(minAPI) >= 4
  } catch (e) {}

  if (useSystem) {
    try {
      createKeyboard({
        inputType: inputType.CHAR,
        text: text || '',
        onComplete: (_kb, result) => {
          try {
            deleteKeyboard()
          } catch (e) {}
          onDone && onDone((result && result.data ? result.data : '').trim())
        },
        onCancel: () => {
          try {
            deleteKeyboard()
          } catch (e) {}
          onCancel && onCancel()
        },
      })
      return
    } catch (e) {}
  }

  openMiniKeyboard({ title, text, onDone, onCancel })
}
