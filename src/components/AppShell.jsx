import React from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../services/AuthContext.jsx'
import { hasBackend } from '../services/api.js'
import { flagFor } from '../game/regions.js'

export default function AppShell({ children }) {
  const { user, online, syncing, loading } = useAuth()
  const loc = useLocation()
  const inGame = loc.pathname.startsWith('/play')

  const syncLabel = !hasBackend() ? 'Local Only'
    : syncing ? 'Syncing'
    : !online ? 'Offline'
    : user ? 'Cloud Synced'
    : 'Guest'
  const syncClass = !hasBackend() ? '' : syncing ? 'syncing' : !online ? 'offline' : 'online'

  return (
    <div className={'shell' + (inGame ? ' game-mode' : '')}>
      {!inGame && (
        <nav className="nav">
          <Link to="/" className="brand">ECHO·DASH</Link>
          <div className="links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/levels">Levels</NavLink>
            <NavLink to="/daily">Daily</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
            <NavLink to="/achievements">Achievements</NavLink>
            <NavLink to="/skins">Skins</NavLink>
          </div>
          <div className="right">
            <span className={'sync-pill ' + syncClass}>{syncLabel}</span>
            {loading ? null : user ? (
              <Link to="/profile" className="userchip">
                <span>{flagFor(user.country)}</span>
                <span>{user.username}</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="navbtn">Login</Link>
                <Link to="/register" className="navbtn">Sign Up</Link>
              </>
            )}
          </div>
        </nav>
      )}
      {children}
    </div>
  )
}
