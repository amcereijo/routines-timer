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
      y: 24,
      w: DEVICE_WIDTH,
      h: 44,
      color: 0xffffff,
      text_size: 30,
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

    const AREA_TOP = 84
    const ROW_H = 66
    const ROW_GAP = 12
    const VISIBLE = 3

    if (this.routines.length === 0) {
      this.listWidgets.push(
        createWidget(widget.TEXT, {
          x: 0,
          y: 190,
          w: DEVICE_WIDTH,
          h: 44,
          color: COLOR_SUBTEXT,
          text_size: 26,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text: getText('saved_empty'),
        }),
        createWidget(widget.TEXT, {
          x: 0,
          y: 236,
          w: DEVICE_WIDTH,
          h: 40,
          color: COLOR_SUBTEXT,
          text_size: 20,
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
      const label = `${routineName} · ${routine.steps.length} ${getText('steps_count')} · ${formatDuration(
        totalSeconds(routine.steps)
      )}`

      const runBtn = createWidget(widget.BUTTON, {
        x: 40,
        y,
        w: 238,
        h: ROW_H,
        radius: 16,
        text: label,
        text_size: 20,
        normal_color: COLOR_ACCENT,
        press_color: 0x0288d1,
        click_func: () => {
          push({
            url: 'page/run',
            params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
          })
        },
      })

      const editBtn = createWidget(widget.BUTTON, {
        x: 286,
        y: y + 6,
        w: 76,
        h: ROW_H - 12,
        radius: 12,
        text: '✎',
        text_size: 24,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
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
        x: 370,
        y: y + 6,
        w: 70,
        h: ROW_H - 12,
        radius: 12,
        text: '×',
        text_size: 32,
        normal_color: 0x330000,
        press_color: 0x550000,
        click_func: () => {
          deleteRoutine(i)
          this.routines = getSavedRoutines()
          this.refreshList()
        },
      })

      this.listWidgets.push(runBtn, editBtn, del)
    }

    // Scroll arrows
    if (this.routines.length > VISIBLE) {
      this.listWidgets.push(
        createWidget(widget.BUTTON, {
          x: 444,
          y: AREA_TOP,
          w: 32,
          h: 110,
          radius: 8,
          text: '▲',
          text_size: 18,
          normal_color: 0x000000,
          press_color: 0x333333,
          click_func: () => {
            this.listOffset = Math.max(0, this.listOffset - 1)
            this.refreshList()
          },
        }),
        createWidget(widget.BUTTON, {
          x: 444,
          y: AREA_TOP + 130,
          w: 32,
          h: 110,
          radius: 8,
          text: '▼',
          text_size: 18,
          normal_color: 0x000000,
          press_color: 0x333333,
          click_func: () => {
            this.listOffset = Math.min(maxOffset, this.listOffset + 1)
            this.refreshList()
          },
        })
      )
    }
  },
})
