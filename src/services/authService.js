import { api, setToken } from './api.js'

export async function register({ username, email, password, country, region }) {
  const r = await api('/api/auth/register', { method: 'POST', auth: false,
    body: { username, email, password, country, region } })
  setToken(r.token)
  return r.user
}
export async function login({ emailOrUsername, password }) {
  const r = await api('/api/auth/login', { method: 'POST', auth: false,
    body: { emailOrUsername, password } })
  setToken(r.token)
  return r.user
}
export async function logout() { setToken(null) }
export async function fetchMe() { const r = await api('/api/auth/me'); return r.user }
export async function updateMe(patch) {
  const r = await api('/api/users/me', { method: 'PATCH', body: patch })
  return r.user
}
