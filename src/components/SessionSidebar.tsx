import { useState } from 'react'
import type { SessionInfo } from '../types'
import { AI_ROLES } from '../types'

interface SessionSidebarProps {
  sessions: SessionInfo[]
  currentSessionId: number | null
  onSelect: (id: number) => void
  onCreate: (role?: string) => void
  onDelete: (id: number) => void
  onRename: (id: number, title: string) => void
}

export default function SessionSidebar({
  sessions, currentSessionId, onSelect, onCreate, onDelete, onRename,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`bg-sidebar text-white flex flex-col transition-all duration-200 ${collapsed ? 'w-12' : 'w-56'}`}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">
              G
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-white/20 hover:text-white/50 text-sm p-1">
          {collapsed ? '☰' : '✕'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="relative px-2 pt-2 pb-1">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              + 新对话
            </button>
            {showRoleMenu && (
              <div className="absolute top-full left-2 right-2 bg-sidebar-hover border border-white/10 rounded-lg z-20 py-1 mt-1">
                {Object.entries(AI_ROLES).map(([key, role]) => (
                  <button key={key} onClick={() => { onCreate(key); setShowRoleMenu(false) }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-white/5 flex items-center gap-2 transition-colors">
                    <span>{role.icon}</span>
                    <span>{role.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-1.5 py-1">
            {sessions.length === 0 && (
              <p className="text-white/15 text-xs text-center mt-6">暂无对话</p>
            )}
            {sessions.map((s) => {
              const roleInfo = AI_ROLES[s.role] || AI_ROLES.assistant
              return (
                <div key={s.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 cursor-pointer rounded-lg text-xs transition-colors ${
                    s.id === currentSessionId ? 'bg-sidebar-active text-white' : 'text-white/50 hover:text-white/70 hover:bg-sidebar-hover'
                  }`}
                  onClick={() => onSelect(s.id)}>
                  <span>{roleInfo.icon}</span>
                  {editingId === s.id ? (
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => { onRename(s.id, editTitle || s.title); setEditingId(null) }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { onRename(s.id, editTitle || s.title); setEditingId(null) } if (e.key === 'Escape') setEditingId(null) }}
                      className="flex-1 bg-white/10 text-white px-1.5 py-0.5 rounded text-xs outline-none"
                      autoFocus onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <span className="flex-1 truncate">{s.title}</span>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title) }}
                      className="text-white/20 hover:text-white/50 text-[10px] p-0.5">✎</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                      className="text-white/20 hover:text-red-400 text-[10px] p-0.5">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
