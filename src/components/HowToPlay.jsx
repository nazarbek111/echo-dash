import React from 'react'

export default function HowToPlay({ onBack }) {
  return (
    <div className="overlay">
      <div className="glass menu-wrap compact">
        <div className="tag">tutorial</div>
        <h2 className="h2">How to Play</h2>
        <div className="howto-list">
          <div><span className="key">Space</span> / <span className="key">Click</span> / <span className="key">Tap</span> Jump</div>
          <div><span className="key">R</span> Restart after death</div>
          <div><span className="key">M</span> Toggle music & sound</div>
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '14px 0' }} />
          <div>· Avoid spikes, gaps, and obstacles.</div>
          <div>· Reach <strong>100%</strong> to complete the level.</div>
          <div>· Land on platforms — touch their <em>tops</em>, not their sides.</div>
          <div>· Each run is recorded. Your best becomes a <strong>Ghost Replay</strong>.</div>
          <div>· The world reacts to a beat. Feel the pulse.</div>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={onBack}>Got it</button>
        </div>
      </div>
    </div>
  )
}
