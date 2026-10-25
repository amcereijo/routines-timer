import {
  createWidget,
  deleteWidget,
  widget,
  align,
  prop,
  text_style,
} from '@zos/ui'
import { back } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  SAFE_MARGIN,
  SAFE_WIDTH,
  SAFE_HEIGHT,
  COLOR_ACCENT,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
  COLOR_SUBTEXT,
  MAX_STEPS,
  DEFAULT_REST_SECONDS,
} from '../utils/constants'
import { formatStepSummary } from '../utils/format'
import { addRoutine } from '../utils/storage'
import { promptText } from '../utils/textInput'

const MIN_VALUES = []
for (let i = 0; i < 60; i++) MIN_VALUES.push(i)
const SEC_VALUES = []
for (let i = 0; i < 60; i += 5) SEC_VALUES.push(i)
const REPEAT_VALUES = []
for (let i = 1; i <= 20; i++) REPEAT_VALUES.push(i)

// ---- Layout (safe drawing area: 70..410 on both axes) ----
const TITLE_Y = SAFE_MARGIN + 6 // 76
const NAME_Y = SAFE_MARGIN + 44 // 114
const LIST_TOP = SAFE_MARGIN + 88 // 158
const SAVE_Y = SAFE_MARGIN + SAFE_HEIGHT - 60 // 350
const LIST_H = SAVE_Y - 8 - LIST_TOP // 184
const ROW_H = 54
const ROW_GAP = 8
const ADD_ROW_H = 46
const DEL_W = 50

Page({
  onInit(params) {
    this.steps = []
    this.routineName = ''
    this.editId = null
    try {
      const data = typeof params === 'string' ? JSON.parse(params) : params
      if (data && data.edit) {
        // Editing an existing routine
        this.routineName = data.edit.name || ''
        this.editId = data.edit.id != null ? data.edit.id : null
        if (Array.isArray(data.edit.steps)) {
          // Deep copy so we never mutate the stored object before saving
          this.steps = data.edit.steps.map((s) => ({
            seconds: s.seconds,
            name: s.name || '',
            repeat: s.repeat || 1,
            rest: s.rest != null ? s.rest : DEFAULT_REST_SECONDS,
          }))
        }
      }
    } catch (e) {}
    this.headerWidgets = []
    this.footerWidgets = []
    this.listWidgets = []
    this.pickerWidgets = []
    this.pickerCtx = null
    this.minIdx = 0
    this.secIdx = 6
    this.repeatIdx = 0
    this.restMinIdx = 0
    this.restSecIdx = 2
    this.listScrollY = 0
    this.scrollToEnd = false
    this.listView = null
    this.routineNameWidget = null
    this.routineNameBtn = null
  },

  onDestroy() {
    this.clearHeaderWidgets()
    this.clearListWidgets()
    this.clearFooterWidgets()
    this.clearPickerWidgets()
    this.steps = null
  },

  build() {
    this.buildHeader()
    this.refreshList()
    this.buildFooter()
  },

  // ---- Header (title + routine name row) ----
  buildHeader() {
    this.headerWidgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: TITLE_Y,
        w: SAFE_WIDTH,
        h: 34,
        color: 0xffffff,
        text_size: 26,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text:
          this.editId != null ? getText('create_title_edit') : getText('create_title'),
      })
    )

    // Routine name row (tap the name itself to edit it)
    this.routineNameBtn = createWidget(widget.BUTTON, {
      x: SAFE_MARGIN,
      y: NAME_Y,
      w: SAFE_WIDTH,
      h: 38,
      radius: 19,
      normal_color: 0x141414,
      press_color: 0x2a2a2a,
      click_func: () => this.editRoutineName(),
    })
    this.headerWidgets.push(this.routineNameBtn)

    this.routineNameWidget = createWidget(widget.TEXT, {
      x: SAFE_MARGIN + 16,
      y: NAME_Y + 6,
      w: SAFE_WIDTH - 32,
      h: 26,
      color: COLOR_ACCENT,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })
    this.routineNameWidget.setEnable(false)
    this.headerWidgets.push(this.routineNameWidget)

    this.refreshRoutineName()
  },

  clearHeaderWidgets() {
    this.headerWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.headerWidgets = []
    this.routineNameWidget = null
    this.routineNameBtn = null
  },

  // ---- Footer (save button) ----
  buildFooter() {
    this.footerWidgets.push(
      createWidget(widget.BUTTON, {
        x: SAFE_MARGIN,
        y: SAVE_Y,
        w: SAFE_WIDTH,
        h: 52,
        radius: 26,
        text: getText('create_save'),
        text_size: 22,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => {
          if (this.steps.length === 0) return
          addRoutine(this.routineName, this.steps, this.editId)
          this.steps = []
          this.routineName = ''
          this.editId = null
          this.refreshRoutineName()
          this.refreshList()
          back()
        },
      })
    )
  },

  clearFooterWidgets() {
    this.footerWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.footerWidgets = []
  },

  /**
   * Removes every widget of the page. Used before showing a modal overlay
   * (picker or keyboard) so nothing of the page bleeds through it.
   */
  hidePageContent() {
    this.clearHeaderWidgets()
    this.clearListWidgets()
    this.clearFooterWidgets()
  },

  /** Rebuilds the page widgets (scroll position is preserved). */
  showPageContent() {
    this.buildHeader()
    this.refreshList()
    this.buildFooter()
  },

  refreshRoutineName() {
    if (!this.routineNameWidget) return
    const name = this.routineName || getText('create_routine_name')
    this.routineNameWidget.setProperty(prop.TEXT, name)
  },

  editRoutineName() {
    promptText({
      title: getText('name_input_title_routine'),
      text: this.routineName,
      // The keyboard is drawn on its own layer: remove the page content so
      // nothing shows through it.
      onShow: () => this.hidePageContent(),
      onHide: () => this.showPageContent(),
      onDone: (name) => {
        this.routineName = name
      },
      onCancel: () => {},
    })
  },

  clearListWidgets() {
    // Children first, then the scroll container itself
    this.listWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.listWidgets = []
    if (this.listView) {
      try {
        deleteWidget(this.listView)
      } catch (e) {}
      this.listView = null
    }
  },

  clearPickerWidgets() {
    this.pickerWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.pickerWidgets = []
  },

  stepDisplayName(i) {
    const s = this.steps[i]
    return (s.name && s.name.trim()) || `${getText('step_label')} ${i + 1}`
  },

  refreshList() {
    this.clearListWidgets()

    // Scrollable container: behaves like a regular list of elements
    const container = createWidget(widget.VIEW_CONTAINER, {
      x: SAFE_MARGIN,
      y: LIST_TOP,
      w: SAFE_WIDTH,
      h: LIST_H,
      scroll_enable: 1,
      bounce: 1,
      scroll_complete_func: (info) => {
        if (info && typeof info.yoffset === 'number') {
          this.listScrollY = info.yoffset
        }
      },
    })
    this.listView = container

    if (this.steps.length === 0) {
      // The "+ Add Step" button is the first item of the scroll, so the
      // hint has to go below it.
      this.listWidgets.push(
        container.createWidget(widget.TEXT, {
          x: 12,
          y: ADD_ROW_H + 10,
          w: SAFE_WIDTH - 24,
          h: 48,
          color: COLOR_SUBTEXT,
          text_size: 18,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text_style: text_style.WRAP,
          text: getText('saved_empty_hint'),
        })
      )
    } else {
      this.steps.forEach((step, i) => {
        const y = i * (ROW_H + ROW_GAP)

        // Row background: tap to edit the step
        const rowBtn = container.createWidget(widget.BUTTON, {
          x: 0,
          y,
          w: SAFE_WIDTH - DEL_W - 6,
          h: ROW_H,
          radius: 14,
          normal_color: 0x141414,
          press_color: 0x2a2a2a,
          click_func: () => {
            this.openPicker({ mode: 'edit', index: i })
          },
        })

        // Line 1: step number + name
        const nameLabel = container.createWidget(widget.TEXT, {
          x: 14,
          y: y + 4,
          w: SAFE_WIDTH - DEL_W - 34,
          h: 26,
          color: 0xffffff,
          text_size: 20,
          align_h: align.LEFT,
          align_v: align.CENTER_V,
          text: `${i + 1} · ${this.stepDisplayName(i)}`,
        })
        nameLabel.setEnable(false)

        // Line 2: duration + repeat indicator
        const durLabel = container.createWidget(widget.TEXT, {
          x: 14,
          y: y + 28,
          w: SAFE_WIDTH - DEL_W - 34,
          h: 22,
          color: COLOR_ACCENT,
          text_size: 18,
          align_h: align.LEFT,
          align_v: align.CENTER_V,
          text: formatStepSummary(step),
        })
        durLabel.setEnable(false)

        // Delete button
        const del = container.createWidget(widget.BUTTON, {
          x: SAFE_WIDTH - DEL_W,
          y: y + 4,
          w: DEL_W,
          h: ROW_H - 8,
          radius: 12,
          text: '×',
          text_size: 28,
          normal_color: 0x330000,
          press_color: 0x550000,
          click_func: () => {
            this.steps.splice(i, 1)
            this.refreshList()
          },
        })

        this.listWidgets.push(rowBtn, nameLabel, durLabel, del)
      })
    }

    // Last element of the scroll: add another step
    const addY = this.steps.length * (ROW_H + ROW_GAP)
    this.listWidgets.push(
      container.createWidget(widget.BUTTON, {
        x: 0,
        y: addY,
        w: SAFE_WIDTH,
        h: ADD_ROW_H,
        radius: ADD_ROW_H / 2,
        text: `+ ${getText('create_add_step')}`,
        text_size: 20,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          if (this.steps.length >= MAX_STEPS) return
          this.openPicker({ mode: 'add' })
        },
      })
    )

    // Scroll position: end of the list when a step was just added,
    // otherwise keep the current offset.
    const contentH = addY + ADD_ROW_H
    const maxY = Math.max(0, contentH - LIST_H)
    const targetY = this.scrollToEnd ? maxY : Math.min(this.listScrollY, maxY)
    this.scrollToEnd = false

    // The container needs a tick to know its final content height
    setTimeout(() => {
      if (!this.listView || this.listView !== container) return
      try {
        this.listView.setProperty(prop.POS_Y, targetY)
      } catch (e) {}
    }, 50)
  },

  openPicker(ctx) {
    let seconds = 30
    let repeat = 1
    let rest = DEFAULT_REST_SECONDS
    if (ctx.mode === 'edit') {
      const s = this.steps[ctx.index]
      seconds = s.seconds
      repeat = s.repeat || 1
      rest = s.rest != null ? s.rest : DEFAULT_REST_SECONDS
    }

    // The list lives in a scroll layer that is always drawn above regular
    // widgets, and the page widgets would show through the picker
    // overlay, so the whole page is removed while it is open.
    this.hidePageContent()

    this.minIdx = Math.min(59, Math.floor(seconds / 60))
    const secMod = seconds % 60
    this.secIdx = SEC_VALUES.indexOf(secMod)
    if (this.secIdx < 0) this.secIdx = 0
    this.repeatIdx = Math.min(REPEAT_VALUES.length - 1, Math.max(0, repeat - 1))
    this.restMinIdx = Math.min(59, Math.floor(rest / 60))
    const restSecMod = rest % 60
    this.restSecIdx = SEC_VALUES.indexOf(restSecMod)
    if (this.restSecIdx < 0) this.restSecIdx = 0
    this.pickerCtx = ctx
    this.pickerName = ctx.mode === 'edit' ? this.steps[ctx.index].name || '' : ''

    // Simple layout within safe area
    const TOP = SAFE_MARGIN + 6
    const BOT = SAFE_MARGIN + SAFE_HEIGHT - 6
    const CX = SAFE_MARGIN + Math.floor(SAFE_WIDTH / 2)  // center X
    const L = SAFE_MARGIN + 10
    const R = SAFE_MARGIN + SAFE_WIDTH - 10
    const BTN = 54
    const VAL = 120
    const GAP = 6

    this.pickerWidgets.push(
      createWidget(widget.FILL_RECT, {
        x: SAFE_MARGIN,
        y: SAFE_MARGIN,
        w: SAFE_WIDTH,
        h: SAFE_HEIGHT,
        color: 0x000000,
      }),
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: TOP,
        w: SAFE_WIDTH,
        h: 28,
        color: 0xffffff,
        text_size: 22,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText('picker_title'),
      })
    )

    // Name row
    const nameY = TOP + 34
    const nameRowBtn = createWidget(widget.BUTTON, {
      x: L,
      y: nameY,
      w: R - L,
      h: 36,
      radius: 18,
      normal_color: 0x1a1a1a,
      press_color: 0x333333,
      click_func: () => {
        promptText({
          title: getText('name_input_title_step'),
          text: this.pickerName,
          // Hide the picker while the keyboard is open
          onShow: () => this.setPickerVisible(false),
          onHide: () => this.setPickerVisible(true),
          onDone: (name) => {
            this.pickerName = name
            this.pickerNameWidget.setProperty(
              prop.TEXT,
              name || getText('name_input_title_step')
            )
          },
          onCancel: () => {},
        })
      },
    })

    this.pickerNameWidget = createWidget(widget.TEXT, {
      x: L + 12,
      y: nameY + 6,
      w: R - L - 24,
      h: 24,
      color: COLOR_ACCENT,
      text_size: 16,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: this.pickerName || getText('name_input_title_step'),
    })
    this.pickerNameWidget.setEnable(false)
    this.pickerWidgets.push(nameRowBtn, this.pickerNameWidget)

    // Timer: mm:ss in one line (no label)
    const timerY = nameY + 44
    const timerVal = createWidget(widget.TEXT, {
      x: CX - Math.floor(VAL / 2),
      y: timerY,
      w: VAL,
      h: 48,
      color: 0xffffff,
      text_size: 36,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: `${String(MIN_VALUES[this.minIdx]).padStart(2, '0')}:${String(SEC_VALUES[this.secIdx]).padStart(2, '0')}`,
    })

    const timerMinusX = CX - Math.floor(VAL / 2) - BTN - GAP
    const timerPlusX = CX + Math.floor(VAL / 2) + GAP

    this.pickerWidgets.push(
      timerVal,
      createWidget(widget.BUTTON, {
        x: timerMinusX,
        y: timerY,
        w: BTN,
        h: 48,
        radius: 10,
        text: '−',
        text_size: 24,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          let total = MIN_VALUES[this.minIdx] * 60 + SEC_VALUES[this.secIdx]
          total = Math.max(0, total - 5)
          this.minIdx = Math.floor(total / 60)
          this.secIdx = SEC_VALUES.indexOf(total % 60)
          if (this.secIdx < 0) this.secIdx = 0
          timerVal.setProperty(prop.TEXT, `${String(MIN_VALUES[this.minIdx]).padStart(2, '0')}:${String(SEC_VALUES[this.secIdx]).padStart(2, '0')}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: timerPlusX,
        y: timerY,
        w: BTN,
        h: 48,
        radius: 10,
        text: '+',
        text_size: 24,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          let total = MIN_VALUES[this.minIdx] * 60 + SEC_VALUES[this.secIdx]
          total = Math.min(3540, total + 5)
          this.minIdx = Math.floor(total / 60)
          this.secIdx = SEC_VALUES.indexOf(total % 60)
          if (this.secIdx < 0) this.secIdx = 0
          timerVal.setProperty(prop.TEXT, `${String(MIN_VALUES[this.minIdx]).padStart(2, '0')}:${String(SEC_VALUES[this.secIdx]).padStart(2, '0')}`)
        },
      })
    )

    // Repeat label
    const repeatLabelY = timerY + 56
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: repeatLabelY,
        w: SAFE_WIDTH,
        h: 18,
        color: COLOR_SUBTEXT,
        text_size: 14,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText('picker_repeat'),
      })
    )

    // Repeat control
    const repeatY = repeatLabelY + 20
    const repeatVal = createWidget(widget.TEXT, {
      x: CX - Math.floor(VAL / 2),
      y: repeatY,
      w: VAL,
      h: 48,
      color: 0xffffff,
      text_size: 36,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: `×${REPEAT_VALUES[this.repeatIdx]}`,
    })

    const repeatMinusX = CX - Math.floor(VAL / 2) - BTN - GAP
    const repeatPlusX = CX + Math.floor(VAL / 2) + GAP

    this.pickerWidgets.push(
      repeatVal,
      createWidget(widget.BUTTON, {
        x: repeatMinusX,
        y: repeatY,
        w: BTN,
        h: 48,
        radius: 10,
        text: '−',
        text_size: 24,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.repeatIdx = (this.repeatIdx - 1 + REPEAT_VALUES.length) % REPEAT_VALUES.length
          repeatVal.setProperty(prop.TEXT, `×${REPEAT_VALUES[this.repeatIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: repeatPlusX,
        y: repeatY,
        w: BTN,
        h: 48,
        radius: 10,
        text: '+',
        text_size: 24,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.repeatIdx = (this.repeatIdx + 1) % REPEAT_VALUES.length
          repeatVal.setProperty(prop.TEXT, `×${REPEAT_VALUES[this.repeatIdx]}`)
        },
      })
    )

    // Rest label
    const restLabelY = repeatY + 56
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: SAFE_MARGIN,
        y: restLabelY,
        w: SAFE_WIDTH,
        h: 18,
        color: COLOR_SUBTEXT,
        text_size: 14,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.ELLIPSIS,
        text: getText('picker_rest'),
      })
    )

    // Rest control
    const restY = restLabelY + 20
    const restVal = createWidget(widget.TEXT, {
      x: CX - Math.floor(VAL / 2),
      y: restY,
      w: VAL,
      h: 48,
      color: 0xffffff,
      text_size: 36,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: `${String(MIN_VALUES[this.restMinIdx]).padStart(2, '0')}:${String(SEC_VALUES[this.restSecIdx]).padStart(2, '0')}`,
    })

    const restMinusX = CX - Math.floor(VAL / 2) - BTN - GAP
    const restPlusX = CX + Math.floor(VAL / 2) + GAP

    this.pickerWidgets.push(
      restVal,
      createWidget(widget.BUTTON, {
        x: restMinusX,
        y: restY,
        w: BTN,
        h: 48,
        radius: 10,
        text: '−',
        text_size: 24,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          let total = MIN_VALUES[this.restMinIdx] * 60 + SEC_VALUES[this.restSecIdx]
          total = Math.max(0, total - 5)
          this.restMinIdx = Math.floor(total / 60)
          this.restSecIdx = SEC_VALUES.indexOf(total % 60)
          if (this.restSecIdx < 0) this.restSecIdx = 0
          restVal.setProperty(prop.TEXT, `${String(MIN_VALUES[this.restMinIdx]).padStart(2, '0')}:${String(SEC_VALUES[this.restSecIdx]).padStart(2, '0')}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: restPlusX,
        y: restY,
        w: BTN,
        h: 48,
        radius: 10,
        text: '+',
        text_size: 24,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          let total = MIN_VALUES[this.restMinIdx] * 60 + SEC_VALUES[this.restSecIdx]
          total = Math.min(3599, total + 5)
          this.restMinIdx = Math.floor(total / 60)
          this.restSecIdx = SEC_VALUES.indexOf(total % 60)
          if (this.restSecIdx < 0) this.restSecIdx = 0
          restVal.setProperty(prop.TEXT, `${String(MIN_VALUES[this.restMinIdx]).padStart(2, '0')}:${String(SEC_VALUES[this.restSecIdx]).padStart(2, '0')}`)
        },
      })
    )

    // Cancel / OK buttons
    const btnY = BOT - 40
    this.pickerWidgets.push(
      createWidget(widget.BUTTON, {
        x: CX - 145,
        y: btnY,
        w: 130,
        h: 44,
        radius: 22,
        text: 'CANCEL',
        text_size: 18,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => this.closePicker(),
      }),
      createWidget(widget.BUTTON, {
        x: CX + 15,
        y: btnY,
        w: 130,
        h: 44,
        radius: 22,
        text: 'OK',
        text_size: 20,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => {
          const seconds = MIN_VALUES[this.minIdx] * 60 + SEC_VALUES[this.secIdx]
          const repeat = REPEAT_VALUES[this.repeatIdx]
          const rest = MIN_VALUES[this.restMinIdx] * 60 + SEC_VALUES[this.restSecIdx]
          if (seconds > 0) {
            const stepData = {
              seconds,
              name: this.pickerName || '',
              repeat: repeat > 1 ? repeat : undefined,
              rest: repeat > 1 ? rest : undefined,
            }
            if (this.pickerCtx.mode === 'add') {
              this.steps.push(stepData)
              // Go back to the list, always scrolled to the end
              this.scrollToEnd = true
            } else {
              this.steps[this.pickerCtx.index] = stepData
            }
          }
          this.closePicker()
        },
      })
    )
  },

  /** Shows/hides the picker overlay (used while a keyboard is open). */
  setPickerVisible(visible) {
    this.pickerWidgets.forEach((w) => {
      try {
        w.setProperty(prop.VISIBLE, visible)
      } catch (e) {}
    })
  },

  closePicker() {
    this.clearPickerWidgets()
    this.pickerNameWidget = null
    // Rebuild the page (scroll position is preserved)
    this.showPageContent()
  },
})
