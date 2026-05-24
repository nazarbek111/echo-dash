import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext.jsx'
import { fetchAnalytics } from '../services/leaderboardService.js'
import { flagFor } from '../game/regions.js'
import { SKIN_CATALOG } from '../game/catalog.js'
import { loadLocalStats } from '../services/progressionService.js'

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

function formatTime(ms) {
  if (!ms) return '—'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function ProfilePage() {
  const { user, logout, skins, achievements, isGuest } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchAnalytics().then(a => setAnalytics(a)).catch(() => setAnalytics(null)).finally(() => setLoading(false))
  }, [user])

  if (isGuest) {
    return (
      <div className="page"><div className="page-inner">
        <div className="glass form-card">
          <h2 className="h2">Guest Mode</h2>
          <p className="sub">Create an account to view your profile, sync progress, and compete on leaderboards.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <Link className="btn primary" to="/register">Sign Up</Link>
            <Link className="btn" to="/login">Login</Link>
          </div>
        </div>
      </div></div>
    )
  }

  const stats = analytics?.stats || loadLocalStats()
  const selectedSkin = SKIN_CATALOG.find(s => s.key === user.selectedSkinId) || SKIN_CATALOG[0]
  const deathsByZone = analytics?.deathsByZone || {}
  const zones = ['blue','purple','red','white']
  const maxDeath = Math.max(1, ...Object.values(deathsByZone))

  return (
    <div className="page"><div className="page-inner">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your account, stats, and analytics.</p>
      </div>

      <div className="glass" style={{ padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div className="skin-cube" style={{
            ['--c']: selectedSkin.primaryColor, ['--g']: selectedSkin.glowColor,
            width: 72, height: 72,
          }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 28 }}>{user.username}</h2>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, letterSpacing: '0.06em' }}>
              {flagFor(user.country)} {user.country} · {user.region} · joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="row" style={{ flex: '0 0 auto' }}>
            <Link className="btn small" to="/skins">Change Skin</Link>
            <button className="btn small" onClick={async () => { await logout(); nav('/') }}>Logout</button>
          </div>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <StatCard label="Best Demo"     value={Math.floor((stats.bestDemoProgress || 0) * 100) + '%'} />
        <StatCard label="Best Full"     value={Math.floor((stats.bestFullProgress || 0) * 100) + '%'} />
        <StatCard label="Best Daily"    value={Math.floor((stats.bestDailyProgress || 0) * 100) + '%'} />
        <StatCard label="Completed"     value={stats.completedRuns || 0} />
        <StatCard label="Attempts"      value={stats.totalAttempts || 0} />
        <StatCard label="Deaths"        value={stats.totalDeaths || 0} />
        <StatCard label="Jumps"         value={stats.totalJumps || 0} />
        <StatCard label="Play Time"     value={formatTime(stats.totalPlayTimeMs)} />
        <StatCard label="Skins Unlocked"value={skins.size} />
        <StatCard label="Achievements"  value={achievements.size} />
      </div>

      <div className="glass" style={{ padding: 22, marginTop: 18 }}>
        <h3 style={{ margin: '0 0 14px', letterSpacing: '0.1em', fontSize: 16 }}>Deaths by Zone</h3>
        <div className="chart-bars">
          {zones.map(z => (
            <div key={z} className="bar-row">
              <div className="bar-label" style={{ textTransform: 'capitalize' }}>{z}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${((deathsByZone[z] || 0) / maxDeath) * 100}%` }} />
              </div>
              <div className="bar-value">{deathsByZone[z] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {analytics?.timeline?.length > 0 && (
        <div className="glass" style={{ padding: 22, marginTop: 18 }}>
          <h3 style={{ margin: '0 0 14px', letterSpacing: '0.1em', fontSize: 16 }}>Progress Timeline (last {analytics.timeline.length} runs)</h3>
          <div className="timeline">
            {analytics.timeline.map((t, i) => (
              <div key={i} className="dot" style={{ height: `${Math.max(4, t.percent * 100)}%` }} title={`${Math.floor(t.percent*100)}% · ${t.mode}`} />
            ))}
          </div>
          {stats.averageProgress > 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
              Average progress: <strong style={{ color: '#fff' }}>{Math.floor(stats.averageProgress * 100)}%</strong>
              {analytics.mostCommonDeathCause && <> · Most common cause of death: <strong style={{ color: '#fff' }}>{analytics.mostCommonDeathCause}</strong></>}
            </p>
          )}
        </div>
      )}

      {analytics?.recentRuns?.length > 0 && (
        <div className="glass" style={{ padding: 22, marginTop: 18 }}>
          <h3 style={{ margin: '0 0 14px', letterSpacing: '0.1em', fontSize: 16 }}>Recent Runs</h3>
          <table className="lb-table">
            <thead><tr><th>Mode</th><th>Level</th><th>Percent</th><th className="hide-sm">Time</th><th className="hide-sm">Cause</th><th className="hide-sm">When</th></tr></thead>
            <tbody>
              {analytics.recentRuns.map(r => (
                <tr key={r.id}>
                  <td style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.18em' }}>{r.mode}</td>
                  <td>{r.levelId}</td>
                  <td className="pct">{Math.floor(r.percent * 100)}%</td>
                  <td className="hide-sm">{r.completed ? formatTime(r.completionTimeMs) : '—'}</td>
                  <td className="hide-sm small">{r.deathCause || (r.completed ? '✓' : '—')}</td>
                  <td className="hide-sm small">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && <div className="empty">Loading analytics...</div>}
    </div></div>
  )
}
