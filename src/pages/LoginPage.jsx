import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../services/AuthContext.jsx'
import { hasBackend } from '../services/api.js'

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [form, setForm] = useState({ emailOrUsername: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await login(form)
      const next = new URLSearchParams(loc.search).get('next') || '/'
      nav(next, { replace: true })
    } catch (ex) {
      setErr(ex.message || 'Login failed')
    } finally { setLoading(false) }
  }

  if (!hasBackend()) {
    return (
      <div className="page"><div className="page-inner">
        <div className="glass form-card">
          <h2 className="h2">Cloud Disabled</h2>
          <p className="sub">No backend configured. Set VITE_API_URL to enable accounts.</p>
          <Link className="btn primary" to="/">Back Home</Link>
        </div>
      </div></div>
    )
  }

  return (
    <div className="page"><div className="page-inner">
      <form className="glass form-card form" onSubmit={submit}>
        <h2 className="h2">Welcome Back</h2>
        <p className="sub">Login to sync progress and climb the leaderboards.</p>
        {err && <div className="alert">{err}</div>}
        <div className="field">
          <label>Username or Email</label>
          <input value={form.emailOrUsername} onChange={onChange('emailOrUsername')} autoComplete="username" autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={onChange('password')} autoComplete="current-password" />
        </div>
        <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          No account? <Link to="/register" style={{ color: 'var(--cyan)' }}>Create one</Link>
        </div>
      </form>
    </div></div>
  )
}
