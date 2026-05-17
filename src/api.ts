const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function* streamChat(
  messages: { role: string; content: any }[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') return
    throw err
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const friendly: Record<number, string> = {
      401: 'API 认证失败，请检查 API Key 是否正确配置',
      403: '没有访问 API 的权限',
      429: '请求过于频繁，请稍后再试',
      500: 'AI 服务暂时不可用，请稍后重试',
      502: 'AI 服务暂时不可用，请稍后重试',
      503: 'AI 服务正在维护中，请稍后再试',
    }
    throw new Error(body.error || friendly[response.status] || `请求失败(${response.status})，请稍后重试`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return
        yield data
      }
    }
  } catch (err: any) {
    // 被 AbortController 中止时不抛异常，正常结束
    if (err.name === 'AbortError') return
    throw err
  } finally {
    reader.releaseLock()
  }
}
