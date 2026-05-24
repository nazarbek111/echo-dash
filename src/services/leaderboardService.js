import { api } from './api.js'

export async function fetchLeaderboard({ mode = 'demo', scope = 'global', country, region, sort = 'progress', levelId, limit = 100 } = {}) {
  const params = new URLSearchParams({ mode, scope, sort, limit: String(limit) })
  if (country) params.set('country', country)
  if (region) params.set('region', region)
  if (levelId) params.set('levelId', levelId)
  return await api(`/api/leaderboard?${params.toString()}`)
}

export async function submitRun(run) {
  return await api('/api/runs', { method: 'POST', body: run })
}

export async function fetchMyRuns() {
  return await api('/api/users/me/runs')
}

export async function fetchAnalytics() {
  return await api('/api/users/me/analytics')
}
