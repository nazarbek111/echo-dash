import React from 'react'

export default function MainMenu({ onPlay, onDemo, onHow, onSkins, onSettings, onReset, bestPct }) {
  return (
    <div className="overlay">
      <div className="glass menu-wrap">
        <div className="logo-cube" />
        <div className="tag">cyber · glitch · rhythm runner</div>
        <h1 className="title">ECHO DASH</h1>
        <div className="subtitle">Run · Die · Remember · Repeat</div>

        <div className="stats" style={{ marginTop: 28 }}>
          <div className="stat-card">
            <div className="label">Best Progress</div>
            <div className="value">{Math.floor(bestPct * 100)}%</div>
          </div>
          <div className="stat-card">
            <div className="label">Ghost Replay</div>
            <div className="value" style={{ fontSize: 18 }}>
              {bestPct > 0 ? 'Ready' : 'Locked'}
            </div>
          </div>
        </div>

        <div className="menu-grid">
          <button className="btn primary" onClick={onPlay}>▶ Start Full Run</button>
          <button className="btn" onClick={onDemo}>⚡ Demo Run</button>
          <button className="btn" onClick={onHow}>How to Play</button>
          <button className="btn" onClick={onSkins}>Skins</button>
          <button className="btn" onClick={onSettings}>Settings</button>
          <button className="btn danger" onClick={onReset}>Reset Best</button>
        </div>
      </div>
      <div className="footer">© Echo Dash · made for arena demo</div>
    </div>
  )
}
