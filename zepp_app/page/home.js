import { createWidget, widget, align, text_style } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  DEVICE_WIDTH,
  COLOR_ACCENT,
} from '../utils/constants'
import { getSavedRoutines } from '../utils/storage'
import { renderRoutineList, clearWidgets } from '../utils/routineList'

Page({
  onInit() {
    this.listWidgets = []
    this.listOffset = 0
    this.routines = []
  },

  onDestroy() {
    clearWidgets(this.listWidgets)
    this.routines = null
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
      text: getText('home_title'),
    })

    this.routines = getSavedRoutines()
    this.refreshList()

    // Bottom bar: new routine
    createWidget(widget.BUTTON, {
      x: 40,
      y: 404,
      w: 400,
      h: 64,
      radius: 32,
      text: `+ ${getText('home_new_routine')}`,
      text_size: 28,
      normal_color: COLOR_ACCENT,
      press_color: 0x0288d1,
      click_func: () => {
        push({ url: 'page/create' })
      },
    })
  },

  refreshList() {
    clearWidgets(this.listWidgets)
    this.routines = getSavedRoutines()
    this.listOffset = renderRoutineList(this, {
      routines: this.routines,
      listOffset: this.listOffset,
      top: 72,
      bottomY: 404,
      emptyText: getText('saved_empty'),
      emptyHint: getText('saved_empty_hint'),
      onChanged: () => this.refreshList(),
    })
  },
})
