import { z } from 'zod'
import { prisma } from '../utils/prisma.js'

// Compose a full cloud save snapshot
export async function getSave(req, res) {
  const u = req.user
  const [settings, stats, achievements, skins] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: u.id } }),
    prisma.userStats.findUnique({ where: { userId: u.id } }),
    prisma.userAchievement.findMany({ where: { userId: u.id }, include: { achievement: true } }),
    prisma.userSkin.findMany({ where: { userId: u.id }, include: { skin: true } }),
  ])
  res.json({
    settings: settings || {},
    stats: stats || {},
    achievements: achievements.map(a => a.achievement.key),
    unlockedSkins: skins.map(s => s.skin.key),
    selectedSkin: u.selectedSkinId,
  })
}

const saveSchema = z.object({
  settings: z.object({
    sound: z.boolean().optional(),
    showGhost: z.boolean().optional(),
    particles: z.boolean().optional(),
    screenShake: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
  }).optional(),
  selectedSkin: z.string().optional(),
})

export async function putSave(req, res) {
  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const { settings, selectedSkin } = parsed.data
  if (settings) {
    await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: settings,
      create: { userId: req.user.id, ...settings },
    })
  }
  if (selectedSkin) {
    await prisma.user.update({ where: { id: req.user.id }, data: { selectedSkinId: selectedSkin } })
  }
  res.json({ ok: true })
}

// Merge local guest progress into cloud (best wins)
const mergeSchema = z.object({
  bestDemoProgress: z.number().optional(),
  bestFullProgress: z.number().optional(),
  unlockedSkins: z.array(z.string()).optional(),
  unlockedAchievements: z.array(z.string()).optional(),
  totalAttempts: z.number().optional(),
  totalJumps: z.number().optional(),
  totalDeaths: z.number().optional(),
})

export async function syncLocal(req, res) {
  const parsed = mergeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const d = parsed.data
  const cur = await prisma.userStats.findUnique({ where: { userId: req.user.id } })

  const merged = {
    bestDemoProgress: Math.max(cur?.bestDemoProgress || 0, d.bestDemoProgress || 0),
    bestFullProgress: Math.max(cur?.bestFullProgress || 0, d.bestFullProgress || 0),
    totalAttempts: Math.max(cur?.totalAttempts || 0, d.totalAttempts || 0),
    totalJumps: Math.max(cur?.totalJumps || 0, d.totalJumps || 0),
    totalDeaths: Math.max(cur?.totalDeaths || 0, d.totalDeaths || 0),
  }
  await prisma.userStats.upsert({
    where: { userId: req.user.id },
    update: merged,
    create: { userId: req.user.id, ...merged },
  })

  if (d.unlockedSkins?.length) {
    const skins = await prisma.skin.findMany({ where: { key: { in: d.unlockedSkins } } })
    for (const s of skins) {
      await prisma.userSkin.upsert({
        where: { userId_skinId: { userId: req.user.id, skinId: s.id } },
        update: {}, create: { userId: req.user.id, skinId: s.id },
      }).catch(() => {})
    }
  }
  if (d.unlockedAchievements?.length) {
    const ach = await prisma.achievement.findMany({ where: { key: { in: d.unlockedAchievements } } })
    for (const a of ach) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: req.user.id, achievementId: a.id } },
        update: {}, create: { userId: req.user.id, achievementId: a.id },
      }).catch(() => {})
    }
  }
  res.json({ ok: true, merged })
}
