import {
  createWidget,
  deleteWidget,
  widget,
  align,
  text_style,
} from '@zos/ui'
import { back } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  SAFE_MARGIN,
  SAFE_WIDTH,
  COLOR_TEXT,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
} from '../utils/constants'
import { QR_SIZE, QR_MATRIX } from '../utils/generatedQr'

// ---- Layout (safe drawing area: 70..410 on both axes) ----
const TITLE_Y = SAFE_MARGIN // 70
const TITLE_H = 22 // 70..92
// The code is drawn module by module, so the size is ours to choose.
// 7px per module keeps the whole code (33 modules) plus the 4-module
// quiet zone inside the round screen.
const MODULE = 7
const QUIET = 4
const CARD_W = (QR_SIZE + QUIET * 2) * MODULE // 287
const CARD_X = Math.round((480 - CARD_W) / 2) // 96
const CARD_Y = 96 // 96..383
const CODE_X = CARD_X + QUIET * MODULE // 124
const CODE_Y = CARD_Y + QUIET * MODULE // 124
const BTN_Y = CARD_Y + CARD_W + 9 // 392 (392..432)
const BTN_H = 40
const BTN_W = 200
const BTN_X = Math.round((480 - BTN_W) / 2) // 140

/** True when the module at (row, col) is dark. */
function isDark(row, col) {
  return QR_MATRIX.charCodeAt(row * QR_SIZE + col) === 49 // '1'
}

/**
 * Splits the code into the fewest rectangles possible: every dark module
 * is covered exactly once, and neighbouring modules are merged into
 * bigger blocks (a 33x33 code needs ~210 rectangles instead of ~550).
 */
function buildRectangles() {
  const covered = new Uint8Array(QR_SIZE * QR_SIZE)
  const rects = []
  for (let row = 0; row < QR_SIZE; row++) {
    for (let col = 0; col < QR_SIZE; col++) {
      const index = row * QR_SIZE + col
      if (!isDark(row, col) || covered[index]) continue

      // How far can the block grow to the right?
      let w = 1
      while (
        col + w < QR_SIZE &&
        isDark(row, col + w) &&
        !covered[index + w]
      ) {
        w++
      }

      // And how far down, as long as the whole row of the block is dark?
      let h = 1
      while (row + h < QR_SIZE) {
        let solid = true
        for (let k = 0; k < w; k++) {
          const below = (row + h) * QR_SIZE + col + k
          if (!isDark(row + h, col + k) || covered[below]) {
            solid = false
            break
          }
        }
        if (!solid) break
        h++
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          covered[(row + y) * QR_SIZE + col + x] = 1
        }
      }
      rects.push({ x: col, y: row, w, h })
    }
  }
  return rects
}

/**
 * Shows the QR code of the web routine builder.
 *
 * The code is drawn by the app itself (one filled rectangle per block of
 * dark modules) instead of with the QRCODE widget: the widget renders
 * the code into a fixed-size bitmap and crops it, so a code of this size
 * loses its right-hand column — the finder pattern never appears and
 * the code cannot be scanned.
 */
Page({
  onInit() {
    this.widgets = []
  },

  onDestroy() {
    this.widgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.widgets = []
  },

  build() {
    // Title
    this.widgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: TITLE_Y,
        w: SAFE_WIDTH,
        h: TITLE_H,
        color: COLOR_TEXT,
        text_size: 20,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText('web_qr_title'),
      })
    )

    // The white card the code sits on: a QR code needs a light
    // background (and a quiet zone) around it to be readable.
    this.widgets.push(
      createWidget(widget.FILL_RECT, {
        x: CARD_X,
        y: CARD_Y,
        w: CARD_W,
        h: CARD_W,
        color: 0xffffff,
      })
    )

    // The code itself
    buildRectangles().forEach((rect) => {
      this.widgets.push(
        createWidget(widget.FILL_RECT, {
          x: CODE_X + rect.x * MODULE,
          y: CODE_Y + rect.y * MODULE,
          w: rect.w * MODULE,
          h: rect.h * MODULE,
          color: 0x000000,
        })
      )
    })

    // Back to the address
    this.widgets.push(
      createWidget(widget.BUTTON, {
        x: BTN_X,
        y: BTN_Y,
        w: BTN_W,
        h: BTN_H,
        radius: BTN_H / 2,
        text: getText('web_back'),
        text_size: 20,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => back(),
      })
    )
  },
})
