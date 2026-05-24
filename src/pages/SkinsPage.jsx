import React from 'react'
import { SKIN_CATALOG, RARITY_COLORS } from '../game/catalog.js'
import { useAuth } from '../services/AuthContext.jsx'
import { useToasts } from '../components/Toasts.jsx'

export default function SkinsPage() {
  const { skins, selectedSkin, selectSkin } = useAuth()
  const { push } = useToasts()
  const unlockedCount = SKIN_CATALOG.filter(s => skins.has(s.key)).length

  const onSelect = async (key) => {
    if (!skins.has(key)) return
    await selectSkin(key)
    const s = SKIN_CATALOG.find(x => x.key === key)
    push({ title: 'Skin Selected', body: s?.name || key })
  }

  return (
    <div className="page"><div className="page-inner">
      <div className="page-header">
        <h1>Skins</h1>
        <p>{unlockedCount} / {SKIN_CATALOG.length} unlocked. Selected skin syncs to the cloud when logged in.</p>
      </div>

      <div className="card-grid">
        {SKIN_CATALOG.map(s => {
          const unlocked = skins.has(s.key)
          const active = selectedSkin === s.key
          return (
            <div
              key={s.key}
              className={'skin-card' + (active ? ' active' : '') + (unlocked ? '' : ' locked')}
              onClick={() => onSelect(s.key)}
            >
              <div
                className={'skin-cube' + (unlocked ? '' : ' locked')}
                style={unlocked ? { ['--c']: s.primaryColor, ['--g']: s.glowColor } : {}}
              />
              <div className="skin-name">{s.name}</div>
              <div className="rarity" style={{ background: `${RARITY_COLORS[s.rarity]}22`, color: RARITY_COLORS[s.rarity], border: `1px solid ${RARITY_COLORS[s.rarity]}55` }}>
                {s.rarity}
              </div>
              <div className="req">{unlocked ? (active ? 'Selected' : 'Tap to select') : s.unlockCondition}</div>
            </div>
          )
        })}
      </div>
    </div></div>
  )
}
