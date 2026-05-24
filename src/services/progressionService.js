// Local progression — mirrors backend so guest mode produces same unlocks.
// Keys stay identical between local and cloud.

const LS = {
  achievements: 'echodash_local_achievements_v1',
  skins:        'echodash_local_skins_v1',
  stats:        'echodash_local_stats_v1',
}

export function loadLocalAchievements() {
  try { return new Set(JSON.parse(localStorage.getItem(LS.achievements) || '[]')) } catch { return new Set() }
}
export function saveLocalAchievements(set) {
  try { localStorage.setItem(LS.achievements, JSON.stringify([...set])) } catch {}
}
export function loadLocalSkins() {
  try { return new Set(JSON.parse(localStorage.getItem(LS.skins) || '["cyan"]')) } catch { return new Set(['cyan']) }
}
export function saveLocalSkins(set) {
  try { localStorage.setItem(LS.skins, JSON.stringify([...set])) } catch {}
}
export function loadLocalStats() {
  try { return JSON.parse(localStorage.getItem(LS.stats) || '{}') } catch { return {} }
}
export function saveLocalStats(stats) {
  try { localStorage.setItem(LS.stats, JSON.stringify(stats)) } catch {}
}

// Update stats from a run summary. Returns { newSkins[], newAchievements[] } for toasts.
export function applyRunLocally(run) {
  const stats = loadLocalStats()
  stats.totalAttempts = (stats.totalAttempts || 0) + 1
  stats.totalDeaths   = (stats.totalDeaths   || 0) + (run.completed ? 0 : 1)
  stats.totalJumps    = (stats.totalJumps    || 0) + (run.jumps || 0)
  stats.totalPlayTimeMs = (stats.totalPlayTimeMs || 0) + (run.survivedTimeMs || 0)
  stats.deathsByZone = stats.deathsByZone || {}
  if (run.deathZone) stats.deathsByZone[run.deathZone] = (stats.deathsByZone[run.deathZone] || 0) + 1
  stats.attemptsByLevel = stats.attemptsByLevel || {}
  stats.attemptsByLevel[run.levelId] = (stats.attemptsByLevel[run.levelId] || 0) + 1

  const m = run.mode
  if (m === 'demo'  && run.percent > (stats.bestDemoProgress  || 0)) stats.bestDemoProgress  = run.percent
  if (m === 'full'  && run.percent > (stats.bestFullProgress  || 0)) stats.bestFullProgress  = run.percent
  if (m === 'daily' && run.percent > (stats.bestDailyProgress || 0)) stats.bestDailyProgress = run.percent
  if (run.completed) {
    stats.completedRuns = (stats.completedRuns || 0) + 1
    if (m === 'demo' && (!stats.bestDemoTimeMs || run.completionTimeMs < stats.bestDemoTimeMs)) stats.bestDemoTimeMs = run.completionTimeMs
    if (m === 'full' && (!stats.bestFullTimeMs || run.completionTimeMs < stats.bestFullTimeMs)) stats.bestFullTimeMs = run.completionTimeMs
  }
  const totalPct = (stats.averageProgress || 0) * ((stats.totalAttempts || 1) - 1) + run.percent
  stats.averageProgress = totalPct / stats.totalAttempts
  saveLocalStats(stats)

  // Evaluate unlocks
  const before = loadLocalAchievements()
  const beforeSkins = loadLocalSkins()
  const ach = new Set(before)
  const skins = new Set(beforeSkins)
  const best = Math.max(stats.bestDemoProgress || 0, stats.bestFullProgress || 0, stats.bestDailyProgress || 0)

  // achievements
  if ((stats.totalDeaths || 0) >= 1) ach.add('first_crash')
  if (run.hasReplay) ach.add('echo_created')
  if (best >= 0.50) ach.add('halfway')
  if (best >= 0.60) ach.add('glitch_survivor')
  if (best >= 0.85) ach.add('danger_runner')
  if (run.completed) ach.add('final_echo')
  if ((stats.bestDemoProgress || 0) >= 1) ach.add('demo_master')
  if ((stats.bestFullProgress || 0) >= 0.5) ach.add('full_runner')
  if ((stats.bestFullProgress || 0) >= 1) ach.add('full_master')
  if ((run.speedPortalsPassed || 0) >= 3) ach.add('speed_demon')
  if ((stats.totalAttempts || 0) >= 10) ach.add('persistent')
  if (run.noPanic30) ach.add('no_panic')
  if (run.ghostEnabled) ach.add('ghost_chaser')
  if ((run.survivedTimeMs || 0) >= 60000) ach.add('beat_rider')
  if (best >= 0.9) ach.add('golden_focus')
  if (run.ghostEnabled && run.completed) ach.add('echo_legend')

  // skins
  if (best >= 0.30) skins.add('purple')
  if (best >= 0.60) skins.add('red')
  if (best >= 0.90) skins.add('white_finale')
  if ((stats.bestDemoProgress || 0) >= 1) skins.add('gold')
  if ((stats.bestFullProgress || 0) >= 1) skins.add('void_runner')
  if (run.hasReplay) skins.add('ghost_echo')

  if (skins.size >= 5) ach.add('skin_collector')

  saveLocalAchievements(ach)
  saveLocalSkins(skins)
  const newAch = [...ach].filter(k => !before.has(k))
  const newSkins = [...skins].filter(k => !beforeSkins.has(k))
  return { newAchievements: newAch, newSkins, stats }
}

export function getLocalSelectedSkin() {
  try { return JSON.parse(localStorage.getItem('echodash_skin_v1') || '"cyan"') } catch { return 'cyan' }
}
export function setLocalSelectedSkin(key) {
  try { localStorage.setItem('echodash_skin_v1', JSON.stringify(key)) } catch {}
}
