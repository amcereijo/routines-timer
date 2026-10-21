import { localStorage } from '@zos/storage'
import { MAX_SAVED } from './constants'

const KEY = 'saved_routines'

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (e) {
    return []
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch (e) {}
}

/**
 * routines shape: [{ id: number, name: string, steps: [{seconds, name}] }]
 */
export function getSavedRoutines() {
  return readAll()
}

/**
 * Add a routine. When `editId` matches an existing routine id, that routine
 * is updated in place (keeping its position in the list). As a convenience,
 * when no editId is given but the name matches an existing routine, that
 * routine is overwritten instead.
 * Returns true when an existing routine was overwritten/updated.
 */
export function addRoutine(name, steps, editId) {
  const list = readAll()

  // Update in place
  if (editId != null) {
    const idx = list.findIndex((r) => r.id === editId)
    if (idx >= 0) {
      list[idx] = { id: editId, name: name || '', steps }
      writeAll(list)
      return true
    }
  }

  // Overwrite by name
  const existing = name ? list.findIndex((r) => r.name === name) : -1
  let overwritten = false
  if (existing >= 0) {
    list.splice(existing, 1)
    overwritten = true
  }
  if (list.length >= MAX_SAVED) {
    list.shift()
  }
  list.push({ id: Date.now(), name: name || '', steps })
  writeAll(list)
  return overwritten
}

export function deleteRoutine(index) {
  const list = readAll()
  if (index < 0 || index >= list.length) return
  list.splice(index, 1)
  writeAll(list)
}
