// Server-side progression rules. These mirror the frontend evaluator so cloud and
// guest mode produce the same unlocks.
import { prisma } from '../utils/prisma.js'

// Returns set of skin keys a user qualifies for given their stats + run history.
export async function evaluateSkinUnlocks(userId) {
  const stats = await prisma.userStats.findUnique({ where: { userId } })
  const runs = await prisma.run.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 200 })

  const keys = new Set(['cyan'])
  const best = Math.max(stats?.bestDemoProgress || 0, stats?.bestFullProgress || 0, stats?.bestDailyProgress || 0)
  if (best >= 0.30) keys.add('purple')
  if (best >= 0.60) keys.add('red')
  if (best >= 0.90) keys.add('white_finale')
  if ((stats?.bestDemoProgress || 0) >= 1.0) keys.add('gold')
  if ((stats?.bestFullProgress || 0) >= 1.0) keys.add('void_runner')
  if (runs.some(r => r.replayId)) keys.add('ghost_echo')
  // Leaderboard-based unlocks are added inside leaderboard controller after rank computed.
  return keys
}

export async function persistSkinUnlocks(userId, keys) {
  const skins = await prisma.skin.findMany({ where: { key: { in: [...keys] } } })
  for (const s of skins) {
    await prisma.userSkin.upsert({
      where: { userId_skinId: { userId, skinId: s.id } },
      update: {}, create: { userId, skinId: s.id },
    }).catch(() => {})
  }
}

// Evaluate achievement keys from stats + latest run context
export async function evaluateAchievementKeys(userId, runCtx = {}) {
  const stats = await prisma.userStats.findUnique({ where: { userId } })
  const runs = await prisma.run.findMany({ where: { userId } })
  const skins = await prisma.userSkin.findMany({ where: { userId } })
  const keys = new Set()

  if ((stats?.totalDeaths || 0) >= 1) keys.add('first_crash')
  if (runs.some(r => r.replayId)) keys.add('echo_created')
  const best = Math.max(stats?.bestDemoProgress || 0, stats?.bestFullProgress || 0)
  if (best >= 0.50) keys.add('halfway')
  if (best >= 0.60) keys.add('glitch_survivor')
  if (best >= 0.85) keys.add('danger_runner')
  if (runs.some(r => r.completed)) keys.add('final_echo')
  if ((stats?.bestDemoProgress || 0) >= 1.0) keys.add('demo_master')
  if ((stats?.bestFullProgress || 0) >= 0.50) keys.add('full_runner')
  if ((stats?.bestFullProgress || 0) >= 1.0) keys.add('full_master')
  if (runs.some(r => (r.speedPortalsPassed || 0) >= 3)) keys.add('speed_demon')
  if ((stats?.totalAttempts || 0) >= 10) keys.add('persistent')
  if (runCtx.ghostEnabled) keys.add('ghost_chaser')
  if (runs.some(r => (r.survivedTimeMs || 0) >= 60000)) keys.add('beat_rider')
  if (best >= 0.90) keys.add('golden_focus')
  if (skins.length >= 5) keys.add('skin_collector')
  if (runCtx.ghostEnabled && runCtx.completed) keys.add('echo_legend')
  if (runCtx.noPanic30) keys.add('no_panic')
  // local_hero / national_runner / world_challenger evaluated in leaderboard endpoint
  return keys
}

export async function persistAchievementUnlocks(userId, keys) {
  if (!keys || keys.size === 0) return []
  const achievements = await prisma.achievement.findMany({ where: { key: { in: [...keys] } } })
  const newlyUnlocked = []
  for (const a of achievements) {
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: a.id } }
    }).catch(() => null)
    if (!existing) {
      await prisma.userAchievement.create({ data: { userId, achievementId: a.id } }).catch(() => {})
      newlyUnlocked.push(a.key)
    }
  }
  return newlyUnlocked
}
