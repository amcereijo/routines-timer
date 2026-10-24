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
  DEVICE_WIDTH,
  COLOR_ACCENT,
  COLOR_GREEN,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
  COLOR_SUBTEXT,
} from '../utils/constants'
import { formatDuration, totalSeconds } from '../utils/format'
import { getSavedRoutines, deleteRoutine } from '../utils/storage'

Page({
  onInit() {
    this.listWidgets = []
    this.listOffset = 0
    this.routines = []
  },

  onDestroy() {
    this.clearListWidgets()
    this.routines = null
  },

  build() {
    createWidget(widget.TEXT, {
      x: 0,
      y: 28,
      w: DEVICE_WIDTH,
      h: 48,
      color: 0xffffff,
      text_size: 32,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: getText('saved_title'),
    })

    this.routines = getSavedRoutines()
    this.refreshList()
  },

  clearListWidgets() {
    this.listWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.listWidgets = []
  },

  refreshList() {
    this.clearListWidgets()

    const AREA_TOP = 92
    const ROW_H = 128
    const ROW_GAP = 16
    const VISIBLE = 2

    if (this.routines.length === 0) {
      this.listWidgets.push(
        createWidget(widget.TEXT, {
          x: 0,
          y: 200,
          w: DEVICE_WIDTH,
          h: 48,
          color: COLOR_SUBTEXT,
          text_size: 30,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text: getText('saved_empty'),
        }),
        createWidget(widget.TEXT, {
          x: 0,
          y: 252,
          w: DEVICE_WIDTH,
          h: 40,
          color: COLOR_SUBTEXT,
          text_size: 24,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text: getText('saved_empty_hint'),
        })
      )
      return
    }

    const maxOffset = Math.max(0, this.routines.length - VISIBLE)
    if (this.listOffset > maxOffset) this.listOffset = maxOffset

    for (let row = 0; row < VISIBLE; row++) {
      const i = this.listOffset + row
      if (i >= this.routines.length) break
      const routine = this.routines[i]
      const y = AREA_TOP + row * (ROW_H + ROW_GAP)

      const routineName =
        (routine.name && routine.name.trim()) || `${getText('saved_routine_fallback')} ${i + 1}`
      const info = `${routine.steps.length} ${getText('steps_count')} · ${formatDuration(
        totalSeconds(routine.steps)
      )}`

      // Line 1: routine name (tappable to run)
      const nameBtn = createWidget(widget.BUTTON, {
        x: 40,
        y,
        w: 400,
        h: 62,
        radius: 14,
        normal_color: 0x141414,
        press_color: 0x2a2a2a,
        click_func: () => {
          push({
            url: 'page/run',
            params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
          })
        },
      })

      const nameLabel = createWidget(widget.TEXT, {
        x: 56,
        y: y + 4,
        w: 368,
        h: 32,
        color: 0xffffff,
        text_size: 26,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text: routineName,
      })
      nameLabel.setEnable(false)

      const infoLabel = createWidget(widget.TEXT, {
        x: 56,
        y: y + 32,
        w: 368,
        h: 26,
        color: COLOR_SUBTEXT,
        text_size: 20,
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text: info,
      })
      infoLabel.setEnable(false)

      // Line 2: action buttons (run / edit / delete) with text labels
      const btnY = y + 68
      const runBtn = createWidget(widget.BUTTON, {
        x: 40,
        y: btnY,
        w: 165,
        h: 52,
        radius: 26,
        text: `▶ ${getText('saved_run')}`,
        text_size: 24,
        normal_color: COLOR_GREEN,
        press_color: 0x009624,
        click_func: () => {
          push({
            url: 'page/run',
            params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
          })
        },
      })

      const editBtn = createWidget(widget.BUTTON, {
        x: 215,
        y: btnY,
        w: 135,
        h: 52,
        radius: 26,
        text: getText('saved_edit'),
        text_size: 24,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => {
          push({
            url: 'page/create',
            params: JSON.stringify({
              edit: { id: routine.id, name: routine.name || '', steps: routine.steps },
            }),
          })
        },
      })

      const del = createWidget(widget.BUTTON, {
        x: 360,
        y: btnY,
        w: 80,
        h: 52,
        radius: 26,
        text: '×',
        text_size: 34,
        normal_color: 0x330000,
        press_color: 0x550000,
        click_func: () => {
          deleteRoutine(i)
          this.routines = getSavedRoutines()
          this.refreshList()
        },
      })

      this.listWidgets.push(nameBtn, nameLabel, infoLabel, runBtn, editBtn, del)
    }

    // Big scroll arrows at the bottom (easy to tap)
    if (this.routines.length > VISIBLE) {
      this.listWidgets.push(
        createWidget(widget.BUTTON, {
          x: 40,
          y: 420,
          w: 190,
          h: 52,
          radius: 26,
          text: '▲',
          text_size: 24,
          normal_color: COLOR_DARK_BTN,
          press_color: COLOR_DARK_BTN_PRESS,
          click_func: () => {
            this.listOffset = Math.max(0, this.listOffset - 1)
            this.refreshList()
          },
        }),
        createWidget(widget.BUTTON, {
          x: 250,
          y: 420,
          w: 190,
          h: 52,
          radius: 26,
          text: '▼',
          text_size: 24,
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
})
