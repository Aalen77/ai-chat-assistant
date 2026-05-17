import { Router, Response, Request } from 'express'
import { verifyToken } from '../middleware/auth'

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

const ZHIPU_API_URL = process.env.VITE_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
const ZHIPU_API_KEY = process.env.VITE_ZHIPU_API_KEY || ''
const MODEL = 'glm-4v-flash'
const MAX_PROMPT_CHARS = 120000

router.post('/stream', async (req: AuthRequest, res: Response) => {
  try {
    const { messages } = req.body
    let currentMessages = [...messages]

    // 截断过长历史
    const totalChars = currentMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0)
    if (totalChars > MAX_PROMPT_CHARS) {
      const systemMsg = currentMessages.find((m: any) => m.role === 'system')
      currentMessages = [...(systemMsg ? [systemMsg] : []), ...currentMessages.slice(-20)]
    }

    // Streaming call
    const streamRes = await fetch(`${ZHIPU_API_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ZHIPU_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages: currentMessages, stream: true }),
    })
    if (!streamRes.ok) {
      const text = await streamRes.text()
      let msg = `AI 服务响应异常 (${streamRes.status})`
      try { const j = JSON.parse(text); if (j.error?.message) msg = j.error.message } catch {}
      console.error('Streaming call failed:', streamRes.status, msg)
      res.status(502).json({ error: msg })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const reader = streamRes.body?.getReader()
    if (!reader) {
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let contentBuffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed === 'data: [DONE]') { res.write('data: [DONE]\n\n'); continue }
          if (trimmed.startsWith('data:')) {
            try {
              const json = JSON.parse(trimmed.slice(5).trim())
              const delta = json.choices?.[0]?.delta || {}
              if (delta.content) {
                contentBuffer += delta.content
                if (/[。！？\n\r，、；：]/.test(delta.content) || contentBuffer.length >= 20) {
                  res.write(`data: ${contentBuffer}\n\n`)
                  contentBuffer = ''
                }
              }
            } catch {
              res.write(line + '\n\n')
            }
          }
        }
      }
      if (contentBuffer) res.write(`data: ${contentBuffer}\n\n`)
    } finally {
      reader.releaseLock()
    }
    res.end()
  } catch (err: any) {
    console.error('Chat error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'AI 服务暂时不可用' })
    } else {
      try { res.write('data: [DONE]\n\n'); res.end() } catch {}
    }
  }
})

export default router
