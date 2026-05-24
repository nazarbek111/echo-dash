import React, { useEffect, useRef, useState } from 'react'
import { createEngine } from '../game/engine.js'
import * as audio from '../game/audio.js'

export default function GameCanvas({
                                       level, levelId, settings, skin, ghost, attempt,
                                       onDeath, onWin, onPauseRestart
                                   }) {
    const canvasRef = useRef(null)
    const engineRef = useRef(null)
    const [hud, setHud] = useState({ progress: 0, elapsed: 0, jumpsLeft: 2, maxJumps: 2 })
    const [soundOn, setSoundOn] = useState(audio.isEnabled())

    useEffect(() => {
        audio.setEnabled(settings.sound)
        if (settings.sound) audio.startMusic()
        else audio.stopMusic()
        setSoundOn(audio.isEnabled())
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        const onState = (e) => {
            if (e.type === 'tick') {
                setHud({
                    progress: e.progress,
                    elapsed: e.elapsed,
                    jumpsLeft: e.jumpsLeft ?? 2,
                    maxJumps: e.maxJumps ?? 2,
                })
            } else if (e.type === 'death') {
                onDeath(e)
            } else if (e.type === 'win') {
                onWin(e)
            } else if (e.type === 'restart-request') {
                onPauseRestart()
            } else if (e.type === 'sound-toggle') {
                setSoundOn(e.enabled)
            }
        }
        const engine = createEngine({
            canvas, level, levelId, settings, skin, ghost,
            attemptIndex: attempt, onState,
        })
        engineRef.current = engine
        return () => engine.destroy()
        // eslint-disable-next-line
    }, [])

    const pct = Math.floor(hud.progress * 100)
    const dots = Array.from({ length: hud.maxJumps }, (_, i) => i < hud.jumpsLeft)

    return (
        <div className="canvas-wrap">
            <canvas ref={canvasRef} className="game" />
            <div className="hud">
                <div className="top">
                    <div className="stat">Progress <strong>{pct}%</strong></div>
                    <div className="progress-shell">
                        <div className="progress-fill" style={{ width: pct + '%' }} />
                    </div>
                    <div className="stat">Attempt <strong>#{attempt}</strong></div>
                </div>
                <div className="jumps-row">
                    <span className="jumps-label">Jumps</span>
                    <div className="jump-dots" aria-label={`${hud.jumpsLeft} of ${hud.maxJumps} jumps available`}>
                        {dots.map((on, i) => (
                            <span key={i} className={'jump-dot' + (on ? ' on' : '')} />
                        ))}
                    </div>
                </div>
                <div className="bottom">
                    <div className="hint">Space / Click / Tap = Jump (×2) · R = Restart · M = Sound</div>
                    <button
                        className="pill"
                        onClick={() => engineRef.current?.toggleSound()}
                        aria-label="toggle sound"
                    >
                        {soundOn ? '🔊 Sound On' : '🔇 Sound Off'}
                    </button>
                </div>
            </div>
        </div>
    )
}