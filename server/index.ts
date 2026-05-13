import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDB } from './db'
import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)

const PORT = process.env.SERVER_PORT || 3000

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })
})
