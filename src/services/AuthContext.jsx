import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { ping, getToken, setToken, subscribeOnline, hasBackend } from './api.js'
import { fetchMe, logout as logoutSvc, login as loginSvc, register as registerSvc, updateMe as updateMeSvc } from './authService.js'
import { fetchCloudSave, syncLocalToCloud } from './saveService.js'
import { loadLocalSkins, loadLocalAchievements, saveLocalSkins, saveLocalAchievements, getLocalSelectedSkin, setLocalSelectedSkin, loadLocalStats, saveLocalStats } from './progressionService.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  // local state for guest progression / merged after login
  const [skins, setSkins] = useState(() => loadLocalSkins())
  const [achievements, setAchievements] = useState(() => loadLocalAchievements())
  const [selectedSkin, setSelectedSkinState] = useState(() => getLocalSelectedSkin())

  const refreshing = useRef(false)

  // Boot: try to fetch user and cloud save
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasBackend()) { setLoading(false); return }
      const ok = await ping()
      setOnline(ok)
      if (!ok || !getToken()) { setLoading(false); return }
      try {
        const u = await fetchMe()
        if (cancelled) return
        setUser(u)
        await loadCloudSaveInto(u)
      } catch (e) {
        if (e?.status === 401) setToken(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    const off = subscribeOnline(v => setOnline(v))
    return () => { cancelled = true; off() }
    // eslint-disable-next-line
  }, [])

  async function loadCloudSaveInto(u) {
    try {
      const save = await fetchCloudSave()
      const cloudSkins = new Set(save.unlockedSkins || [])
      const cloudAch = new Set(save.achievements || [])
      // merge: cloud + local
      const merged = new Set([...cloudSkins, ...loadLocalSkins()])
      const mergedAch = new Set([...cloudAch, ...loadLocalAchievements()])
      setSkins(merged); saveLocalSkins(merged)
      setAchievements(mergedAch); saveLocalAchievements(mergedAch)
      if (u?.selectedSkinId) { setSelectedSkinState(u.selectedSkinId); setLocalSelectedSkin(u.selectedSkinId) }
    } catch {}
  }

  const register = useCallback(async (form) => {
    const u = await registerSvc(form)
    setUser(u)
    // attempt to merge guest progress into cloud
    try { setSyncing(true); await syncLocalToCloud(); await loadCloudSaveInto(u) } catch {} finally { setSyncing(false) }
    return u
  }, [])

  const login = useCallback(async (form) => {
    const u = await loginSvc(form)
    setUser(u)
    try { setSyncing(true); await syncLocalToCloud(); await loadCloudSaveInto(u) } catch {} finally { setSyncing(false) }
    return u
  }, [])

  const logout = useCallback(async () => {
    await logoutSvc()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (patch) => {
    const u = await updateMeSvc(patch)
    setUser(u)
    return u
  }, [])

  const selectSkin = useCallback(async (key) => {
    setSelectedSkinState(key); setLocalSelectedSkin(key)
    if (user) {
      try { await updateMeSvc({ selectedSkinId: key }) } catch {}
    }
  }, [user])

  // Called after a run finishes — merges new unlocks into context state
  const applyUnlocks = useCallback(({ newAchievements = [], newSkins = [] } = {}) => {
    if (newAchievements.length || newSkins.length) {
      setAchievements(prev => { const n = new Set(prev); newAchievements.forEach(k => n.add(k)); saveLocalAchievements(n); return n })
      setSkins(prev => { const n = new Set(prev); newSkins.forEach(k => n.add(k)); saveLocalSkins(n); return n })
    }
  }, [])

  // Refresh cloud save (after submitting a run)
  const refreshCloudSave = useCallback(async () => {
    if (!user) return
    if (refreshing.current) return
    refreshing.current = true
    try { await loadCloudSaveInto(user) } finally { refreshing.current = false }
  }, [user])

  const value = {
    user, loading, online, syncing,
    isGuest: !user,
    skins, achievements, selectedSkin,
    register, login, logout, updateProfile,
    selectSkin, applyUnlocks, refreshCloudSave,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
