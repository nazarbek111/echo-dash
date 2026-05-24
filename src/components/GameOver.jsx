import React, { useMemo } from 'react'
import { loadDeathEchoes, echoZoneColor } from '../game/deathEchoes.js'

const ZONE_LEGEND = [
    { id: 'blue',   label: 'Blue Zone' },
    { id: 'purple', label: 'Glitch Zone' },
    { id: 'red',    label: 'Danger Zone' },
    { id: 'white',  label: 'Finale Zone' },
]

export default function GameOver({
                                     progress, bestPct, attempt, cause, levelId, levelLength,
                                     onRetry, onMenu,
                                 }) {
    // Load all echoes for this level. We read fresh each render — engine already wrote
    // the current death before this component mounted (see engine.die()).
    const echoes = useMemo(() => (levelId ? loadDeathEchoes(levelId) : []), [levelId, attempt])

    const safeLength = levelLength && levelLength > 0 ? levelLength : 1
    const total = echoes.length
    const currentPct = Math.floor(progress * 100)

    return (
        <div className="overlay">
            <div className="glass menu-wrap compact" style={{ maxWidth: 560 }}>
                <div className="tag" style={{ borderColor: 'rgba(255,90,106,0.4)', color: '#ff8a98' }}>
                    crashed
                </div>
                <h2 className="h2 danger">CRASHED AT {currentPct}%</h2>

                <div className="stats">
                    <div className="stat-card">
                        <div className="label">Best</div>
                        <div className="value">{Math.floor(bestPct * 100)}%</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Attempt</div>
                        <div className="value">#{attempt}</div>
                    </div>
                    <div className="stat-card" style={{ gridColumn: '1 / span 2' }}>
                        <div className="label">Cause of Death</div>
                        <div className="value" style={{ fontSize: 22 }}>{cause || 'Unknown'}</div>
                    </div>
                </div>

                {/* ─── Death Graveyard map ─── */}
                <div className="graveyard">
                    <div className="graveyard-head">
                        <span className="gy-title">Your Graveyard · Attempt #{attempt}</span>
                        <span className="gy-count">{total} {total === 1 ? 'echo' : 'echoes'}</span>
                    </div>

                    {total === 0 ? (
                        <div className="gy-empty">No echoes yet — this is your first crash here.</div>
                    ) : (
                        <div className="gy-track" role="img" aria-label={`${total} death markers along level progress`}>
                            <div className="gy-track-fill" style={{ width: `${currentPct}%` }} />
                            {echoes.map((e, i) => {
                                const left = Math.max(0, Math.min(100, (e.x / safeLength) * 100))
                                const color = echoZoneColor(e.zone)
                                const isCurrent = i === echoes.length - 1
                                return (
                                    <span
                                        key={i}
                                        className={'gy-mark' + (isCurrent ? ' current' : '')}
                                        style={{
                                            left: `${left}%`,
                                            color,
                                            textShadow: `0 0 8px ${color}, 0 0 16px ${color}99`,
                                        }}
                                        title={`Attempt #${e.attempt} · ${Math.floor((e.x / safeLength) * 100)}% · ${e.zone}`}
                                    >
                    ✕
                  </span>
                                )
                            })}
                        </div>
                    )}

                    <div className="gy-axis">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>

                    <div className="gy-legend">
                        {ZONE_LEGEND.map(z => (
                            <span key={z.id} className="gy-legend-item">
                <span className="gy-legend-dot" style={{ background: echoZoneColor(z.id), boxShadow: `0 0 8px ${echoZoneColor(z.id)}` }} />
                                {z.label}
              </span>
                        ))}
                    </div>
                </div>

                <div className="row">
                    <button className="btn primary" onClick={onRetry}>↻ Retry</button>
                    <button className="btn" onClick={onMenu}>Main Menu</button>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    press <span style={{ color: '#fff' }}>R</span> to retry
                </div>
            </div>
        </div>
    )
}