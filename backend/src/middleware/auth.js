import { verifyToken } from '../utils/jwt.js'
import { prisma } from '../utils/prisma.js'

// Attaches req.user if Authorization Bearer token is valid; otherwise leaves it undefined.
export async function attachUser(req, _res, next) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (!m) return next()
  const payload = verifyToken(m[1])
  if (!payload?.userId) return next()
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, country: true, region: true,
                avatarSkinId: true, selectedSkinId: true, createdAt: true, lastLoginAt: true }
    })
    if (user) req.user = user
  } catch {}
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })
  next()
}
