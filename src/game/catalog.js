// Catalog used in guest mode and as fallback when backend is offline.
// Mirrors backend seed.

export const SKIN_CATALOG = [
  { key: 'cyan',            name: 'Cyan Core',       rarity: 'common',    primaryColor:'#22e3ff', glowColor:'#22e3ff', unlockCondition: 'Default skin.' },
  { key: 'purple',          name: 'Purple Pulse',    rarity: 'common',    primaryColor:'#b46bff', glowColor:'#d28bff', unlockCondition: 'Reach 30% in any level.' },
  { key: 'red',             name: 'Red Glitch',      rarity: 'rare',      primaryColor:'#ff4d6d', glowColor:'#ff8aa1', unlockCondition: 'Reach 60% in any level.' },
  { key: 'gold',            name: 'Gold Runner',     rarity: 'rare',      primaryColor:'#ffd166', glowColor:'#ffe9a8', unlockCondition: 'Complete the Demo Run.' },
  { key: 'ghost_echo',      name: 'Ghost Echo',      rarity: 'rare',      primaryColor:'#a8efff', glowColor:'#bff7ff', unlockCondition: 'Create your first ghost replay.' },
  { key: 'white_finale',    name: 'White Finale',    rarity: 'epic',      primaryColor:'#ffffff', glowColor:'#9af8ff', unlockCondition: 'Reach 90% in any level.' },
  { key: 'void_runner',     name: 'Void Runner',     rarity: 'epic',      primaryColor:'#7a3bff', glowColor:'#ff4dd2', unlockCondition: 'Complete the Full Run.' },
  { key: 'champion_cube',   name: 'Champion Cube',   rarity: 'legendary', primaryColor:'#ffe066', glowColor:'#ffc043', unlockCondition: 'Enter any top 10 leaderboard.' },
  { key: 'kz_neon',         name: 'Kazakhstan Neon', rarity: 'epic',      primaryColor:'#00afca', glowColor:'#7ff0ff', unlockCondition: 'Enter Kazakhstan top 50.' },
  { key: 'almaty_pulse',    name: 'Almaty Pulse',    rarity: 'epic',      primaryColor:'#ff8a3c', glowColor:'#ffb27a', unlockCondition: 'Enter regional top 25.' },
  { key: 'world_spark',     name: 'World Spark',     rarity: 'legendary', primaryColor:'#ffffff', glowColor:'#b46bff', unlockCondition: 'Enter global top 100.' },
  { key: 'echo_legend_sk',  name: 'Echo Legend',     rarity: 'legendary', primaryColor:'#fef08a', glowColor:'#ffffff', unlockCondition: 'Complete a level with ghost enabled.' },
]

export const ACHIEVEMENT_CATALOG = [
  { key:'first_crash',     name:'First Crash',       description:'Die for the first time.',                rarity:'common',    icon:'💥' },
  { key:'echo_created',    name:'Echo Created',      description:'Save your first ghost replay.',          rarity:'common',    icon:'👻' },
  { key:'halfway',         name:'Halfway There',     description:'Reach 50% in any level.',                rarity:'common',    icon:'🎯' },
  { key:'glitch_survivor', name:'Glitch Survivor',   description:'Reach 60% in any level.',                rarity:'rare',      icon:'🌀' },
  { key:'danger_runner',   name:'Danger Runner',     description:'Reach 85% in any level.',                rarity:'rare',      icon:'🔥' },
  { key:'final_echo',      name:'Final Echo',        description:'Complete any level.',                    rarity:'epic',      icon:'🏁' },
  { key:'demo_master',     name:'Demo Master',       description:'Complete the Demo Run.',                 rarity:'rare',      icon:'⚡' },
  { key:'full_runner',     name:'Full Runner',       description:'Reach 50% in the Full Run.',             rarity:'rare',      icon:'🏃' },
  { key:'full_master',     name:'Full Master',       description:'Complete the Full Run.',                 rarity:'legendary', icon:'👑' },
  { key:'speed_demon',     name:'Speed Demon',       description:'Pass 3 speed portals in one run.',       rarity:'rare',      icon:'💨' },
  { key:'persistent',      name:'Persistent Runner', description:'Play 10 attempts.',                      rarity:'common',    icon:'🔁' },
  { key:'no_panic',        name:'No Panic',          description:'Reach 30% without dying this session.',  rarity:'common',    icon:'🧘' },
  { key:'ghost_chaser',    name:'Ghost Chaser',      description:'Play a run with ghost replay enabled.',  rarity:'common',    icon:'👀' },
  { key:'beat_rider',      name:'Beat Rider',        description:'Survive 60 seconds in one run.',         rarity:'rare',      icon:'🎵' },
  { key:'golden_focus',    name:'Golden Focus',      description:'Reach 90% in any level.',                rarity:'epic',      icon:'✨' },
  { key:'local_hero',      name:'Local Hero',        description:'Enter regional top 10.',                 rarity:'epic',      icon:'🏘️' },
  { key:'national_runner', name:'National Runner',   description:'Enter country top 10.',                  rarity:'epic',      icon:'🇰🇿' },
  { key:'world_challenger',name:'World Challenger',  description:'Enter global top 100.',                  rarity:'legendary', icon:'🌍' },
  { key:'skin_collector',  name:'Skin Collector',    description:'Unlock 5 skins.',                        rarity:'rare',      icon:'🎨' },
  { key:'echo_legend',     name:'Echo Legend',       description:'Complete a level while racing a ghost.', rarity:'legendary', icon:'⭐' },
]

export const LEVEL_CATALOG = [
  { key:'demo',            name:'Demo Run',         difficulty:'Normal',  mode:'demo', description:'Compact ~70s run through all 4 mood zones.',  estimatedDurationSec:70 },
  { key:'full',            name:'Full Run',         difficulty:'Hard',    mode:'full', description:'The full ~3-minute neon cyber-glitch gauntlet.', estimatedDurationSec:180 },
  { key:'blue_initiation', name:'Blue Initiation',  difficulty:'Easy',    mode:'demo', description:'Training level — gentle spikes and your first jumps.', estimatedDurationSec:55 },
  { key:'glitch_corridor', name:'Glitch Corridor',  difficulty:'Medium',  mode:'demo', description:'Glitch zones and platform corridors.', estimatedDurationSec:75 },
  { key:'redline_sprint',  name:'Redline Sprint',   difficulty:'Hard',    mode:'demo', description:'Speed portals and dense rhythm patterns.', estimatedDurationSec:70 },
  { key:'white_finale',    name:'White Finale',     difficulty:'Extreme', mode:'demo', description:'High-intensity finale — the ultimate test.', estimatedDurationSec:80 },
]

export const RARITY_COLORS = {
  common:    '#9af8ff',
  rare:      '#b46bff',
  epic:      '#ff5a6a',
  legendary: '#ffd166',
}
