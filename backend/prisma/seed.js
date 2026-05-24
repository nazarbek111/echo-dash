import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const ACHIEVEMENTS = [
  ['first_crash',      'First Crash',       'Die for the first time.',                 'common',    '💥'],
  ['echo_created',     'Echo Created',      'Save your first ghost replay.',           'common',    '👻'],
  ['halfway',          'Halfway There',     'Reach 50% in any level.',                 'common',    '🎯'],
  ['glitch_survivor',  'Glitch Survivor',   'Reach 60% in any level.',                 'rare',      '🌀'],
  ['danger_runner',    'Danger Runner',     'Reach 85% in any level.',                 'rare',      '🔥'],
  ['final_echo',       'Final Echo',        'Complete any level.',                     'epic',      '🏁'],
  ['demo_master',      'Demo Master',       'Complete the Demo Run.',                  'rare',      '⚡'],
  ['full_runner',      'Full Runner',       'Reach 50% in the Full Run.',              'rare',      '🏃'],
  ['full_master',      'Full Master',       'Complete the Full Run.',                  'legendary', '👑'],
  ['speed_demon',      'Speed Demon',       'Pass 3 speed portals in one run.',        'rare',      '💨'],
  ['persistent',       'Persistent Runner', 'Play 10 attempts.',                       'common',    '🔁'],
  ['no_panic',         'No Panic',          'Reach 30% without dying this session.',   'common',    '🧘'],
  ['ghost_chaser',     'Ghost Chaser',      'Play a run with ghost replay enabled.',   'common',    '👀'],
  ['beat_rider',       'Beat Rider',        'Survive 60 seconds in one run.',          'rare',      '🎵'],
  ['golden_focus',     'Golden Focus',      'Reach 90% in any level.',                 'epic',      '✨'],
  ['local_hero',       'Local Hero',        'Enter regional top 10.',                  'epic',      '🏘️'],
  ['national_runner',  'National Runner',   'Enter country top 10.',                   'epic',      '🇰🇿'],
  ['world_challenger', 'World Challenger',  'Enter global top 100.',                   'legendary', '🌍'],
  ['skin_collector',   'Skin Collector',    'Unlock 5 skins.',                         'rare',      '🎨'],
  ['echo_legend',      'Echo Legend',       'Complete a level while racing a ghost.',  'legendary', '⭐'],
]

const SKINS = [
  ['cyan',            'Cyan Core',       'common',    '#22e3ff','#9af8ff','#22e3ff', 'Default skin.'],
  ['purple',          'Purple Pulse',    'common',    '#b46bff','#ffb8ff','#d28bff', 'Reach 30% in any level.'],
  ['red',             'Red Glitch',      'rare',      '#ff4d6d','#ffd1d8','#ff8aa1', 'Reach 60% in any level.'],
  ['gold',            'Gold Runner',     'rare',      '#ffd166','#fff5d6','#ffe9a8', 'Complete the Demo Run.'],
  ['ghost_echo',      'Ghost Echo',      'rare',      '#a8efff','#ffffff','#bff7ff', 'Create your first ghost replay.'],
  ['white_finale',    'White Finale',    'epic',      '#ffffff','#9af8ff','#ffffff', 'Reach 90% in any level.'],
  ['void_runner',     'Void Runner',     'epic',      '#1f1147','#ff4dd2','#7a3bff', 'Complete the Full Run.'],
  ['champion_cube',   'Champion Cube',   'legendary', '#ffe066','#ffffff','#ffc043', 'Enter any top 10 leaderboard.'],
  ['kz_neon',         'Kazakhstan Neon', 'epic',      '#00afca','#ffd54a','#7ff0ff', 'Enter Kazakhstan top 50.'],
  ['almaty_pulse',    'Almaty Pulse',    'epic',      '#ff8a3c','#7ff0ff','#ffb27a', 'Enter regional top 25.'],
  ['world_spark',     'World Spark',     'legendary', '#ffffff','#22e3ff','#b46bff', 'Enter global top 100.'],
  ['echo_legend_sk',  'Echo Legend',     'legendary', '#fef08a','#ff4dd2','#ffffff', 'Complete a level with ghost enabled.'],
]

const LEVELS = [
  ['demo',             'Demo Run',         'Normal',  'demo', 'Compact ~70s run through all 4 mood zones.',          70],
  ['full',             'Full Run',         'Hard',    'full', 'The full ~3-minute neon cyber-glitch gauntlet.',     180],
  ['blue_initiation',  'Blue Initiation',  'Easy',    'demo', 'Training level — gentle spikes and your first jumps.', 55],
  ['glitch_corridor',  'Glitch Corridor',  'Medium',  'demo', 'Glitch zones and platform corridors.',                75],
  ['redline_sprint',   'Redline Sprint',   'Hard',    'demo', 'Speed portals and dense rhythm patterns.',            70],
  ['white_finale',     'White Finale',     'Extreme', 'demo', 'High-intensity finale — the ultimate test.',          80],
]

async function main() {
  console.log('Seeding achievements...')
  for (const [key, name, description, rarity, icon] of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key }, update: { name, description, rarity, icon },
      create: { key, name, description, rarity, icon },
    })
  }
  console.log('Seeding skins...')
  for (const [key, name, rarity, primaryColor, secondaryColor, glowColor, unlockCondition] of SKINS) {
    await prisma.skin.upsert({
      where: { key }, update: { name, rarity, primaryColor, secondaryColor, glowColor, unlockCondition },
      create: { key, name, rarity, primaryColor, secondaryColor, glowColor, unlockCondition },
    })
  }
  console.log('Seeding levels...')
  for (const [key, name, difficulty, mode, description, estimatedDurationSec] of LEVELS) {
    await prisma.level.upsert({
      where: { key }, update: { name, difficulty, mode, description, estimatedDurationSec },
      create: { key, name, difficulty, mode, description, estimatedDurationSec },
    })
  }
  console.log('Seed complete.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
