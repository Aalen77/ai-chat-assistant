import express from 'express'
import cors from 'cors'
import { initDB } from './_lib/db'
import authRoutes from './_lib/routes/auth'
import sessionRoutes from './_lib/routes/sessions'
import chatRoutes from './_lib/routes/chat'
import documentRoutes from './_lib/routes/documents'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/documents', documentRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: process.env.POSTGRES_URL ? 'vercel-postgres' : 'not-configured' })
})

// Initialize DB on cold start
let dbReady = false
app.use(async (_req, _res, next) => {
  if (!dbReady) {
    try {
      await initDB()
      dbReady = true
    } catch (err) {
      console.error('DB init failed:', err)
    }
  }
  next()
})

export default app
