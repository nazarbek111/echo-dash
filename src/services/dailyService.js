import { api } from './api.js'

export async function fetchDaily() { return await api('/api/daily', { auth: false }) }
export async function submitDailyRun(body) { return await api('/api/daily/runs', { method: 'POST', body }) }
export async function fetchDailyLeaderboard({ scope = 'global', country, region, date } = {}) {
  const p = new URLSearchParams({ scope })
  if (country) p.set('country', country)
  if (region) p.set('region', region)
  if (date) p.set('date', date)
  return await api(`/api/daily/leaderboard?${p.toString()}`, { auth: false })
}
