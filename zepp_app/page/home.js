import { createWidget, widget, align, text_style } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  SAFE_MARGIN,
  SAFE_WIDTH,
  SAFE_HEIGHT,
  COLOR_ACCENT,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
} from '../utils/constants'
import { getSavedRoutines } from '../utils/storage'
import { renderRoutineList, clearRoutineList } from '../utils/routineList'

// Layout inside the safe drawing area (70..410 on both axes)
const TITLE_Y = SAFE_MARGIN // 70
const TITLE_H = 30 // 70..100
const LIST_TOP = TITLE_Y + TITLE_H + 4 // 104
const BAR_H = 52
const BAR_Y = SAFE_MARGIN + SAFE_HEIGHT - BAR_H - 2 // 356
const LIST_BOTTOM = BAR_Y - 4 // 352

Page({
  onInit() {
    this.listWidgets = []
    this.listView = null
    this.listScrollY = 0
    this.routines = []
  },

  onDestroy() {
    clearRoutineList(this)
    this.routines = null
  },

  build() {
    createWidget(widget.TEXT, {
      x: SAFE_MARGIN,
      y: TITLE_Y,
      w: SAFE_WIDTH,
      h: TITLE_H,
      color: 0xffffff,
      text_size: 26,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: getText('home_title'),
    })

    this.routines = getSavedRoutines()
    this.refreshList()

    // Bottom bar: new routine + import (always reachable, the list scrolls)
    this.buildBottomBar()
  },

  buildBottomBar() {
    createWidget(widget.BUTTON, {
      x: SAFE_MARGIN,
      y: BAR_Y,
      w: 190,
      h: BAR_H,
      radius: BAR_H / 2,
      text: `+ ${getText('home_new_routine')}`,
      text_size: 22,
      normal_color: COLOR_ACCENT,
      press_color: 0x0288d1,
      click_func: () => {
        push({ url: 'page/create' })
      },
    })
    createWidget(widget.BUTTON, {
      x: SAFE_MARGIN + 198,
      y: BAR_Y,
      w: SAFE_WIDTH - 198,
      h: BAR_H,
      radius: BAR_H / 2,
      text: getText('home_import'),
      text_size: 22,
      normal_color: COLOR_DARK_BTN,
      press_color: COLOR_DARK_BTN_PRESS,
      click_func: () => {
        push({ url: 'page/import' })
      },
    })
  },

  refreshList() {
    clearRoutineList(this)
    this.routines = getSavedRoutines()
    renderRoutineList(this, {
      routines: this.routines,
      top: LIST_TOP,
      bottomY: LIST_BOTTOM,
      emptyText: getText('saved_empty'),
      emptyHint: getText('saved_empty_hint'),
      onChanged: () => this.refreshList(),
    })
  },
})
