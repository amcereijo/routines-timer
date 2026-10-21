import {
  createWidget,
  deleteWidget,
  widget,
  align,
  prop,
  text_style,
} from '@zos/ui'
import { back } from '@zos/router'
import { getText } from '@zos/i18n'
import { Vibrator, VIBRATOR_SCENE_DURATION } from '@zos/sensor'
import {
  setPageBrightTime,
  pauseDropWristScreenOff,
  resetDropWristScreenOff,
} from '@zos/display'
import {
  DEVICE_WIDTH,
  COLOR_ACCENT,
  COLOR_GREEN,
  COLOR_RED,
  COLOR_ORANGE,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
  COLOR_SUBTEXT,
} from '../utils/constants'
import { formatDuration } from '../utils/format'

Page({
  onInit(params) {
    this.steps = []
    this.routineName = ''
    try {
      const data = typeof params === 'string' ? JSON.parse(params) : params
      if (data && Array.isArray(data.steps)) this.steps = data.steps
      if (data && typeof data.name === 'string') this.routineName = data.name
    } catch (e) {}

    this.currentIdx = 0
    this.remaining = 0
    this.paused = false
    this.tickTimer = null
    this.vibrator = new Vibrator()

    this.widgets = {}
    this.doneWidgets = []
  },

  onDestroy() {
    this.stopTick()
    try {
      this.vibrator.stop()
    } catch (e) {}
    // Restore default screen-off behavior (the bright-time setting resets
    // automatically when the page is destroyed)
    try {
      resetDropWristScreenOff()
    } catch (e) {}
    this.clearDoneOverlay()
  },

  build() {
    // Keep the screen on for the whole run (long bright time + ignore
    // wrist-down gesture)
    setPageBrightTime({ brightTime: 3600000 })
    pauseDropWristScreenOff({ duration: 0 })

    this.widgets.stepText = createWidget(widget.TEXT, {
      x: 0,
      y: 52,
      w: DEVICE_WIDTH,
      h: 40,
      color: COLOR_SUBTEXT,
      text_size: 26,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })

    this.widgets.routineText = createWidget(widget.TEXT, {
      x: 0,
      y: 20,
      w: DEVICE_WIDTH,
      h: 30,
      color: COLOR_ACCENT,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: this.routineName || '',
    })

    this.widgets.nextText = createWidget(widget.TEXT, {
      x: 0,
      y: 96,
      w: DEVICE_WIDTH,
      h: 34,
      color: COLOR_SUBTEXT,
      text_size: 22,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })

    this.widgets.timeText = createWidget(widget.TEXT, {
      x: 0,
      y: 136,
      w: DEVICE_WIDTH,
      h: 120,
      color: 0xffffff,
      text_size: 110,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: '0:00',
    })

    this.widgets.barBg = createWidget(widget.FILL_RECT, {
      x: 70,
      y: 290,
      w: 340,
      h: 12,
      radius: 6,
      color: 0x1c1c1c,
    })

    this.widgets.barFill = createWidget(widget.FILL_RECT, {
      x: 70,
      y: 290,
      w: 340,
      h: 12,
      radius: 6,
      color: COLOR_ACCENT,
    })

    this.widgets.pauseBtn = createWidget(widget.BUTTON, {
      x: 40,
      y: 352,
      w: 190,
      h: 76,
      radius: 38,
      text: getText('run_pause'),
      text_size: 26,
      normal_color: COLOR_ORANGE,
      press_color: 0xc67000,
      click_func: () => this.togglePause(),
    })

    this.widgets.stopBtn = createWidget(widget.BUTTON, {
      x: 250,
      y: 352,
      w: 190,
      h: 76,
      radius: 38,
      text: getText('run_stop'),
      text_size: 26,
      normal_color: COLOR_RED,
      press_color: 0xb9004e,
      click_func: () => this.stopAll(),
    })

    if (this.steps.length === 0) {
      back()
      return
    }

    this.startStep(0)
  },

  startStep(index) {
    this.currentIdx = index
    this.remaining = Math.max(1, this.steps[index].seconds)
    this.paused = false
    this.updatePauseLabel()
    this.updateUI()
    this.notifyStepChange()
    this.startTick()
  },

  startTick() {
    this.stopTick()
    this.tickTimer = setInterval(() => {
      if (this.paused) return
      this.remaining -= 1
      if (this.remaining <= 0) {
        this.remaining = 0
        this.updateUI()
        this.stopTick()
        if (this.currentIdx < this.steps.length - 1) {
          this.startStep(this.currentIdx + 1)
        } else {
          this.onFinished()
        }
        return
      }
      this.updateUI()
    }, 1000)
  },

  stopTick() {
    if (this.tickTimer != null) {
      try {
        clearInterval(this.tickTimer)
      } catch (e) {}
      this.tickTimer = null
    }
  },

  updateUI() {
    const total = this.steps[this.currentIdx].seconds
    const step = this.steps[this.currentIdx]
    const stepName =
      (step.name && step.name.trim()) || `${getText('step_label')} ${this.currentIdx + 1}`
    this.widgets.stepText.setProperty(
      prop.TEXT,
      `${this.currentIdx + 1}/${this.steps.length} · ${stepName}`
    )

    const next = this.steps[this.currentIdx + 1]
    const nextName =
      next && next.name && next.name.trim() ? ` ${next.name.trim()}` : ''
    this.widgets.nextText.setProperty(
      prop.TEXT,
      next ? `→ ${formatDuration(next.seconds)}${nextName}` : ''
    )

    this.widgets.timeText.setProperty(prop.TEXT, formatDuration(this.remaining))

    const frac = total > 0 ? this.remaining / total : 0
    const w = Math.max(0, Math.round(340 * frac))
    this.widgets.barFill.setProperty(prop.MORE, {
      x: 70,
      y: 290,
      w,
      h: 12,
      radius: 6,
      color: this.remaining <= 5 ? COLOR_RED : COLOR_ACCENT,
    })
  },

  togglePause() {
    this.paused = !this.paused
    this.updatePauseLabel()
  },

  updatePauseLabel() {
    this.widgets.pauseBtn.setProperty(
      prop.TEXT,
      this.paused ? getText('run_resume') : getText('run_pause')
    )
  },

  stopAll() {
    this.stopTick()
    back()
  },

  notifyStepChange() {
    try {
      this.vibrator.stop()
      this.vibrator.setMode({ mode: VIBRATOR_SCENE_DURATION })
      this.vibrator.start()
    } catch (e) {}
  },

  onFinished() {
    try {
      this.vibrator.stop()
      this.vibrator.setMode({ mode: VIBRATOR_SCENE_DURATION })
      this.vibrator.start()
    } catch (e) {}

    // Hide running widgets
    ;[
      'stepText',
      'routineText',
      'nextText',
      'timeText',
      'barBg',
      'barFill',
      'pauseBtn',
      'stopBtn',
    ].forEach((k) => {
      try {
        this.widgets[k].setProperty(prop.VISIBLE, false)
      } catch (e) {}
    })

    this.doneWidgets = [
      createWidget(widget.TEXT, {
        x: 0,
        y: 130,
        w: DEVICE_WIDTH,
        h: 80,
        color: COLOR_GREEN,
        text_size: 60,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('done_title'),
      }),
      createWidget(widget.TEXT, {
        x: 0,
        y: 220,
        w: DEVICE_WIDTH,
        h: 44,
        color: 0xffffff,
        text_size: 26,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('done_text'),
      }),
      createWidget(widget.BUTTON, {
        x: 140,
        y: 320,
        w: 200,
        h: 72,
        radius: 36,
        text: getText('done_ok'),
        text_size: 28,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => back(),
      }),
    ]
  },

  clearDoneOverlay() {
    this.doneWidgets.forEach((w) => {
      try {
        deleteWidget(w)
      } catch (e) {}
    })
    this.doneWidgets = []
  },
})
