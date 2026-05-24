import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { evaluateSkinUnlocks, persistSkinUnlocks, evaluateAchievementKeys, persistAchievementUnlocks } from '../services/progression.js'

const runSchema = z.object({
  mode: z.enum(['demo', 'full', 'daily']),
  levelId: z.string().min(1).max(40),
  percent: z.number().min(0).max(1),
  completed: z.boolean().default(false),
  completionTimeMs: z.number().int().min(0).max(60 * 60 * 1000),
  survivedTimeMs: z.number().int().min(0).max(60 * 60 * 1000),
  jumps: z.number().int().min(0).max(100000).default(0),
  deaths: z.number().int().min(0).max(100000).default(0),
  deathCause: z.string().max(40).optional().nullable(),
  deathZone: z.string().max(40).optional().nullable(),
  speedPortalsPassed: z.number().int().min(0).max(50).default(0),
  skinId: z.string().min(1).max(40).default('cyan'),
  replayData: z.array(z.array(z.number())).optional(), // compact [[d,y,r],...]
  ghostEnabled: z.boolean().optional().default(false),
  noPanic30: z.boolean().optional().default(false),
})

export async function submitRun(req, res) {
  const parsed = runSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid run', details: parsed.error.flatten() })
  const data = parsed.data
  const user = req.user

  // 1. Persist replay only if "good" (best so far OR completed)
  const userStats = await prisma.userStats.findUnique({ where: { userId: user.id } })
  let bestForMode = 0
  if (data.mode === 'demo')  bestForMode = userStats?.bestDemoProgress  || 0
  if (data.mode === 'full')  bestForMode = userStats?.bestFullProgress  || 0
  if (data.mode === 'daily') bestForMode = userStats?.bestDailyProgress || 0
  const isBest = data.percent > bestForMode
  let replayId = null
  if ((isBest || data.completed) && Array.isArray(data.replayData) && data.replayData.length > 1) {
    const replay = await prisma.replay.create({
      data: {
        userId: user.id, levelId: data.levelId, mode: data.mode,
        data: JSON.stringify(data.replayData),
        percent: data.percent, completed: data.completed,
        durationMs: data.survivedTimeMs,
      },
    })
    replayId = replay.id
  }

  // 2. Save Run row
  const run = await prisma.run.create({
    data: {
      userId: user.id, mode: data.mode, levelId: data.levelId,
      percent: data.percent, completed: data.completed,
      completionTimeMs: data.completionTimeMs, survivedTimeMs: data.survivedTimeMs,
      jumps: data.jumps, deaths: data.deaths,
      deathCause: data.deathCause, deathZone: data.deathZone,
      speedPortalsPassed: data.speedPortalsPassed,
      skinId: data.skinId, country: user.country, region: user.region,
      replayId,
      attemptsAtRun: (userStats?.totalAttempts || 0) + 1,
    },
  })

  // 3. Update UserStats
  const deathsByZone = JSON.parse(userStats?.deathsByZone || '{}')
  if (data.deathZone) deathsByZone[data.deathZone] = (deathsByZone[data.deathZone] || 0) + 1
  const attemptsByLevel = JSON.parse(userStats?.attemptsByLevel || '{}')
  attemptsByLevel[data.levelId] = (attemptsByLevel[data.levelId] || 0) + 1

  const newTotalAttempts = (userStats?.totalAttempts || 0) + 1
  const newAvgProgress = (((userStats?.averageProgress || 0) * (userStats?.totalAttempts || 0)) + data.percent) / newTotalAttempts

  const updates = {
    totalAttempts: newTotalAttempts,
    totalDeaths: (userStats?.totalDeaths || 0) + (data.completed ? 0 : 1),
    totalJumps: (userStats?.totalJumps || 0) + data.jumps,
    totalPlayTimeMs: (userStats?.totalPlayTimeMs || 0) + data.survivedTimeMs,
    averageProgress: newAvgProgress,
    deathsByZone: JSON.stringify(deathsByZone),
    attemptsByLevel: JSON.stringify(attemptsByLevel),
    favoriteSkinId: data.skinId,
  }
  if (data.completed) updates.completedRuns = (userStats?.completedRuns || 0) + 1
  if (data.mode === 'demo'  && data.percent > (userStats?.bestDemoProgress  || 0)) updates.bestDemoProgress  = data.percent
  if (data.mode === 'full'  && data.percent > (userStats?.bestFullProgress  || 0)) updates.bestFullProgress  = data.percent
  if (data.mode === 'daily' && data.percent > (userStats?.bestDailyProgress || 0)) updates.bestDailyProgress = data.percent
  if (data.mode === 'demo' && data.completed) {
    if (!userStats?.bestDemoTimeMs || data.completionTimeMs < userStats.bestDemoTimeMs) updates.bestDemoTimeMs = data.completionTimeMs
  }
  if (data.mode === 'full' && data.completed) {
    if (!userStats?.bestFullTimeMs || data.completionTimeMs < userStats.bestFullTimeMs) updates.bestFullTimeMs = data.completionTimeMs
  }
  await prisma.userStats.upsert({
    where: { userId: user.id },
    update: updates,
    create: { userId: user.id, ...updates },
  })

  // 4. Evaluate skins + achievements
  const skinKeys = await evaluateSkinUnlocks(user.id)
  await persistSkinUnlocks(user.id, skinKeys)
  const achKeys = await evaluateAchievementKeys(user.id, {
    ghostEnabled: data.ghostEnabled, completed: data.completed, noPanic30: data.noPanic30,
  })
  const newlyAch = await persistAchievementUnlocks(user.id, achKeys)

  res.json({ run, newlyUnlockedAchievements: newlyAch, isBest, replayId })
}

export async function myRuns(req, res) {
  const runs = await prisma.run.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({ runs })
}
