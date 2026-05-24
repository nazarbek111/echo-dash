import { z } from 'zod'
import { prisma } from '../utils/prisma.js'

function todayDateStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}
function timeToResetMs() {
  const d = new Date()
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
  return next.getTime() - Date.now()
}

// Deterministic hash from date string -> integer seed
function hashSeed(s) {
  let h = 0x9e3779b9
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x85ebca6b)
  return h >>> 0
}

const DAILY_NAMES = ['Neon Tide','Glitch Sprint','Cyber Drift','Static Bloom','Pulse Echo','Ghost Frequency','Chrome Cascade']
const DIFFICULTIES = ['Normal','Hard','Hard','Medium','Extreme']

export async function todaysDaily(_req, res) {
  const date = todayDateStr()
  let daily = await prisma.dailyChallenge.findUnique({ where: { date } })
  if (!daily) {
    const seed = hashSeed(date).toString()
    const name = DAILY_NAMES[hashSeed(date + 'name') % DAILY_NAMES.length]
    const difficulty = DIFFICULTIES[hashSeed(date + 'diff') % DIFFICULTIES.length]
    daily = await prisma.dailyChallenge.create({
      data: { date, seed, name, difficulty, levelData: JSON.stringify({ seed, generated: true }) },
    })
  }
  res.json({ daily: { ...daily, timeToResetMs: timeToResetMs() } })
}

export async function submitDailyRun(req, res) {
  const schema = z.object({
    percent: z.number().min(0).max(1),
    completionTimeMs: z.number().int().min(0),
    attemptsAtRun: z.number().int().min(1).default(1),
    skinId: z.string().default('cyan'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const date = todayDateStr()
  const daily = await prisma.dailyChallenge.findUnique({ where: { date } })
  if (!daily) return res.status(404).json({ error: 'No daily challenge for today' })

  // upsert best run per user per date
  const existing = await prisma.dailyRun.findFirst({ where: { userId: req.user.id, date } })
  const newRow = {
    userId: req.user.id, dailyId: daily.id, date,
    percent: parsed.data.percent, completionTimeMs: parsed.data.completionTimeMs,
    attemptsAtRun: parsed.data.attemptsAtRun, skinId: parsed.data.skinId,
    country: req.user.country, region: req.user.region,
  }
  let row
  if (!existing) {
    row = await prisma.dailyRun.create({ data: newRow })
  } else {
    const isBetter = parsed.data.percent > existing.percent ||
      (parsed.data.percent === existing.percent && parsed.data.completionTimeMs < existing.completionTimeMs)
    row = isBetter
      ? await prisma.dailyRun.update({ where: { id: existing.id }, data: newRow })
      : existing
  }
  res.json({ run: row })
}

export async function dailyLeaderboard(req, res) {
  const scope = (req.query.scope || 'global').toString()
  const country = req.query.country?.toString()
  const region = req.query.region?.toString()
  const date = (req.query.date || todayDateStr()).toString()
  const limit = Math.min(parseInt(req.query.limit) || 100, 200)

  const where = { date }
  if (scope === 'country' && country) where.country = country
  if (scope === 'region' && country && region) { where.country = country; where.region = region }

  const rows = await prisma.dailyRun.findMany({
    where, orderBy: [{ percent: 'desc' }, { completionTimeMs: 'asc' }], take: limit,
    include: { user: { select: { username: true, country: true, region: true, selectedSkinId: true } } }
  })
  const out = rows.map((r, i) => ({
    rank: i + 1, runId: r.id, userId: r.userId,
    username: r.user.username, country: r.user.country, region: r.user.region,
    skinId: r.skinId || r.user.selectedSkinId,
    percent: r.percent, completionTimeMs: r.completionTimeMs,
    attemptsAtRun: r.attemptsAtRun, createdAt: r.createdAt,
  }))
  let myRank = null
  if (req.user) myRank = out.find(r => r.userId === req.user.id) || null
  res.json({ rows: out, myRank, scope, date })
}
