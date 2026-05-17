import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { searchRelevantChunks } from './documents'
const router = Router()
router.use(authMiddleware)
const ZHIPU_API_URL = process.env.VITE_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
const ZHIPU_API_KEY = process.env.VITE_ZHIPU_API_KEY || ''
const MODEL = 'glm-4v-flash'
const MAX_TOOL_ROUNDS = 5
const MAX_PROMPT_CHARS = 120000 // 超过此长度时截断历史
async function callZhipu(messages: any[], tools?: any[]) {
  const body: any = { model: MODEL, messages, stream: false }
  if (tools?.length) body.tools = tools
  const res = await fetch(`${ZHIPU_API_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ZHIPU_API_KEY}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = `AI 服务响应异常 (${res.status})`
    try { const j = JSON.parse(text); if (j.error?.message) msg = j.error.message } catch {}
    if (res.status === 429 && msg.includes('1113')) msg = '智谱 AI 账号余额不足，请充值后使用'
    throw new Error(msg)
  }
  return res.json()
}
router.post('/stream', async (req: AuthRequest, res: Response) => {
  const mcpClient = req.app.get('mcpClient') as any
  try {
    const { messages } = req.body
    // 1. 获取 MCP 工具定义
    let tools: any[] | undefined
    if (mcpClient) {
      try {
        const toolResult = await mcpClient.listTools()
        tools = toolResult.tools.map((t: any) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.inputSchema },
        }))
      } catch (err) {
        console.warn('获取 MCP 工具列表失败:', err)
      }
    }
    // 3. 工具调用循环（non-streaming）
    let currentMessages = [...messages]
    // 截断过长历史，避免 Prompt exceeds max length
    const totalChars = currentMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0)
    if (totalChars > MAX_PROMPT_CHARS) {
      const systemMsg = currentMessages.find((m: any) => m.role === 'system')
      currentMessages = [
        ...(systemMsg ? [systemMsg] : []),
        ...currentMessages.slice(-20),
      ]
    }
    // 4. RAG：搜索用户文档中的相关内容，注入 system prompt
    try {
      const lastUserMsg = [...currentMessages].reverse().find((m: any) => m.role === 'user')
      if (lastUserMsg && req.userId) {
        const relevantChunks = await searchRelevantChunks(lastUserMsg.content, req.userId, 3)
        if (relevantChunks.length) {
          const ragContext = '以下是用户知识库中与问题相关的参考内容：\n' + relevantChunks.join('\n\n---\n\n')
          const sysIdx = currentMessages.findIndex((m: any) => m.role === 'system')
          if (sysIdx !== -1) {
            currentMessages[sysIdx] = {
              ...currentMessages[sysIdx],
              content: currentMessages[sysIdx].content + '\n\n' + ragContext,
            }
          } else {
            currentMessages.unshift({ role: 'system', content: ragContext })
          }
        }
      }
    } catch (err) {
      console.warn('RAG 搜索失败，跳过:', err)
    }

    let toolRounds = 0
    while (toolRounds < MAX_TOOL_ROUNDS && tools?.length) {
      const data = await callZhipu(currentMessages, tools)
      const choice = data.choices?.[0]
      if (!choice) throw new Error('AI 响应异常')
      const msg = choice.message
      if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length && mcpClient) {
        for (const tc of msg.tool_calls) {
          const name = tc.function.name
          let args: any = {}
          try { args = JSON.parse(tc.function.arguments) } catch {}
          let result = ''
          try {
            const r = await mcpClient.callTool({ name, arguments: args })
            result = r.content?.map((c: any) => c.text).join('\n') || ''
          } catch (err: any) {
            result = `工具调用失败: ${err.message}`
          }
          currentMessages.push({ role: 'assistant', content: null, tool_calls: [tc] })
          currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
        toolRounds++
        continue
      }
      // 非工具调用 → 退出循环，用 streaming 生成最终回复
      break
    }
    // 4. 用最终 messages 做 streaming 调用，转发到前端
    //    不含最终 assistant 响应（以免模型认为已回答完），也不含 tools（避免再次调用工具）
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
    // 流式调用成功后才发送 SSE 头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    const reader = streamRes.body?.getReader()
    if (!reader) {
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    const decoder = new TextDecoder()
    let buffer = ''
    let contentBuffer = ''  // 累积可见内容，凑整句再发
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed === 'data: [DONE]') {
          res.write('data: [DONE]\n\n')
          continue
        }
        if (trimmed.startsWith('data:')) {
          try {
            const json = JSON.parse(trimmed.slice(5).trim())
            const delta = json.choices?.[0]?.delta || {}
            // 可见内容
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
    // 发送剩余缓冲
    if (contentBuffer) res.write(`data: ${contentBuffer}\n\n`)
    res.end()
  } catch (err: any) {
    console.error('Chat error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'AI 服务暂时不可用' })
    } else {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
})
export default router
