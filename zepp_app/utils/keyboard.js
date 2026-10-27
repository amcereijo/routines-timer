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
  COLOR_DISABLED_BTN,
  COLOR_DISABLED_TEXT,
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

// The target device is a round 480x480 display, so widgets near the top and
// bottom of the screen are clipped by the bezel. Everything is laid out
// against the circle rather than the square bounding box.
const SCREEN_R = DEVICE_WIDTH / 2
const SCREEN_CX = DEVICE_WIDTH / 2
const SCREEN_CY = DEVICE_HEIGHT / 2

/** Usable width of the horizontal band [y, y+h] inside the round bezel. */
function bandWidth(y, h) {
  const dy = Math.max(
    Math.abs(y - SCREEN_CY),
    Math.abs(y + h - SCREEN_CY)
  )
  const r2 = SCREEN_R * SCREEN_R - dy * dy
  return r2 <= 0 ? 0 : 2 * Math.sqrt(r2)
}

/**
 * Lay out `count` equally sized keys centered on the display, shrinking them
 * when the row would otherwise stick out of the round bezel.
 */
function layoutRow(count, y, h, maxW, gap) {
  const avail = bandWidth(y, h)
  const g = Math.min(gap, 8)
  let w = maxW
  if (count * w + (count - 1) * g > avail) {
    w = Math.floor((avail - (count - 1) * g) / count)
  }
  const total = count * w + (count - 1) * g
  const startX = Math.round(SCREEN_CX - total / 2)
  const slots = []
  for (let i = 0; i < count; i++) {
    slots.push({ x: startX + i * (w + g), w })
  }
  return slots
}

/** Lay out buttons with relative weights across the usable band width. */
function layoutWeighted(weights, y, h, gap) {
  const avail = bandWidth(y, h)
  const g = Math.min(gap, 8)
  const usable = Math.round(avail - g * (weights.length - 1))
  const sum = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map((wt) => Math.round((usable * wt) / sum))
  const used = widths.reduce((a, b) => a + b, 0)
  widths[widths.length - 1] += usable - used

  const total = used + g * (weights.length - 1)
  const startX = Math.round(SCREEN_CX - total / 2)
  const slots = []
  let x = startX
  widths.forEach((w) => {
    slots.push({ x, w })
    x += w + g
  })
  return slots
}

/**
 * Compact on-screen keyboard for devices without the API 4.0 system keyboard.
 *
 * openMiniKeyboard({
 *   title: string,
 *   text: string,              // initial value
 *   rows?: string[],           // key layout (default QWERTY+digits)
 *   maxLen?: number,           // input length cap (default 18)
 *   allowSpace?: boolean,      // show SPACE key (default true)
 *   disabled?: string[],       // characters shown greyed out, not tappable
 *   onDone: (text) => void,    // confirmed (text may be '')
 *   onCancel: () => void,
 * })
 */
export function openMiniKeyboard({
  title,
  text,
  rows,
  maxLen,
  allowSpace,
  disabled,
  onDone,
  onCancel,
}) {
  const keyRows = rows || ROWS
  const cap = maxLen || MAX_LEN
  const withSpace = allowSpace !== false
  const blocked = disabled || []
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
    if (blocked.indexOf(ch) !== -1) return
    if (value.length >= cap) return
    value += ch
    refresh()
  }

  // Character rows
  keyRows.forEach((row, r) => {
    const y = TOP + r * (KEY_H + GAP)
    const slots = layoutRow(row.length, y, KEY_H, KEY_W, GAP)
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      const slot = slots[i]
      const isBlocked = blocked.indexOf(ch) !== -1
      const options = {
        x: slot.x,
        y,
        w: slot.w,
        h: KEY_H,
        radius: 8,
        text: ch,
        text_size: 24,
        normal_color: isBlocked ? COLOR_DISABLED_BTN : COLOR_DARK_BTN,
        press_color: isBlocked ? COLOR_DISABLED_BTN : COLOR_DARK_BTN_PRESS,
      }
      if (isBlocked) {
        // Greyed out and inert: the character is not part of the accepted
        // alphabet, so tapping it must do nothing.
        options.text_color = COLOR_DISABLED_TEXT
      } else {
        options.click_func = () => press(ch)
      }
      add(createWidget(widget.BUTTON, options))
    }
  })

  // Bottom row: space, backspace, cancel, ok
  const y = TOP + 4 * (KEY_H + GAP)
  const weights = withSpace ? [0.22, 0.16, 0.31, 0.31] : [0.42, 0.29, 0.29]
  const slots = layoutWeighted(weights, y, KEY_H, 8)
  let slotIndex = 0

  // Without SPACE (e.g. import codes), DEL takes the wider left slot.
  if (withSpace) {
    add(
      createWidget(widget.BUTTON, {
        x: slots[slotIndex].x,
        y,
        w: slots[slotIndex].w,
        h: KEY_H,
        radius: 10,
        text: 'SPACE',
        text_size: 18,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => press(' '),
      })
    )
    slotIndex++
  }

  add(
    createWidget(widget.BUTTON, {
      x: slots[slotIndex].x,
      y,
      w: slots[slotIndex].w,
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
  slotIndex++

  add(
    createWidget(widget.BUTTON, {
      x: slots[slotIndex].x,
      y,
      w: slots[slotIndex].w,
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
  slotIndex++

  add(
    createWidget(widget.BUTTON, {
      x: slots[slotIndex].x,
      y,
      w: slots[slotIndex].w,
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
