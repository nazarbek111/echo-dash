import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDaily, fetchDailyLeaderboard } from '../services/dailyService.js'
import { useAuth } from '../services/AuthContext.jsx'
import { hasBackend } from '../services/api.js'
import { flagFor, COUNTRIES, REGIONS_BY_COUNTRY } from '../game/regions.js'

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = String(Math.floor(s/3600)).padStart(2,'0')
  const m = String(Math.floor((s%3600)/60)).padStart(2,'0')
  const ss = String(s%60).padStart(2,'0')
  return `${h}:${m}:${ss}`
}

const SCOPES = [
  { id: 'global',  label: 'Global' },
  { id: 'country', label: 'Country' },
  { id: 'region',  label: 'Region' },
]

export default function DailyPage() {
  const { user } = useAuth()
  const [daily, setDaily] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [scope, setScope] = useState('global')
  const [country, setCountry] = useState(user?.country || 'Kazakhstan')
  const [region, setRegion] = useState(user?.region || 'Almaty')
  const [lb, setLb] = useState({ rows: [], myRank: null })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasBackend()) return
    fetchDaily().then(d => setDaily(d.daily)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!hasBackend() || !daily) return
    setLoading(true)
    fetchDailyLeaderboard({ scope, country, region, date: daily.date })
      .then(d => setLb(d)).catch(() => {}).finally(() => setLoading(false))
  }, [daily, scope, country, region])

  if (!hasBackend()) {
    return (
      <div className="page"><div className="page-inner">
        <div className="glass form-card">
          <h2 className="h2">Backend Disabled</h2>
          <p className="sub">Daily Challenge needs the backend. Set VITE_API_URL to enable.</p>
        </div>
      </div></div>
    )
  }

  const remaining = daily ? Math.max(0, daily.timeToResetMs - (now - new Date(daily.createdAt).getTime() + (Date.now() - now))) : 0
  // Simpler: server told us timeToResetMs at fetch time; recompute by adjusting against fetch moment.
  // Use approximation: resets at next UTC midnight.
  const nowD = new Date()
  const nextUTC = Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), nowD.getUTCDate()+1)
  const realRemaining = nextUTC - Date.now()

  return (
    <div className="page"><div className="page-inner">
      <div className="page-header">
        <h1>Daily Challenge</h1>
        <p>A new procedurally-generated level every day. Same seed for every player worldwide.</p>
      </div>

      {daily && (
        <div className="glass daily-card">
          <div className="row">
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--muted)' }}>Today · {daily.date}</div>
              <h2>{daily.name}</h2>
              <div style={{ marginTop: 6, fontSize: 12, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                Difficulty: <strong style={{ color: '#fff' }}>{daily.difficulty}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--muted)' }}>Resets in</div>
              <div className="countdown">{formatCountdown(realRemaining)}</div>
            </div>
            <Link className="btn primary" to="/play/daily">▶ Play Today's Challenge</Link>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: 14, marginBottom: 14 }}>
        <div className="tabs">
          {SCOPES.map(s => <div key={s.id} className={'tab' + (scope === s.id ? ' active' : '')} onClick={() => setScope(s.id)}>{s.label}</div>)}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {(scope === 'country' || scope === 'region') && (
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>Country</label>
              <select value={country} onChange={e => { setCountry(e.target.value); setRegion((REGIONS_BY_COUNTRY[e.target.value]||['Other'])[0]) }}>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
          )}
          {scope === 'region' && (
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label>Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)}>
                {(REGIONS_BY_COUNTRY[country] || ['Other']).map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="glass" style={{ padding: 14 }}>
        <h3 style={{ margin: '0 0 12px', letterSpacing: '0.1em', fontSize: 14 }}>Daily Leaderboard — {daily?.date}</h3>
        {loading ? (
          <div className="empty">Loading...</div>
        ) : lb.rows.length === 0 ? (
          <div className="empty">No runs submitted yet today. Be first.</div>
        ) : (
          <table className="lb-table">
            <thead><tr><th>#</th><th>Player</th><th className="hide-sm">Country</th><th>%</th><th>Time</th></tr></thead>
            <tbody>
              {lb.rows.map(r => (
                <tr key={r.runId} className={user && r.userId === user.id ? 'me' : ''}>
                  <td className={'rank ' + (r.rank===1?'r1':r.rank===2?'r2':r.rank===3?'r3':'')}>{r.rank}</td>
                  <td>{r.username}</td>
                  <td className="hide-sm small">{flagFor(r.country)} {r.country}</td>
                  <td className="pct">{Math.floor(r.percent * 100)}%</td>
                  <td>{r.completionTimeMs ? `${(r.completionTimeMs/1000).toFixed(2)}s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div></div>
  )
}
