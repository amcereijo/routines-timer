import {
  createWidget,
  deleteWidget,
  widget,
  align,
} from '@zos/ui'
import { push } from '@zos/router'
import { getText } from '@zos/i18n'
import {
  DEVICE_WIDTH,
  COLOR_ACCENT,
  COLOR_GREEN,
  COLOR_DARK_BTN,
  COLOR_DARK_BTN_PRESS,
  COLOR_SUBTEXT,
} from './constants'
import { formatDuration, totalSeconds } from './format'
import { deleteRoutine } from './storage'

/**
 * Renders a scrollable routine list (2 rows visible) into `ctx.listWidgets`.
 *
 * renderRoutineList(ctx, {
 *   routines,          // array of saved routines
 *   listOffset,        // first visible index
 *   top,               // y of the list area
 *   bottomY,           // y reserved for the bottom bar (scroll arrows go just above)
 *   emptyText,         // shown when there are no routines
 *   emptyHint,         // secondary line under emptyText (optional, '' to skip)
 *   onChanged,         // called after a routine is deleted
 * })
 *
 * Returns the new (clamped) listOffset.
 */
export function renderRoutineList(ctx, {
  routines,
  listOffset,
  top,
  bottomY,
  emptyText,
  emptyHint,
  onChanged,
}) {
  const NAME_H = 72
  const ACTIONS_H = 52
  const ROW_H = NAME_H + ACTIONS_H + 6
  const ROW_GAP = 12
  const VISIBLE = 2

  if (routines.length === 0) {
    ctx.listWidgets.push(
      createWidget(widget.TEXT, {
        x: 0,
        y: top + 88,
        w: DEVICE_WIDTH,
        h: 48,
        color: COLOR_SUBTEXT,
        text_size: 30,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text: emptyText,
      })
    )
    if (emptyHint) {
      ctx.listWidgets.push(
        createWidget(widget.TEXT, {
          x: 0,
          y: top + 140,
          w: DEVICE_WIDTH,
          h: 40,
          color: COLOR_SUBTEXT,
          text_size: 24,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text: emptyHint,
        })
      )
    }
    return 0
  }

  const maxOffset = Math.max(0, routines.length - VISIBLE)
  const offset = Math.min(Math.max(0, listOffset), maxOffset)

  for (let row = 0; row < VISIBLE; row++) {
    const i = offset + row
    if (i >= routines.length) break
    const routine = routines[i]
    const y = top + row * (ROW_H + ROW_GAP)

    const routineName =
      (routine.name && routine.name.trim()) ||
      `${getText('saved_routine_fallback')} ${i + 1}`
    const info = `${routine.steps.length} ${getText('steps_count')} · ${formatDuration(
      totalSeconds(routine.steps)
    )}`

    // Line 1: routine name (tappable to run)
    const nameBtn = createWidget(widget.BUTTON, {
      x: 40,
      y,
      w: 400,
      h: NAME_H,
      radius: 14,
      normal_color: 0x141414,
      press_color: 0x2a2a2a,
      click_func: () => {
        push({
          url: 'page/run',
          params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
        })
      },
    })

    const nameLabel = createWidget(widget.TEXT, {
      x: 56,
      y: y + 4,
      w: 368,
      h: 42,
      color: 0xffffff,
      text_size: 34,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: routineName,
    })
    nameLabel.setEnable(false)

    const infoLabel = createWidget(widget.TEXT, {
      x: 56,
      y: y + 42,
      w: 368,
      h: 26,
      color: COLOR_SUBTEXT,
      text_size: 22,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text: info,
    })
    infoLabel.setEnable(false)

    // Line 2: action buttons (run / edit / delete)
    const btnY = y + NAME_H + 4
    const runBtn = createWidget(widget.BUTTON, {
      x: 40,
      y: btnY,
      w: 165,
      h: 52,
      radius: 26,
      text: `▶ ${getText('saved_run')}`,
      text_size: 24,
      normal_color: COLOR_GREEN,
      press_color: 0x009624,
      click_func: () => {
        push({
          url: 'page/run',
          params: JSON.stringify({ name: routine.name || '', steps: routine.steps }),
        })
      },
    })

    const editBtn = createWidget(widget.BUTTON, {
      x: 215,
      y: btnY,
      w: 135,
      h: 52,
      radius: 26,
      text: getText('saved_edit'),
      text_size: 24,
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

    const del = createWidget(widget.BUTTON, {
      x: 360,
      y: btnY,
      w: 80,
      h: 52,
      radius: 26,
      text: '×',
      text_size: 34,
      normal_color: 0x330000,
      press_color: 0x550000,
      click_func: () => {
        deleteRoutine(i)
        onChanged && onChanged()
      },
    })

    ctx.listWidgets.push(nameBtn, nameLabel, infoLabel, runBtn, editBtn, del)
  }

  // Scroll arrows just above the bottom bar
  if (routines.length > VISIBLE) {
    const arrowsY = bottomY - 56
    ctx.listWidgets.push(
      createWidget(widget.BUTTON, {
        x: 40,
        y: arrowsY,
        w: 190,
        h: 48,
        radius: 24,
        text: '▲',
        text_size: 24,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          ctx.listOffset = Math.max(0, ctx.listOffset - 1)
          ctx.refreshList()
        },
      }),
      createWidget(widget.BUTTON, {
        x: 250,
        y: arrowsY,
        w: 190,
        h: 48,
        radius: 24,
        text: '▼',
        text_size: 24,
        normal_color: COLOR_DARK_BTN,
        press_color: COLOR_DARK_BTN_PRESS,
        click_func: () => {
          ctx.listOffset = Math.min(maxOffset, ctx.listOffset + 1)
          ctx.refreshList()
        },
      })
    )
  }

  return offset
}

export function clearWidgets(widgets) {
  widgets.forEach((w) => {
    try {
      deleteWidget(w)
    } catch (e) {}
  })
  widgets.length = 0
}
