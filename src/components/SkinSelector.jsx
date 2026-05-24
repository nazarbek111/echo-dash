import React from 'react'
import { SKINS } from '../game/constants.js'

export default function SkinSelector({ current, onSelect, onBack }) {
  return (
    <div className="overlay">
      <div className="glass menu-wrap compact" style={{ maxWidth: 640 }}>
        <div className="tag">customize</div>
        <h2 className="h2">Skins</h2>
        <div className="skin-grid">
          {Object.values(SKINS).map(s => (
            <div
              key={s.id}
              className={'skin-card' + (current === s.id ? ' active' : '')}
              onClick={() => onSelect(s.id)}
            >
              <div
                className="skin-cube"
                style={{ ['--c']: s.color, ['--g']: s.glow }}
              />
              <div className="skin-name">{s.name}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={onBack}>Done</button>
        </div>
      </div>
    </div>
  )
}
