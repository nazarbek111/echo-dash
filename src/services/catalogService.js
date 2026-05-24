import { api } from './api.js'

export async function fetchAllSkins()        { return await api('/api/skins',        { auth: false }) }
export async function fetchAllAchievements() { return await api('/api/achievements', { auth: false }) }
export async function fetchMySkins()         { return await api('/api/users/me/skins') }
export async function fetchMyAchievements()  { return await api('/api/users/me/achievements') }
export async function selectSkin(key)        { return await api('/api/users/me/selected-skin', { method: 'PATCH', body: { key } }) }
export async function unlockSkin(key)        { return await api('/api/users/me/skins/unlock',  { method: 'POST',  body: { key } }) }
