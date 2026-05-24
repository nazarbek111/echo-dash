// Core game constants
export const BASE_WIDTH = 1280
export const BASE_HEIGHT = 720

export const GROUND_Y = 560        // top of ground line (px from top in base coords)
export const PLAYER_X = 280         // player horizontal screen position
export const PLAYER_SIZE = 46

export const GRAVITY = 2600         // px / s^2
export const JUMP_VELOCITY = -940   // px / s

export const BASE_SPEED = 460       // px / s (world scroll)
export const SPEED_BOOST = 720
export const FINAL_SPEED = 600

export const TILE = 40              // grid unit in level data

export const STORAGE_KEYS = {
    best: 'echodash_best_v1',
    attempts: 'echodash_attempts_v1',
    ghost: 'echodash_ghost_v1',
    skin: 'echodash_skin_v1',
    settings: 'echodash_settings_v1',
}

export const SKINS = {
    cyan:   { id: 'cyan',   name: 'Cyan Core',    color: '#22e3ff', glow: '#22e3ff', accent: '#9af8ff' },
    purple: { id: 'purple', name: 'Purple Pulse', color: '#b46bff', glow: '#d28bff', accent: '#ffb8ff' },
    red:    { id: 'red',    name: 'Red Glitch',   color: '#ff4d6d', glow: '#ff8aa1', accent: '#ffd1d8' },
    gold:   { id: 'gold',   name: 'Gold Runner',  color: '#ffd166', glow: '#ffe9a8', accent: '#fff5d6' },
}

export const DEFAULT_SETTINGS = {
    showGhost: true,
    sound: true,
    particles: true,
    shake: true,
    reducedMotion: false,
}

// Mood zones (by progress 0..1)
export const MOODS = [
    { id: 'blue',   from: 0.00, to: 0.30, name: 'Blue Zone',
        primary: '#22e3ff', secondary: '#1a6dff', bg1: '#04111f', bg2: '#021024', pulseHz: 1.6 },
    { id: 'purple', from: 0.30, to: 0.60, name: 'Purple Glitch',
        primary: '#b46bff', secondary: '#ff4dd2', bg1: '#160726', bg2: '#0a0418', pulseHz: 2.0 },
    { id: 'red',    from: 0.60, to: 0.85, name: 'Danger Zone',
        primary: '#ff5a4a', secondary: '#ffae3a', bg1: '#1d0608', bg2: '#0e0204', pulseHz: 2.6 },
    { id: 'white',  from: 0.85, to: 1.01, name: 'Finale',
        primary: '#ffffff', secondary: '#9af8ff', bg1: '#0a1622', bg2: '#020812', pulseHz: 3.2 },
]

export function lerp(a, b, t) { return a + (b - a) * t }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

export function mixColor(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2)
    const r = Math.round(lerp(a.r, b.r, t))
    const g = Math.round(lerp(a.g, b.g, t))
    const bb = Math.round(lerp(a.b, b.b, t))
    return `rgb(${r}, ${g}, ${bb})`
}
export function hexToRgb(hex) {
    const h = hex.replace('#','')
    const v = h.length === 3
        ? h.split('').map(c => parseInt(c+c, 16))
        : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
    return { r: v[0], g: v[1], b: v[2] }
}
export function rgba(hex, a) {
    const { r, g, b } = hexToRgb(hex.startsWith('#') ? hex : '#ffffff')
    return `rgba(${r},${g},${b},${a})`
}

export function getMood(progress) {
    // Find current and next mood, return blended primaries
    let cur = MOODS[0], next = MOODS[0], t = 0
    for (let i = 0; i < MOODS.length; i++) {
        const m = MOODS[i]
        if (progress >= m.from && progress < m.to) {
            cur = m
            next = MOODS[Math.min(i + 1, MOODS.length - 1)]
            // smooth transition in last 6% of zone
            const span = m.to - m.from
            const local = (progress - m.from) / span
            t = local > 0.85 ? (local - 0.85) / 0.15 : 0
            break
        }
    }
    return {
        cur, next, t,
        primary: mixColor(cur.primary, next.primary, t),
        secondary: mixColor(cur.secondary, next.secondary, t),
        bg1: mixColor(cur.bg1, next.bg1, t),
        bg2: mixColor(cur.bg2, next.bg2, t),
        pulseHz: lerp(cur.pulseHz, next.pulseHz, t),
    }
}