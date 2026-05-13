import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-chat-secret-key'

export interface AuthRequest extends Request {
  userId?: number
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
