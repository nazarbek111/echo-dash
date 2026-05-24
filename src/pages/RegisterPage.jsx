import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/AuthContext.jsx'
import { COUNTRIES, REGIONS_BY_COUNTRY } from '../game/regions.js'
import { hasBackend } from '../services/api.js'

export default function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    country: 'Kazakhstan', region: 'Almaty',
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const onChange = (k) => (e) => {
    const v = e.target.value
    setForm(f => k === 'country' ? { ...f, country: v, region: (REGIONS_BY_COUNTRY[v] || ['Other'])[0] } : { ...f, [k]: v })
  }

  const regions = useMemo(() => REGIONS_BY_COUNTRY[form.country] || ['Other'], [form.country])

  const fieldErrors = {
    username: form.username && !/^[a-zA-Z0-9_]{3,20}$/.test(form.username) ? '3–20 chars, letters/numbers/underscore.' : '',
    email: form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? 'Invalid email format.' : '',
    password: form.password && form.password.length < 6 ? 'Min 6 characters.' : '',
  }
  const canSubmit = form.username && form.email && form.password && form.country && form.region &&
    !fieldErrors.username && !fieldErrors.email && !fieldErrors.password

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setErr(''); setLoading(true)
    try { await register(form); nav('/', { replace: true }) }
    catch (ex) { setErr(ex.message || 'Registration failed') }
    finally { setLoading(false) }
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
      <form className="glass form-card form" onSubmit={submit} style={{ maxWidth: 560 }}>
        <h2 className="h2">Create Account</h2>
        <p className="sub">Save progress to the cloud · compete by Global / Country / Region.</p>
        {err && <div className="alert">{err}</div>}
        <div className="field">
          <label>Username</label>
          <input value={form.username} onChange={onChange('username')} autoComplete="username" />
          {fieldErrors.username && <div className="err">{fieldErrors.username}</div>}
        </div>
        <div className="field">
          <label>Email</label>
          <input value={form.email} onChange={onChange('email')} type="email" autoComplete="email" />
          {fieldErrors.email && <div className="err">{fieldErrors.email}</div>}
        </div>
        <div className="field">
          <label>Password</label>
          <input value={form.password} onChange={onChange('password')} type="password" autoComplete="new-password" />
          {fieldErrors.password && <div className="err">{fieldErrors.password}</div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Country</label>
            <select value={form.country} onChange={onChange('country')}>
              {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Region / City</label>
            <select value={form.region} onChange={onChange('region')}>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button className="btn primary" type="submit" disabled={!canSubmit || loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          Already have one? <Link to="/login" style={{ color: 'var(--cyan)' }}>Log in</Link>
        </div>
      </form>
    </div></div>
  )
}
