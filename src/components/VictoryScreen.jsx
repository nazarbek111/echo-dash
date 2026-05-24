import React from 'react'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  const ms = Math.floor((s % 1) * 100).toString().padStart(2, '0')
  return `${m}:${sec}.${ms}`
}

export default function VictoryScreen({ time, attempts, onPlay, onMenu }) {
  return (
    <div className="overlay">
      <div className="glass menu-wrap compact" style={{ maxWidth: 560 }}>
        <div className="tag" style={{ borderColor: 'rgba(255,209,102,0.5)', color: '#ffe6a8' }}>
          completed
        </div>
        <h2 className="h2 gold">LEVEL COMPLETE</h2>
        <div className="stats">
          <div className="stat-card">
            <div className="label">Completion Time</div>
            <div className="value">{formatTime(time)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Attempts</div>
            <div className="value">{attempts}</div>
          </div>
          <div className="stat-card" style={{ gridColumn: '1 / span 2' }}>
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: 18 }}>✓ Best run saved as ghost</div>
          </div>
        </div>
        <div className="row">
          <button className="btn primary" onClick={onPlay}>↻ Play Again</button>
          <button className="btn" onClick={onMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  )
}
