import { api } from './api.js'

export async function fetchMyBestReplay(levelId = 'demo') {
  return await api(`/api/replays/me/best?levelId=${encodeURIComponent(levelId)}`)
}
export async function fetchTopReplay({ levelId = 'demo', scope = 'global', country, region } = {}) {
  const p = new URLSearchParams({ levelId, scope })
  if (country) p.set('country', country)
  if (region) p.set('region', region)
  return await api(`/api/replays/top?${p.toString()}`)
}
export async function fetchReplayById(id) { return await api(`/api/replays/${id}`) }
