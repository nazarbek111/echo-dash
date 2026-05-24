import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './services/AuthContext.jsx'
import { ToastProvider } from './components/Toasts.jsx'
import AppShell from './components/AppShell.jsx'

import HomePage         from './pages/HomePage.jsx'
import LoginPage        from './pages/LoginPage.jsx'
import RegisterPage     from './pages/RegisterPage.jsx'
import ProfilePage      from './pages/ProfilePage.jsx'
import LeaderboardPage  from './pages/LeaderboardPage.jsx'
import AchievementsPage from './pages/AchievementsPage.jsx'
import SkinsPage        from './pages/SkinsPage.jsx'
import LevelSelectPage  from './pages/LevelSelectPage.jsx'
import DailyPage        from './pages/DailyPage.jsx'
import GamePage         from './pages/GamePage.jsx'
import SettingsPage     from './pages/SettingsPage.jsx'
import HowToPlayPage    from './pages/HowToPlayPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell>
            <Routes>
              <Route path="/"                 element={<HomePage />} />
              <Route path="/login"            element={<LoginPage />} />
              <Route path="/register"         element={<RegisterPage />} />
              <Route path="/profile"          element={<ProfilePage />} />
              <Route path="/leaderboard"      element={<LeaderboardPage />} />
              <Route path="/achievements"     element={<AchievementsPage />} />
              <Route path="/skins"            element={<SkinsPage />} />
              <Route path="/levels"           element={<LevelSelectPage />} />
              <Route path="/daily"            element={<DailyPage />} />
              <Route path="/settings"         element={<SettingsPage />} />
              <Route path="/how-to-play"      element={<HowToPlayPage />} />
              <Route path="/play/:levelId"    element={<GamePage />} />
              <Route path="/play"             element={<Navigate to="/play/demo" replace />} />
              <Route path="*"                 element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
