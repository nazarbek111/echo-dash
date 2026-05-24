import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'echo-dash-dev-secret-change-me'
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES })
}
export function verifyToken(token) {
  try { return jwt.verify(token, SECRET) } catch { return null }
}
