import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../services/AuthContext.jsx'

export default function HomePage() {
  const { user, isGuest } = useAuth()
  return (
    <div className="overlay" style={{ position: 'static', flex: 1, background: 'transparent', backdropFilter: 'none' }}>
      <div className="glass menu-wrap">
        <div className="logo-cube" />
        <div className="tag">cyber · glitch · rhythm runner</div>
        <h1 className="title">ECHO DASH</h1>
        <div className="subtitle">Run · Die · Remember · Repeat</div>

        {isGuest ? (
          <p style={{ color: 'var(--muted)', marginTop: 22, fontSize: 13, letterSpacing: '0.08em' }}>
            Playing as Guest — <Link to="/register" style={{ color: 'var(--cyan)' }}>create an account</Link> to save progress online and compete on leaderboards.
          </p>
        ) : (
          <p style={{ color: 'var(--muted)', marginTop: 22, fontSize: 13, letterSpacing: '0.08em' }}>
            Welcome back, <strong style={{ color: '#fff' }}>{user.username}</strong> · {user.region}, {user.country}
          </p>
        )}

        <div className="menu-grid" style={{ marginTop: 28 }}>
          <Link className="btn primary" to="/play/full">▶ Start Full Run</Link>
          <Link className="btn" to="/play/demo">⚡ Demo Run</Link>
          <Link className="btn" to="/levels">🎮 Level Select</Link>
          <Link className="btn" to="/daily">🌟 Daily Challenge</Link>
          <Link className="btn" to="/leaderboard">🏆 Leaderboard</Link>
          <Link className="btn" to="/achievements">🏅 Achievements</Link>
          <Link className="btn" to="/skins">🎨 Skins</Link>
          <Link className="btn" to="/profile">👤 Profile</Link>
        </div>
      </div>
    </div>
  )
}
