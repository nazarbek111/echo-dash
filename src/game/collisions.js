import { GROUND_Y, TILE } from './constants.js'

// Return list of solid rects for collision (in world coords, x absolute, y from top)
export function getObstacleRects(obs) {
  const T = TILE
  const groundTop = GROUND_Y
  switch (obs.type) {
    case 'block':
      return [{ x: obs.x, y: groundTop - obs.h - obs.y, w: obs.w, h: obs.h, kind: 'block' }]
    case 'platform':
      return [{ x: obs.x, y: groundTop - obs.y - obs.h, w: obs.w, h: obs.h, kind: 'platform' }]
    case 'mover': {
      // mover y handled outside via current offset
      const cy = obs._cy ?? (groundTop - obs.y - obs.h)
      return [{ x: obs.x, y: cy, w: obs.w, h: obs.h, kind: 'mover' }]
    }
    default: return []
  }
}

// Spike triangles, return polygon for triangle-AABB approximation (use shrunken AABB for fairness)
export function getSpikeHitboxes(obs) {
  const T = TILE
  const groundTop = GROUND_Y
  const baseY = groundTop - obs.y  // top edge of ground/platform spike sits on
  let count = 1
  if (obs.type === 'dspike') count = 2
  if (obs.type === 'tspike') count = 3
  const boxes = []
  for (let i = 0; i < count; i++) {
    const x = obs.x + i * T
    // shrink hitbox for fairness (~40% width, ~70% height)
    const shrinkW = T * 0.45
    const shrinkH = T * 0.7
    boxes.push({
      x: x + (T - shrinkW) / 2,
      y: baseY - shrinkH,
      w: shrinkW,
      h: shrinkH,
      kind: 'spike'
    })
  }
  return boxes
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

// Test if player rect overlaps a gap (ground missing); returns true if player would fall (i.e., below ground but no platform support)
export function isOverGap(playerX, gaps) {
  for (const g of gaps) {
    if (playerX > g.x && playerX < g.x + g.w) return true
  }
  return false
}
