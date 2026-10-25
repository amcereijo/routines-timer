import { createWidget, widget, align, text_style } from '@zos/ui'
import { getText } from '@zos/i18n'
import { DEVICE_WIDTH } from '../utils/constants'
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

  refreshList() {
    clearWidgets(this.listWidgets)
    this.routines = getSavedRoutines()
    this.listOffset = renderRoutineList(this, {
      routines: this.routines,
      listOffset: this.listOffset,
      top: 92,
      bottomY: 480,
      emptyText: getText('saved_empty'),
      emptyHint: getText('saved_empty_hint'),
      onChanged: () => this.refreshList(),
    })
  },
})
