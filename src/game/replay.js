import { STORAGE_KEYS } from './constants.js'

// Records frames every N ms, stores compact array
export class Recorder {
  constructor() { this.frames = [] }
  reset() { this.frames = [] }
  // distance is world-x; we record so ghost can be re-played by interpolation on world-x
  record(distance, y, rot) {
    // store every 30px of distance to keep size small
    const last = this.frames[this.frames.length - 1]
    if (!last || distance - last[0] >= 28) {
      this.frames.push([Math.round(distance), Math.round(y), +rot.toFixed(2)])
    }
  }
}

export function saveBest(levelId, best, frames) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ghost)
    const all = raw ? JSON.parse(raw) : {}
    all[levelId] = { best, frames }
    localStorage.setItem(STORAGE_KEYS.ghost, JSON.stringify(all))
  } catch (e) { console.warn('ghost save failed', e) }
}

export function loadBest(levelId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ghost)
    if (!raw) return null
    const all = JSON.parse(raw)
    return all[levelId] || null
  } catch { return null }
}

export function clearBest() {
  try { localStorage.removeItem(STORAGE_KEYS.ghost) } catch {}
}

// Sample ghost y/rot at given world distance via binary search
export function sampleGhost(frames, distance) {
  if (!frames || frames.length === 0) return null
  if (distance <= frames[0][0]) return { y: frames[0][1], rot: frames[0][2] }
  const last = frames[frames.length - 1]
  if (distance >= last[0]) return { y: last[1], rot: last[2], done: true }
  let lo = 0, hi = frames.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (frames[mid][0] <= distance) lo = mid
    else hi = mid
  }
  const a = frames[lo], b = frames[hi]
  const t = (distance - a[0]) / Math.max(1, b[0] - a[0])
  return { y: a[1] + (b[1] - a[1]) * t, rot: a[2] + (b[2] - a[2]) * t }
}
