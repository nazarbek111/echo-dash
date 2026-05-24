import { z } from 'zod'
import { prisma } from '../utils/prisma.js'

export async function listSkins(_req, res) {
  const skins = await prisma.skin.findMany({ orderBy: { key: 'asc' } })
  res.json({ skins })
}

export async function mySkins(req, res) {
  const userSkins = await prisma.userSkin.findMany({
    where: { userId: req.user.id },
    include: { skin: true },
  })
  res.json({ skins: userSkins.map(us => ({ ...us.skin, unlockedAt: us.unlockedAt })) })
}

export async function unlockSkin(req, res) {
  const schema = z.object({ key: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const skin = await prisma.skin.findUnique({ where: { key: parsed.data.key } })
  if (!skin) return res.status(404).json({ error: 'Skin not found' })
  await prisma.userSkin.upsert({
    where: { userId_skinId: { userId: req.user.id, skinId: skin.id } },
    update: {}, create: { userId: req.user.id, skinId: skin.id },
  })
  res.json({ ok: true, skin })
}

export async function selectSkin(req, res) {
  const schema = z.object({ key: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  await prisma.user.update({ where: { id: req.user.id }, data: { selectedSkinId: parsed.data.key } })
  res.json({ ok: true, selectedSkinId: parsed.data.key })
}
