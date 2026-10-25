import { createKeyboard, deleteKeyboard, inputType } from '@zos/ui'
import { getSystemInfo } from '@zos/settings'
import { openMiniKeyboard } from './keyboard'

/**
 * Opens a text input UI. Uses the system keyboard on API_LEVEL >= 4.0,
 * otherwise falls back to a built-in mini keyboard overlay.
 *
 * The keyboard is drawn on its own layer, so any page content behind it
 * would still be visible. Callers should hide their widgets in `onShow`
 * and restore them in `onHide`.
 *
 * promptText({
 *   title,          // text shown as the input title
 *   text,           // initial value
 *   onShow,         // called right before the keyboard opens
 *   onHide,         // called right after the keyboard closes
 *   onDone,         // called with the confirmed value (may be '')
 *   onCancel,       // called when the user cancels
 * })
 */
export function promptText({ title, text, onShow, onHide, onDone, onCancel }) {
  let useSystem = false
  try {
    const { minAPI } = getSystemInfo()
    useSystem = parseFloat(minAPI) >= 4
  } catch (e) {}

  const show = () => {
    if (onShow) onShow()
  }
  const hide = () => {
    if (onHide) onHide()
  }

  if (useSystem) {
    show()
    try {
      createKeyboard({
        inputType: inputType.CHAR,
        text: text || '',
        onComplete: (_kb, result) => {
          try {
            deleteKeyboard()
          } catch (e) {}
          onDone && onDone((result && result.data ? result.data : '').trim())
          hide()
        },
        onCancel: () => {
          try {
            deleteKeyboard()
          } catch (e) {}
          onCancel && onCancel()
          hide()
        },
      })
      return
    } catch (e) {
      // System keyboard unavailable: restore the UI and use the fallback
      hide()
    }
  }

  show()
  openMiniKeyboard({
    title,
    text,
    onDone: (value) => {
      onDone && onDone(value)
      hide()
    },
    onCancel: () => {
      onCancel && onCancel()
      hide()
    },
  })
}
