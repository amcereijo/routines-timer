import { createWidget, widget, align, prop } from '@zos/ui'
import { back } from '@zos/router'
import { getText } from '@zos/i18n'
import { BasePage } from '@zeppos/zml/base-page'
import {
  SAFE_MARGIN,
  SAFE_WIDTH,
  SAFE_HEIGHT,
  COLOR_ACCENT,
  COLOR_RED,
  COLOR_GREEN,
  COLOR_SUBTEXT,
  CODE_ALPHABET,
  CODE_LENGTH,
} from '../utils/constants'
import { openMiniKeyboard } from '../utils/keyboard'
import { parseRoutineDoc } from '../utils/routineDoc'
import { addRoutine } from '../utils/storage'

// The code keyboard reuses the default QWERTY layout, so it matches the
// routine/step name keyboard. Only the alphabet restriction differs: the
// six ambiguous characters (0/O, 1/I/L, U/V) are shown greyed out and
// cannot be typed, because the import-code alphabet excludes them.
const CODE_DISABLED = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  .split('')
  .filter((ch) => CODE_ALPHABET.indexOf(ch) === -1)

Page(
  BasePage({
    onInit() {
      this.code = ''
      this.widgets = {}
      this.busy = false
    },

    build() {
      // Title
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: SAFE_MARGIN + 10,
        w: SAFE_WIDTH,
        h: 46,
        color: 0xffffff,
        text_size: 32,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('import_title'),
      })

      // Current code / hint — tappable, opens the code keyboard
      this.widgets.value = createWidget(widget.BUTTON, {
        x: SAFE_MARGIN,
        y: SAFE_MARGIN + 70,
        w: SAFE_WIDTH,
        h: 56,
        radius: 28,
        text: getText('import_tap_to_enter'),
        text_size: 28,
        color: COLOR_ACCENT,
        normal_color: 0x141414,
        press_color: 0x2a2a2a,
        click_func: () => this.openCodeKeyboard(),
      })

      // Status / feedback line
      this.widgets.status = createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: SAFE_MARGIN + 140,
        w: SAFE_WIDTH,
        h: 80,
        color: COLOR_SUBTEXT,
        text_size: 22,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: '',
      })

      // Import action (gated: needs exactly CODE_LENGTH chars)
      createWidget(widget.BUTTON, {
        x: SAFE_MARGIN,
        y: SAFE_MARGIN + SAFE_HEIGHT - 74,
        w: SAFE_WIDTH,
        h: 64,
        radius: 32,
        text: getText('import_action'),
        text_size: 28,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => this.startImport(),
      })
    },

    onDestroy() {
      this.widgets = null
    },

    setStatus(text, color) {
      this.widgets.status.setProperty(prop.TEXT, text)
      this.widgets.status.setProperty(prop.COLOR, color || COLOR_SUBTEXT)
    },

    refreshValue() {
      this.widgets.value.setProperty(
        prop.TEXT,
        this.code.length ? this.code : getText('import_tap_to_enter')
      )
    },

    openCodeKeyboard() {
      if (this.busy) return
      openMiniKeyboard({
        title: getText('import_code_title'),
        text: this.code,
        maxLen: CODE_LENGTH,
        allowSpace: false,
        disabled: CODE_DISABLED,
        onDone: (text) => {
          this.code = text.toUpperCase()
          this.refreshValue()
          this.setStatus('')
        },
        onCancel: () => {},
      })
    },

    startImport() {
      if (this.busy) return
      if (this.code.length !== CODE_LENGTH) {
        this.setStatus(getText('import_error_incomplete'), COLOR_RED)
        return
      }

      this.busy = true
      this.setStatus(getText('import_loading'))

      // Guarded so a synchronous throw (e.g. messaging not ready) is
      // reported like a failed request instead of an unhandled error that
      // leaves the page stuck on "Importing...".
      let pending
      try {
        pending = this.request({
          method: 'routine.resolve',
          params: { code: this.code },
        })
      } catch (e) {
        console.log('import request failed', e)
        this.busy = false
        this.setStatus(getText('import_error_phone'), COLOR_RED)
        return
      }

      pending
        .then((result) => {
          const status = result && result.status
          if (status === 200) {
            const parsed = parseRoutineDoc(result.body)
            if (!parsed.ok) {
              this.setStatus(getText('import_error_data'), COLOR_RED)
              return
            }
            // Same semantics as manual creation (same-name overwrite,
            // oldest-first eviction); imported routines are ordinary routines.
            addRoutine(parsed.name, parsed.steps)
            this.setStatus(getText('import_success'), COLOR_GREEN)
            setTimeout(() => back(), 1200)
            return
          }
          if (status === 404) {
            this.setStatus(getText('import_error_code'), COLOR_RED)
            return
          }
          // status 0 (no HTTP response) or any other HTTP error.
          this.setStatus(getText('import_error_network'), COLOR_RED)
        })
        .catch((e) => {
          console.log('import request failed', e)
          // Request itself failed: phone app not connected / side service down.
          this.setStatus(getText('import_error_phone'), COLOR_RED)
        })
        .finally(() => {
          this.busy = false
        })
    },
  })
)
