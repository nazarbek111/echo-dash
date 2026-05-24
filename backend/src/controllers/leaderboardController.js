import { prisma } from '../utils/prisma.js'
import { evaluateSkinUnlocks, persistSkinUnlocks, persistAchievementUnlocks } from '../services/progression.js'

export async function leaderboard(req, res) {
  const mode = (req.query.mode || 'demo').toString()
  const scope = (req.query.scope || 'global').toString()
  const sort = (req.query.sort || 'progress').toString()
  const country = req.query.country?.toString()
  const region = req.query.region?.toString()
  const limit = Math.min(parseInt(req.query.limit) || 100, 200)
  const levelId = req.query.levelId?.toString()

  const where = { mode }
  if (levelId) where.levelId = levelId
  if (scope === 'country' && country) where.country = country
  if (scope === 'region' && country && region) { where.country = country; where.region = region }

  // Get each user's best run for the scope.
  // SQLite-friendly approach: fetch top N candidates ordered by sort key, then dedupe per user.
  let orderBy
  if (sort === 'time') orderBy = [{ completed: 'desc' }, { completionTimeMs: 'asc' }]
  else if (sort === 'attempts') orderBy = [{ percent: 'desc' }, { attemptsAtRun: 'asc' }]
  else orderBy = [{ percent: 'desc' }, { completionTimeMs: 'asc' }]

  const candidates = await prisma.run.findMany({
    where, orderBy, take: limit * 4,
    include: { user: { select: { username: true, country: true, region: true, selectedSkinId: true } } },
  })

  const seen = new Set()
  const rows = []
  for (const r of candidates) {
    if (seen.has(r.userId)) continue
    seen.add(r.userId)
    rows.push({
      runId: r.id, userId: r.userId,
      username: r.user.username, country: r.user.country, region: r.user.region,
      skinId: r.skinId || r.user.selectedSkinId,
      percent: r.percent, completed: r.completed,
      completionTimeMs: r.completionTimeMs, attemptsAtRun: r.attemptsAtRun,
      deaths: r.deaths, replayId: r.replayId,
      createdAt: r.createdAt,
    })
    if (rows.length >= limit) break
  }
  rows.forEach((r, i) => { r.rank = i + 1 })

  let myRank = null
  if (req.user) {
    const idx = rows.findIndex(r => r.userId === req.user.id)
    if (idx >= 0) myRank = rows[idx]
    // Evaluate leaderboard-tier skin / achievement unlocks for current user
    await evaluateLeaderboardUnlocks(req.user, rows)
  }

  res.json({ rows, myRank, scope, mode, sort, country, region })
}

async function evaluateLeaderboardUnlocks(user, rows) {
  const idx = rows.findIndex(r => r.userId === user.id) // 0-based
  if (idx < 0) return
  const rank = idx + 1
  const skinKeysToAdd = new Set()
  const achKeysToAdd = new Set()
  if (rank <= 10) { skinKeysToAdd.add('champion_cube'); achKeysToAdd.add('local_hero') }
  if (rank <= 10) achKeysToAdd.add('national_runner')
  if (rank <= 100) achKeysToAdd.add('world_challenger')
  if (user.country === 'Kazakhstan' && rank <= 50) skinKeysToAdd.add('kz_neon')
  if (rank <= 25) skinKeysToAdd.add('almaty_pulse')
  if (rank <= 100) skinKeysToAdd.add('world_spark')
  await persistSkinUnlocks(user.id, skinKeysToAdd)
  await persistAchievementUnlocks(user.id, achKeysToAdd)
}
