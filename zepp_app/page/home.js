import { createWidget, widget, align, text_style } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  DEVICE_WIDTH,
  SAFE_MARGIN,
  SAFE_WIDTH,
  SAFE_HEIGHT,
  COLOR_ACCENT,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
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
      x: SAFE_MARGIN,
      y: SAFE_MARGIN + 10,
      w: SAFE_WIDTH,
      h: 46,
      color: 0xffffff,
      text_size: 32,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: getText('home_title'),
    })

    this.routines = getSavedRoutines()
    this.refreshList()

    // Bottom bar: new routine + import (within safe area)
    const barY = SAFE_MARGIN + SAFE_HEIGHT - 74
    createWidget(widget.BUTTON, {
      x: SAFE_MARGIN,
      y: barY,
      w: 200,
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
    createWidget(widget.BUTTON, {
      x: SAFE_MARGIN + 212,
      y: barY,
      w: SAFE_WIDTH - 212,
      h: 64,
      radius: 32,
      text: getText('home_import'),
      text_size: 28,
      normal_color: COLOR_DARK_BTN,
      press_color: COLOR_DARK_BTN_PRESS,
      click_func: () => {
        push({ url: 'page/import' })
      },
    })
  },

  refreshList() {
    clearWidgets(this.listWidgets)
    this.routines = getSavedRoutines()
    this.listOffset = renderRoutineList(this, {
      routines: this.routines,
      listOffset: this.listOffset,
      top: SAFE_MARGIN + 60,
      bottomY: SAFE_MARGIN + SAFE_HEIGHT - 74,
      emptyText: getText('saved_empty'),
      emptyHint: getText('saved_empty_hint'),
      onChanged: () => this.refreshList(),
    })
  },
})
