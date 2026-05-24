// Web Audio synthetic beat + SFX. No external files.
// Music uses a lookahead scheduler driven by AudioContext.currentTime, so timing
// stays sample-accurate over long sessions (no drift, even after 30+ seconds).
let ctx = null
let masterGain = null
let musicNodes = []
let enabled = true

// ---- Lookahead scheduler state ----
const SCHEDULE_AHEAD = 0.1        // seconds — how far in advance to queue notes
const TICK_INTERVAL  = 0.05       // seconds — how often the scheduler wakes up
const BPM = 132
const BEAT = 60 / BPM
const BASS_NOTES = [55, 55, 73.42, 65.41, 55, 55, 82.41, 73.42]
let schedulerTimer = null         // setTimeout handle for the scheduler
let nextBeatTime = 0              // absolute AudioContext time of the next beat to schedule
let beatStep = 0                  // pattern step (0..15)

function ensureCtx() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        ctx = new AC()
        masterGain = ctx.createGain()
        masterGain.gain.value = 0.35
        masterGain.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(()=>{})
    return ctx
}

export function setEnabled(v) {
    enabled = !!v
    if (masterGain) masterGain.gain.value = enabled ? 0.35 : 0.0
    if (!enabled) stopMusic()
}

export function isEnabled() { return enabled }

// ---------------- SFX (unchanged behavior) ----------------
export function jumpSfx() {
    if (!enabled) return
    const c = ensureCtx(); if (!c) return
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(620, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.12)
    g.gain.setValueAtTime(0.18, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
    o.connect(g).connect(masterGain)
    o.start(); o.stop(c.currentTime + 0.16)
}

export function deathSfx() {
    if (!enabled) return
    const c = ensureCtx(); if (!c) return
    const bufSize = c.sampleRate * 0.5
    const buf = c.createBuffer(1, bufSize, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize)
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = 800
    const g = c.createGain()
    g.gain.setValueAtTime(0.3, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    src.connect(f).connect(g).connect(masterGain)
    src.start(); src.stop(c.currentTime + 0.5)

    const o = c.createOscillator()
    const g2 = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(180, c.currentTime)
    o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.4)
    g2.gain.setValueAtTime(0.2, c.currentTime)
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
    o.connect(g2).connect(masterGain)
    o.start(); o.stop(c.currentTime + 0.5)
}

export function victorySfx() {
    if (!enabled) return
    const c = ensureCtx(); if (!c) return
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = 'triangle'
        o.frequency.value = f
        g.gain.setValueAtTime(0, c.currentTime + i*0.1)
        g.gain.linearRampToValueAtTime(0.2, c.currentTime + i*0.1 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.1 + 0.4)
        o.connect(g).connect(masterGain)
        o.start(c.currentTime + i*0.1); o.stop(c.currentTime + i*0.1 + 0.45)
    })
}

// ---------------- Music: lookahead scheduler ----------------
// scheduleOneBeat(t) — schedules a single beat's kick, bass, and hi-hat to fire
// at absolute AudioContext time `t`. Uses sample-accurate Web Audio scheduling.
function scheduleOneBeat(t) {
    const c = ctx
    if (!c) return

    // Kick on every beat
    const kO = c.createOscillator()
    const kG = c.createGain()
    kO.frequency.setValueAtTime(140, t)
    kO.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    kG.gain.setValueAtTime(0.5, t)
    kG.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    kO.connect(kG).connect(masterGain)
    kO.start(t); kO.stop(t + 0.18)
    musicNodes.push(kO)

    // Bass — saw, one per beat (preserves original "step % 1 === 0" behavior)
    const bO = c.createOscillator()
    const bG = c.createGain()
    bO.type = 'sawtooth'
    bO.frequency.value = BASS_NOTES[beatStep % BASS_NOTES.length]
    bG.gain.setValueAtTime(0.0, t)
    bG.gain.linearRampToValueAtTime(0.12, t + 0.01)
    bG.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.9)
    bO.connect(bG).connect(masterGain)
    bO.start(t); bO.stop(t + BEAT)
    musicNodes.push(bO)

    // Hi-hat-ish noise burst on offbeats
    if (beatStep % 2 === 1) {
        const bufSize = Math.floor(c.sampleRate * 0.05)
        const buf = c.createBuffer(1, bufSize, c.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) d[i] = (Math.random()*2-1) * (1 - i/bufSize)
        const src = c.createBufferSource(); src.buffer = buf
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000
        const g = c.createGain(); g.gain.value = 0.08
        src.connect(hp).connect(g).connect(masterGain)
        src.start(t); src.stop(t + 0.06)
    }

    beatStep = (beatStep + 1) % 16
    // Trim retained node list so we don't leak references
    if (musicNodes.length > 60) musicNodes = musicNodes.slice(-40)
}

function scheduler() {
    // If music was stopped between iterations, do nothing.
    if (!schedulerTimer || !ctx) return
    // Queue every beat whose start time falls within the lookahead window.
    while (nextBeatTime < ctx.currentTime + SCHEDULE_AHEAD) {
        scheduleOneBeat(nextBeatTime)
        nextBeatTime += BEAT
    }
    schedulerTimer = setTimeout(scheduler, TICK_INTERVAL * 1000)
}

export function startMusic() {
    if (!enabled) return
    const c = ensureCtx(); if (!c) return
    // Guard against duplicate schedulers — single source of truth.
    stopMusic()
    beatStep = 0
    // Schedule first beat just slightly in the future so the first audio packet
    // is ready before playback starts (avoids click).
    nextBeatTime = c.currentTime + 0.06
    // Use a truthy sentinel so scheduler() recognises it's allowed to run.
    schedulerTimer = setTimeout(scheduler, 0)
}

export function stopMusic() {
    if (schedulerTimer) { clearTimeout(schedulerTimer); schedulerTimer = null }
    musicNodes.forEach(n => { try { n.stop() } catch {} })
    musicNodes = []
}
