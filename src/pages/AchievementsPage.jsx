import React from 'react'
import { ACHIEVEMENT_CATALOG, RARITY_COLORS } from '../game/catalog.js'
import { useAuth } from '../services/AuthContext.jsx'

export default function AchievementsPage() {
  const { achievements } = useAuth()
  const unlockedCount = ACHIEVEMENT_CATALOG.filter(a => achievements.has(a.key)).length

  return (
    <div className="page"><div className="page-inner">
      <div className="page-header">
        <h1>Achievements</h1>
        <p>{unlockedCount} / {ACHIEVEMENT_CATALOG.length} unlocked.</p>
      </div>

      <div className="card-grid">
        {ACHIEVEMENT_CATALOG.map(a => {
          const unlocked = achievements.has(a.key)
          return (
            <div key={a.key} className={'ach-card glass' + (unlocked ? '' : ' locked')} style={{ background: unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }}>
              <div className="ico" style={unlocked ? { borderColor: RARITY_COLORS[a.rarity], boxShadow: `0 0 18px ${RARITY_COLORS[a.rarity]}55` } : {}}>
                {unlocked ? a.icon : '🔒'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="name">{a.name}</div>
                <div className="desc">{a.description}</div>
                <div className="rarity" style={{ background: `${RARITY_COLORS[a.rarity]}22`, color: RARITY_COLORS[a.rarity], border: `1px solid ${RARITY_COLORS[a.rarity]}55` }}>
                  {a.rarity}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div></div>
  )
}
