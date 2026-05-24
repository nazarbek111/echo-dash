import React from 'react'

function Row({ label, value, onToggle }) {
  return (
    <div className="setting-row">
      <span className="name">{label}</span>
      <div className={'toggle' + (value ? ' on' : '')} onClick={onToggle}>
        <div className="dot" />
      </div>
    </div>
  )
}

export default function Settings({ settings, setSettings, onBack }) {
  const update = (k) => setSettings({ ...settings, [k]: !settings[k] })
  return (
    <div className="overlay">
      <div className="glass menu-wrap compact" style={{ maxWidth: 520 }}>
        <div className="tag">configuration</div>
        <h2 className="h2">Settings</h2>
        <div style={{ marginTop: 20 }}>
          <Row label="Show Ghost"     value={settings.showGhost}     onToggle={() => update('showGhost')} />
          <Row label="Sound & Music"  value={settings.sound}         onToggle={() => update('sound')} />
          <Row label="Particles"      value={settings.particles}     onToggle={() => update('particles')} />
          <Row label="Screen Shake"   value={settings.shake}         onToggle={() => update('shake')} />
          <Row label="Reduced Motion" value={settings.reducedMotion} onToggle={() => update('reducedMotion')} />
        </div>
        <div className="row" style={{ marginTop: 22 }}>
          <button className="btn primary" onClick={onBack}>Back</button>
        </div>
      </div>
    </div>
  )
}
