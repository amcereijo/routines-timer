import {
  createWidget,
  deleteWidget,
  widget,
  align,
  prop,
  text_style,
} from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  SAFE_MARGIN,
  SAFE_WIDTH,
  COLOR_ACCENT,
  COLOR_GREEN,
  COLOR_SUBTEXT,
} from './constants'
import { formatDuration, totalSeconds } from './format'
import { deleteRoutine } from './storage'

// ---- Row metrics (all values are relative to the scroll container) ----
const ROW_PAD = 4 // top/bottom padding of a row
const NAME_H = 34 // routine name line
const INFO_H = 20 // "steps · duration" line
const BLOCK_GAP = 4 // gap between the name block and the action buttons
const BTN_H = 44 // action buttons (large touch targets)
const ROW_H = ROW_PAD + NAME_H + INFO_H + BLOCK_GAP + BTN_H + ROW_PAD // 110
const ROW_STEP = ROW_H + 4 // vertical gap between two rows

const CARD_PAD = 6 // horizontal padding inside a row
const CARD_W = SAFE_WIDTH - CARD_PAD * 2 // 328
const BTN_GAP = 8
const RUN_W = 148
const EDIT_W = 108
const DEL_W = 56

/**
 * Renders the saved routines as a scrollable list of big cards.
 *
 * The list lives in a VIEW_CONTAINER, so every saved routine is reachable
 * with a swipe instead of the old one-row-at-a-time arrows. Each row shows
 * the routine name, a summary line and three large action buttons
 * (start / edit / delete).
 *
 * renderRoutineList(ctx, {
 *   routines,    // array of saved routines
 *   top,         // y of the list area
 *   bottomY,     // y where the list area ends
 *   emptyText,   // shown when there are no routines
 *   emptyHint,   // secondary line under emptyText (optional, '' to skip)
 *   onChanged,   // called after a routine is deleted
 * })
 */
export function renderRoutineList(ctx, {
  routines,
  top,
  bottomY,
  emptyText,
  emptyHint,
  onChanged,
}) {
  const listH = Math.max(ROW_H, bottomY - top)

  const container = createWidget(widget.VIEW_CONTAINER, {
    x: SAFE_MARGIN,
    y: top,
    w: SAFE_WIDTH,
    h: listH,
    scroll_enable: 1,
    bounce: 1,
    scroll_complete_func: (info) => {
      if (info && typeof info.yoffset === 'number') {
        ctx.listScrollY = info.yoffset
      }
    },
  })
  ctx.listView = container

  if (routines.length === 0) {
    ctx.listWidgets.push(
      container.createWidget(widget.TEXT, {
        x: 0,
        y: 40,
        w: SAFE_WIDTH,
        h: 48,
        color: COLOR_SUBTEXT,
        text_size: 26,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: emptyText,
      })
    )
    if (emptyHint) {
      ctx.listWidgets.push(
        container.createWidget(widget.TEXT, {
          x: 0,
          y: 94,
          w: SAFE_WIDTH,
          h: 40,
          color: COLOR_SUBTEXT,
          text_size: 20,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text_style: text_style.WRAP,
          text: emptyHint,
        })
      )
    }
    return
  }

  routines.forEach((routine, i) => {
    const y = i * ROW_STEP

    const routineName =
      (routine.name && routine.name.trim()) ||
      `${getText('saved_routine_fallback')} ${i + 1}`
    const info = `${routine.steps.length} ${getText('steps_count')} · ${formatDuration(
      totalSeconds(routine.steps)
    )}`

    // Name block: tapping it starts the routine
    const nameBtn = container.createWidget(widget.BUTTON, {
      x: CARD_PAD,
      y: y + ROW_PAD,
      w: CARD_W,
      h: NAME_H + INFO_H,
      radius: 16,
      normal_color: 0x141414,
      press_color: 0x2a2a2a,
      click_func: () => {
        push({
          url: 'page/run',
          params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
        })
      },
    })

    const nameLabel = container.createWidget(widget.TEXT, {
      x: CARD_PAD + 12,
      y: y + ROW_PAD,
      w: CARD_W - 24,
      h: NAME_H,
      color: 0xffffff,
      text_size: 28,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.ELLIPSIS,
      text: routineName,
    })
    nameLabel.setEnable(false)

    const infoLabel = container.createWidget(widget.TEXT, {
      x: CARD_PAD + 12,
      y: y + ROW_PAD + NAME_H,
      w: CARD_W - 24,
      h: INFO_H,
      color: COLOR_SUBTEXT,
      text_size: 18,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: info,
    })
    infoLabel.setEnable(false)

    // Action buttons: start / edit / delete
    const btnY = y + ROW_PAD + NAME_H + INFO_H + BLOCK_GAP

    const runBtn = container.createWidget(widget.BUTTON, {
      x: CARD_PAD,
      y: btnY,
      w: RUN_W,
      h: BTN_H,
      radius: BTN_H / 2,
      text: getText('saved_run'),
      text_size: 20,
      normal_color: COLOR_GREEN,
      press_color: 0x009624,
      click_func: () => {
        push({
          url: 'page/run',
          params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
        })
      },
    })

    const editBtn = container.createWidget(widget.BUTTON, {
      x: CARD_PAD + RUN_W + BTN_GAP,
      y: btnY,
      w: EDIT_W,
      h: BTN_H,
      radius: BTN_H / 2,
      text: getText('saved_edit'),
      text_size: 20,
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

    const del = container.createWidget(widget.BUTTON, {
      x: CARD_PAD + RUN_W + BTN_GAP + EDIT_W + BTN_GAP,
      y: btnY,
      w: DEL_W,
      h: BTN_H,
      radius: BTN_H / 2,
      text: '×',
      text_size: 28,
      normal_color: 0x330000,
      press_color: 0x550000,
      click_func: () => {
        deleteRoutine(i)
        onChanged && onChanged()
      },
    })

    ctx.listWidgets.push(nameBtn, nameLabel, infoLabel, runBtn, editBtn, del)
  })

  // Keep the scroll position when the list is rebuilt (e.g. after a delete)
  const contentH = routines.length * ROW_STEP
  const maxY = Math.max(0, contentH - listH)
  const targetY = Math.min(Math.max(0, ctx.listScrollY || 0), maxY)
  if (targetY > 0) {
    // The container needs a tick to know its final content height
    setTimeout(() => {
      try {
        container.setProperty(prop.POS_Y, targetY)
      } catch (e) {}
    }, 50)
  }
}

/**
 * Removes every widget of the rendered list: first the rows (children of
 * the scroll container), then the container itself.
 */
export function clearRoutineList(ctx) {
  clearWidgets(ctx.listWidgets)
  if (ctx.listView) {
    try {
      deleteWidget(ctx.listView)
    } catch (e) {}
    ctx.listView = null
  }
}

export function clearWidgets(widgets) {
  widgets.forEach((w) => {
    try {
      deleteWidget(w)
    } catch (e) {}
  })
  widgets.length = 0
}
