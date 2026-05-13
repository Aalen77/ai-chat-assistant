const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'

export async function* streamChat(
  messages: { role: string; content: any }[],
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'glm-4.5-air',
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    await response.text()
    const friendly: Record<number, string> = {
      401: 'API 认证失败，请检查 API Key 是否正确配置',
      403: '没有访问 API 的权限',
      429: '请求过于频繁，请稍后再试',
      500: 'AI 服务暂时不可用，请稍后重试',
      502: 'AI 服务暂时不可用，请稍后重试',
      503: 'AI 服务正在维护中，请稍后再试',
    }
    throw new Error(friendly[response.status] || `请求失败(${response.status})，请稍后重试`)
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

        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) yield content
        } catch { /* 忽略解析错误 */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
