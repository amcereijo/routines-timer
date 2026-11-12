import {
  createWidget,
  deleteWidget,
  widget,
  align,
  text_style,
} from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  SAFE_MARGIN,
  SAFE_WIDTH,
  COLOR_TEXT,
  COLOR_SUBTEXT,
  COLOR_ACCENT,
} from '../utils/constants'

// ---- Layout (safe drawing area: 70..410 on both axes) ----
const TITLE_Y = SAFE_MARGIN + 4 // 74
const TITLE_H = 38 // 74..112
const ROW_H = 76
const ROW_GAP = 10
const ROW1_Y = TITLE_Y + TITLE_H + 8 // 120 (120..196)
const ROW2_Y = ROW1_Y + ROW_H + ROW_GAP // 206 (206..282)
const HINT_Y = ROW2_Y + ROW_H + 12 // 294
const HINT_H = 56

/**
 * The ways a routine can be added.
 *
 * "On the watch" opens the routine editor, "In the web app" opens the
 * screen with the address and the QR code of the web routine builder.
 */
const ENTRIES = [
  {
    title: 'add_watch_title',
    hint: 'add_watch_hint',
    url: 'page/create',
  },
  {
    title: 'add_web_title',
    hint: 'add_web_hint',
    url: 'page/web',
  },
]

/**
 * The section where a routine is added.
 *
 * It replaces the separate "New Routine" and "Import" actions of the home
 * screen: the routine can be built on the watch or in the web app, and a
 * routine built in the web app comes back with its import code.
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
        text_size: 30,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText('add_title'),
      })
    )

    ENTRIES.forEach((entry, index) => {
      const y = index === 0 ? ROW1_Y : ROW2_Y

      // Row background: opens the screen of the entry
      const row = createWidget(widget.BUTTON, {
        x: SAFE_MARGIN,
        y,
        w: SAFE_WIDTH,
        h: ROW_H,
        radius: 16,
        normal_color: 0x0d2637,
        press_color: 0x14415c,
        click_func: () => push({ url: entry.url }),
      })

      // Line 1: what the entry does
      const title = createWidget(widget.TEXT, {
        x: SAFE_MARGIN + 16,
        y: y + 8,
        w: SAFE_WIDTH - 32,
        h: 32,
        color: COLOR_ACCENT,
        text_size: 26,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText(entry.title),
      })
      title.setEnable(false)

      // Line 2: where it leads to
      const hint = createWidget(widget.TEXT, {
        x: SAFE_MARGIN + 16,
        y: y + 40,
        w: SAFE_WIDTH - 32,
        h: 28,
        color: COLOR_SUBTEXT,
        text_size: 20,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText(entry.hint),
      })
      hint.setEnable(false)

      this.widgets.push(row, title, hint)
    })

    // The web route is only half of the flow: the routine built in the web
    // app comes back with an import code.
    this.widgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: HINT_Y,
        w: SAFE_WIDTH,
        h: HINT_H,
        color: COLOR_SUBTEXT,
        text_size: 18,
        align_h: align.CENTER_H,
        align_v: align.TOP,
        text_style: text_style.WRAP,
        text: getText('add_hint'),
      })
    )
  },
})
