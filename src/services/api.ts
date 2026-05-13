const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `请求失败 (${res.status})`)
  }
  return res.json()
}

export const sessionApi = {
  list: () => request<{ id: number; title: string; role: string; created_at: string }[]>('/sessions'),
  create: (role?: string, title?: string) =>
    request<{ id: number }>('/sessions', { method: 'POST', body: JSON.stringify({ role, title }) }),
  delete: (id: number) => request('/sessions/' + id, { method: 'DELETE' }),
  rename: (id: number, title: string) =>
    request('/sessions/' + id, { method: 'PUT', body: JSON.stringify({ title }) }),
  getMessages: (id: number) =>
    request<MessageData[]>('/sessions/' + id + '/messages'),
  saveMessage: (sessionId: number, message: MessageData) =>
    request('/sessions/' + sessionId + '/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    }),
  clearMessages: (id: number) =>
    request('/sessions/' + id + '/messages', { method: 'DELETE' }),
}

export interface MessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  timestamp: number
}
