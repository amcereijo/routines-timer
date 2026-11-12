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
  DEVICE_WIDTH,
  SAFE_MARGIN,
  SAFE_WIDTH,
  COLOR_TEXT,
  COLOR_SUBTEXT,
  COLOR_ACCENT,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
  WEB_BUILDER_URL,
} from '../utils/constants'

// ---- Layout (safe drawing area: 70..410 on both axes) ----
const TITLE_Y = SAFE_MARGIN // 70
const TITLE_H = 24 // 70..94
const DESC_Y = TITLE_Y + TITLE_H + 2 // 96
const DESC_H = 58 // 96..154
const QR_SIZE = 170
const QR_X = Math.round((DEVICE_WIDTH - QR_SIZE) / 2) // 155
const QR_Y = DESC_Y + DESC_H + 10 // 164
const QR_BG_PAD = 8 // white margin around the code
const URL_Y = QR_Y + QR_SIZE + 12 // 346
const URL_H = 22 // 346..368
const BTN_W = 130
const BTN_H = 36
const BTN_X = Math.round((DEVICE_WIDTH - BTN_W) / 2) // 175
const BTN_Y = URL_Y + URL_H + 4 // 372 (372..408)

/**
 * Shows the address of the web routine builder so the user can open it on
 * another device (phone, computer) and build routines there.
 *
 * The screen shows the plain address, a QR code with the same address and a
 * short explanation of what the link is for.
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
        text_size: 21,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText('web_title'),
      })
    )

    // What the link is for
    this.widgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: DESC_Y,
        w: SAFE_WIDTH,
        h: DESC_H,
        color: COLOR_SUBTEXT,
        text_size: 15,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.WRAP,
        text: getText('web_desc'),
      })
    )

    // QR code with the same address. Older firmware may not know the widget,
    // in that case the address alone is shown.
    let hasQr = true
    try {
      this.widgets.push(
        createWidget(widget.QRCODE, {
          content: WEB_BUILDER_URL,
          x: QR_X,
          y: QR_Y,
          w: QR_SIZE,
          h: QR_SIZE,
          bg_x: QR_X - QR_BG_PAD,
          bg_y: QR_Y - QR_BG_PAD,
          bg_w: QR_SIZE + QR_BG_PAD * 2,
          bg_h: QR_SIZE + QR_BG_PAD * 2,
        })
      )
    } catch (e) {
      console.log('QR code widget not available', e)
      hasQr = false
    }
    if (!hasQr) {
      this.widgets.push(
        createWidget(widget.TEXT, {
          x: SAFE_MARGIN,
          y: QR_Y,
          w: SAFE_WIDTH,
          h: QR_SIZE,
          color: COLOR_SUBTEXT,
          text_size: 16,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text_style: text_style.WRAP,
          text: getText('web_qr_unavailable'),
        })
      )
    }

    // The address itself
    this.widgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: URL_Y,
        w: SAFE_WIDTH,
        h: URL_H,
        color: COLOR_ACCENT,
        text_size: 13,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.WRAP,
        text: WEB_BUILDER_URL,
      })
    )

    // Back to the routine editor
    this.widgets.push(
      createWidget(widget.BUTTON, {
        x: BTN_X,
        y: BTN_Y,
        w: BTN_W,
        h: BTN_H,
        radius: BTN_H / 2,
        text: getText('web_back'),
        text_size: 18,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => back(),
      })
    )
  },
})
