// Generic fetch wrapper with token + offline fallback signal.
const RAW = import.meta.env.VITE_API_URL || ''
export const API_URL = RAW.replace(/\/+$/, '')
const TOKEN_KEY = 'echodash_token_v1'

export const hasBackend = () => Boolean(API_URL)
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch {} }

let onlineStatus = true
const listeners = new Set()
export const subscribeOnline = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const isOnline = () => onlineStatus
function setOnline(v) {
  if (v === onlineStatus) return
  onlineStatus = v
  listeners.forEach(fn => { try { fn(v) } catch {} })
}

export class APIError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body }
}

export async function api(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  if (!API_URL) throw new APIError('No backend configured', 0, null)
  const h = { 'Content-Type': 'application/json', ...headers }
  if (auth) {
    const t = getToken()
    if (t) h.Authorization = `Bearer ${t}`
  }
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method, headers: h, body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    setOnline(false)
    throw new APIError('Network error', 0, null)
  }
  setOnline(true)
  let payload = null
  try { payload = await res.json() } catch {}
  if (!res.ok) throw new APIError(payload?.error || `HTTP ${res.status}`, res.status, payload)
  return payload
}

// Quick health check — used by AuthContext to decide initial online status
export async function ping() {
  if (!API_URL) return false
  try {
    const r = await fetch(`${API_URL}/health`)
    const ok = r.ok
    setOnline(ok)
    return ok
  } catch { setOnline(false); return false }
}
