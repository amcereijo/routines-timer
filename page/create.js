import {
  createWidget,
  deleteWidget,
  widget,
  align,
  prop,
  text_style,
} from '@zos/ui'
import { push, back } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  DEVICE_WIDTH,
  DEVICE_HEIGHT,
  COLOR_ACCENT,
  COLOR_GREEN,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
  COLOR_SUBTEXT,
  MAX_STEPS,
  DEFAULT_REST_SECONDS,
} from '../utils/constants'
import { formatDuration, formatStepSummary } from '../utils/format'
import { addRoutine } from '../utils/storage'
import { promptText } from '../utils/textInput'

const MIN_VALUES = []
for (let i = 0; i < 60; i++) MIN_VALUES.push(i)
const SEC_VALUES = []
for (let i = 0; i < 60; i += 5) SEC_VALUES.push(i)
const REPEAT_VALUES = []
for (let i = 1; i <= 20; i++) REPEAT_VALUES.push(i)

const WHEEL_H = 60
const WHEEL_Y = 140

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
    this.listWidgets = []
    this.pickerWidgets = []
    this.pickerCtx = null
    this.minIdx = 1
    this.secIdx = 0
    this.repeatIdx = 0
    this.restMinIdx = 0
    this.restSecIdx = 2
    this.listOffset = 0
    this.routineNameWidget = null
    this.routineNameBtn = null
  },

  onDestroy() {
    this.clearListWidgets()
    this.clearPickerWidgets()
    this.steps = null
  },

  build() {
    createWidget(widget.TEXT, {
      x: 0,
      y: 20,
      w: DEVICE_WIDTH,
      h: 46,
      color: 0xffffff,
      text_size: 32,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: this.editId != null ? getText('create_title_edit') : getText('create_title'),
    })

    // Routine name row (tap the name itself to edit it)
    this.routineNameBtn = createWidget(widget.BUTTON, {
      x: 40,
      y: 64,
      w: 400,
      h: 46,
      radius: 23,
      normal_color: 0x141414,
      press_color: 0x2a2a2a,
      click_func: () => this.editRoutineName(),
    })

    this.routineNameWidget = createWidget(widget.TEXT, {
      x: 60,
      y: 70,
      w: 340,
      h: 34,
      color: COLOR_ACCENT,
      text_size: 24,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })
    this.routineNameWidget.setEnable(false)
    this.refreshRoutineName()    // Bottom action bar
    createWidget(widget.BUTTON, {
      x: 40,
      y: 292,
      w: 400,
      h: 68,
      radius: 34,
      text: `+ ${getText('create_add_step')}`,
      text_size: 28,
      normal_color: COLOR_DARK_BTN,
      press_color: COLOR_DARK_BTN_PRESS,
      click_func: () => {
        if (this.steps.length >= MAX_STEPS) return
        this.openPicker({ mode: 'add' })
      },
    })

    createWidget(widget.BUTTON, {
      x: 40,
      y: 376,
      w: 190,
      h: 80,
      radius: 40,
      text: getText('create_start'),
      text_size: 28,
      normal_color: COLOR_GREEN,
      press_color: 0x009624,
      click_func: () => {
        if (this.steps.length === 0) return
        push({
          url: 'page/run',
          params: JSON.stringify({ name: this.routineName, steps: this.steps }),
        })
      },
    })

    createWidget(widget.BUTTON, {
      x: 250,
      y: 376,
      w: 190,
      h: 80,
      radius: 40,
      text: getText('create_save'),
      text_size: 28,
      normal_color: COLOR_ACCENT,
      press_color: 0x0288d1,
      click_func: () => {
        if (this.steps.length === 0) return
        addRoutine(this.routineName, this.steps, this.editId)
        this.steps = []
        this.routineName = ''
        this.editId = null
        this.listOffset = 0
        this.refreshRoutineName()
        this.refreshList()
        back()
      },
    })

    this.refreshList()
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
      onDone: (name) => {
        this.routineName = name
        this.refreshRoutineName()
      },
      onCancel: () => {},
    })
  },

  clearListWidgets() {
    this.listWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.listWidgets = []
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

    const AREA_TOP = 112
    const ROW_H = 70
    const ROW_GAP = 10
    const VISIBLE = 2

    if (this.steps.length === 0) {
      this.listWidgets.push(
        createWidget(widget.TEXT, {
          x: 0,
          y: AREA_TOP + 40,
          w: DEVICE_WIDTH,
          h: 60,
          color: COLOR_SUBTEXT,
          text_size: 26,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text: getText('saved_empty_hint'),
        })
      )
      return
    }

    const maxOffset = Math.max(0, this.steps.length - VISIBLE)
    if (this.listOffset > maxOffset) this.listOffset = maxOffset

    for (let row = 0; row < VISIBLE; row++) {
      const i = this.listOffset + row
      if (i >= this.steps.length) break
      const step = this.steps[i]
      const y = AREA_TOP + row * (ROW_H + ROW_GAP)

      const rowBtn = createWidget(widget.BUTTON, {
        x: 40,
        y,
        w: 318,
        h: ROW_H,
        radius: 16,
        normal_color: 0x141414,
        press_color: 0x2a2a2a,
        click_func: () => {
          this.openPicker({ mode: 'edit', index: i })
        },
      })

      // Line 1: step number + name
      const nameLabel = createWidget(widget.TEXT, {
        x: 58,
        y: y + 6,
        w: 288,
        h: 32,
        color: 0xffffff,
        text_size: 24,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text: `${i + 1} · ${this.stepDisplayName(i)}`,
      })
      // Let the button underneath receive the tap
      nameLabel.setEnable(false)

      // Line 2: duration + repeat indicator
      const durLabel = createWidget(widget.TEXT, {
        x: 58,
        y: y + 38,
        w: 288,
        h: 28,
        color: COLOR_ACCENT,
        text_size: 22,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text: formatStepSummary(step),
      })
      durLabel.setEnable(false)

      const del = createWidget(widget.BUTTON, {
        x: 366,
        y: y + 6,
        w: 74,
        h: ROW_H - 12,
        radius: 14,
        text: '×',
        text_size: 34,
        normal_color: 0x330000,
        press_color: 0x550000,
        click_func: () => {
          this.steps.splice(i, 1)
          this.refreshList()
        },
      })

      this.listWidgets.push(rowBtn, nameLabel, durLabel, del)
    }

    // Page indicator + scroll arrows on one compact strip (above "Add Step")
    if (this.steps.length > VISIBLE) {
      this.listWidgets.push(
        createWidget(widget.BUTTON, {
          x: 40,
          y: 264,
          w: 110,
          h: 26,
          radius: 13,
          text: '▲',
          text_size: 16,
          normal_color: COLOR_DARK_BTN,
          press_color: COLOR_DARK_BTN_PRESS,
          click_func: () => {
            this.listOffset = Math.max(0, this.listOffset - 1)
            this.refreshList()
          },
        }),
        createWidget(widget.TEXT, {
          x: 160,
          y: 264,
          w: 160,
          h: 26,
          color: COLOR_SUBTEXT,
          text_size: 18,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text: `${this.listOffset + 1}-${Math.min(this.listOffset + VISIBLE, this.steps.length)} / ${this.steps.length}`,
        }),
        createWidget(widget.BUTTON, {
          x: 330,
          y: 264,
          w: 110,
          h: 26,
          radius: 13,
          text: '▼',
          text_size: 16,
          normal_color: COLOR_DARK_BTN,
          press_color: COLOR_DARK_BTN_PRESS,
          click_func: () => {
            this.listOffset = Math.min(maxOffset, this.listOffset + 1)
            this.refreshList()
          },
        })
      )
    }
  },

  openPicker(ctx) {
    let seconds = 90
    let repeat = 1
    let rest = DEFAULT_REST_SECONDS
    if (ctx.mode === 'edit') {
      const s = this.steps[ctx.index]
      seconds = s.seconds
      repeat = s.repeat || 1
      rest = s.rest != null ? s.rest : DEFAULT_REST_SECONDS
    }

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
    // Track the picked name (default: current name or '')
    this.pickerName = ctx.mode === 'edit' ? this.steps[ctx.index].name || '' : ''

    // Layout constants for better readability
    const LABEL_SIZE = 20
    const VALUE_SIZE = 42
    const BTN_SIZE = 52
    const BTN_FONT = 28
    const ROW_H = 64
    const GAP = 10

    this.pickerWidgets.push(
      createWidget(widget.FILL_RECT, {
        x: 0,
        y: 0,
        w: DEVICE_WIDTH,
        h: DEVICE_HEIGHT,
        color: 0x000000,
      }),
      createWidget(widget.TEXT, {
        x: 0,
        y: 12,
        w: DEVICE_WIDTH,
        h: 36,
        color: 0xffffff,
        text_size: 26,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_title'),
      })
    )

    // ---- step name row (tap the row to edit the name) ----
    const nameRowBtn = createWidget(widget.BUTTON, {
      x: 30,
      y: 52,
      w: 420,
      h: 44,
      radius: 22,
      normal_color: 0x1a1a1a,
      press_color: 0x333333,
      click_func: () => {
        promptText({
          title: getText('name_input_title_step'),
          text: this.pickerName,
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
      x: 50,
      y: 60,
      w: 380,
      h: 30,
      color: COLOR_ACCENT,
      text_size: 22,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: this.pickerName || getText('name_input_title_step'),
    })
    this.pickerNameWidget.setEnable(false)
    this.pickerWidgets.push(nameRowBtn, this.pickerNameWidget)

    // ---- Row 1: Duration (min + sec side by side) ----
    let y = 108
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: 30,
        y,
        w: 200,
        h: 26,
        color: COLOR_SUBTEXT,
        text_size: LABEL_SIZE,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_min'),
      }),
      createWidget(widget.TEXT, {
        x: 250,
        y,
        w: 200,
        h: 26,
        color: COLOR_SUBTEXT,
        text_size: LABEL_SIZE,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_sec'),
      })
    )

    y += 28
    const minVal = createWidget(widget.TEXT, {
      x: 60,
      y,
      w: 160,
      h: ROW_H,
      color: 0xffffff,
      text_size: VALUE_SIZE,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `${MIN_VALUES[this.minIdx]}`,
    })

    const secVal = createWidget(widget.TEXT, {
      x: 260,
      y,
      w: 160,
      h: ROW_H,
      color: 0xffffff,
      text_size: VALUE_SIZE,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `${SEC_VALUES[this.secIdx]}`,
    })

    this.pickerWidgets.push(
      minVal,
      secVal,
      createWidget(widget.BUTTON, {
        x: 0,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '−',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.minIdx = (this.minIdx - 1 + MIN_VALUES.length) % MIN_VALUES.length
          minVal.setProperty(prop.TEXT, `${MIN_VALUES[this.minIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 220,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '+',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.minIdx = (this.minIdx + 1) % MIN_VALUES.length
          minVal.setProperty(prop.TEXT, `${MIN_VALUES[this.minIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 260,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '−',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.secIdx = (this.secIdx - 1 + SEC_VALUES.length) % SEC_VALUES.length
          secVal.setProperty(prop.TEXT, `${SEC_VALUES[this.secIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 420,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '+',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.secIdx = (this.secIdx + 1) % SEC_VALUES.length
          secVal.setProperty(prop.TEXT, `${SEC_VALUES[this.secIdx]}`)
        },
      })
    )

    // ---- Row 2: Repeat (single centered control) ----
    y = 200
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: 0,
        y,
        w: DEVICE_WIDTH,
        h: 26,
        color: COLOR_SUBTEXT,
        text_size: LABEL_SIZE,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_repeat'),
      })
    )

    y += 28
    const repeatVal = createWidget(widget.TEXT, {
      x: 140,
      y,
      w: 200,
      h: ROW_H,
      color: 0xffffff,
      text_size: VALUE_SIZE,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `×${REPEAT_VALUES[this.repeatIdx]}`,
    })

    this.pickerWidgets.push(
      repeatVal,
      createWidget(widget.BUTTON, {
        x: 60,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '−',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.repeatIdx = (this.repeatIdx - 1 + REPEAT_VALUES.length) % REPEAT_VALUES.length
          repeatVal.setProperty(prop.TEXT, `×${REPEAT_VALUES[this.repeatIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 360,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '+',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          this.repeatIdx = (this.repeatIdx + 1) % REPEAT_VALUES.length
          repeatVal.setProperty(prop.TEXT, `×${REPEAT_VALUES[this.repeatIdx]}`)
        },
      })
    )

    // ---- Row 3: Rest (single centered control with min:sec) ----
    y = 284
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: 0,
        y,
        w: DEVICE_WIDTH,
        h: 26,
        color: COLOR_SUBTEXT,
        text_size: LABEL_SIZE,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_rest'),
      })
    )

    y += 28
    const restVal = createWidget(widget.TEXT, {
      x: 140,
      y,
      w: 200,
      h: ROW_H,
      color: 0xffffff,
      text_size: VALUE_SIZE,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `${MIN_VALUES[this.restMinIdx]}:${SEC_VALUES[this.restSecIdx] < 10 ? '0' : ''}${SEC_VALUES[this.restSecIdx]}`,
    })

    this.pickerWidgets.push(
      restVal,
      createWidget(widget.BUTTON, {
        x: 60,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '−',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          // Decrement rest by 5 seconds
          let total = MIN_VALUES[this.restMinIdx] * 60 + SEC_VALUES[this.restSecIdx]
          total = Math.max(0, total - 5)
          this.restMinIdx = Math.floor(total / 60)
          this.restSecIdx = SEC_VALUES.indexOf(total % 60)
          if (this.restSecIdx < 0) this.restSecIdx = 0
          restVal.setProperty(prop.TEXT, `${MIN_VALUES[this.restMinIdx]}:${SEC_VALUES[this.restSecIdx] < 10 ? '0' : ''}${SEC_VALUES[this.restSecIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 360,
        y,
        w: BTN_SIZE,
        h: ROW_H,
        radius: 14,
        text: '+',
        text_size: BTN_FONT,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => {
          // Increment rest by 5 seconds
          let total = MIN_VALUES[this.restMinIdx] * 60 + SEC_VALUES[this.restSecIdx]
          total = Math.min(3599, total + 5)
          this.restMinIdx = Math.floor(total / 60)
          this.restSecIdx = SEC_VALUES.indexOf(total % 60)
          if (this.restSecIdx < 0) this.restSecIdx = 0
          restVal.setProperty(prop.TEXT, `${MIN_VALUES[this.restMinIdx]}:${SEC_VALUES[this.restSecIdx] < 10 ? '0' : ''}${SEC_VALUES[this.restSecIdx]}`)
        },
      })
    )

    // ---- cancel / confirm ----
    this.pickerWidgets.push(
      createWidget(widget.BUTTON, {
        x: 40,
        y: 396,
        w: 180,
        h: 52,
        radius: 26,
        text: 'CANCEL',
        text_size: 20,
        normal_color: 0x2a2a2a,
        press_color: 0x444444,
        click_func: () => this.closePicker(),
      }),
      createWidget(widget.BUTTON, {
        x: 260,
        y: 396,
        w: 180,
        h: 52,
        radius: 26,
        text: 'OK',
        text_size: 22,
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
              // Auto-scroll to show the new step
              this.listOffset = Math.max(0, this.steps.length - 2)
            } else {
              this.steps[this.pickerCtx.index] = stepData
            }
          }
          this.closePicker()
          this.refreshList()
        },
      })
    )
  },

  closePicker() {
    this.clearPickerWidgets()
    this.pickerNameWidget = null
  },
})
