import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../services/AuthContext.jsx'
import { loadLocalStats } from '../services/progressionService.js'
import { fetchAnalytics, fetchLeaderboard } from '../services/leaderboardService.js'
import { ACHIEVEMENT_CATALOG } from '../game/catalog.js'

export default function HomePage() {
    const { user, isGuest, achievements } = useAuth()
    const [globalRank, setGlobalRank] = useState(null)
    const [regionRank, setRegionRank] = useState(null)
    const [analytics, setAnalytics] = useState(null)

    useEffect(() => {
        if (!user) return

        fetchAnalytics()
            .then(a => setAnalytics(a))
            .catch(() => {})

        fetchLeaderboard({ mode: 'demo', scope: 'global', limit: 100 })
            .then(data => {
                if (data && data.myRank) {
                    setGlobalRank(data.myRank.rank)
                }
            })
            .catch(() => {})

        if (user.country && user.region) {
            fetchLeaderboard({
                mode: 'demo',
                scope: 'region',
                country: user.country,
                region: user.region,
                limit: 100
            })
                .then(data => {
                    if (data && data.myRank) {
                        setRegionRank(data.myRank.rank)
                    }
                })
                .catch(() => {})
        }
    }, [user])

    const stats = analytics?.stats || loadLocalStats()

    const bestProgress = Math.max(
        stats?.bestDemoProgress || 0,
        stats?.bestFullProgress || 0,
        stats?.bestDailyProgress || 0
    )

    const unlockedCount = achievements ? achievements.size : 0
    const totalAchievements = ACHIEVEMENT_CATALOG.length

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

                {/* Quick Play Actions Grid */}
                <div className="menu-grid" style={{ marginTop: 28 }}>
                    <Link className="btn primary" to="/play/full">▶ Start Full Run</Link>
                    <Link className="btn" to="/play/demo">⚡ Demo Run</Link>
                    <Link className="btn" to="/levels">🎮 Level Select</Link>
                    <Link className="btn" to="/profile">👤 Profile</Link>
                </div>

                {/* Compact Stat Cards Section */}
                <div className="stats" style={{ marginTop: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                    <div className="stat-card">
                        <div className="label">Best Progress</div>
                        <div className="value">{Math.floor(bestProgress * 100)}%</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Global Rank</div>
                        <div className="value">{globalRank ? `#${globalRank}` : '—'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Region Rank</div>
                        <div className="value">{regionRank ? `#${regionRank}` : '—'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="label">Achievements Unlocked</div>
                        <div className="value">{unlockedCount} / {totalAchievements}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
