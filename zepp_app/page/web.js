import {
  createWidget,
  deleteWidget,
  widget,
  align,
  text_style,
} from '@zos/ui'
import { back, push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
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
const TITLE_H = 40 // 70..110
const DESC_Y = TITLE_Y + TITLE_H + 6 // 116
const DESC_H = 96 // 116..212
const URL_Y = DESC_Y + DESC_H + 4 // 216
const URL_H = 50 // 216..266
const BTN_H = 48
const BTN_RADIUS = BTN_H / 2
// Row 1: the QR code, on its own screen
const QR_BTN_Y = URL_Y + URL_H + 10 // 276 (276..324)
// Row 2: the import step and back
const BTN_ROW2_Y = QR_BTN_Y + BTN_H + 8 // 332 (332..380)
const BTN_HALF_W = 165
const BTN_GAP = 10
const LEFT_BTN_X = SAFE_MARGIN // 70 (70..235)
const RIGHT_BTN_X = SAFE_MARGIN + BTN_HALF_W + BTN_GAP // 245 (245..410)

/**
 * Shows the address of the web routine builder so the user can open it on
 * another device (phone, computer) and build routines there.
 *
 * The screen shows the address and what it is for, plus the three actions
 * of the flow: show the QR code (on its own screen), enter the import
 * code of a routine built in the web app, and go back.
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
        text_size: 32,
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
        text_size: 24,
        align_h: align.CENTER_H,
        align_v: align.TOP,
        text_style: text_style.WRAP,
        text: getText('web_desc'),
      })
    )

    // The address itself
    this.widgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: URL_Y,
        w: SAFE_WIDTH,
        h: URL_H,
        color: COLOR_ACCENT,
        text_size: 18,
        align_h: align.CENTER_H,
        align_v: align.TOP,
        text_style: text_style.WRAP,
        text: WEB_BUILDER_URL,
      })
    )

    // The QR code, on its own screen
    this.widgets.push(
      createWidget(widget.BUTTON, {
        x: SAFE_MARGIN,
        y: QR_BTN_Y,
        w: SAFE_WIDTH,
        h: BTN_H,
        radius: BTN_RADIUS,
        text: getText('web_show_qr'),
        text_size: 22,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => push({ url: 'page/qr' }),
      })
    )

    // The routine is built in the browser and comes back with an import
    // code: the code is entered on the watch.
    this.widgets.push(
      createWidget(widget.BUTTON, {
        x: LEFT_BTN_X,
        y: BTN_ROW2_Y,
        w: BTN_HALF_W,
        h: BTN_H,
        radius: BTN_RADIUS,
        text: getText('web_enter_code'),
        text_size: 22,
        normal_color: 0x0d2637,
        press_color: 0x14415c,
        color: COLOR_ACCENT,
        click_func: () => push({ url: 'page/import' }),
      })
    )

    // Back to the Add Routine section
    this.widgets.push(
      createWidget(widget.BUTTON, {
        x: RIGHT_BTN_X,
        y: BTN_ROW2_Y,
        w: BTN_HALF_W,
        h: BTN_H,
        radius: BTN_RADIUS,
        text: getText('web_back'),
        text_size: 22,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => back(),
      })
    )
  },
})
