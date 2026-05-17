import { useState, useCallback, useEffect, useRef } from 'react'
import type { Message, SessionInfo } from '../types'
import { AI_ROLES } from '../types'
import { streamChat } from '../api'
import { sessionApi } from '../services/api'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState('assistant')
  const [isInitialized, setIsInitialized] = useState(false)
  const initRef = useRef(false)
  const loadingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const list = await sessionApi.list()
      setSessions(list)
      return list
    } catch {
      return sessions
    }
  }, [])

  // 初始化
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    loadSessions().then((list) => {
      if (list.length > 0) {
        selectSession(list[0].id)
      }
      setIsInitialized(true)
    })
  }, [loadSessions])

  // 选择会话
  const selectSession = useCallback(async (sessionId: number) => {
    // 不中断正在进行的 AI 回复，让它在后台继续
    setCurrentSessionId(sessionId)
    setIsLoading(true)
    setError(null)
    try {
      const msgs = await sessionApi.getMessages(sessionId)
      setMessages(msgs)
      const session = sessions.find(s => s.id === sessionId)
      if (session) setCurrentRole(session.role)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载消息失败')
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [sessions])

  // 创建新会话
  const createSession = useCallback(async (role?: string) => {
    try {
      const newRole = role || currentRole
      const result = await sessionApi.create(newRole)
      const newSession: SessionInfo = {
        id: result.id,
        title: '新对话',
        role: newRole,
        created_at: new Date().toISOString(),
      }
      setSessions((prev) => [newSession, ...prev])
      setCurrentSessionId(newSession.id)
      setMessages([])
      setCurrentRole(newRole)
      setError(null)
      return newSession
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建会话失败')
    }
  }, [currentRole])

  // 删除会话
  const deleteSession = useCallback(async (id: number) => {
    try {
      await sessionApi.delete(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (currentSessionId === id) {
        const remaining = sessions.filter(s => s.id !== id)
        if (remaining.length > 0) {
          selectSession(remaining[0].id)
        } else {
          setCurrentSessionId(null)
          setMessages([])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除会话失败')
    }
  }, [currentSessionId, sessions, selectSession])

  // 重命名会话
  const renameSession = useCallback(async (id: number, title: string) => {
    try {
      await sessionApi.rename(id, title)
      setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title } : s))
    } catch {
      // 静默失败
    }
  }, [])

  // 发送消息
  const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
    if (loadingRef.current) return
    let sessionId = currentSessionId
    if (!sessionId) {
      const result = await sessionApi.create(currentRole)
      sessionId = result.id
      const newSession: SessionInfo = {
        id: result.id,
        title: content.slice(0, 30) || '新对话',
        role: currentRole,
        created_at: new Date().toISOString(),
      }
      setSessions((prev) => [newSession, ...prev])
      setCurrentSessionId(result.id)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      image_url: imageBase64 || null,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    sessionApi.saveMessage(sessionId, userMessage).catch((e) => console.error('保存用户消息失败:', e))

    // 自动重命名（第一条消息时）
    const currentMsgs = messages
    if (currentMsgs.length === 0) {
      const newTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '')
      renameSession(sessionId, newTitle).catch(() => {})
    }

    setIsLoading(true)
    loadingRef.current = true
    setError(null)

    // 创建 AbortController
    const controller = new AbortController()
    abortRef.current = controller

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      // 构建消息历史（含角色 system prompt）
      const history = buildChatHistory(currentMsgs, userMessage, currentRole)

      let fullContent = ''
      let saveTimer = 0
      for await (const token of streamChat(history, controller.signal)) {
        fullContent += token
        // 只更新属于当前 assistant 消息的状态（不干扰其他会话）
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantMessage.id)
          if (idx === -1) return prev // 已切换到其他会话
          const next = [...prev]
          next[idx] = { ...next[idx], content: fullContent }
          return next
        })
        // 渐进保存到服务器（每 50 字符或首次收到内容时）
        if (fullContent.length === token.length || fullContent.length - saveTimer > 50) {
          saveTimer = fullContent.length
          if (fullContent.trim()) {
            sessionApi.saveMessage(sessionId, { ...assistantMessage, content: fullContent })
              .catch((e) => console.error('渐进保存失败:', e))
          }
        }
      }

      // 最终保存到服务器
      if (fullContent) {
        try {
          await sessionApi.saveMessage(sessionId, { ...assistantMessage, content: fullContent })
        } catch (e) {
          console.error('保存AI消息失败:', e)
        }
      } else {
        // 流结束但无内容：移除空白的 assistant 消息（避免 "..." 卡死）
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantMessage.id)
          if (idx === -1) return prev
          return prev.filter((m) => m.id !== assistantMessage.id)
        })
        if (!controller.signal.aborted) {
          setError('AI 返回内容为空，请稍后重试')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误')
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === assistantMessage.id)
        if (idx === -1) return prev
        return prev.filter((m) => m.id !== assistantMessage.id)
      })
    } finally {
      // 完成时关闭 loading（此时 selectSession 早已完成，不会干扰）
      setIsLoading(false)
      loadingRef.current = false
      abortRef.current = null
    }
  }, [currentSessionId, currentRole, messages, renameSession])

  // 清空当前会话
  const clearMessages = useCallback(async () => {
    if (!currentSessionId) return
    try {
      await sessionApi.clearMessages(currentSessionId)
      setMessages([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空失败')
    }
  }, [currentSessionId])

  // 导出对话
  const exportChat = useCallback((format: 'json' | 'markdown' | 'txt') => {
    if (messages.length === 0) return
    const roleName = AI_ROLES[currentRole]?.name || 'AI助手'
    let content = ''
    let filename = ''
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')

    if (format === 'json') {
      content = JSON.stringify({ role: currentRole, messages }, null, 2)
      filename = `chat-${timestamp}.json`
    } else if (format === 'markdown') {
      const lines = [`# AI 对话记录\n`, `**角色**: ${roleName}  \n**时间**: ${new Date().toLocaleString()}\n---\n`]
      for (const m of messages) {
        const name = m.role === 'user' ? '👤 我' : `🤖 ${roleName}`
        lines.push(`### ${name}\n${m.content}\n`)
      }
      content = lines.join('\n')
      filename = `chat-${timestamp}.md`
    } else {
      const lines = [`AI 对话记录`, `角色: ${roleName}`, `时间: ${new Date().toLocaleString()}`, `${'='.repeat(30)}\n`]
      for (const m of messages) {
        const name = m.role === 'user' ? '我' : roleName
        lines.push(`[${name}]\n${m.content}\n`)
      }
      content = lines.join('\n')
      filename = `chat-${timestamp}.txt`
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, currentRole])

  return {
    messages,
    sessions,
    currentSessionId,
    isLoading,
    isInitialized,
    error,
    currentRole,
    sendMessage,
    clearMessages,
    selectSession,
    createSession,
    deleteSession,
    renameSession,
    exportChat,
  }
}

function buildChatHistory(existingMessages: Message[], newUserMsg: Message, role: string) {
  const systemPrompt = AI_ROLES[role]?.prompt || AI_ROLES.assistant.prompt
  const history: { role: 'system' | 'user' | 'assistant'; content: any }[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (const m of existingMessages) {
    history.push({ role: m.role, content: m.content })
  }

  // 如果有图片，使用 content array 格式
  if (newUserMsg.image_url) {
    history.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: newUserMsg.image_url } },
        { type: 'text', text: newUserMsg.content },
      ],
    })
  } else {
    history.push({ role: 'user', content: newUserMsg.content })
  }

  return history
}
