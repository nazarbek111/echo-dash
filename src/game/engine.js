import {
    BASE_WIDTH, BASE_HEIGHT, GROUND_Y, PLAYER_X, PLAYER_SIZE,
    GRAVITY, JUMP_VELOCITY, BASE_SPEED, TILE, getMood, rgba, lerp, clamp
} from './constants.js'
import { getObstacleRects, getSpikeHitboxes, aabb } from './collisions.js'
import { Particles } from './particles.js'
import { Recorder, sampleGhost } from './replay.js'
import * as audio from './audio.js'
import { loadDeathEchoes, addDeathEcho, clearDeathEchoes, echoZoneColor, zoneFromProgress } from './deathEchoes.js'

const CEILING_Y = 40  // ceiling when gravity is flipped

// ─── Bullet Time constants ───────────────────────────────────────────────────
const BULLET_TIME_DURATION = 0.8   // seconds of slow-mo window
const BULLET_TIME_SPEED    = 0.10  // game runs at 10% speed during bullet time
const REWIND_SECS          = 2.0   // how far back to rewind
const REWIND_BUF_SIZE      = 256   // ~4s at 60fps

// ─── Rhythm constants ────────────────────────────────────────────────────────
const RHYTHM_PERFECT_MS = 0.080    // ±80ms = PERFECT
const RHYTHM_GOOD_MS    = 0.145    // ±145ms = GOOD

export function createEngine({ canvas, level, levelId, settings, skin, ghost, onState, attemptIndex }) {
    const ctx = canvas.getContext('2d')
    let DPR = Math.min(window.devicePixelRatio || 1, 2)
    let cssW = canvas.clientWidth, cssH = canvas.clientHeight
    let scale = 1

    function resize() {
        cssW = canvas.clientWidth
        cssH = canvas.clientHeight
        DPR = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(cssW * DPR)
        canvas.height = Math.floor(cssH * DPR)
        scale = Math.min(cssW / BASE_WIDTH, cssH / BASE_HEIGHT)
    }
    resize()

    // ── World state ──────────────────────────────────────────────────────────
    const state = {
        running: true,
        dead: false,
        won: false,
        distance: 0,
        startTime: performance.now(),
        elapsed: 0,
        speed: BASE_SPEED,
        speedMult: 1.0,
        cause: '',
        pendingCause: '',
        progress: 0,
        bestPct: 0,
        attempt: attemptIndex || 1,
        jumps: 0,
        speedPortalsPassed: 0,
        gravityFlipped: false,   // ← gravity portal state
    }

    // ── Player ───────────────────────────────────────────────────────────────
    const player = {
        x: PLAYER_X,
        y: GROUND_Y - PLAYER_SIZE,
        vy: 0,
        onGround: true,
        rot: 0,
        squash: 1,
        size: PLAYER_SIZE,
        jumpsLeft: 2,   // ← double jump
        maxJumps: 2,
        gravityDir: 1,  // 1 = normal (fall down), -1 = flipped (fall up)
    }

    // Load stored death echoes for this level
    const deathEchoes = loadDeathEchoes(levelId)

    const particles = new Particles(settings.particles ? 500 : 80)
    const recorder = new Recorder()

    const gaps = level.obstacles.filter(o => o.type === 'gap').map(o => ({ x: o.x, w: o.w }))

    function isGroundAt(worldX) {
        for (const g of gaps) {
            if (worldX > g.x && worldX < g.x + g.w) return false
        }
        return true
    }

    for (const o of level.obstacles) {
        if (o.type === 'mover') { o._t = 0; o._baseY = o.y }
    }

    // ── Camera shake ─────────────────────────────────────────────────────────
    let shakeT = 0, shakeMag = 0
    function shake(mag) {
        if (!settings.shake || settings.reducedMotion) return
        shakeMag = Math.max(shakeMag, mag)
        shakeT = 0.35
    }

    let glitchActive = 0
    let beatPhase = 0

    // ── Rewind buffer ────────────────────────────────────────────────────────
    const rewindBuf   = new Array(REWIND_BUF_SIZE).fill(null)
    let   rewindHead  = 0
    let   rewindCount = 0
    let   rewindUsed  = false

    // Bullet time state
    let bulletTimeActive = false
    let bulletTimeT      = 0          // countdown to forced death
    let rewindFlashT     = 0          // visual flash duration after rewind

    function recordSnapshot() {
        rewindBuf[rewindHead] = {
            distance:       state.distance,
            speedMult:      state.speedMult,
            elapsed:        state.elapsed,
            py:             player.y,
            pvy:            player.vy,
            ponGround:      player.onGround,
            prot:           player.rot,
            pjumpsLeft:     player.jumpsLeft,
            pgravityDir:    player.gravityDir,
            pgravityFlipped:state.gravityFlipped,
        }
        rewindHead  = (rewindHead + 1) % REWIND_BUF_SIZE
        rewindCount = Math.min(rewindCount + 1, REWIND_BUF_SIZE)
    }

    function getRewindSnapshot() {
        if (rewindCount < 10) return null
        // Scan back through buffer looking for snapshot ~REWIND_SECS ago
        const targetDist = state.distance - BASE_SPEED * REWIND_SECS
        for (let i = 1; i <= rewindCount; i++) {
            const idx  = (rewindHead - i + REWIND_BUF_SIZE) % REWIND_BUF_SIZE
            const snap = rewindBuf[idx]
            if (!snap) continue
            if (snap.distance <= targetDist || i === rewindCount) return snap
        }
        return rewindBuf[(rewindHead - 1 + REWIND_BUF_SIZE) % REWIND_BUF_SIZE]
    }

    function applyRewind() {
        const snap = getRewindSnapshot()
        if (!snap) { die(state.pendingCause); return }

        // Restore world + player to snapshot
        state.distance       = snap.distance
        state.speedMult      = snap.speedMult
        state.elapsed        = snap.elapsed
        state.progress       = clamp(state.distance / level.length, 0, 1)
        player.y             = snap.py
        player.vy            = snap.pvy
        player.onGround      = snap.ponGround
        player.rot           = snap.prot
        player.jumpsLeft     = snap.pjumpsLeft ?? player.maxJumps
        player.gravityDir    = snap.pgravityDir ?? 1
        state.gravityFlipped = snap.pgravityFlipped ?? false
        player.squash        = 1

        bulletTimeActive = false
        rewindUsed       = true
        // Clear buffer so we can't rewind again
        rewindCount = 0; rewindHead = 0

        audio.rewindSfx()
        shake(18)
        if (settings.particles) {
            particles.burst(state.distance + player.x + player.size / 2, player.y + player.size / 2, '#22e3ff', 60)
        }
        // Brief flash tracked via rewindFlashT
        rewindFlashT = 0.45
    }

    // ── Rhythm state ─────────────────────────────────────────────────────────
    const rhythm = {
        score: 0, streak: 0, bestStreak: 0,
        lastHit: null,    // 'perfect' | 'good' | null
        hitFlashT:  0,    // countdown for ring animation
        labelT:     0,    // countdown for floating label
        labelText:  '',
        labelY:     0,
    }

    function checkRhythm() {
        const info = audio.getBeatInfo()
        if (!info) return null
        const { nextBeatTime, BEAT, now } = info
        const prevBeat = nextBeatTime - BEAT
        const dist = Math.min(Math.abs(now - nextBeatTime), Math.abs(now - prevBeat))
        if (dist < RHYTHM_PERFECT_MS) return 'perfect'
        if (dist < RHYTHM_GOOD_MS)    return 'good'
        return null
    }

    // ── Input ─────────────────────────────────────────────────────────────────
    function jump() {
        // Bullet time: Space/tap → rewind
        if (bulletTimeActive) { applyRewind(); return }
        if (state.dead || state.won || !state.running) return

        if (player.jumpsLeft > 0) {
            const isDoubleJump = !player.onGround
            player.vy = player.gravityDir === 1 ? JUMP_VELOCITY : -JUMP_VELOCITY
            player.onGround = false
            player.squash = 0.6
            player.jumpsLeft--
            audio.jumpSfx()
            state.jumps++

            // Double jump — white burst
            if (isDoubleJump && settings.particles) {
                particles.burst(
                    state.distance + player.x + player.size / 2,
                    player.y + player.size / 2,
                    '#ffffff', 22
                )
            }

            // ── Rhythm check ──────────────────────────────────────────────
            const hit = checkRhythm()
            if (hit) {
                rhythm.score  += hit === 'perfect' ? 3 : 1
                rhythm.streak++
                rhythm.bestStreak = Math.max(rhythm.bestStreak, rhythm.streak)
                rhythm.lastHit    = hit
                rhythm.hitFlashT  = hit === 'perfect' ? 0.55 : 0.35
                rhythm.labelT     = 0.7
                rhythm.labelText  = hit === 'perfect' ? 'PERFECT!' : 'GOOD'
                rhythm.labelY     = player.y - 10
                audio.rhythmHitSfx(hit)
            } else {
                rhythm.streak  = 0
                rhythm.lastHit = null
            }
        }
    }

    // Pre-death: enter bullet time if rewind available, else die normally
    function preDie(cause) {
        if (state.dead || bulletTimeActive) return
        if (!rewindUsed && rewindCount >= 30) {
            bulletTimeActive = true
            bulletTimeT      = BULLET_TIME_DURATION
            state.pendingCause = cause
            audio.bulletTimeSfx()
            shake(10)
        } else {
            die(cause)
        }
    }

    function onKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump() }
        if (e.code === 'KeyR') api.requestRestart()
        if (e.code === 'KeyM') api.toggleSound()
    }
    function onPointer(e) { e.preventDefault?.(); jump() }
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', resize)

    // ── Main loop ─────────────────────────────────────────────────────────────
    let lastT = performance.now()
    let raf = 0, stopped = false

    function loop(t) {
        if (stopped) return
        raf = requestAnimationFrame(loop)
        const rawDt = Math.min(0.033, (t - lastT) / 1000)
        lastT = t
        if (!state.running && !bulletTimeActive) { draw(0); return }
        update(rawDt)
        draw(rawDt)
    }

    function update(rawDt) {
        // ── Snapshot for rewind (real time) ──────────────────────────────
        recordSnapshot()

        // ── Bullet time real-time countdown ──────────────────────────────
        if (bulletTimeActive) {
            bulletTimeT -= rawDt
            if (bulletTimeT <= 0) {
                bulletTimeActive = false
                die(state.pendingCause)
                return
            }
        }

        // ── Rewind flash decay ────────────────────────────────────────────
        if (rewindFlashT > 0) rewindFlashT -= rawDt

        // ── Rhythm flash decay (real time) ───────────────────────────────
        if (rhythm.hitFlashT > 0) rhythm.hitFlashT -= rawDt
        if (rhythm.labelT    > 0) {
            rhythm.labelT -= rawDt
            rhythm.labelY -= rawDt * 55   // float upward
        }

        if (!state.running) return

        // ── Effective dt (slowed during bullet time) ──────────────────────
        const dt = bulletTimeActive ? rawDt * BULLET_TIME_SPEED : rawDt

        state.elapsed += dt

        // Mood + beat
        const mood = getMood(state.progress)
        beatPhase += dt * mood.pulseHz * Math.PI * 2

        // Speed portals, gravity portals & finale ramp
        let baseMult = 1
        if (state.progress > 0.85) baseMult = 1.15
        for (const o of level.obstacles) {
            if (o.type === 'portal_speed' && !o._used && Math.abs(o.x - state.distance - PLAYER_X) < 10) {
                state.speedMult = o.mult
                o._used = true
                state.speedPortalsPassed++
            }
            // ─── Gravity portal trigger ───
            if (o.type === 'portal_gravity' && !o._used && Math.abs(o.x - state.distance - PLAYER_X) < 14) {
                o._used = true
                player.gravityDir *= -1
                state.gravityFlipped = player.gravityDir === -1
                player.jumpsLeft = player.maxJumps
                player.onGround = false
                shake(15)
                if (settings.particles) {
                    particles.burst(
                        state.distance + player.x + player.size / 2,
                        player.y + player.size / 2,
                        '#b46bff', 40
                    )
                }
                audio.jumpSfx()
            }
        }
        state.speed = BASE_SPEED * baseMult * state.speedMult

        // Movement
        state.distance += state.speed * dt
        state.progress  = clamp(state.distance / level.length, 0, 1)

        // Glitch zone
        glitchActive = 0
        for (const o of level.obstacles) {
            if (o.type === 'glitch') {
                const wp = state.distance + PLAYER_X
                if (wp >= o.x && wp <= o.x + o.w) { glitchActive = 1; break }
            }
        }

        // Player physics
        player.vy += GRAVITY * player.gravityDir * dt
        player.y  += player.vy * dt
        if (!player.onGround) player.rot += dt * 7.5 * player.gravityDir

        const worldPlayerX = state.distance + player.x
        const groundSolid  = isGroundAt(worldPlayerX) && isGroundAt(worldPlayerX + player.size * 0.8)

        // Platform landing
        let landed = false
        for (const o of level.obstacles) {
            if (o.type === 'platform' || o.type === 'block' || o.type === 'mover') {
                if (o.type === 'mover') {
                    o._t = (o._t || 0) + dt * (o.speed || 1)
                    o.y  = o._baseY + Math.sin(o._t) * (o.amp || TILE)
                }
                const rects = getObstacleRects(o)
                for (const r of rects) {
                    const px = worldPlayerX, py = player.y, psz = player.size
                    if (player.gravityDir === 1) {
                        // normal — land on top
                        if (player.vy >= 0 &&
                            px + psz * 0.9 > r.x && px + psz * 0.1 < r.x + r.w &&
                            py + psz >= r.y && py + psz - player.vy * dt <= r.y + 4) {
                            player.y = r.y - psz
                            player.vy = 0
                            player.onGround = true
                            player.jumpsLeft = player.maxJumps
                            landed = true
                            player.rot = Math.round(player.rot / (Math.PI/2)) * (Math.PI/2)
                        }
                    } else {
                        // flipped — land on bottom of platform
                        if (player.vy <= 0 &&
                            px + psz * 0.9 > r.x && px + psz * 0.1 < r.x + r.w &&
                            py <= r.y + r.h && py - player.vy * dt >= r.y + r.h - 4) {
                            player.y = r.y + r.h
                            player.vy = 0
                            player.onGround = true
                            player.jumpsLeft = player.maxJumps
                            landed = true
                            player.rot = Math.round(player.rot / (Math.PI/2)) * (Math.PI/2)
                        }
                    }
                }
            }
        }

        // Default ground
        if (!landed) {
            if (player.gravityDir === 1) {
                // Normal gravity
                if (groundSolid && player.y + player.size >= GROUND_Y) {
                    player.y = GROUND_Y - player.size
                    player.vy = 0
                    if (!player.onGround) {
                        player.onGround = true
                        player.squash = 0.7
                        player.jumpsLeft = player.maxJumps
                        player.rot = Math.round(player.rot / (Math.PI/2)) * (Math.PI/2)
                    }
                } else if (!groundSolid && player.y + player.size >= GROUND_Y && player.vy >= 0) {
                    player.onGround = false
                } else if (player.y + player.size < GROUND_Y) {
                    player.onGround = false
                }
            } else {
                // Flipped gravity — ceiling is the new floor
                if (player.y <= CEILING_Y) {
                    player.y = CEILING_Y
                    player.vy = 0
                    if (!player.onGround) {
                        player.onGround = true
                        player.squash = 0.7
                        player.jumpsLeft = player.maxJumps
                        player.rot = Math.round(player.rot / (Math.PI/2)) * (Math.PI/2)
                    }
                } else if (player.y > CEILING_Y) {
                    player.onGround = false
                }
            }
        }

        player.squash = lerp(player.squash, 1, dt * 12)

        // Particles
        if (settings.particles) {
            const trailY = player.gravityDir === 1 ? player.y + player.size : player.y
            if (Math.random() < 0.6) particles.trail(state.distance + player.x + player.size * 0.3, trailY, skin.color)
            if (Math.random() < 0.25) particles.ambient(state.distance + cssW / scale + Math.random() * 200, Math.random() * GROUND_Y, rgba(skin.color, 0.7))
        }
        particles.update(dt)
        recorder.record(state.distance, player.y, player.rot)

        // ── Collision detection ──────────────────────────────────────────
        const playerRect = {
            x: worldPlayerX + player.size * 0.12,
            y: player.y + player.size * 0.12,
            w: player.size * 0.76, h: player.size * 0.76,
        }

        // Death by falling out of bounds
        if (player.gravityDir === 1 && player.y > GROUND_Y + 120) { preDie('Gap'); return }
        if (player.gravityDir === -1 && player.y + player.size < -120) { preDie('Gap'); return }

        for (const o of level.obstacles) {
            if (o.type === 'spike' || o.type === 'dspike' || o.type === 'tspike') {
                const boxes = getSpikeHitboxes(o)
                for (const b of boxes) {
                    if (b.x > worldPlayerX + 200) break
                    if (b.x + b.w < worldPlayerX - 80) continue
                    if (aabb(playerRect, b)) { preDie('Spike'); return }
                }
            } else if (o.type === 'block' || o.type === 'mover') {
                const rects = getObstacleRects(o)
                for (const r of rects) {
                    if (r.x > worldPlayerX + 200) break
                    if (r.x + r.w < worldPlayerX - 80) continue
                    if (aabb(playerRect, r)) {
                        const onTop = player.gravityDir === 1
                            ? player.y + player.size - player.vy * dt <= r.y + 4
                            : player.y - player.vy * dt >= r.y + r.h - 4
                        if (!onTop) { preDie('Obstacle'); return }
                    }
                }
            }
        }

        // Win
        if (state.progress >= 1) {
            state.won = true; state.running = false
            audio.victorySfx()
            clearDeathEchoes(levelId)
            onState({
                type: 'win', progress: 1, elapsed: state.elapsed,
                attempt: state.attempt, ghostFrames: recorder.frames,
                jumps: state.jumps, speedPortalsPassed: state.speedPortalsPassed,
                completionTimeMs: Math.floor(state.elapsed * 1000),
                rhythmScore: rhythm.score, rhythmBestStreak: rhythm.bestStreak,
            })
        }

        onState({
            type: 'tick', progress: state.progress, elapsed: state.elapsed,
            attempt: state.attempt,
            jumpsLeft:      player.jumpsLeft,
            maxJumps:       player.maxJumps,
            rhythmScore:    rhythm.score,
            rhythmStreak:   rhythm.streak,
            bulletTimeActive, rewindUsed,
            bulletTimeFrac:  bulletTimeActive ? bulletTimeT / BULLET_TIME_DURATION : 0,
        })

        if (shakeT > 0) shakeT -= rawDt
        else shakeMag *= 0.9
    }

    function die(cause) {
        if (state.dead) return
        state.dead = true; state.running = false; state.cause = cause
        shake(20)
        if (settings.particles) particles.burst(state.distance + player.x + player.size/2, player.y + player.size/2, skin.color, 80)
        audio.deathSfx()

        const zone = zoneFromProgress(state.progress)

        // ─── Save death echo ───
        const newEcho = {
            x: Math.round(state.distance + PLAYER_X),
            attempt: state.attempt,
            zone,
            createdAt: Date.now(),
        }
        addDeathEcho(levelId, newEcho)
        deathEchoes.push(newEcho)  // update local copy for immediate graveyard render

        onState({
            type: 'death', progress: state.progress, cause,
            attempt: state.attempt, ghostFrames: recorder.frames,
            jumps: state.jumps, speedPortalsPassed: state.speedPortalsPassed,
            survivedTimeMs: Math.floor(state.elapsed * 1000),
            deathZone: zone,
            rhythmScore: rhythm.score, rhythmBestStreak: rhythm.bestStreak,
        })
    }

    // ── DRAW ──────────────────────────────────────────────────────────────────
    function draw(rawDt) {
        const mood  = getMood(state.progress)
        const pulse = 0.5 + 0.5 * Math.sin(beatPhase)
        const pulseSharp = Math.max(0, Math.sin(beatPhase))

        if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize()

        ctx.setTransform(1,0,0,1,0,0)
        ctx.clearRect(0,0,canvas.width, canvas.height)

        const offX = (cssW - BASE_WIDTH * scale) / 2
        const offY = (cssH - BASE_HEIGHT * scale) / 2
        let sx = 0, sy = 0
        if (shakeT > 0) {
            sx = (Math.random() - 0.5) * shakeMag * (shakeT / 0.35)
            sy = (Math.random() - 0.5) * shakeMag * (shakeT / 0.35)
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
        ctx.save()
        ctx.translate(offX + sx, offY + sy)
        ctx.scale(scale, scale)

        // ── Background ────────────────────────────────────────────────────
        const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT)
        grad.addColorStop(0, mood.bg1)
        grad.addColorStop(1, mood.bg2)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

        // Flipped world — subtle indicator at ceiling
        if (state.gravityFlipped) {
            ctx.fillStyle = rgba(mood.primary, 0.08)
            ctx.fillRect(0, 0, BASE_WIDTH, CEILING_Y + 20)
            ctx.strokeStyle = rgba(mood.primary, 0.5)
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(0, CEILING_Y + 20)
            ctx.lineTo(BASE_WIDTH, CEILING_Y + 20)
            ctx.stroke()
        }

        // Beat radial vignette
        const vg = ctx.createRadialGradient(BASE_WIDTH/2, BASE_HEIGHT/2, 100, BASE_WIDTH/2, BASE_HEIGHT/2, 800)
        vg.addColorStop(0, rgba(mood.primary, 0.06 + 0.10 * pulseSharp))
        vg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = vg
        ctx.fillRect(0,0,BASE_WIDTH, BASE_HEIGHT)

        drawGrid(mood, pulse)

        const inPurple = state.progress >= 0.30 && state.progress < 0.60
        if (inPurple || glitchActive) drawGlitch(mood, pulse, glitchActive ? 1 : 0.4)

        const camX = state.distance
        drawGround(camX, mood, pulse)
        drawObstacles(camX, mood, pulse)

        // ─── Draw death echoes ───
        drawDeathEchoes(camX, pulse)

        // Ghost
        if (settings.showGhost && ghost?.frames?.length > 1) {
            const s = sampleGhost(ghost.frames, state.distance)
            if (s && !s.done) {
                const gColor = ghost.color || '#a8efff'
                drawCube({ x: player.x, y: s.y, rot: s.rot, size: player.size,
                    color: gColor, glow: gColor, alpha: 0.35, squash: 1, pulse })
                if (ghost.label) {
                    ctx.save()
                    ctx.font = '600 11px Inter, system-ui, sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillStyle = gColor
                    ctx.shadowColor = gColor
                    ctx.shadowBlur = 8
                    ctx.fillText(ghost.label, player.x + player.size / 2, s.y - 10)
                    ctx.restore()
                }
            }
        }

        if (settings.particles) particles.draw(ctx, camX)

        if (!state.dead) {
            // Streak ring around player
            if (rhythm.streak >= 5 && !bulletTimeActive) {
                drawStreakAura(mood, pulse)
            }
            drawCube({ x: player.x, y: player.y, rot: player.rot, size: player.size,
                color: skin.color, glow: skin.glow, alpha: 1, squash: player.squash, pulse })
            // ─── Double jump indicator — dots under/above player ───
            drawJumpIndicator(pulse)
        }

        // ─── Rhythm hit ring ───────────────────────────────────────────────
        if (rhythm.hitFlashT > 0) drawRhythmRing()

        // ─── Rhythm floating label ─────────────────────────────────────────
        if (rhythm.labelT > 0) drawRhythmLabel()

        // ─── Rhythm score (HUD canvas area) ────────────────────────────────
        drawRhythmHUD(mood, pulse)

        // ─── Bullet time overlay ───────────────────────────────────────────
        if (bulletTimeActive) drawBulletTimeOverlay(mood)

        // ─── Rewind flash ──────────────────────────────────────────────────
        if (rewindFlashT > 0) {
            const a = (rewindFlashT / 0.45)
            ctx.fillStyle = `rgba(34,227,255,${0.22 * a})`
            ctx.fillRect(0,0,BASE_WIDTH,BASE_HEIGHT)
            // Scanlines going backwards
            for (let y = 0; y < BASE_HEIGHT; y += 6) {
                ctx.fillStyle = `rgba(34,227,255,${0.06 * a})`
                ctx.fillRect(0, y, BASE_WIDTH, 2)
            }
        }

        // Beat flash
        if (pulseSharp > 0.85 && !settings.reducedMotion) {
            ctx.fillStyle = rgba(mood.primary, 0.04)
            ctx.fillRect(0,0,BASE_WIDTH,BASE_HEIGHT)
        }

        // Edge vignette
        const eg = ctx.createLinearGradient(0,0,0,BASE_HEIGHT)
        eg.addColorStop(0,'rgba(0,0,0,0.35)')
        eg.addColorStop(0.5,'rgba(0,0,0,0)')
        eg.addColorStop(1,'rgba(0,0,0,0.5)')
        ctx.fillStyle = eg
        ctx.fillRect(0,0,BASE_WIDTH,BASE_HEIGHT)

        ctx.restore()
    }

    // ─── Draw double jump dots ───────────────────────────────
    function drawJumpIndicator(pulse) {
        const cx = player.x + player.size / 2
        const dotY = player.gravityDir === 1
            ? player.y + player.size + 8
            : player.y - 8
        const dotR = 4
        const gap = 12
        const total = player.maxJumps
        const startX = cx - ((total - 1) * gap) / 2

        for (let i = 0; i < total; i++) {
            const x = startX + i * gap
            const filled = i < player.jumpsLeft
            ctx.beginPath()
            ctx.arc(x, dotY, dotR, 0, Math.PI * 2)
            if (filled) {
                ctx.fillStyle = rgba(skin.glow, 0.85 + 0.15 * pulse)
                ctx.shadowColor = skin.glow
                ctx.shadowBlur = 8
            } else {
                ctx.fillStyle = rgba('#ffffff', 0.2)
                ctx.shadowBlur = 0
            }
            ctx.fill()
            ctx.shadowBlur = 0
        }
    }

    // ─── Draw death echoes on canvas ────────────────────────
    function drawDeathEchoes(camX, pulse) {
        if (!deathEchoes.length) return
        const size = player.size
        const t = performance.now() / 1000

        for (const echo of deathEchoes) {
            const screenX = echo.x - camX
            if (screenX > BASE_WIDTH + 100) continue
            if (screenX + size < -100) continue

            const color = echoZoneColor(echo.zone)
            const floatY = (GROUND_Y - size) + Math.sin(t * 1.2 + echo.x * 0.01) * 4

            ctx.save()
            ctx.globalAlpha = 0.32
            ctx.shadowColor = color
            ctx.shadowBlur = 10 + 6 * pulse

            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.strokeRect(screenX, floatY, size, size)

            ctx.globalAlpha = 0.55
            ctx.font = `bold ${Math.floor(size * 0.55)}px Inter, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = color
            ctx.fillText('✕', screenX + size / 2, floatY + size / 2 - 2)

            ctx.globalAlpha = 0.7
            ctx.font = `500 9px Inter, sans-serif`
            ctx.fillStyle = color
            ctx.shadowBlur = 0
            ctx.fillText(`#${echo.attempt}`, screenX + size / 2, floatY + size + 10)

            ctx.restore()
        }
    }

    // ── Rhythm: expanding ring on player ──────────────────────────────────────
    function drawRhythmRing() {
        const frac = rhythm.hitFlashT / (rhythm.lastHit === 'perfect' ? 0.55 : 0.35)
        const isPerfect = rhythm.lastHit === 'perfect'
        const col = isPerfect ? '34,227,255' : '74,222,128'
        const maxR = player.size * (isPerfect ? 3.0 : 2.2)
        const r = maxR * (1 - frac * 0.6)

        ctx.save()
        ctx.globalAlpha = frac * 0.9
        ctx.strokeStyle = `rgb(${col})`
        ctx.shadowColor = `rgb(${col})`
        ctx.shadowBlur  = 30
        ctx.lineWidth   = isPerfect ? 3 : 2
        ctx.beginPath()
        ctx.arc(player.x + player.size/2, player.y + player.size/2, r, 0, Math.PI*2)
        ctx.stroke()

        if (isPerfect) {
            ctx.globalAlpha = frac * 0.4
            ctx.lineWidth   = 1.5
            ctx.beginPath()
            ctx.arc(player.x + player.size/2, player.y + player.size/2, r * 1.4, 0, Math.PI*2)
            ctx.stroke()
        }
        ctx.restore()
    }

    // ── Rhythm: floating "PERFECT!" / "GOOD" label ───────────────────────────
    function drawRhythmLabel() {
        const frac = rhythm.labelT / 0.7
        const isPerfect = rhythm.lastHit === 'perfect'
        const col  = isPerfect ? '#22e3ff' : '#4ade80'
        const size = isPerfect ? 22 : 17

        ctx.save()
        ctx.globalAlpha = frac
        ctx.font        = `900 ${size}px Inter, sans-serif`
        ctx.fillStyle   = col
        ctx.shadowColor = col
        ctx.shadowBlur  = 20
        ctx.textAlign   = 'center'
        ctx.fillText(rhythm.labelText, player.x + player.size/2, rhythm.labelY)
        ctx.restore()
    }

    // ── Rhythm: small score in top-right of game canvas ──────────────────────
    function drawRhythmHUD(mood, pulse) {
        if (rhythm.score === 0 && rhythm.streak === 0) return
        const x = BASE_WIDTH - 18, y = 18
        ctx.save()
        ctx.textAlign = 'right'

        // Score
        ctx.font      = '700 14px Inter, sans-serif'
        ctx.fillStyle = rgba('#22e3ff', 0.85 + 0.15 * pulse)
        ctx.shadowColor = '#22e3ff'; ctx.shadowBlur = 10
        ctx.fillText(`♪ ${rhythm.score}`, x, y + 16)

        // Streak
        if (rhythm.streak >= 3) {
            const streakColor = rhythm.streak >= 10 ? '#ffd166' : rhythm.streak >= 5 ? '#b46bff' : '#4ade80'
            ctx.font      = `900 ${12 + Math.min(rhythm.streak, 10)}px Inter, sans-serif`
            ctx.fillStyle = streakColor
            ctx.shadowColor = streakColor; ctx.shadowBlur = 16
            ctx.fillText(`×${rhythm.streak}`, x, y + 36)
        }
        ctx.restore()
    }

    // ── Streak aura when combo ≥ 5 ────────────────────────────────────────────
    function drawStreakAura(mood, pulse) {
        const intensity = Math.min(1, (rhythm.streak - 5) / 10)
        const col = rhythm.streak >= 10 ? '#ffd166' : '#b46bff'
        ctx.save()
        ctx.globalAlpha = (0.25 + 0.15 * pulse) * intensity
        ctx.strokeStyle = col
        ctx.shadowColor = col
        ctx.shadowBlur  = 30 + 20 * pulse
        ctx.lineWidth   = 2
        const r = player.size * (0.9 + 0.2 * Math.sin(beatPhase * 2))
        ctx.beginPath()
        ctx.arc(player.x + player.size/2, player.y + player.size/2, r, 0, Math.PI*2)
        ctx.stroke()
        ctx.restore()
    }

    // ── Bullet time overlay ───────────────────────────────────────────────────
    function drawBulletTimeOverlay(mood) {
        const frac = bulletTimeT / BULLET_TIME_DURATION  // 1→0 as time runs out

        // Heavy blue vignette
        const vg = ctx.createRadialGradient(BASE_WIDTH/2, BASE_HEIGHT/2, 60, BASE_WIDTH/2, BASE_HEIGHT/2, 700)
        vg.addColorStop(0, 'rgba(0,10,30,0)')
        vg.addColorStop(1, `rgba(0,10,40,${0.72 * (1 - frac * 0.3)})`)
        ctx.fillStyle = vg; ctx.fillRect(0,0,BASE_WIDTH,BASE_HEIGHT)

        // Scanline effect (heavy)
        ctx.fillStyle = 'rgba(0,20,60,0.18)'
        for (let y = 0; y < BASE_HEIGHT; y += 3) {
            ctx.fillRect(0, y, BASE_WIDTH, 1)
        }

        // Chromatic aberration strips
        ctx.save()
        ctx.globalAlpha = 0.06
        ctx.fillStyle = '#ff0040'
        ctx.fillRect(-4, 0, BASE_WIDTH, BASE_HEIGHT)
        ctx.fillStyle = '#0040ff'
        ctx.fillRect(4, 0, BASE_WIDTH, BASE_HEIGHT)
        ctx.restore()

        // REWIND? label
        ctx.save()
        ctx.textAlign  = 'center'
        const pulse2   = 0.7 + 0.3 * Math.sin(Date.now() / 120)

        ctx.font       = '900 52px Inter, sans-serif'
        ctx.fillStyle  = `rgba(34,227,255,${0.9 * pulse2})`
        ctx.shadowColor = '#22e3ff'; ctx.shadowBlur = 40
        ctx.fillText('⏮  REWIND?', BASE_WIDTH/2, BASE_HEIGHT/2 - 50)

        ctx.font       = '700 20px Inter, sans-serif'
        ctx.fillStyle  = 'rgba(230,241,255,0.75)'
        ctx.shadowBlur = 0
        ctx.fillText('SPACE  ·  TAP', BASE_WIDTH/2, BASE_HEIGHT/2 + 4)

        // Timer bar
        const barW = 320, barH = 8
        const bx   = BASE_WIDTH/2 - barW/2, by = BASE_HEIGHT/2 + 34
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 4); ctx.fill()

        const barFill = frac * barW
        const barGrad = ctx.createLinearGradient(bx, by, bx + barW, by)
        barGrad.addColorStop(0, '#22e3ff')
        barGrad.addColorStop(1, frac < 0.3 ? '#ff5a6a' : '#b46bff')
        ctx.fillStyle   = barGrad
        ctx.shadowColor = '#22e3ff'; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.roundRect(bx, by, barFill, barH, 4); ctx.fill()
        ctx.shadowBlur = 0

        ctx.restore()
    }

    // ── Scene drawing (unchanged) ─────────────────────────────────────────────
    function drawGrid(mood, pulse) {
        const camX = state.distance
        const gridSize = 64
        const ox = -((camX * 0.5) % gridSize)
        ctx.strokeStyle = rgba(mood.primary, 0.10 + 0.10 * pulse)
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = ox; x < BASE_WIDTH + gridSize; x += gridSize) { ctx.moveTo(x,0); ctx.lineTo(x,BASE_HEIGHT) }
        for (let y = 0; y < BASE_HEIGHT; y += gridSize)             { ctx.moveTo(0,y); ctx.lineTo(BASE_WIDTH,y) }
        ctx.stroke()
        ctx.strokeStyle = rgba(mood.secondary, 0.15 + 0.15 * pulse)
        ctx.lineWidth = 2; ctx.beginPath()
        const horizon = GROUND_Y
        for (let i = -10; i < 30; i++) {
            const lx = (i * 80) - (camX * 0.7) % 80
            ctx.moveTo(BASE_WIDTH/2 + lx*4, BASE_HEIGHT)
            ctx.lineTo(BASE_WIDTH/2 + lx*0.5, horizon)
        }
        ctx.stroke()
    }

    function drawGlitch(mood, pulse, intensity) {
        const lines = Math.floor(8 * intensity)
        for (let i = 0; i < lines; i++) {
            const y = Math.random() * BASE_HEIGHT, h = 2 + Math.random() * 10
            const offset = (Math.random() - 0.5) * 30 * intensity
            ctx.fillStyle = rgba(mood.primary, 0.04 + 0.10 * intensity)
            ctx.fillRect(offset, y, BASE_WIDTH, h)
        }
        ctx.fillStyle = rgba(mood.secondary, 0.05)
        for (let y = 0; y < BASE_HEIGHT; y += 4) ctx.fillRect(0, y, BASE_WIDTH, 1)
    }

    function drawGround(camX, mood, pulse) {
        ctx.fillStyle   = rgba(mood.primary, 0.18 + 0.06 * pulse)
        ctx.strokeStyle = rgba(mood.primary, 0.7 + 0.3 * pulse)
        ctx.shadowColor = mood.primary; ctx.shadowBlur = 18 * (0.6 + 0.4 * pulse); ctx.lineWidth = 2
        const worldStart = camX - 100, worldEnd = camX + BASE_WIDTH + 100
        let cursor = worldStart
        const segs = []
        const sortedGaps = gaps.filter(g => g.x + g.w > worldStart && g.x < worldEnd).sort((a,b) => a.x - b.x)
        for (const g of sortedGaps) { if (g.x > cursor) segs.push([cursor, g.x]); cursor = g.x + g.w }
        if (cursor < worldEnd) segs.push([cursor, worldEnd])
        for (const [a, b] of segs) {
            const x = a - camX, w = b - a
            ctx.fillRect(x, GROUND_Y, w, BASE_HEIGHT - GROUND_Y)
            ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x+w, GROUND_Y); ctx.stroke()
        }
        ctx.shadowBlur = 0
    }

    function drawObstacles(camX, mood, pulse) {
        for (const o of level.obstacles) {
            const screenX = o.x - camX
            if (screenX > BASE_WIDTH + 80 || screenX < -200) continue
            switch (o.type) {
                case 'spike':        drawSpike(screenX, o, mood, pulse, 1); break
                case 'dspike':       drawSpike(screenX, o, mood, pulse, 2); break
                case 'tspike':       drawSpike(screenX, o, mood, pulse, 3); break
                case 'block':        drawBlock(screenX, o, mood, pulse);    break
                case 'mover':        drawMover(screenX, o, mood, pulse);    break
                case 'platform':     drawPlatform(screenX, o, mood, pulse); break
                case 'portal_speed': drawSpeedPortal(screenX, o, mood, pulse); break
                case 'portal_gravity': drawGravityPortal(screenX, o, mood, pulse); break
                case 'glitch':       break
                case 'gap':          break
            }
        }
    }

    function drawSpike(x, o, mood, pulse, count) {
        const T = TILE, baseY = GROUND_Y - o.y
        ctx.save(); ctx.shadowColor = mood.primary; ctx.shadowBlur = 18 + 14 * pulse
        for (let i = 0; i < count; i++) {
            const sx = x + i * T
            const grad = ctx.createLinearGradient(sx, baseY - T, sx, baseY)
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, mood.primary); grad.addColorStop(1, mood.secondary)
            ctx.fillStyle = grad; ctx.beginPath()
            ctx.moveTo(sx, baseY); ctx.lineTo(sx + T/2, baseY - T); ctx.lineTo(sx + T, baseY); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 1; ctx.stroke()
        }
        ctx.restore()
    }

    function drawBlock(x, o, mood, pulse) {
        const y = GROUND_Y - o.h - o.y
        ctx.save(); ctx.shadowColor = mood.primary; ctx.shadowBlur = 14 + 12 * pulse
        const grad = ctx.createLinearGradient(x, y, x, y + o.h)
        grad.addColorStop(0, rgba(mood.primary, 0.95)); grad.addColorStop(1, rgba(mood.secondary, 0.85))
        ctx.fillStyle = grad; ctx.fillRect(x, y, o.w, o.h)
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(x+1, y+1, o.w-2, o.h-2)
        ctx.fillStyle = rgba('#ffffff', 0.15 + 0.15 * pulse); ctx.fillRect(x+6, y+6, o.w-12, 4)
        ctx.restore()
    }

    // ─── Gravity portal visual ────────────────────────────────
    function drawGravityPortal(x, o, mood, pulse) {
        const cy = GROUND_Y - 110
        const used = !!o._used
        ctx.save()
        const col = '#b46bff'
        ctx.shadowColor = col
        ctx.shadowBlur = 28 + 18 * pulse
        // portal bar
        ctx.fillStyle = rgba(col, used ? 0.3 : 0.85)
        ctx.fillRect(x - 5, cy - 90, 18, 180)
        ctx.strokeStyle = used ? rgba('#fff', 0.3) : '#fff'
        ctx.lineWidth = 2
        ctx.strokeRect(x - 5, cy - 90, 18, 180)
        // up/down arrows ↕
        ctx.fillStyle = used ? rgba('#fff', 0.3) : '#fff'
        ctx.font = `bold ${20 + Math.floor(4 * pulse)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('↕', x + 4, cy)
        // label
        ctx.font = '500 10px Inter, sans-serif'
        ctx.fillStyle = rgba(col, 0.9)
        ctx.fillText('FLIP', x + 4, cy + 28)
        ctx.restore()
    }

    function drawMover(x, o, mood, pulse) {
        const y = GROUND_Y - o.h - o.y
        ctx.save(); ctx.shadowColor = mood.secondary; ctx.shadowBlur = 20 + 12 * pulse
        ctx.fillStyle = rgba(mood.secondary, 0.9); ctx.fillRect(x, y, o.w, o.h)
        ctx.strokeStyle = '#fff'; ctx.strokeRect(x+1, y+1, o.w-2, o.h-2)
        ctx.fillStyle = rgba('#ffffff', 0.5)
        ctx.fillRect(x + o.w/2-2, y-4, 4, 4); ctx.fillRect(x + o.w/2-2, y+o.h, 4, 4)
        ctx.restore()
    }

    function drawPlatform(x, o, mood, pulse) {
        const y = GROUND_Y - o.y - o.h
        ctx.save(); ctx.shadowColor = mood.primary; ctx.shadowBlur = 16 + 10 * pulse
        const grad = ctx.createLinearGradient(x, y, x, y + o.h)
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, rgba(mood.primary, 0.9))
        ctx.fillStyle = grad; ctx.fillRect(x, y, o.w, o.h)
        ctx.fillStyle = rgba(mood.primary, 0.4); ctx.fillRect(x, y + o.h, o.w, 4)
        ctx.restore()
    }

    function drawSpeedPortal(x, o, mood, pulse) {
        const cy = GROUND_Y - 110
        ctx.save(); ctx.shadowColor = mood.secondary; ctx.shadowBlur = 30 + 20 * pulse
        const grad = ctx.createLinearGradient(x, cy-80, x, cy+80)
        grad.addColorStop(0, rgba('#ffffff', 0.9)); grad.addColorStop(0.5, rgba(mood.secondary, 0.8)); grad.addColorStop(1, rgba(mood.primary, 0.9))
        ctx.fillStyle = grad; ctx.fillRect(x-4, cy-80, 16, 160)
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x-4, cy-80, 16, 160)
        ctx.fillStyle = '#fff'
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(x+20, cy+i*24-6); ctx.lineTo(x+36, cy+i*24); ctx.lineTo(x+20, cy+i*24+6); ctx.closePath(); ctx.fill()
        }
        ctx.restore()
    }

    function drawCube({ x, y, rot, size, color, glow, alpha, squash, pulse }) {
        ctx.save(); ctx.globalAlpha = alpha
        ctx.translate(x + size/2, y + size/2); ctx.rotate(rot)
        ctx.scale(squash, 2 - squash)
        ctx.shadowColor = glow; ctx.shadowBlur = 28 + 16 * pulse
        const grad = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2)
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, color); grad.addColorStop(1, glow)
        ctx.fillStyle = grad; ctx.fillRect(-size/2, -size/2, size, size)
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(-size/2+1, -size/2+1, size-2, size-2)
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-size/4, -size/4, size/2, size/2)
        ctx.fillStyle = rgba(glow, 0.9);    ctx.fillRect(-size/8, -size/8, size/4, size/4)
        ctx.restore()
    }

    const api = {
        stop()    { stopped = true; cancelAnimationFrame(raf) },
        destroy() {
            stopped = true; cancelAnimationFrame(raf)
            window.removeEventListener('keydown', onKeyDown)
            canvas.removeEventListener('pointerdown', onPointer)
            window.removeEventListener('resize', resize)
            particles.clear()
        },
        requestRestart() { onState({ type: 'restart-request' }) },
        toggleSound() {
            audio.setEnabled(!audio.isEnabled())
            if (audio.isEnabled()) audio.startMusic(); else audio.stopMusic()
            onState({ type: 'sound-toggle', enabled: audio.isEnabled() })
        },
        getState() { return state },
        getGhostFrames() { return recorder.frames },
    }

    raf = requestAnimationFrame((t) => { lastT = t; loop(t) })
    return api
}
