import { createWidget, widget, align, text_style } from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import { DEVICE_WIDTH, COLOR_ACCENT, COLOR_DARK_BTN, COLOR_DARK_BTN_PRESS } from '../utils/constants'

Page({
  build() {
    createWidget(widget.TEXT, {
      x: 0,
      y: 70,
      w: DEVICE_WIDTH,
      h: 60,
      color: 0xffffff,
      text_size: 40,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: getText('home_title'),
    })

    createWidget(widget.BUTTON, {
      x: 90,
      y: 170,
      w: 300,
      h: 80,
      radius: 40,
      text: getText('home_new_routine'),
      text_size: 30,
      normal_color: COLOR_ACCENT,
      press_color: 0x0288d1,
      click_func: () => {
        push({ url: 'page/create' })
      },
    })

    createWidget(widget.BUTTON, {
      x: 90,
      y: 280,
      w: 300,
      h: 80,
      radius: 40,
      text: getText('home_saved'),
      text_size: 30,
      normal_color: COLOR_DARK_BTN,
      press_color: COLOR_DARK_BTN_PRESS,
      click_func: () => {
        push({ url: 'page/saved' })
      },
    })
  },
})
