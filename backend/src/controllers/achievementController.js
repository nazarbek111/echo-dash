import { z } from 'zod'
import { prisma } from '../utils/prisma.js'

export async function listAchievements(_req, res) {
  const list = await prisma.achievement.findMany({ orderBy: { key: 'asc' } })
  res.json({ achievements: list })
}

export async function myAchievements(req, res) {
  const userAch = await prisma.userAchievement.findMany({
    where: { userId: req.user.id },
    include: { achievement: true },
  })
  res.json({ achievements: userAch.map(u => ({ ...u.achievement, unlockedAt: u.unlockedAt, progress: u.progress })) })
}

export async function unlockAchievement(req, res) {
  const schema = z.object({ key: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const ach = await prisma.achievement.findUnique({ where: { key: parsed.data.key } })
  if (!ach) return res.status(404).json({ error: 'Not found' })
  await prisma.userAchievement.upsert({
    where: { userId_achievementId: { userId: req.user.id, achievementId: ach.id } },
    update: {}, create: { userId: req.user.id, achievementId: ach.id },
  })
  res.json({ ok: true, achievement: ach })
}
