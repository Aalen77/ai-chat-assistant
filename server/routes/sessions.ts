import { Router, Request, Response } from 'express'
import { Session } from '../models/Session'
import { Message } from '../models/Message'

const router = Router()

// 获取所有会话
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sessions = await Session.findAll()
    res.json(sessions)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    res.status(500).json({ error: '获取会话列表失败' })
  }
})

// 创建新会话
router.post('/', async (req: Request, res: Response) => {
  try {
    const { role, title } = req.body
    const id = await Session.create(role || 'assistant', title || '新对话')
    res.status(201).json({ id, role: role || 'assistant', title: title || '新对话' })
  } catch (error) {
    console.error('创建会话失败:', error)
    res.status(500).json({ error: '创建会话失败' })
  }
})

// 更新会话（重命名/改角色）
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id)
    const owned = await Session.exists(sessionId)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }

    await Session.update(sessionId, req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('更新会话失败:', error)
    res.status(500).json({ error: '更新会话失败' })
  }
})

// 删除会话
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id)
    const owned = await Session.exists(sessionId)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }

    await Session.delete(sessionId)
    res.json({ success: true })
  } catch (error) {
    console.error('删除会话失败:', error)
    res.status(500).json({ error: '删除会话失败' })
  }
})

// 获取会话的消息
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id)
    const owned = await Session.exists(sessionId)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }

    const messages = await Message.getBySessionId(sessionId)
    res.json(messages)
  } catch (error) {
    console.error('获取消息失败:', error)
    res.status(500).json({ error: '获取消息失败' })
  }
})

// 保存消息到会话
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id)
    const owned = await Session.exists(sessionId)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }

    await Message.create(sessionId, req.body)
    res.status(201).json({ success: true })
  } catch (error) {
    console.error('保存消息失败:', error)
    res.status(500).json({ error: '保存消息失败' })
  }
})

// 清空会话的消息
router.delete('/:id/messages', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id)
    const owned = await Session.exists(sessionId)
    if (!owned) { res.status(404).json({ error: '会话不存在' }); return }

    await Message.clearBySessionId(sessionId)
    res.json({ success: true })
  } catch (error) {
    console.error('清空消息失败:', error)
    res.status(500).json({ error: '清空消息失败' })
  }
})

export default router
