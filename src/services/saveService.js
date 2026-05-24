import { api } from './api.js'
import { loadLocalAchievements, loadLocalSkins, loadLocalStats } from './progressionService.js'

export async function fetchCloudSave() {
  return await api('/api/save')
}
export async function putCloudSave(payload) {
  return await api('/api/save', { method: 'PUT', body: payload })
}
export async function syncLocalToCloud() {
  const stats = loadLocalStats()
  const body = {
    bestDemoProgress: stats.bestDemoProgress || 0,
    bestFullProgress: stats.bestFullProgress || 0,
    totalAttempts: stats.totalAttempts || 0,
    totalJumps: stats.totalJumps || 0,
    totalDeaths: stats.totalDeaths || 0,
    unlockedSkins: [...loadLocalSkins()],
    unlockedAchievements: [...loadLocalAchievements()],
  }
  return await api('/api/save/sync-local', { method: 'POST', body })
}
