import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../game/constants.js'
import Settings from '../components/Settings.jsx'

export default function SettingsPage() {
  const nav = useNavigate()
  const [settings, setSettings] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.settings)
      return v ? { ...DEFAULT_SETTINGS, ...JSON.parse(v) } : DEFAULT_SETTINGS
    } catch { return DEFAULT_SETTINGS }
  })
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)) } catch {}
  }, [settings])
  return <Settings settings={settings} setSettings={setSettings} onBack={() => nav('/')} />
}
