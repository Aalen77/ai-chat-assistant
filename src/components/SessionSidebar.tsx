import { useState } from 'react'
import type { SessionInfo } from '../types'
import { AI_ROLES } from '../types'
import LearningModule from './LearningModule'

function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function IconMenuClose({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

function IconMenuOpen({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  )
}

function IconEdit({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  )
}

function IconDelete({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function IconLogout({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}

function IconChat({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}

function IconBook({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function IconSun({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  )
}

function IconMoon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  )
}

const ROLE_COLORS: Record<string, string> = {
  assistant: 'from-blue-400 to-sky-400',
  coding: 'from-cyan-400 to-teal-400',
  writing: 'from-pink-400 to-rose-400',
  psychologist: 'from-emerald-400 to-teal-400',
  tutor: 'from-amber-400 to-orange-400',
  translator: 'from-violet-400 to-indigo-400',
}

function RoleBadge({ role }: { role: string }) {
  const roleInfo = AI_ROLES[role] || AI_ROLES.assistant
  const gradient = ROLE_COLORS[role] || ROLE_COLORS.assistant
  return (
    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
      {roleInfo.name.charAt(0)}
    </div>
  )
}

interface SessionSidebarProps {
  sessions: SessionInfo[]
  currentSessionId: number | null
  onSelect: (id: number) => void
  onCreate: (role?: string) => void
  onDelete: (id: number) => void
  onRename: (id: number, title: string) => void
  onLogout: () => void
  username: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  userRole?: string
}

export default function SessionSidebar({
  sessions, currentSessionId, onSelect, onCreate, onDelete, onRename, onLogout, username, theme, onToggleTheme, userRole = 'user',
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<'chat' | 'learn'>('chat')

  return (
    <div className={`bg-sidebar text-foreground flex flex-col transition-all duration-200 border-r border-border ${collapsed ? 'w-14' : 'w-56'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-400 to-sky-400 flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-xs text-foreground-muted font-medium">{username}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-foreground-dim hover:text-foreground-secondary p-1 rounded-lg hover:bg-sidebar-hover transition-colors">
          {collapsed ? <IconMenuOpen className="w-4 h-4" /> : <IconMenuClose className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 px-2 pt-2 pb-1">
            <button onClick={() => setTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'chat' ? 'bg-primary-light text-primary' : 'text-foreground-muted hover:text-foreground hover:bg-sidebar-hover'
              }`}>
              <IconChat className="w-3.5 h-3.5" />
              对话
            </button>
            {userRole === 'admin' && (
            <button onClick={() => setTab('learn')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'learn' ? 'bg-primary-light text-primary' : 'text-foreground-muted hover:text-foreground hover:bg-sidebar-hover'
              }`}>
              <IconBook className="w-3.5 h-3.5" />
              学习
            </button>
          )}
          </div>

          {tab === 'chat' ? (
            <>
              {/* New Chat Button */}
              <div className="relative px-2 pt-1 pb-1">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="w-full bg-primary text-white py-2 rounded-xl text-xs font-medium transition-all shadow-sm hover:bg-primary-hover flex items-center justify-center gap-1.5"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  新对话
                </button>
                {showRoleMenu && (
                  <div className="absolute top-full left-2 right-2 bg-surface border border-border rounded-xl z-20 py-1 mt-1 shadow-xl">
                    {Object.entries(AI_ROLES).map(([key, role]) => (
                      <button key={key} onClick={() => { onCreate(key); setShowRoleMenu(false) }}
                        className="w-full px-3 py-2.5 text-left text-xs hover:bg-surface-hover flex items-center gap-2.5 transition-colors">
                        <RoleBadge role={key} />
                        <span className="text-foreground-secondary">{role.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Session List */}
              <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
                {sessions.length === 0 && (
                  <p className="text-foreground-dim text-xs text-center mt-8">暂无对话</p>
                )}
                {sessions.map((s) => (
                  <div key={s.id}
                    className={`group flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-xl text-xs transition-all ${
                      s.id === currentSessionId
                        ? 'bg-sidebar-active text-foreground shadow-sm'
                        : 'text-foreground-muted hover:text-foreground hover:bg-sidebar-hover'
                    }`}
                    onClick={() => onSelect(s.id)}>
                    {editingId === s.id ? (
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => { onRename(s.id, editTitle || s.title); setEditingId(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { onRename(s.id, editTitle || s.title); setEditingId(null) } if (e.key === 'Escape') setEditingId(null) }}
                        className="flex-1 bg-surface-hover text-foreground px-1.5 py-0.5 rounded text-xs outline-none"
                        autoFocus onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <span className="flex-1 truncate">{s.title}</span>
                    )}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title) }}
                        className="text-foreground-dim hover:text-foreground-secondary p-1 rounded hover:bg-sidebar-hover transition-colors">
                        <IconEdit className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(s.id) }}
                        className="text-foreground-dim hover:text-red-400 p-1 rounded hover:bg-sidebar-hover transition-colors">
                        <IconDelete className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <LearningModule />
          )}

          {/* Theme toggle + Logout */}
          <div className="px-2 py-2 border-t border-border flex items-center gap-1">
            <button onClick={onToggleTheme}
              className="flex-1 text-foreground-dim hover:text-foreground-secondary text-xs py-2 rounded-xl hover:bg-sidebar-hover transition-colors flex items-center justify-center gap-1.5">
              {theme === 'light' ? <IconMoon className="w-3.5 h-3.5" /> : <IconSun className="w-3.5 h-3.5" />}
              {theme === 'light' ? '深色' : '浅色'}
            </button>
            <button onClick={onLogout}
              className="flex-1 text-foreground-dim hover:text-red-400 text-xs py-2 rounded-xl hover:bg-sidebar-hover transition-colors flex items-center justify-center gap-1.5">
              <IconLogout className="w-3.5 h-3.5" />
              退出
            </button>
          </div>
        </>
      )}
    </div>
  )
}
