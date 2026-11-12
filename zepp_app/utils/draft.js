import { localStorage } from '@zos/storage'

/**
 * Draft of the routine that is being created/edited on the watch.
 *
 * Zepp OS destroys the page when another page is pushed and re-runs
 * `onInit` + `build` when the user comes back, so any state that has to
 * survive a navigation must be kept outside the page object. The draft is
 * stored here so opening the "Create on web" screen does not throw away the
 * steps the user already added.
 *
 * Shape: `{ name, steps, editId }` (the same fields the create page uses).
 */

const KEY = 'routine_draft'

export function saveDraft(draft) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        name: draft.name || '',
        steps: draft.steps || [],
        editId: draft.editId != null ? draft.editId : null,
      })
    )
  } catch (e) {}
}

/**
 * Returns the stored draft (or null when there is none) and removes it, so
 * a draft is only ever restored once.
 */
export function takeDraft() {
  let raw = null
  try {
    raw = localStorage.getItem(KEY)
  } catch (e) {
    return null
  }
  clearDraft()
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || !Array.isArray(parsed.steps)) return null
    return parsed
  } catch (e) {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch (e) {}
}
