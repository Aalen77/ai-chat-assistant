import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'

interface RegisterPageProps {
  onSwitchToLogin: () => void
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('两次密码不一致'); return }
    setLoading(true)
    try {
      const data = await authApi.register(username.trim(), password)
      login(data.token, data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">
            G
          </div>
          <h1 className="text-lg font-semibold text-gray-800">创建账号</h1>
          <p className="text-sm text-gray-400 mt-1">注册后开始 AI 对话</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">用户名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 bg-white transition-all"
              placeholder="2-20个字符" autoFocus />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 bg-white transition-all"
              placeholder="至少6位" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">确认密码</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 bg-white transition-all"
              placeholder="再次输入" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading || !username || !password || !confirm}
            className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:bg-gray-300 transition-colors">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">
          已有账号？{' '}
          <button onClick={onSwitchToLogin} className="text-amber-600 hover:text-amber-700">
            登录
          </button>
        </p>
      </div>
    </div>
  )
}
