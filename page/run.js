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
  DEFAULT_REST_SECONDS,
} from '../utils/constants'
import { formatDuration } from '../utils/format'
import {
  initAlerts,
  destroyAlerts,
  alertStepWarning,
  alertStepEnd,
  alertRoutineDone,
} from '../utils/alerts'

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
    this.currentRep = 1
    this.phase = 'work' // 'work' | 'rest'
    this.remaining = 0
    this.paused = false
    this.tickTimer = null
    initAlerts()

    this.widgets = {}
    this.doneWidgets = []
  },

  onDestroy() {
    this.stopTick()
    destroyAlerts()
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

    this.widgets.routineText = createWidget(widget.TEXT, {
      x: 0,
      y: 22,
      w: DEVICE_WIDTH,
      h: 34,
      color: COLOR_ACCENT,
      text_size: 24,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: this.routineName || '',
    })

    this.widgets.stepText = createWidget(widget.TEXT, {
      x: 0,
      y: 60,
      w: DEVICE_WIDTH,
      h: 36,
      color: COLOR_SUBTEXT,
      text_size: 26,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })

    this.widgets.repText = createWidget(widget.TEXT, {
      x: 0,
      y: 98,
      w: DEVICE_WIDTH,
      h: 30,
      color: COLOR_ORANGE,
      text_size: 22,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })

    this.widgets.nextText = createWidget(widget.TEXT, {
      x: 0,
      y: 128,
      w: DEVICE_WIDTH,
      h: 30,
      color: COLOR_SUBTEXT,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })

    this.widgets.phaseText = createWidget(widget.TEXT, {
      x: 0,
      y: 160,
      w: DEVICE_WIDTH,
      h: 40,
      color: COLOR_ACCENT,
      text_size: 32,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '',
    })

    this.widgets.timeText = createWidget(widget.TEXT, {
      x: 0,
      y: 200,
      w: DEVICE_WIDTH,
      h: 100,
      color: 0xffffff,
      text_size: 96,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: '0:00',
    })

    this.widgets.barBg = createWidget(widget.FILL_RECT, {
      x: 60,
      y: 310,
      w: 360,
      h: 16,
      radius: 8,
      color: 0x1c1c1c,
    })

    this.widgets.barFill = createWidget(widget.FILL_RECT, {
      x: 60,
      y: 310,
      w: 360,
      h: 16,
      radius: 8,
      color: COLOR_ACCENT,
    })

    this.widgets.pauseBtn = createWidget(widget.BUTTON, {
      x: 40,
      y: 360,
      w: 190,
      h: 84,
      radius: 42,
      text: getText('run_pause'),
      text_size: 28,
      normal_color: COLOR_ORANGE,
      press_color: 0xc67000,
      click_func: () => this.togglePause(),
    })

    this.widgets.stopBtn = createWidget(widget.BUTTON, {
      x: 250,
      y: 360,
      w: 190,
      h: 84,
      radius: 42,
      text: getText('run_stop'),
      text_size: 28,
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
    this.currentRep = 1
    this.phase = 'work'
    this.remaining = Math.max(1, this.steps[index].seconds)
    this.paused = false
    this.updatePauseLabel()
    this.updateUI()
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
        this.onPhaseEnd()
        return
      }
      // Last 3 seconds of the step: single vibration + single soft sound
      if (this.remaining <= 3) alertStepWarning()
      this.updateUI()
    }, 1000)
  },

  onPhaseEnd() {
    const step = this.steps[this.currentIdx]
    const totalReps = step.repeat || 1

    if (this.phase === 'work') {
      // Work phase ended
      alertStepEnd()
      if (this.currentRep < totalReps) {
        // Start rest phase
        this.phase = 'rest'
        this.remaining = step.rest != null ? step.rest : DEFAULT_REST_SECONDS
        this.updateUI()
        this.startTick()
      } else {
        // Move to next step or finish
        if (this.currentIdx < this.steps.length - 1) {
          this.startStep(this.currentIdx + 1)
        } else {
          this.onFinished()
        }
      }
    } else {
      // Rest phase ended, start next rep
      alertStepEnd()
      this.currentRep += 1
      this.phase = 'work'
      this.remaining = Math.max(1, step.seconds)
      this.updateUI()
      this.startTick()
    }
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
    const step = this.steps[this.currentIdx]
    const totalReps = step.repeat || 1
    const stepName =
      (step.name && step.name.trim()) || `${getText('step_label')} ${this.currentIdx + 1}`

    // Step info line
    this.widgets.stepText.setProperty(
      prop.TEXT,
      `${this.currentIdx + 1}/${this.steps.length} · ${stepName}`
    )

    // Repetition indicator (only when repeating)
    if (totalReps > 1) {
      this.widgets.repText.setProperty(
        prop.TEXT,
        getText('run_rep').replace('%1', this.currentRep).replace('%2', totalReps)
      )
      this.widgets.repText.setProperty(prop.VISIBLE, true)
    } else {
      this.widgets.repText.setProperty(prop.VISIBLE, false)
    }

    // Phase indicator (WORK / REST)
    const phaseColor = this.phase === 'work' ? COLOR_ACCENT : COLOR_ORANGE
    const phaseText = this.phase === 'work' ? getText('run_work') : getText('run_rest')
    this.widgets.phaseText.setProperty(prop.TEXT, phaseText)
    this.widgets.phaseText.setProperty(prop.COLOR, phaseColor)

    // Next step preview (only show when in last rep of current step)
    let nextText = ''
    if (this.currentRep >= totalReps && this.currentIdx < this.steps.length - 1) {
      const next = this.steps[this.currentIdx + 1]
      const nextName = next && next.name && next.name.trim() ? ` ${next.name.trim()}` : ''
      nextText = `→ ${formatDuration(next.seconds)}${nextName}`
    }
    this.widgets.nextText.setProperty(prop.TEXT, nextText)

    this.widgets.timeText.setProperty(prop.TEXT, formatDuration(this.remaining))

    // Progress bar: work uses accent, rest uses orange
    const total = this.phase === 'work' ? step.seconds : (step.rest != null ? step.rest : DEFAULT_REST_SECONDS)
    const frac = total > 0 ? this.remaining / total : 0
    const w = Math.max(0, Math.round(360 * frac))
    this.widgets.barFill.setProperty(prop.MORE, {
      x: 60,
      y: 310,
      w,
      h: 16,
      radius: 8,
      color: this.remaining <= 5 ? COLOR_RED : phaseColor,
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

  onFinished() {
    // Triple long vibration + triple long sound for the whole routine
    alertRoutineDone()

    // Hide running widgets
    ;[
      'stepText',
      'routineText',
      'repText',
      'nextText',
      'phaseText',
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
        y: 120,
        w: DEVICE_WIDTH,
        h: 96,
        color: COLOR_GREEN,
        text_size: 72,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('done_title'),
      }),
      createWidget(widget.TEXT, {
        x: 0,
        y: 228,
        w: DEVICE_WIDTH,
        h: 48,
        color: 0xffffff,
        text_size: 30,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: getText('done_text'),
      }),
      createWidget(widget.BUTTON, {
        x: 120,
        y: 330,
        w: 240,
        h: 88,
        radius: 44,
        text: getText('done_ok'),
        text_size: 32,
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
