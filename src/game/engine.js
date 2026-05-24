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

export function createEngine({ canvas, level, settings, skin, ghost, onState, attemptIndex, levelId }) {
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

    // World state
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
        progress: 0,
        bestPct: 0,
        attempt: attemptIndex || 1,
        jumps: 0,
        speedPortalsPassed: 0,
        gravityFlipped: false,   // ← gravity portal state
    }

    // Player
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

    let shakeT = 0, shakeMag = 0
    function shake(mag) {
        if (!settings.shake || settings.reducedMotion) return
        shakeMag = Math.max(shakeMag, mag)
        shakeT = 0.35
    }

    let glitchActive = 0
    let beatPhase = 0

    // ─── INPUT ───────────────────────────────────────────────
    function jump() {
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
        }
    }
    function onKeyDown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump() }
        if (e.code === 'KeyR') { api.requestRestart() }
        if (e.code === 'KeyM') { api.toggleSound() }
    }
    function onPointer(e) { e.preventDefault?.(); jump() }
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', resize)

    let lastT = performance.now()
    let raf = 0
    let stopped = false

    function loop(t) {
        if (stopped) return
        raf = requestAnimationFrame(loop)
        let dt = Math.min(0.033, (t - lastT) / 1000)
        lastT = t
        if (!state.running) { draw(0); return }
        update(dt)
        draw(dt)
    }

    function update(dt) {
        state.elapsed += dt

        const mood = getMood(state.progress)
        beatPhase += dt * mood.pulseHz * Math.PI * 2

        let baseMult = 1
        if (state.progress > 0.85) baseMult = 1.15
        for (const o of level.obstacles) {
            if (o.type === 'portal_speed' && !o._used && Math.abs((o.x) - state.distance - PLAYER_X) < 10) {
                state.speedMult = o.mult
                o._used = true
                state.speedPortalsPassed++
            }
            // ─── Gravity portal trigger ───
            if (o.type === 'portal_gravity' && !o._used && Math.abs((o.x) - state.distance - PLAYER_X) < 14) {
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

        state.distance += state.speed * dt
        state.progress = clamp(state.distance / level.length, 0, 1)

        glitchActive = 0
        for (const o of level.obstacles) {
            if (o.type === 'glitch') {
                const worldPlayer = state.distance + PLAYER_X
                if (worldPlayer >= o.x && worldPlayer <= o.x + o.w) { glitchActive = 1; break }
            }
        }

        // Physics — respects gravityDir
        player.vy += GRAVITY * player.gravityDir * dt
        player.y += player.vy * dt
        if (!player.onGround) player.rot += dt * 7.5 * player.gravityDir

        const worldPlayerX = state.distance + player.x
        const groundSolid = isGroundAt(worldPlayerX) && isGroundAt(worldPlayerX + player.size * 0.8)

        // Platform landing
        let landed = false
        for (const o of level.obstacles) {
            if (o.type === 'platform' || o.type === 'block' || o.type === 'mover') {
                if (o.type === 'mover') {
                    o._t = (o._t || 0) + dt * (o.speed || 1)
                    o.y = o._baseY + Math.sin(o._t) * (o.amp || TILE)
                }
                const rects = getObstacleRects(o)
                for (const r of rects) {
                    const px = worldPlayerX
                    const py = player.y
                    const psz = player.size
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
                            player.rot = Math.round(player.rot / (Math.PI / 2)) * (Math.PI / 2)
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
                            player.rot = Math.round(player.rot / (Math.PI / 2)) * (Math.PI / 2)
                        }
                    }
                }
            }
        }

        // Default ground / ceiling
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
                        player.rot = Math.round(player.rot / (Math.PI / 2)) * (Math.PI / 2)
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
                        player.rot = Math.round(player.rot / (Math.PI / 2)) * (Math.PI / 2)
                    }
                } else if (player.y > CEILING_Y) {
                    player.onGround = false
                }
            }
        }

        player.squash = lerp(player.squash, 1, dt * 12)

        if (settings.particles) {
            const trailY = player.gravityDir === 1 ? player.y + player.size : player.y
            if (Math.random() < 0.6) particles.trail(state.distance + player.x + player.size * 0.3, trailY, skin.color)
            if (Math.random() < 0.25) particles.ambient(state.distance + cssW / scale + Math.random() * 200, Math.random() * GROUND_Y, rgba(skin.color, 0.7))
        }
        particles.update(dt)

        recorder.record(state.distance, player.y, player.rot)

        const playerRect = {
            x: worldPlayerX + player.size * 0.12,
            y: player.y + player.size * 0.12,
            w: player.size * 0.76,
            h: player.size * 0.76,
        }

        // Death by falling out of bounds
        if (player.gravityDir === 1 && player.y > GROUND_Y + 120) { die('Gap'); return }
        if (player.gravityDir === -1 && player.y + player.size < -120) { die('Gap'); return }

        // Spike / block collisions
        for (const o of level.obstacles) {
            if (o.type === 'spike' || o.type === 'dspike' || o.type === 'tspike') {
                const boxes = getSpikeHitboxes(o)
                for (const b of boxes) {
                    if (b.x > worldPlayerX + 200) break
                    if (b.x + b.w < worldPlayerX - 80) continue
                    if (aabb(playerRect, b)) { die('Spike'); return }
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
                        if (!onTop) { die('Obstacle'); return }
                    }
                }
            }
        }

        // Win
        if (state.progress >= 1) {
            state.won = true
            state.running = false
            audio.victorySfx()
            clearDeathEchoes(levelId)
            onState({
                type: 'win',
                progress: 1,
                elapsed: state.elapsed,
                attempt: state.attempt,
                ghostFrames: recorder.frames,
                jumps: state.jumps,
                speedPortalsPassed: state.speedPortalsPassed,
                completionTimeMs: Math.floor(state.elapsed * 1000),
            })
        }

        onState({
            type: 'tick',
            progress: state.progress,
            elapsed: state.elapsed,
            attempt: state.attempt,
        })

        if (shakeT > 0) shakeT -= dt
        else shakeMag *= 0.9
    }

    function die(cause) {
        if (state.dead) return
        state.dead = true
        state.running = false
        state.cause = cause
        shake(20)
        if (settings.particles) particles.burst(state.distance + player.x + player.size / 2, player.y + player.size / 2, skin.color, 80)
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
            type: 'death',
            progress: state.progress,
            cause,
            attempt: state.attempt,
            ghostFrames: recorder.frames,
            jumps: state.jumps,
            speedPortalsPassed: state.speedPortalsPassed,
            survivedTimeMs: Math.floor(state.elapsed * 1000),
            deathZone: zone,
        })
    }

    // ─── DRAW ─────────────────────────────────────────────────
    function draw(dt) {
        const mood = getMood(state.progress)
        const pulse = 0.5 + 0.5 * Math.sin(beatPhase)
        const pulseSharp = Math.max(0, Math.sin(beatPhase))

        if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize()

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

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

        // Background
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

        const vg = ctx.createRadialGradient(BASE_WIDTH / 2, BASE_HEIGHT / 2, 100, BASE_WIDTH / 2, BASE_HEIGHT / 2, 800)
        vg.addColorStop(0, rgba(mood.primary, 0.06 + 0.10 * pulseSharp))
        vg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

        drawGrid(mood, pulse)

        const inPurple = state.progress >= 0.30 && state.progress < 0.60
        if (inPurple || glitchActive) drawGlitch(mood, pulse, glitchActive ? 1 : 0.4)

        const camX = state.distance
        drawGround(camX, mood, pulse)
        drawObstacles(camX, mood, pulse)

        // ─── Draw death echoes ───
        drawDeathEchoes(camX, pulse)

        // Ghost
        if (settings.showGhost && ghost && ghost.frames && ghost.frames.length > 1) {
            const s = sampleGhost(ghost.frames, state.distance)
            if (s && !s.done) {
                const gColor = ghost.color || '#a8efff'
                drawCube({
                    x: player.x, y: s.y, rot: s.rot, size: player.size,
                    color: gColor, glow: gColor, alpha: 0.35, squash: 1, pulse,
                })
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
            drawCube({
                x: player.x, y: player.y, rot: player.rot, size: player.size,
                color: skin.color, glow: skin.glow, alpha: 1, squash: player.squash, pulse,
            })
            // ─── Double jump indicator — dots under/above player ───
            drawJumpIndicator(pulse)
        }

        if (pulseSharp > 0.85 && !settings.reducedMotion) {
            ctx.fillStyle = rgba(mood.primary, 0.04)
            ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)
        }

        const eg = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT)
        eg.addColorStop(0, 'rgba(0,0,0,0.35)')
        eg.addColorStop(0.5, 'rgba(0,0,0,0)')
        eg.addColorStop(1, 'rgba(0,0,0,0.5)')
        ctx.fillStyle = eg
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT)

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
            // gentle float
            const floatY = (GROUND_Y - size) + Math.sin(t * 1.2 + echo.x * 0.01) * 4

            ctx.save()
            ctx.globalAlpha = 0.32
            ctx.shadowColor = color
            ctx.shadowBlur = 10 + 6 * pulse

            // ghost cube outline
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.strokeRect(screenX, floatY, size, size)

            // inner cross
            ctx.globalAlpha = 0.55
            ctx.font = `bold ${Math.floor(size * 0.55)}px Inter, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = color
            ctx.fillText('✕', screenX + size / 2, floatY + size / 2 - 2)

            // attempt number below
            ctx.globalAlpha = 0.7
            ctx.font = `500 9px Inter, sans-serif`
            ctx.fillStyle = color
            ctx.shadowBlur = 0
            ctx.fillText(`#${echo.attempt}`, screenX + size / 2, floatY + size + 10)

            ctx.restore()
        }
    }

    function drawGrid(mood, pulse) {
        const camX = state.distance
        const gridSize = 64
        const ox = -((camX * 0.5) % gridSize)
        ctx.strokeStyle = rgba(mood.primary, 0.10 + 0.10 * pulse)
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = ox; x < BASE_WIDTH + gridSize; x += gridSize) {
            ctx.moveTo(x, 0); ctx.lineTo(x, BASE_HEIGHT)
        }
        for (let y = 0; y < BASE_HEIGHT; y += gridSize) {
            ctx.moveTo(0, y); ctx.lineTo(BASE_WIDTH, y)
        }
        ctx.stroke()

        ctx.strokeStyle = rgba(mood.secondary, 0.15 + 0.15 * pulse)
        ctx.lineWidth = 2
        ctx.beginPath()
        const horizon = GROUND_Y
        for (let i = -10; i < 30; i++) {
            const lx = ((i * 80) - (camX * 0.7) % 80)
            ctx.moveTo(BASE_WIDTH / 2 + (lx) * 4, BASE_HEIGHT)
            ctx.lineTo(BASE_WIDTH / 2 + lx * 0.5, horizon)
        }
        ctx.stroke()
    }

    function drawGlitch(mood, pulse, intensity) {
        const lines = Math.floor(8 * intensity)
        for (let i = 0; i < lines; i++) {
            const y = Math.random() * BASE_HEIGHT
            const h = 2 + Math.random() * 10
            const offset = (Math.random() - 0.5) * 30 * intensity
            ctx.fillStyle = rgba(mood.primary, 0.04 + 0.10 * intensity)
            ctx.fillRect(offset, y, BASE_WIDTH, h)
        }
        ctx.fillStyle = rgba(mood.secondary, 0.05)
        for (let y = 0; y < BASE_HEIGHT; y += 4) {
            ctx.fillRect(0, y, BASE_WIDTH, 1)
        }
    }

    function drawGround(camX, mood, pulse) {
        ctx.fillStyle = rgba(mood.primary, 0.18 + 0.06 * pulse)
        ctx.strokeStyle = rgba(mood.primary, 0.7 + 0.3 * pulse)
        ctx.shadowColor = mood.primary
        ctx.shadowBlur = 18 * (0.6 + 0.4 * pulse)
        ctx.lineWidth = 2

        const worldStart = camX - 100
        const worldEnd = camX + BASE_WIDTH + 100
        let cursor = worldStart
        const segs = []
        const sortedGaps = gaps.filter(g => g.x + g.w > worldStart && g.x < worldEnd).sort((a, b) => a.x - b.x)
        for (const g of sortedGaps) {
            if (g.x > cursor) segs.push([cursor, g.x])
            cursor = g.x + g.w
        }
        if (cursor < worldEnd) segs.push([cursor, worldEnd])
        for (const [a, b] of segs) {
            const x = a - camX
            const w = b - a
            ctx.fillRect(x, GROUND_Y, w, BASE_HEIGHT - GROUND_Y)
            ctx.beginPath()
            ctx.moveTo(x, GROUND_Y)
            ctx.lineTo(x + w, GROUND_Y)
            ctx.stroke()
        }
        ctx.shadowBlur = 0
    }

    function drawObstacles(camX, mood, pulse) {
        for (const o of level.obstacles) {
            const screenX = o.x - camX
            if (screenX > BASE_WIDTH + 80) continue
            if (screenX < -200) continue

            switch (o.type) {
                case 'spike':        drawSpike(screenX, o, mood, pulse, 1); break
                case 'dspike':       drawSpike(screenX, o, mood, pulse, 2); break
                case 'tspike':       drawSpike(screenX, o, mood, pulse, 3); break
                case 'block':        drawBlock(screenX, o, mood, pulse); break
                case 'mover':        drawMover(screenX, o, mood, pulse); break
                case 'platform':     drawPlatform(screenX, o, mood, pulse); break
                case 'portal_speed': drawSpeedPortal(screenX, o, mood, pulse); break
                case 'portal_gravity': drawGravityPortal(screenX, o, mood, pulse); break
                case 'glitch':       break
                case 'gap':          break
            }
        }
    }

    function drawSpike(x, o, mood, pulse, count) {
        const T = TILE
        const baseY = GROUND_Y - o.y
        ctx.save()
        ctx.shadowColor = mood.primary
        ctx.shadowBlur = 18 + 14 * pulse
        for (let i = 0; i < count; i++) {
            const sx = x + i * T
            const grad = ctx.createLinearGradient(sx, baseY - T, sx, baseY)
            grad.addColorStop(0, '#ffffff')
            grad.addColorStop(0.5, mood.primary)
            grad.addColorStop(1, mood.secondary)
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.moveTo(sx, baseY)
            ctx.lineTo(sx + T / 2, baseY - T)
            ctx.lineTo(sx + T, baseY)
            ctx.closePath()
            ctx.fill()
            ctx.strokeStyle = rgba('#ffffff', 0.7)
            ctx.lineWidth = 1
            ctx.stroke()
        }
        ctx.restore()
    }

    function drawBlock(x, o, mood, pulse) {
        const y = GROUND_Y - o.h - o.y
        ctx.save()
        ctx.shadowColor = mood.primary
        ctx.shadowBlur = 14 + 12 * pulse
        const grad = ctx.createLinearGradient(x, y, x, y + o.h)
        grad.addColorStop(0, rgba(mood.primary, 0.95))
        grad.addColorStop(1, rgba(mood.secondary, 0.85))
        ctx.fillStyle = grad
        ctx.fillRect(x, y, o.w, o.h)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, y + 1, o.w - 2, o.h - 2)
        ctx.fillStyle = rgba('#ffffff', 0.15 + 0.15 * pulse)
        ctx.fillRect(x + 6, y + 6, o.w - 12, 4)
        ctx.restore()
    }

    function drawMover(x, o, mood, pulse) {
        const y = GROUND_Y - o.h - o.y
        ctx.save()
        ctx.shadowColor = mood.secondary
        ctx.shadowBlur = 20 + 12 * pulse
        ctx.fillStyle = rgba(mood.secondary, 0.9)
        ctx.fillRect(x, y, o.w, o.h)
        ctx.strokeStyle = '#fff'
        ctx.strokeRect(x + 1, y + 1, o.w - 2, o.h - 2)
        ctx.fillStyle = rgba('#ffffff', 0.5)
        ctx.fillRect(x + o.w / 2 - 2, y - 4, 4, 4)
        ctx.fillRect(x + o.w / 2 - 2, y + o.h, 4, 4)
        ctx.restore()
    }

    function drawPlatform(x, o, mood, pulse) {
        const y = GROUND_Y - o.y - o.h
        ctx.save()
        ctx.shadowColor = mood.primary
        ctx.shadowBlur = 16 + 10 * pulse
        const grad = ctx.createLinearGradient(x, y, x, y + o.h)
        grad.addColorStop(0, '#ffffff')
        grad.addColorStop(1, rgba(mood.primary, 0.9))
        ctx.fillStyle = grad
        ctx.fillRect(x, y, o.w, o.h)
        ctx.fillStyle = rgba(mood.primary, 0.4)
        ctx.fillRect(x, y + o.h, o.w, 4)
        ctx.restore()
    }

    function drawSpeedPortal(x, o, mood, pulse) {
        const cy = GROUND_Y - 110
        ctx.save()
        ctx.shadowColor = mood.secondary
        ctx.shadowBlur = 30 + 20 * pulse
        const grad = ctx.createLinearGradient(x, cy - 80, x, cy + 80)
        grad.addColorStop(0, rgba('#ffffff', 0.9))
        grad.addColorStop(0.5, rgba(mood.secondary, 0.8))
        grad.addColorStop(1, rgba(mood.primary, 0.9))
        ctx.fillStyle = grad
        ctx.fillRect(x - 4, cy - 80, 16, 160)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.strokeRect(x - 4, cy - 80, 16, 160)
        ctx.fillStyle = '#fff'
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath()
            ctx.moveTo(x + 20, cy + i * 24 - 6)
            ctx.lineTo(x + 36, cy + i * 24)
            ctx.lineTo(x + 20, cy + i * 24 + 6)
            ctx.closePath()
            ctx.fill()
        }
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

    function drawCube({ x, y, rot, size, color, glow, alpha, squash, pulse }) {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(x + size / 2, y + size / 2)
        ctx.rotate(rot)
        const sx = squash, sy = 2 - squash
        ctx.scale(sx, sy)
        ctx.shadowColor = glow
        ctx.shadowBlur = 28 + 16 * pulse
        const grad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2)
        grad.addColorStop(0, '#ffffff')
        grad.addColorStop(0.5, color)
        grad.addColorStop(1, glow)
        ctx.fillStyle = grad
        ctx.fillRect(-size / 2, -size / 2, size, size)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.strokeRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2)
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2)
        ctx.fillStyle = rgba(glow, 0.9)
        ctx.fillRect(-size / 8, -size / 8, size / 4, size / 4)
        ctx.restore()
    }

    const api = {
        stop() { stopped = true; cancelAnimationFrame(raf) },
        destroy() {
            stopped = true
            cancelAnimationFrame(raf)
            window.removeEventListener('keydown', onKeyDown)
            canvas.removeEventListener('pointerdown', onPointer)
            window.removeEventListener('resize', resize)
            particles.clear()
        },
        requestRestart() { onState({ type: 'restart-request' }) },
        toggleSound() {
            audio.setEnabled(!audio.isEnabled())
            if (audio.isEnabled()) audio.startMusic()
            else audio.stopMusic()
            onState({ type: 'sound-toggle', enabled: audio.isEnabled() })
        },
        getState() { return state },
        getGhostFrames() { return recorder.frames },
    }

    raf = requestAnimationFrame((t) => { lastT = t; loop(t) })
    return api
}