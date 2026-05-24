import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { signToken } from '../utils/jwt.js'

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only'),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  country: z.string().min(2).max(40),
  region: z.string().min(2).max(40),
})

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
})

function userPublic(u) {
  return {
    id: u.id, username: u.username, email: u.email,
    country: u.country, region: u.region,
    avatarSkinId: u.avatarSkinId, selectedSkinId: u.selectedSkinId,
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
  }
}

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  const { username, email, password, country, region } = parsed.data

  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: email.toLowerCase() }] }
  })
  if (exists) return res.status(409).json({ error: 'Username or email already in use' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username, email: email.toLowerCase(), passwordHash, country, region,
      settings: { create: {} },
      stats:    { create: {} },
    },
  })
  // Unlock default skin
  const defaultSkin = await prisma.skin.findUnique({ where: { key: 'cyan' } })
  if (defaultSkin) {
    await prisma.userSkin.create({ data: { userId: user.id, skinId: defaultSkin.id } }).catch(() => {})
  }
  const token = signToken({ userId: user.id })
  res.status(201).json({ token, user: userPublic(user) })
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const { emailOrUsername, password } = parsed.data

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: emailOrUsername }, { email: emailOrUsername.toLowerCase() }] }
  })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  const token = signToken({ userId: user.id })
  res.json({ token, user: userPublic(user) })
}

export async function me(req, res) {
  res.json({ user: req.user })
}

export async function logout(_req, res) {
  // JWT is stateless; client just discards the token.
  res.json({ ok: true })
}

export async function updateMe(req, res) {
  const schema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
    country: z.string().min(2).max(40).optional(),
    region: z.string().min(2).max(40).optional(),
    avatarSkinId: z.string().min(1).max(40).optional(),
    selectedSkinId: z.string().min(1).max(40).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  if (parsed.data.username) {
    const exists = await prisma.user.findFirst({
      where: { username: parsed.data.username, NOT: { id: req.user.id } }
    })
    if (exists) return res.status(409).json({ error: 'Username already taken' })
  }
  const updated = await prisma.user.update({
    where: { id: req.user.id }, data: parsed.data,
  })
  res.json({ user: userPublic(updated) })
}
