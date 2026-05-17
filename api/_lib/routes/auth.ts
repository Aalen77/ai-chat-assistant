import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'
import { sql } from '../db'
import { generateToken } from '../middleware/auth'
import { initDB } from '../db'

const router = Router()

router.post('/register', async (req, res: Response) => {
  try {
    const { username, password } = req.body
    if (!username || !password) { res.status(400).json({ error: '用户名和密码不能为空' }); return }
    if (username.length < 2 || username.length > 20) { res.status(400).json({ error: '用户名长度需在2-20个字符之间' }); return }
    if (password.length < 6) { res.status(400).json({ error: '密码长度不能少于6位' }); return }

    const existing = await User.findByUsername(username)
    if (existing) { res.status(409).json({ error: '用户名已被使用' }); return }

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = await User.create(username, passwordHash)

    await initDB()
    const { rows } = await sql`SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`
    const isFirst = parseInt((rows[0] as any).cnt) === 0
    if (isFirst) {
      await sql`UPDATE users SET role = 'admin' WHERE id = ${userId}`
    }

    const token = generateToken(userId)
    const role = isFirst ? 'admin' : 'user'
    res.status(201).json({ token, user: { id: userId, username, role } })
  } catch (error) {
    console.error('注册失败:', error)
    res.status(500).json({ error: '注册失败' })
  }
})

router.post('/login', async (req, res: Response) => {
  try {
    const { username, password } = req.body
    if (!username || !password) { res.status(400).json({ error: '用户名和密码不能为空' }); return }

    const user = await User.findByUsername(username)
    if (!user) { res.status(401).json({ error: '用户名或密码错误' }); return }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) { res.status(401).json({ error: '用户名或密码错误' }); return }

    const token = generateToken(user.id)
    res.json({ token, user: { id: user.id, username, role: user.role || 'user' } })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ error: '登录失败' })
  }
})

export default router
