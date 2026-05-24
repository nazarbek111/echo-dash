import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import GameCanvas from '../components/GameCanvas.jsx'
import GameOver from '../components/GameOver.jsx'
import VictoryScreen from '../components/VictoryScreen.jsx'
import { LEVELS, buildDailyLevel } from '../game/levels.js'
import { SKINS, DEFAULT_SETTINGS, STORAGE_KEYS } from '../game/constants.js'
import { SKIN_CATALOG, LEVEL_CATALOG } from '../game/catalog.js'
import { loadBest, saveBest } from '../game/replay.js'
import { useAuth } from '../services/AuthContext.jsx'
import { applyRunLocally } from '../services/progressionService.js'
import { submitRun } from '../services/leaderboardService.js'
import { submitDailyRun, fetchDaily } from '../services/dailyService.js'
import { fetchMyBestReplay, fetchTopReplay } from '../services/replayService.js'
import { useToasts } from '../components/Toasts.jsx'
import { ACHIEVEMENT_CATALOG, SKIN_CATALOG as SKINS_CATALOG } from '../game/catalog.js'

function readLS(k, fb) {
    try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v) } catch { return fb }
}
function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// Map levelId → engine mode (demo/full/daily) so leaderboards are categorized
function modeForLevel(id) {
    if (id === 'full')  return 'full'
    if (id === 'daily') return 'daily'
    return 'demo'
}

export default function GamePage() {
    const { levelId = 'demo' } = useParams()
    const [params] = useSearchParams()
    const ghostMode = params.get('ghost') || 'mine' // 'mine' | 'top' | 'off'
    const nav = useNavigate()
    const { user, selectedSkin, applyUnlocks, refreshCloudSave } = useAuth()
    const { push } = useToasts()

    const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readLS(STORAGE_KEYS.settings, {}) }))
    const [attempts, setAttempts] = useState(() => readLS(STORAGE_KEYS.attempts, {}))
    const [best, setBest] = useState(() => readLS(STORAGE_KEYS.best, {}))
    const [death, setDeath] = useState(null)
    const [win, setWin] = useState(null)
    const [runKey, setRunKey] = useState(0)
    const [level, setLevel] = useState(null)
    const [cloudGhost, setCloudGhost] = useState(null) // ghost loaded from backend
    const [noPanic30, setNoPanic30] = useState(true)

    useEffect(() => { writeLS(STORAGE_KEYS.attempts, attempts) }, [attempts])
    useEffect(() => { writeLS(STORAGE_KEYS.best, best) }, [best])

    // Load level (handle daily separately — needs network or fallback)
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (levelId === 'daily') {
                try {
                    const d = await fetchDaily()
                    if (cancelled) return
                    // Use deterministic builder with same date string
                    setLevel(buildDailyLevel(d.daily.date))
                } catch {
                    // Backend unavailable — use today's UTC date deterministically
                    const date = new Date().toISOString().slice(0, 10)
                    setLevel(buildDailyLevel(date))
                }
            } else {
                setLevel(LEVELS[levelId] || LEVELS.demo)
            }
        })()
        return () => { cancelled = true }
    }, [levelId])

    // Bump attempt counter when this page mounts / level changes
    useEffect(() => {
        setAttempts(a => ({ ...a, [levelId]: (a[levelId] || 0) + 1 }))
        setRunKey(k => k + 1)
    }, [levelId])

    // Load ghost (top from backend OR local best)
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (ghostMode === 'off') { setCloudGhost(null); return }
            if (ghostMode === 'top') {
                try {
                    const r = await fetchTopReplay({ levelId, scope: 'global' })
                    if (!cancelled && r.replay) {
                        setCloudGhost({ frames: r.replay.data, color: '#ffd166', label: 'Champion Ghost' })
                        return
                    }
                } catch {}
            }
            if (ghostMode === 'mine' && user) {
                try {
                    const r = await fetchMyBestReplay(levelId)
                    if (!cancelled && r.replay) {
                        setCloudGhost({ frames: r.replay.data, color: '#a8efff', label: 'Your Echo (Cloud)' })
                        return
                    }
                } catch {}
            }
            // Fallback to local
            const localG = loadBest(levelId)
            if (!cancelled && localG?.frames?.length) {
                setCloudGhost({ frames: localG.frames, color: '#a8efff', label: 'Your Echo' })
            } else if (!cancelled) {
                setCloudGhost(null)
            }
        })()
        return () => { cancelled = true }
    }, [levelId, ghostMode, user, runKey])

    const skin = SKINS[selectedSkin] || SKINS.cyan

    const handleEnd = useCallback(async (kind, e) => {
        // Build run summary
        const completed = kind === 'win'
        const runSummary = {
            mode: modeForLevel(levelId),
            levelId,
            percent: completed ? 1 : (e.progress || 0),
            completed,
            completionTimeMs: completed ? Math.floor(e.elapsed * 1000) : 0,
            survivedTimeMs: e.survivedTimeMs || (completed ? Math.floor(e.elapsed * 1000) : 0),
            jumps: e.jumps || 0,
            deaths: completed ? 0 : 1,
            deathCause: completed ? null : (e.cause || 'Unknown'),
            deathZone: completed ? null : (e.deathZone || null),
            speedPortalsPassed: e.speedPortalsPassed || 0,
            skinId: selectedSkin,
            hasReplay: (e.ghostFrames || []).length > 1,
            ghostEnabled: ghostMode !== 'off' && !!cloudGhost,
            noPanic30,
            replayData: e.ghostFrames || [],
        }

        // 1. Update local progression + unlocks
        const localUnlocks = applyRunLocally(runSummary)
        applyUnlocks(localUnlocks)

        // 2. Update local best % for this level
        setBest(b => {
            const cur = b[levelId] || 0
            if (runSummary.percent > cur) {
                saveBest(levelId, runSummary.percent, runSummary.replayData)
                return { ...b, [levelId]: runSummary.percent }
            }
            return b
        })

        // 3. Toast unlocks (local first, then we'll add cloud-only ones)
        const allNew = new Set([...(localUnlocks.newAchievements || [])])
        localUnlocks.newSkins?.forEach(s => {
            const sk = SKINS_CATALOG.find(x => x.key === s)
            push({ title: 'Skin Unlocked!', body: sk?.name || s })
        })
        localUnlocks.newAchievements?.forEach(k => {
            const a = ACHIEVEMENT_CATALOG.find(x => x.key === k)
            push({ title: 'Achievement Unlocked', body: a?.name || k })
        })

        // 4. Submit to backend (if logged in) — fire-and-forget for non-best, but await for best/completed
        if (user) {
            try {
                const cloudRes = await submitRun(runSummary)
                if (cloudRes?.newlyUnlockedAchievements?.length) {
                    for (const k of cloudRes.newlyUnlockedAchievements) {
                        if (allNew.has(k)) continue
                        const a = ACHIEVEMENT_CATALOG.find(x => x.key === k)
                        push({ title: 'Achievement Unlocked', body: a?.name || k })
                    }
                    await refreshCloudSave()
                }
                // Submit daily separately if daily
                if (modeForLevel(levelId) === 'daily') {
                    try {
                        await submitDailyRun({
                            percent: runSummary.percent,
                            completionTimeMs: runSummary.completionTimeMs,
                            attemptsAtRun: attempts[levelId] || 1,
                            skinId: selectedSkin,
                        })
                    } catch {}
                }
            } catch (err) {
                // Backend unavailable — local state already updated
            }
        }
    }, [levelId, selectedSkin, user, attempts, ghostMode, cloudGhost, applyUnlocks, push, refreshCloudSave, noPanic30])

    const onDeath = useCallback(async (e) => {
        if (e.progress < 0.30) setNoPanic30(false)
        setDeath({ progress: e.progress, cause: e.cause })
        await handleEnd('death', e)
    }, [handleEnd])

    const onWin = useCallback(async (e) => {
        setWin({ time: e.elapsed })
        await handleEnd('win', e)
    }, [handleEnd])

    const onPauseRestart = useCallback(() => {
        setDeath(null); setWin(null)
        setAttempts(a => ({ ...a, [levelId]: (a[levelId] || 0) + 1 }))
        setRunKey(k => k + 1)
        setNoPanic30(true)
    }, [levelId])

    const restart = () => {
        setDeath(null); setWin(null)
        setAttempts(a => ({ ...a, [levelId]: (a[levelId] || 0) + 1 }))
        setRunKey(k => k + 1)
        setNoPanic30(true)
    }

    if (!level) return <div className="page"><div className="empty">Loading level...</div></div>

    return (
        <>
            <GameCanvas
                key={runKey}
                level={level}
                levelId={levelId}
                settings={settings}
                skin={skin}
                ghost={cloudGhost}
                attempt={attempts[levelId] || 1}
                onDeath={onDeath}
                onWin={onWin}
                onPauseRestart={onPauseRestart}
            />
            {death && (
                <GameOver
                    progress={death.progress}
                    bestPct={best[levelId] || 0}
                    attempt={attempts[levelId] || 1}
                    cause={death.cause}
                    onRetry={restart}
                    onMenu={() => nav('/')}
                />
            )}
            {win && (
                <VictoryScreen
                    time={win.time}
                    attempts={attempts[levelId] || 1}
                    onPlay={restart}
                    onMenu={() => nav('/')}
                />
            )}
        </>
    )
}
