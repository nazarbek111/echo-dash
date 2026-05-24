import React, { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../services/leaderboardService.js'
import { hasBackend } from '../services/api.js'
import { useAuth } from '../services/AuthContext.jsx'
import { COUNTRIES, REGIONS_BY_COUNTRY, flagFor } from '../game/regions.js'

const MODES = [
  { id: 'demo',  label: 'Demo Run' },
  { id: 'full',  label: 'Full Run' },
  { id: 'daily', label: 'Daily Challenge' },
]
const SORTS = [
  { id: 'progress', label: 'Best Progress' },
  { id: 'time',     label: 'Fastest Time' },
  { id: 'attempts', label: 'Fewest Attempts' },
]
const SCOPES = [
  { id: 'global',  label: 'Global' },
  { id: 'country', label: 'Country' },
  { id: 'region',  label: 'Region' },
]

function formatTime(ms) {
  if (!ms) return '—'
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  const cs = Math.floor((s % 1) * 100).toString().padStart(2, '0')
  return `${m}:${sec}.${cs}`
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState('demo')
  const [sort, setSort] = useState('progress')
  const [scope, setScope] = useState('global')
  const [country, setCountry] = useState(user?.country || 'Kazakhstan')
  const [region, setRegion] = useState(user?.region || 'Almaty')
  const [data, setData] = useState({ rows: [], myRank: null })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!hasBackend()) return
    setLoading(true); setErr('')
    fetchLeaderboard({ mode, sort, scope, country, region, limit: 100 })
      .then(d => setData(d))
      .catch(e => setErr(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [mode, sort, scope, country, region])

  return (
    <div className="page"><div className="page-inner">
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p>Global · Country · Region rankings. Submit runs while logged in to appear here.</p>
      </div>

      {!hasBackend() && (
        <div className="glass" style={{ padding: 22, marginBottom: 18 }}>
          <strong>Backend not configured.</strong> Set <code>VITE_API_URL</code> to enable leaderboards.
        </div>
      )}

      <div className="glass" style={{ padding: 16, marginBottom: 18 }}>
        <div className="tabs">
          {MODES.map(m => <div key={m.id} className={'tab' + (mode === m.id ? ' active' : '')} onClick={() => setMode(m.id)}>{m.label}</div>)}
        </div>
        <div className="tabs">
          {SCOPES.map(s => <div key={s.id} className={'tab' + (scope === s.id ? ' active' : '')} onClick={() => setScope(s.id)}>{s.label}</div>)}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>Sort By</label>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
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
        {err && <div className="alert" style={{ marginBottom: 10 }}>{err}</div>}
        {loading ? (
          <div className="empty">Loading...</div>
        ) : data.rows.length === 0 ? (
          <div className="empty">No runs yet for this scope. Be the first.</div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th className="hide-sm">Country</th>
                <th className="hide-sm">Region</th>
                <th>%</th>
                <th>Time</th>
                <th className="hide-sm">Attempts</th>
                <th className="hide-sm">Replay</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.runId} className={user && r.userId === user.id ? 'me' : ''}>
                  <td className={'rank ' + (r.rank === 1 ? 'r1' : r.rank === 2 ? 'r2' : r.rank === 3 ? 'r3' : '')}>{r.rank}</td>
                  <td><strong>{r.username}</strong></td>
                  <td className="hide-sm small">{flagFor(r.country)} {r.country}</td>
                  <td className="hide-sm small">{r.region}</td>
                  <td className="pct">{Math.floor(r.percent * 100)}%</td>
                  <td>{r.completed ? formatTime(r.completionTimeMs) : '—'}</td>
                  <td className="hide-sm">{r.attemptsAtRun}</td>
                  <td className="hide-sm small">{r.replayId ? '👻' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div></div>
  )
}
