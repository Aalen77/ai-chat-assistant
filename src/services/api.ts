const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `请求失败 (${res.status})`)
  }
  return res.json()
}

export interface MessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  timestamp: number
}

export interface DocumentInfo {
  id: number
  filename: string
  filepath: string
  filesize: number
  filetype: string
  created_at: string
}

export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
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

export const documentApi = {
  list: () => request<DocumentInfo[]>('/documents'),
  getContent: (id: number) => request<{ id: number; filename: string; content: string }>('/documents/' + id + '/content'),
  upload: async (file: File) => {
    const token = localStorage.getItem('token')
    const form = new FormData()
    form.append('file', file)
    // 文件夹上传时携带相对路径，单文件用文件名
    form.append('filepath', (file as any).webkitRelativePath || file.name)
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `上传失败 (${res.status})`)
    }
    return res.json()
  },
  delete: (id: number) => request('/documents/' + id, { method: 'DELETE' }),
}
