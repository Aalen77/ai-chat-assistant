import { Router, Response, Request } from 'express'
import { verifyToken } from '../middleware/auth'
import { Session } from '../models/Session'
import { Message } from '../models/Message'

interface AuthRequest extends Request { userId?: number }

const router = Router()

function authMiddleware(req: AuthRequest, res: Response, next: Function) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return }
  const payload = verifyToken(header.slice(7))
  if (!payload) { res.status(401).json({ error: '登录已过期，请重新登录' }); return }
  req.userId = payload.userId
  next()
}

router.use(authMiddleware as any)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await Session.findByUser(req.userId!)
    res.json(sessions)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    res.status(500).json({ error: '获取会话列表失败' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { role, title } = req.body
    const id = await Session.create(req.userId!, role || 'assistant', title || '新对话')
    res.status(201).json({ id, role: role || 'assistant', title: title || '新对话' })
  } catch (error) {
    console.error('创建会话失败:', error)
    res.status(500).json({ error: '创建会话失败' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(String(req.params.id))
    const owned = await Session.verifyOwner(sessionId, req.userId!)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }
    await Session.update(sessionId, req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('更新会话失败:', error)
    res.status(500).json({ error: '更新会话失败' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(String(req.params.id))
    const owned = await Session.verifyOwner(sessionId, req.userId!)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }
    await Session.delete(sessionId)
    res.json({ success: true })
  } catch (error) {
    console.error('删除会话失败:', error)
    res.status(500).json({ error: '删除会话失败' })
  }
})

router.get('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(String(req.params.id))
    const owned = await Session.verifyOwner(sessionId, req.userId!)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }
    const messages = await Message.getBySessionId(sessionId)
    res.json(messages)
  } catch (error) {
    console.error('获取消息失败:', error)
    res.status(500).json({ error: '获取消息失败' })
  }
})

router.post('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(String(req.params.id))
    const owned = await Session.verifyOwner(sessionId, req.userId!)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }
    await Message.create(sessionId, req.body)
    res.status(201).json({ success: true })
  } catch (error) {
    console.error('保存消息失败:', error)
    res.status(500).json({ error: '保存消息失败' })
  }
})

router.delete('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(String(req.params.id))
    const owned = await Session.verifyOwner(sessionId, req.userId!)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }
    await Message.clearBySessionId(sessionId)
    res.json({ success: true })
  } catch (error) {
    console.error('清空消息失败:', error)
    res.status(500).json({ error: '清空消息失败' })
  }
})

export default router
