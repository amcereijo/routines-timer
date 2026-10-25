import {
  createWidget,
  deleteWidget,
  widget,
  align,
  prop,
  text_style,
} from '@zos/ui'
import { push } from '@zos/router'
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
} from '../utils/constants'
import { formatDuration } from '../utils/format'
import { addRoutine } from '../utils/storage'
import { promptText } from '../utils/textInput'

const MIN_VALUES = []
for (let i = 0; i < 60; i++) MIN_VALUES.push(i)
const SEC_VALUES = []
for (let i = 0; i < 60; i += 5) SEC_VALUES.push(i)

const WHEEL_H = 72
const WHEEL_Y = 172

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
          }))
        }
      }
    } catch (e) {}
    this.listWidgets = []
    this.pickerWidgets = []
    this.pickerCtx = null
    this.minIdx = 1
    this.secIdx = 0
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
        push({ url: 'page/saved' })
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

      // Line 2: duration
      const durLabel = createWidget(widget.TEXT, {
        x: 58,
        y: y + 38,
        w: 288,
        h: 28,
        color: COLOR_ACCENT,
        text_size: 22,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text: formatDuration(step.seconds),
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
    if (ctx.mode === 'edit') seconds = this.steps[ctx.index].seconds

    this.minIdx = Math.min(59, Math.floor(seconds / 60))
    const secMod = seconds % 60
    this.secIdx = SEC_VALUES.indexOf(secMod)
    if (this.secIdx < 0) this.secIdx = 0
    this.pickerCtx = ctx
    // Track the picked name (default: current name or '')
    this.pickerName = ctx.mode === 'edit' ? this.steps[ctx.index].name || '' : ''

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
        y: 34,
        w: DEVICE_WIDTH,
        h: 44,
        color: 0xffffff,
        text_size: 30,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_title'),
      })
    )

    // ---- step name row (tap the row to edit the name) ----
    const nameRowBtn = createWidget(widget.BUTTON, {
      x: 40,
      y: 86,
      w: 400,
      h: 48,
      radius: 24,
      normal_color: 0x141414,
      press_color: 0x2a2a2a,
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
      x: 60,
      y: 93,
      w: 360,
      h: 34,
      color: COLOR_ACCENT,
      text_size: 26,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: this.pickerName || getText('name_input_title_step'),
    })
    this.pickerNameWidget.setEnable(false)
    this.pickerWidgets.push(nameRowBtn, this.pickerNameWidget)

    // ---- minutes wheel ----
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: 0,
        y: WHEEL_Y - 34,
        w: DEVICE_WIDTH,
        h: 30,
        color: COLOR_SUBTEXT,
        text_size: 24,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_min'),
      })
    )

    const minVal = createWidget(widget.TEXT, {
      x: 130,
      y: WHEEL_Y,
      w: 220,
      h: WHEEL_H,
      color: 0xffffff,
      text_size: 56,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `${MIN_VALUES[this.minIdx]}`,
    })

    this.pickerWidgets.push(
      minVal,
      createWidget(widget.BUTTON, {
        x: 40,
        y: WHEEL_Y,
        w: 80,
        h: WHEEL_H,
        radius: 20,
        text: '−',
        text_size: 40,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          this.minIdx = (this.minIdx - 1 + MIN_VALUES.length) % MIN_VALUES.length
          minVal.setProperty(prop.TEXT, `${MIN_VALUES[this.minIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 360,
        y: WHEEL_Y,
        w: 80,
        h: WHEEL_H,
        radius: 20,
        text: '+',
        text_size: 40,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          this.minIdx = (this.minIdx + 1) % MIN_VALUES.length
          minVal.setProperty(prop.TEXT, `${MIN_VALUES[this.minIdx]}`)
        },
      })
    )

    // ---- seconds wheel ----
    this.pickerWidgets.push(
      createWidget(widget.TEXT, {
        x: 0,
        y: WHEEL_Y + 98,
        w: DEVICE_WIDTH,
        h: 30,
        color: COLOR_SUBTEXT,
        text_size: 24,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('picker_sec'),
      })
    )

    const secVal = createWidget(widget.TEXT, {
      x: 130,
      y: WHEEL_Y + 132,
      w: 220,
      h: WHEEL_H,
      color: 0xffffff,
      text_size: 56,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `${SEC_VALUES[this.secIdx]}`,
    })

    this.pickerWidgets.push(
      secVal,
      createWidget(widget.BUTTON, {
        x: 40,
        y: WHEEL_Y + 132,
        w: 80,
        h: WHEEL_H,
        radius: 20,
        text: '−',
        text_size: 40,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          this.secIdx = (this.secIdx - 1 + SEC_VALUES.length) % SEC_VALUES.length
          secVal.setProperty(prop.TEXT, `${SEC_VALUES[this.secIdx]}`)
        },
      }),
      createWidget(widget.BUTTON, {
        x: 360,
        y: WHEEL_Y + 132,
        w: 80,
        h: WHEEL_H,
        radius: 20,
        text: '+',
        text_size: 40,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          this.secIdx = (this.secIdx + 1) % SEC_VALUES.length
          secVal.setProperty(prop.TEXT, `${SEC_VALUES[this.secIdx]}`)
        },
      })
    )

    // ---- cancel / confirm ----
    this.pickerWidgets.push(
      createWidget(widget.BUTTON, {
        x: 50,
        y: 400,
        w: 175,
        h: 64,
        radius: 32,
        text: 'CANCEL',
        text_size: 20,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => this.closePicker(),
      }),
      createWidget(widget.BUTTON, {
        x: 255,
        y: 400,
        w: 175,
        h: 64,
        radius: 32,
        text: 'OK',
        text_size: 22,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => {
          const seconds = MIN_VALUES[this.minIdx] * 60 + SEC_VALUES[this.secIdx]
          if (seconds > 0) {
            if (this.pickerCtx.mode === 'add') {
              this.steps.push({ seconds, name: this.pickerName || '' })
              // Auto-scroll to show the new step
              this.listOffset = Math.max(0, this.steps.length - 2)
            } else {
              this.steps[this.pickerCtx.index].seconds = seconds
              this.steps[this.pickerCtx.index].name = this.pickerName || ''
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
