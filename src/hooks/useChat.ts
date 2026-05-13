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
    if (loadingRef.current) return
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
    sessionApi.saveMessage(sessionId, userMessage).catch(() => {})

    // 自动重命名（第一条消息时）
    const currentMsgs = messages
    if (currentMsgs.length === 0) {
      const newTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '')
      renameSession(sessionId, newTitle).catch(() => {})
    }

    setIsLoading(true)
    loadingRef.current = true
    setError(null)

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
      for await (const token of streamChat(history)) {
        fullContent += token
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMessage.id ? { ...m, content: fullContent } : m)
        )
      }

      const finalMessage = { ...assistantMessage, content: fullContent }
      sessionApi.saveMessage(sessionId, finalMessage).catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误')
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsLoading(false)
      loadingRef.current = false
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
    loadSessions,
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
