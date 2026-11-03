import { createWidget, widget, align, text_style } from '@zos/ui'
import { getText } from '@zos/i18n'
import { SAFE_MARGIN, SAFE_WIDTH, SAFE_HEIGHT } from '../utils/constants'
import { getSavedRoutines } from '../utils/storage'
import { renderRoutineList, clearRoutineList } from '../utils/routineList'

// Layout inside the safe drawing area (70..410 on both axes)
const TITLE_Y = SAFE_MARGIN // 70
const TITLE_H = 30 // 70..100
const LIST_TOP = TITLE_Y + TITLE_H + 4 // 104

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
      text: getText('saved_title'),
    })

    this.routines = getSavedRoutines()
    this.refreshList()
  },

  refreshList() {
    clearRoutineList(this)
    this.routines = getSavedRoutines()
    renderRoutineList(this, {
      routines: this.routines,
      top: LIST_TOP,
      bottomY: SAFE_MARGIN + SAFE_HEIGHT,
      emptyText: getText('saved_empty'),
      emptyHint: getText('saved_empty_hint'),
      onChanged: () => this.refreshList(),
    })
  },
})
