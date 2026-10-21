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
 * Add (or overwrite when a routine with the same name exists) a routine.
 * Returns true when an existing routine was overwritten.
 */
export function addRoutine(name, steps) {
  const list = readAll()
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
