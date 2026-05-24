import { prisma } from '../utils/prisma.js'

export async function myBestReplay(req, res) {
  const levelId = (req.query.levelId || 'demo').toString()
  const replay = await prisma.replay.findFirst({
    where: { userId: req.user.id, levelId },
    orderBy: [{ percent: 'desc' }, { durationMs: 'asc' }],
  })
  if (!replay) return res.json({ replay: null })
  res.json({ replay: { ...replay, data: JSON.parse(replay.data) } })
}

export async function topReplay(req, res) {
  const levelId = (req.query.levelId || 'demo').toString()
  const scope = (req.query.scope || 'global').toString()
  const country = req.query.country?.toString()
  const region = req.query.region?.toString()

  const where = { levelId }
  // We need to filter by user country/region — fetch via join.
  let userFilter = undefined
  if (scope === 'country' && country) userFilter = { country }
  if (scope === 'region' && country && region) userFilter = { country, region }
  if (userFilter) where.user = userFilter

  const replay = await prisma.replay.findFirst({
    where, orderBy: [{ percent: 'desc' }, { durationMs: 'asc' }],
    include: { user: { select: { username: true, country: true, region: true, selectedSkinId: true } } }
  })
  if (!replay) return res.json({ replay: null })
  res.json({ replay: { ...replay, data: JSON.parse(replay.data) } })
}

export async function getReplay(req, res) {
  const r = await prisma.replay.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { username: true, country: true, region: true, selectedSkinId: true } } }
  })
  if (!r) return res.status(404).json({ error: 'Replay not found' })
  res.json({ replay: { ...r, data: JSON.parse(r.data) } })
}
