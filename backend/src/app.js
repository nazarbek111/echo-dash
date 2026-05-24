import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { attachUser } from './middleware/auth.js'
import { notFound, errorHandler } from './middleware/error.js'

export function createApp() {
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use(cors({
    origin: (origin, cb) => cb(null, true), // permissive for dev; tighten via CLIENT_URL in prod
    credentials: false,
  }))
  app.use(attachUser)

  app.get('/health', (_req, res) => res.json({ ok: true, name: 'echo-dash-api' }))
  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
