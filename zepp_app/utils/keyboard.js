import {
  createWidget,
  deleteWidget,
  widget,
  align,
  prop,
} from '@zos/ui'
import {
  DEVICE_WIDTH,
  DEVICE_HEIGHT,
  COLOR_ACCENT,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
} from './constants'

const ROWS = [
  '1234567890',
  'QWERTYUIOP',
  'ASDFGHJKL',
  'ZXCVBNM',
]

const KEY_W = 44
const KEY_H = 52
const GAP = 4
const TOP = 120
const MAX_LEN = 18

/**
 * Compact on-screen keyboard for devices without the API 4.0 system keyboard.
 *
 * openMiniKeyboard({
 *   title: string,
 *   text: string,              // initial value
 *   onDone: (text) => void,    // confirmed (text may be '')
 *   onCancel: () => void,
 * })
 */
export function openMiniKeyboard({ title, text, onDone, onCancel }) {
  let value = text || ''
  const widgets = []

  const add = (w) => {
    widgets.push(w)
    return w
  }

  // Full-screen dark overlay
  add(
    createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: 0x000000,
    })
  )

  // Title
  add(
    createWidget(widget.TEXT, {
      x: 0,
      y: 26,
      w: DEVICE_WIDTH,
      h: 36,
      color: 0xffffff,
      text_size: 24,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: title || '',
    })
  )

  // Current value
  const valueWidget = add(
    createWidget(widget.TEXT, {
      x: 30,
      y: 66,
      w: DEVICE_WIDTH - 60,
      h: 40,
      color: COLOR_ACCENT,
      text_size: 28,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: value || ' ',
    })
  )

  const refresh = () => {
    valueWidget.setProperty(prop.TEXT, value.length ? value : ' ')
  }

  const press = (ch) => {
    if (value.length >= MAX_LEN) return
    value += ch
    refresh()
  }

  // Character rows
  ROWS.forEach((row, r) => {
    const rowW = row.length * (KEY_W + GAP) - GAP
    const startX = Math.round((DEVICE_WIDTH - rowW) / 2)
    const y = TOP + r * (KEY_H + GAP)
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      add(
        createWidget(widget.BUTTON, {
          x: startX + i * (KEY_W + GAP),
          y,
          w: KEY_W,
          h: KEY_H,
          radius: 8,
          text: ch,
          text_size: 24,
          normal_color: COLOR_DARK_BTN,
          press_color: COLOR_DARK_BTN_PRESS,
          click_func: () => press(ch),
        })
      )
    }
  })

  // Bottom row: space, backspace, cancel, ok
  const y = TOP + 4 * (KEY_H + GAP)

  add(
    createWidget(widget.BUTTON, {
      x: 30,
      y,
      w: 108,
      h: KEY_H,
      radius: 10,
      text: 'SPACE',
      text_size: 18,
      normal_color: COLOR_DARK_BTN,
      press_color: COLOR_DARK_BTN_PRESS,
      click_func: () => press(' '),
    })
  )

  add(
    createWidget(widget.BUTTON, {
      x: 146,
      y,
      w: 76,
      h: KEY_H,
      radius: 10,
      text: 'DEL',
      text_size: 18,
      normal_color: COLOR_DARK_BTN,
      press_color: COLOR_DARK_BTN_PRESS,
      click_func: () => {
        value = value.slice(0, -1)
        refresh()
      },
    })
  )

  add(
    createWidget(widget.BUTTON, {
      x: 230,
      y,
      w: 108,
      h: KEY_H,
      radius: 10,
      text: 'CANCEL',
      text_size: 18,
      normal_color: 0x330000,
      press_color: 0x550000,
      click_func: () => {
        close()
        onCancel && onCancel()
      },
    })
  )

  add(
    createWidget(widget.BUTTON, {
      x: 346,
      y,
      w: 104,
      h: KEY_H,
      radius: 10,
      text: 'OK',
      text_size: 20,
      normal_color: COLOR_ACCENT,
      press_color: 0x0288d1,
      click_func: () => {
        const result = value.trim()
        close()
        onDone && onDone(result)
      },
    })
  )

  function close() {
    widgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
  }

  return { close }
}
