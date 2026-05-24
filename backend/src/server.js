import 'dotenv/config'
import { createApp } from './app.js'

const PORT = parseInt(process.env.PORT || '4000', 10)
const app = createApp()

app.listen(PORT, () => {
  console.log(`Echo Dash API listening on http://localhost:${PORT}`)
  console.log(`Health:        GET http://localhost:${PORT}/health`)
  console.log(`Env:           NODE_ENV=${process.env.NODE_ENV || 'development'}`)
})
