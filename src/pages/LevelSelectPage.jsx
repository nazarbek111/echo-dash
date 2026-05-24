import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LEVEL_CATALOG } from '../game/catalog.js'
import { useAuth } from '../services/AuthContext.jsx'
import { loadLocalStats } from '../services/progressionService.js'

const DIFF_COLORS = {
  Easy:    { bg: 'rgba(74,222,128,0.18)', fg: '#86efac' },
  Normal:  { bg: 'rgba(34,227,255,0.18)',  fg: '#9af8ff' },
  Medium:  { bg: 'rgba(180,107,255,0.18)', fg: '#d28bff' },
  Hard:    { bg: 'rgba(255,90,106,0.18)',  fg: '#ff8a98' },
  Extreme: { bg: 'rgba(255,209,102,0.18)', fg: '#ffd166' },
}

function formatTime(ms) {
  if (!ms) return '—'
  const s = ms / 1000
  return `${Math.floor(s/60)}:${(Math.floor(s%60)+'').padStart(2,'0')}`
}

export default function LevelSelectPage() {
  const nav = useNavigate()
  const { user } = useAuth()
  const stats = loadLocalStats()
  // We don't have per-level best stats locally yet — we approximate using best demo/full for the two main modes.
  const bestFor = (key) => {
    if (key === 'demo')  return { p: stats.bestDemoProgress || 0, t: stats.bestDemoTimeMs || 0 }
    if (key === 'full')  return { p: stats.bestFullProgress || 0, t: stats.bestFullTimeMs || 0 }
    return { p: 0, t: 0 }
  }

  return (
    <div className="page"><div className="page-inner">
      <div className="page-header">
        <h1>Level Select</h1>
        <p>Choose your run. Each level scores independently and feeds into the leaderboard.</p>
      </div>

      <div className="card-grid">
        {LEVEL_CATALOG.map(l => {
          const { p, t } = bestFor(l.key)
          const diff = DIFF_COLORS[l.difficulty] || DIFF_COLORS.Normal
          const completed = p >= 1.0
          return (
            <div key={l.key} className={'glass level-card' + (completed ? ' completed' : '')}>
              <div className="row">
                <h3>{l.name}</h3>
                <span className="diff" style={{ background: diff.bg, color: diff.fg, border: `1px solid ${diff.fg}44` }}>{l.difficulty}</span>
              </div>
              <div className="desc">{l.description}</div>
              <div className="progress-mini"><div style={{ width: `${Math.floor(p * 100)}%` }} /></div>
              <div className="meta">
                <span>Best: <strong style={{ color: '#fff' }}>{Math.floor(p * 100)}%</strong></span>
                <span>~{l.estimatedDurationSec}s</span>
                <span>{t ? `🏁 ${formatTime(t)}` : ''}</span>
              </div>
              <button className="btn primary" onClick={() => nav(`/play/${l.key}`)}>
                {completed ? '✓ Replay' : 'Play'}
              </button>
            </div>
          )
        })}
      </div>
    </div></div>
  )
}
