import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getPool } from '../db'
import type { RowDataPacket } from 'mysql2'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-chat-secret-key'

export interface AuthRequest extends Request {
  userId?: number
  userRole?: string
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: '未登录' })
    return
  }
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT role FROM users WHERE id = ?",
      [req.userId]
    )
    const role = rows[0]?.role || 'user'
    if (role !== 'admin') {
      res.status(403).json({ error: '仅管理员可执行此操作' })
      return
    }
    req.userRole = role
    next()
  } catch {
    res.status(500).json({ error: '权限验证失败' })
  }
}
