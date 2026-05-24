// Level data — obstacle types:
// spike (1 high), dspike (2 wide), tspike (3 wide), block (w,h), platform (w,h, y from ground)
// gap (w) — represented as missing ground segments
// portal_speed (mult), glitch (w) zone marker, mover (block oscillating)
//
// x is absolute pixel position in world space.
// y is height above ground (0 = on ground). For platforms y is platform top above ground.
//
// LEVEL DURATION TARGETS (at BASE_SPEED 460 px/s with portal mults):
//   Demo Run: ~60-90s  -> ~35,000-42,000 px
//   Full Run: ~2-4 min -> ~75,000-110,000 px

import { TILE } from './constants.js'

const T = TILE

// ---------- helpers (cursor-style builder) ----------
function ctx() {
  const obs = []
  let x = 0
  const api = {
    obs, get x() { return x },
    skip(d)  { x += d; return api },
    moveTo(v){ x = v; return api },
    spike(yOff = 0, gap = 200)  { x += gap; obs.push({ type:'spike',  x, y: yOff }); return api },
    dspike(gap = 240)           { x += gap; obs.push({ type:'dspike', x, y: 0 }); return api },
    tspike(gap = 280)           { x += gap; obs.push({ type:'tspike', x, y: 0 }); return api },
    block(w = T, h = T, gap = 280, yOff = 0) {
      x += gap; obs.push({ type:'block', x, y: yOff, w, h }); return api
    },
    platform(yAbove = T*3, w = T*3, h = T*0.6, gap = 320) {
      x += gap; obs.push({ type:'platform', x, y: yAbove, w, h }); return api
    },
    gap(w = T*3, gap = 280) {
      x += gap; obs.push({ type:'gap', x, w }); return api
    },
    mover(yAbove = T*2, w = T, h = T, amp = T*2, speed = 1.5, gap = 360) {
      x += gap; obs.push({ type:'mover', x, y: yAbove, w, h, amp, speed }); return api
    },
    speed(mult = 1.0, gap = 220) {
      x += gap; obs.push({ type:'portal_speed', x, mult }); return api
    },
    glitch(w = 1400, gap = 40) {
      x += gap; obs.push({ type:'glitch', x, w }); return api
    },
    // ---------- rhythm pattern primitives ----------
    rest(d = 600) { x += d; return api },
    spikeTrain(count = 4, spacing = 200, firstGap = 240) {
      api.spike(0, firstGap)
      for (let i = 1; i < count; i++) api.spike(0, spacing)
      return api
    },
    altPattern(count = 3, spacing = 260) {
      for (let i = 0; i < count; i++) {
        if (i % 2 === 0) api.spike(0, spacing)
        else api.dspike(spacing)
      }
      return api
    },
    stairs(steps = 3, stepW = T, stepH = T, spacing = 0) {
      for (let i = 0; i < steps; i++) {
        api.block(stepW, stepH * (i + 1), i === 0 ? 320 : stepW + spacing, 0)
      }
      for (let i = steps - 1; i > 0; i--) {
        api.block(stepW, stepH * i, stepW + spacing, 0)
      }
      return api
    },
    platformRun(count = 3, yAbove = T*3, w = T*3, gap = 80) {
      for (let i = 0; i < count; i++) {
        api.platform(yAbove, w, T*0.6, i === 0 ? 360 : (w + gap))
      }
      return api
    },
    gapTrap(gapW = T*3, gapDist = 320, spikeDist = 220) {
      api.gap(gapW, gapDist)
      api.spike(0, spikeDist)
      return api
    },
    raisedSpike(blockH = T) {
      api.block(T, blockH, 320, 0)
      api.spike(blockH, 60)
      return api
    },
  }
  return api
}

// ============================================================
// FULL RUN  ~ ≈3 min playtime
// ============================================================
function buildFull() {
  const c = ctx()
  c.skip(1200)

  // ============================================
  // SECTION 1: 0% - 20%  EASY INTRODUCTION
  // ============================================
  c.spike(0, 700).spike(0, 480).spike(0, 460)
  c.rest(400)
  c.spike(0, 380).spike(0, 360).spike(0, 380)
  c.rest(300)
  c.block(T*2, T, 420)
  c.spike(0, 380)
  c.rest(300)
  c.platform(T*3, T*4, T*0.6, 460)
  c.spike(0, 320).spike(0, 320)
  c.rest(300)
  c.dspike(420)
  c.spike(0, 360).spike(0, 320)
  c.rest(300)
  c.block(T, T, 400).spike(0, 220)
  c.spike(0, 360).spike(0, 320)
  c.rest(300)
  c.tspike(440)
  c.spike(0, 380).spike(0, 320).spike(0, 320)
  c.rest(400)
  c.platform(T*3, T*3, T*0.6, 420)
  c.platform(T*4, T*3, T*0.6, T*3 + 100)
  c.spike(0, 360)
  c.rest(400)
  c.spikeTrain(3, 320, 380)
  c.rest(360)
  c.platform(T*3, T*4, T*0.6, 420)
  c.spike(0, 80).spike(0, 320)
  c.rest(360)
  c.dspike(380)
  c.spike(0, 340).dspike(320)
  c.rest(360)
  c.block(T*2, T, 380).spike(0, 240)
  c.spike(0, 340)
  c.rest(400)
  c.tspike(420).spike(0, 320).spike(0, 320)
  c.rest(500)

  // ============================================
  // SECTION 2: 20% - 40%  MORE OBSTACLES
  // ============================================
  c.spikeTrain(3, 280, 380)
  c.rest(300)
  c.dspike(380).spike(0, 260).dspike(280)
  c.rest(360)
  c.stairs(3, T, T)
  c.spike(0, 320)
  c.rest(300)
  c.gap(T*3, 360)
  c.spike(0, 280).spike(0, 320)
  c.rest(300)
  c.tspike(380).spike(0, 320).dspike(280)
  c.rest(360)
  c.platform(T*3, T*3, T*0.6, 380)
  c.spike(0, 60).spike(0, 280)
  c.rest(300)
  c.platform(T*3, T*2, T*0.6, 380)
  c.platform(T*5, T*2, T*0.6, T*2 + 80)
  c.spike(0, 280).spike(0, 280)
  c.rest(400)
  c.raisedSpike(T)
  c.spike(0, 320)
  c.rest(300)
  c.altPattern(4, 280)
  c.rest(300)
  c.gap(T*4, 360)
  c.dspike(280)
  c.rest(400)
  c.spikeTrain(4, 260, 360)
  c.rest(320)
  c.platformRun(3, T*3, T*3, 80)
  c.spike(0, 320)
  c.rest(360)
  c.tspike(360).dspike(320).tspike(340)
  c.rest(360)
  c.block(T*2, T*2, 380, 0)
  c.spike(0, 120).spike(0, 280)
  c.rest(360)
  c.gapTrap(T*3, 360, 240)
  c.dspike(300)
  c.rest(500)

  // ============================================
  // SECTION 3: 40% - 60%  GLITCH ZONE + SPEED
  // ============================================
  c.speed(1.30, 360)
  c.glitch(5800, 60)
  c.spike(0, 320).spike(0, 260).spike(0, 260)
  c.dspike(320)
  c.spike(0, 260).spike(0, 260)
  c.rest(280)
  c.platform(T*3, T*3, T*0.6, 360)
  c.platform(T*5, T*2, T*0.6, T*3 + 80)
  c.spike(0, 280)
  c.rest(280)
  c.tspike(360)
  c.spike(0, 280).spike(0, 260)
  c.rest(280)
  c.gapTrap(T*4, 360, 240)
  c.dspike(300)
  c.rest(280)
  c.platform(T*3, T*4, T*0.6, 380)
  c.spike(0, 80)
  c.platform(T*5, T*3, T*0.6, T*4 + 100)
  c.spike(0, 240)
  c.rest(280)
  c.altPattern(5, 260)
  c.rest(280)
  c.spike(0, 280).dspike(280).spike(0, 240).tspike(320)
  c.rest(280)
  c.platformRun(3, T*3, T*2, 80)
  c.spike(0, 260).dspike(280)
  c.rest(280)
  c.speed(1.0, 280)
  c.rest(400)
  c.platform(T*3, T*3, T*0.6, 400)
  c.spike(0, 320).spike(0, 320)
  c.rest(500)

  // ============================================
  // SECTION 4: 60% - 85%  DANGER ZONE
  // ============================================
  c.spike(0, 380).spike(0, 260).dspike(280)
  c.rest(280)
  c.mover(T*2, T, T, T*2, 1.5, 420)
  c.spike(0, 280).spike(0, 280)
  c.rest(300)
  c.tspike(380)
  c.raisedSpike(T)
  c.spike(0, 300)
  c.rest(300)
  c.platform(T*3, T*3, T*0.6, 360)
  c.gap(T*4, T*3 + 80)
  c.spike(0, 260)
  c.dspike(280)
  c.rest(300)
  c.mover(T*3, T, T, T*2, 1.8, 380)
  c.tspike(360)
  c.rest(280)
  c.block(T*2, T*2, 380, 0)
  c.spike(0, 100)
  c.spike(0, 260)
  c.rest(300)
  c.dspike(360).dspike(320).dspike(320)
  c.rest(300)
  c.platformRun(3, T*3, T*2, 90)
  c.spike(0, 260).spike(0, 260)
  c.rest(300)
  c.mover(T*3, T, T, T*2, 1.6, 380)
  c.spike(0, 280)
  c.mover(T*3, T, T, T*2, 2.0, 360)
  c.tspike(340)
  c.rest(300)
  c.spike(0, 300).spike(0, 260).spike(0, 260).dspike(280)
  c.rest(300)
  c.gapTrap(T*4, 360, 240)
  c.dspike(280)
  c.tspike(320)
  c.rest(400)
  c.spikeTrain(4, 260, 360)
  c.rest(300)
  c.platform(T*3, T*3, T*0.6, 380)
  c.spike(0, 80).dspike(280)
  c.rest(300)
  c.mover(T*3, T, T, T*2, 2.2, 380)
  c.spike(0, 280).tspike(320)
  c.rest(320)
  c.block(T*2, T, 360, 0)
  c.spike(0, 80).spike(0, 240)
  c.dspike(280)
  c.rest(300)
  c.altPattern(5, 260)
  c.rest(320)
  c.gap(T*3, 340)
  c.platform(T*3, T*3, T*0.6, 220)
  c.spike(0, 80).dspike(280)
  c.rest(300)
  c.tspike(340).spike(0, 240).tspike(340)
  c.rest(500)

  // ============================================
  // SECTION 5: 85% - 100%  FINALE
  // ============================================
  c.speed(1.30, 380)
  c.spike(0, 320).spike(0, 240).spike(0, 240).spike(0, 240)
  c.rest(260)
  c.dspike(280).dspike(280).dspike(280)
  c.rest(260)
  c.platform(T*3, T*4, T*0.6, 320)
  c.spike(0, 80).spike(0, 280)
  c.rest(260)
  c.tspike(320)
  c.spike(0, 240).spike(0, 240)
  c.rest(260)
  c.gap(T*3, 320)
  c.spike(0, 240).dspike(260)
  c.rest(260)
  c.tspike(300)
  c.spike(0, 240).dspike(260).tspike(320)
  c.spike(0, 240).spike(0, 240)
  c.rest(260)
  c.block(T*2, T, 320, 0)
  c.spike(0, 240).dspike(280)
  c.rest(280)
  c.platform(T*3, T*4, T*0.6, 340)
  c.spike(0, 80).spike(0, 260)
  c.tspike(320)
  c.rest(280)
  c.spike(0, 260).dspike(280).spike(0, 240)
  c.tspike(320)
  c.rest(280)
  c.dspike(280).tspike(320).dspike(280)
  c.rest(500)

  const totalLength = c.x + 1600
  return { obstacles: c.obs, length: totalLength, name: 'Full Run' }
}

// ============================================================
// DEMO RUN  ~ ≈70s playtime
// ============================================================
function buildDemo() {
  const c = ctx()
  c.skip(900)

  // ---- 0-30% Blue intro ----
  c.spike(0, 600).spike(0, 460).spike(0, 420)
  c.rest(300)
  c.dspike(420)
  c.spike(0, 360).spike(0, 340)
  c.rest(300)
  c.block(T*2, T, 400)
  c.spike(0, 360)
  c.rest(300)
  c.platform(T*3, T*3, T*0.6, 420)
  c.spike(0, 320).spike(0, 320)
  c.rest(360)
  c.tspike(420)
  c.spike(0, 320).dspike(300)
  c.rest(360)
  c.spikeTrain(3, 300, 360)
  c.rest(300)
  c.platform(T*3, T*4, T*0.6, 400)
  c.spike(0, 80).spike(0, 320)
  c.rest(360)
  c.dspike(380).spike(0, 320)
  c.rest(360)
  c.block(T*2, T, 380).spike(0, 240)
  c.spike(0, 320)
  c.rest(400)

  // ---- 30-60% Purple glitch ----
  c.speed(1.25, 380)
  c.glitch(3800, 40)
  c.spike(0, 320).spike(0, 280).dspike(300)
  c.rest(280)
  c.platform(T*3, T*3, T*0.6, 360)
  c.spike(0, 80).spike(0, 280)
  c.rest(280)
  c.tspike(340).spike(0, 280)
  c.rest(280)
  c.gapTrap(T*3, 340, 240)
  c.dspike(280)
  c.rest(280)
  c.altPattern(4, 280)
  c.rest(280)
  c.platformRun(2, T*3, T*3, 80)
  c.spike(0, 280)
  c.rest(280)
  c.spike(0, 300).dspike(280).tspike(320)
  c.speed(1.0, 280)
  c.rest(400)

  // ---- 60-85% Danger ----
  c.spike(0, 360).dspike(280)
  c.mover(T*2, T, T, T*2, 1.6, 380)
  c.tspike(340)
  c.rest(300)
  c.platform(T*3, T*3, T*0.6, 360)
  c.gap(T*3, T*3 + 100)
  c.spike(0, 240).dspike(280)
  c.rest(300)
  c.stairs(2, T, T)
  c.spike(0, 280).tspike(320)
  c.rest(300)
  c.mover(T*3, T, T, T*2, 2.0, 380)
  c.spike(0, 280).dspike(280)
  c.rest(300)
  c.spikeTrain(3, 280, 340)
  c.rest(300)
  c.block(T*2, T*2, 380, 0)
  c.spike(0, 100).dspike(280)
  c.rest(300)
  c.altPattern(4, 280)
  c.rest(400)

  // ---- 85-100% Finale ----
  c.speed(1.30, 380)
  c.spike(0, 300).spike(0, 240).spike(0, 240)
  c.dspike(280).dspike(280)
  c.rest(260)
  c.platform(T*3, T*4, T*0.6, 320)
  c.spike(0, 80).tspike(320)
  c.rest(260)
  c.spike(0, 240).dspike(280).tspike(320)
  c.rest(260)
  c.tspike(300).spike(0, 240).dspike(280)
  c.rest(500)

  const totalLength = c.x + 1200
  return { obstacles: c.obs, length: totalLength, name: 'Demo Run' }
}


// ============================================================
// EXTRA HANDCRAFTED LEVELS (used by Level Select)
// ============================================================
function buildBlueInitiation() {
  const c = ctx()
  c.skip(1000)
  for (let i = 0; i < 6; i++) c.spike(0, 520)
  c.rest(400)
  c.dspike(480).spike(0, 420).spike(0, 380)
  c.rest(400)
  c.platform(T*3, T*4, T*0.6, 460)
  c.spike(0, 80).spike(0, 360)
  c.rest(400)
  c.spikeTrain(3, 360, 420)
  c.rest(400)
  c.block(T*2, T, 420).spike(0, 240).spike(0, 360)
  c.rest(400)
  c.dspike(420).spike(0, 380).platform(T*3, T*3, T*0.6, 400)
  c.spike(0, 360)
  c.rest(500)
  const totalLength = c.x + 1200
  return { obstacles: c.obs, length: totalLength, name: 'Blue Initiation' }
}

function buildGlitchCorridor() {
  const c = ctx()
  c.skip(1000)
  c.spike(0, 480).dspike(360).spike(0, 320)
  c.rest(360)
  c.speed(1.20, 360)
  c.glitch(5000, 60)
  c.spike(0, 320).spike(0, 280).dspike(300)
  c.rest(280)
  c.platformRun(3, T*3, T*3, 80)
  c.spike(0, 280).tspike(320)
  c.rest(280)
  c.altPattern(5, 280)
  c.rest(280)
  c.platform(T*3, T*3, T*0.6, 360)
  c.spike(0, 80).spike(0, 260)
  c.dspike(280).tspike(320)
  c.rest(280)
  c.speed(1.0, 280)
  c.platform(T*3, T*4, T*0.6, 380)
  c.spike(0, 80).spike(0, 280).tspike(320)
  c.rest(500)
  const totalLength = c.x + 1200
  return { obstacles: c.obs, length: totalLength, name: 'Glitch Corridor' }
}

function buildRedlineSprint() {
  const c = ctx()
  c.skip(900)
  c.spike(0, 380).dspike(280).tspike(320)
  c.rest(280)
  c.speed(1.30, 320)
  c.spike(0, 280).spike(0, 240).dspike(280)
  c.rest(260)
  c.platform(T*3, T*3, T*0.6, 340)
  c.spike(0, 80).tspike(320)
  c.rest(260)
  c.mover(T*2, T, T, T*2, 2.0, 360)
  c.spike(0, 280).dspike(280)
  c.rest(260)
  c.speed(1.40, 260)
  c.spikeTrain(4, 240, 320)
  c.dspike(280).tspike(320)
  c.rest(260)
  c.gap(T*3, 320)
  c.spike(0, 240).dspike(280)
  c.rest(260)
  c.platform(T*3, T*4, T*0.6, 320)
  c.spike(0, 80).tspike(320)
  c.spike(0, 240).dspike(280)
  c.rest(500)
  const totalLength = c.x + 1200
  return { obstacles: c.obs, length: totalLength, name: 'Redline Sprint' }
}

function buildWhiteFinaleLevel() {
  const c = ctx()
  c.skip(900)
  c.speed(1.30, 320)
  c.spike(0, 300).dspike(280).tspike(320)
  c.rest(260)
  c.platform(T*3, T*4, T*0.6, 320)
  c.spike(0, 80).tspike(320).dspike(280)
  c.rest(260)
  c.mover(T*3, T, T, T*2, 2.2, 360)
  c.spike(0, 280).tspike(320)
  c.rest(260)
  c.gap(T*3, 320)
  c.platform(T*3, T*3, T*0.6, 220)
  c.spike(0, 80).dspike(280)
  c.rest(260)
  c.speed(1.40, 260)
  c.spike(0, 240).dspike(280).spike(0, 240).tspike(320)
  c.rest(260)
  c.altPattern(5, 260)
  c.tspike(320).dspike(280).tspike(320)
  c.rest(260)
  c.platform(T*3, T*4, T*0.6, 320)
  c.spike(0, 80).spike(0, 240).dspike(280).tspike(320)
  c.rest(500)
  const totalLength = c.x + 1200
  return { obstacles: c.obs, length: totalLength, name: 'White Finale' }
}

// ============================================================
// DAILY CHALLENGE (deterministic from date seed)
// ============================================================
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(s) {
  let h = 0x9e3779b9
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x85ebca6b)
  return h >>> 0
}

// Build a fair, ~70-90s level from a date seed.
export function buildDailyLevel(dateStr) {
  const rnd = mulberry32(hashSeed(dateStr))
  const c = ctx()
  c.skip(900)

  const PATTERNS = [
    () => c.spike(0, 380 + Math.floor(rnd()*120)),
    () => c.spike(0, 320).spike(0, 280).spike(0, 280),
    () => c.dspike(360),
    () => c.tspike(380),
    () => c.altPattern(3 + Math.floor(rnd()*2), 280),
    () => c.platform(T*3, T*3, T*0.6, 360).spike(0, 80).spike(0, 280),
    () => c.block(T*2, T, 360).spike(0, 240),
    () => c.spikeTrain(3, 280, 360),
    () => c.gap(T*3, 340).spike(0, 240),
    () => c.mover(T*2, T, T, T*2, 1.4 + rnd()*0.6, 360).spike(0, 280),
  ]

  // Intro
  c.spike(0, 600).spike(0, 480).spike(0, 420)
  c.rest(360)
  // Pre-glitch zone
  for (let i = 0; i < 6; i++) {
    PATTERNS[Math.floor(rnd() * PATTERNS.length)]()
    c.rest(260 + Math.floor(rnd()*120))
  }
  // Mood transition + speed portal
  c.speed(1.20 + rnd()*0.15, 320)
  c.glitch(2400, 40)
  for (let i = 0; i < 5; i++) {
    PATTERNS[Math.floor(rnd() * PATTERNS.length)]()
    c.rest(240 + Math.floor(rnd()*100))
  }
  c.speed(1.0, 260)
  // Finale
  for (let i = 0; i < 4; i++) {
    PATTERNS[Math.floor(rnd() * PATTERNS.length)]()
    c.rest(240 + Math.floor(rnd()*80))
  }
  c.rest(600)
  const totalLength = c.x + 1200
  return { obstacles: c.obs, length: totalLength, name: 'Daily Challenge' }
}

export const LEVELS = {
  full: buildFull(),
  demo: buildDemo(),
  blue_initiation: buildBlueInitiation(),
  glitch_corridor: buildGlitchCorridor(),
  redline_sprint:  buildRedlineSprint(),
  white_finale:    buildWhiteFinaleLevel(),
}
