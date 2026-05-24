// Echo Mode — store visual death markers per level in localStorage.
// Echoes are visual-only (no collision). Used by the engine to render a
// "graveyard" of past failures at the exact world position where the player died.

const STORAGE_KEY = 'echodash_death_echoes_v1'
const MAX_PER_LEVEL = 50

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}
function writeAll(obj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch {}
}

export function loadDeathEchoes(levelId) {
    if (!levelId) return []
    const all = readAll()
    const list = Array.isArray(all[levelId]) ? all[levelId] : []
    // defensive: filter out malformed
    return list.filter(e => e && typeof e.x === 'number')
}

export function addDeathEcho(levelId, echo) {
    if (!levelId || !echo) return
    const all = readAll()
    const list = Array.isArray(all[levelId]) ? all[levelId] : []
    list.push({
        x: Math.round(echo.x),
        attempt: echo.attempt | 0,
        zone: echo.zone || 'blue',
        createdAt: echo.createdAt || Date.now(),
    })
    // keep last N
    if (list.length > MAX_PER_LEVEL) list.splice(0, list.length - MAX_PER_LEVEL)
    all[levelId] = list
    writeAll(all)
}

export function clearDeathEchoes(levelId) {
    if (!levelId) return
    const all = readAll()
    if (all[levelId]) {
        delete all[levelId]
        writeAll(all)
    }
}

export function clearAllDeathEchoes() {
    writeAll({})
}

// Color per zone — matches mood palette so echoes feel continuous with the world.
export function echoZoneColor(zone) {
    switch (zone) {
        case 'purple': return '#d28bff'
        case 'red':    return '#ff7a4a'
        case 'white':  return '#ffffff'
        case 'blue':
        default:       return '#22e3ff'
    }
}

// Helper used by engine.die() to pick a zone label from progress (0..1).
export function zoneFromProgress(p) {
    if (p < 0.30) return 'blue'
    if (p < 0.60) return 'purple'
    if (p < 0.85) return 'red'
    return 'white'
}
