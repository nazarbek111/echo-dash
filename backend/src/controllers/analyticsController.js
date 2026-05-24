import { prisma } from '../utils/prisma.js'

export async function myAnalytics(req, res) {
  const userId = req.user.id
  const [stats, runs] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.run.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ])

  const deathCauseCounts = {}
  const skinUseCounts = {}
  let totalSpeedPortals = 0
  let mostCommonZone = null
  for (const r of runs) {
    if (r.deathCause) deathCauseCounts[r.deathCause] = (deathCauseCounts[r.deathCause] || 0) + 1
    skinUseCounts[r.skinId] = (skinUseCounts[r.skinId] || 0) + 1
    totalSpeedPortals += r.speedPortalsPassed || 0
  }
  const mostCommonDeathCause = Object.entries(deathCauseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  const mostUsedSkin = Object.entries(skinUseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || stats?.favoriteSkinId || 'cyan'

  const deathsByZone = JSON.parse(stats?.deathsByZone || '{}')
  const attemptsByLevel = JSON.parse(stats?.attemptsByLevel || '{}')
  mostCommonZone = Object.entries(deathsByZone).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const timeline = runs.slice().reverse().map(r => ({
    t: r.createdAt, percent: r.percent, mode: r.mode, completed: r.completed,
  }))

  res.json({
    stats: stats || {},
    mostCommonDeathCause,
    mostCommonDeathZone: mostCommonZone,
    mostUsedSkin,
    totalSpeedPortals,
    deathsByZone,
    attemptsByLevel,
    timeline,
    recentRuns: runs.slice(0, 15),
  })
}
