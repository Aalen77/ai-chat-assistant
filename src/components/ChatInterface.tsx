import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message } from '../types'
import { AI_ROLES } from '../types'

function IconSparkles({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function IconSend({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
    </svg>
  )
}

function IconImage({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
    </svg>
  )
}

function IconCopy({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  )
}

function IconUser({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function IconStop({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
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

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }, [text])
  return (
    <button onClick={handleCopy} className={`transition-colors ${className}`}>
      {copied ? '已复制' : <IconCopy />}
    </button>
  )
}

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const code = String(children).replace(/\n$/, '')
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200/50">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2 text-xs text-gray-400">
        <span>{language || 'code'}</span>
        <CopyButton text={code} className="text-xs p-1 rounded text-gray-400 hover:text-white" />
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{ margin: 0 }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// 解析 <think> 标签：分离思考内容和最终回复
function splitThinkTag(content: string): { think: string; response: string; hasThinkTag: boolean } {
  // 完整的 <think>...</think> 标签对
  const complete = content.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)/)
  if (complete) {
    return { think: complete[1].trim(), response: complete[2].trim(), hasThinkTag: true }
  }
  // 有开始标签但无结束标签（仍在流式输出思考内容）
  const openIdx = content.indexOf('<think>')
  if (openIdx !== -1) {
    return {
      think: content.slice(openIdx + 7),
      response: content.slice(0, openIdx),
      hasThinkTag: true,
    }
  }
  return { think: '', response: content, hasThinkTag: false }
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isEmpty = !message.content
  const parsed = !isUser && !isEmpty ? splitThinkTag(message.content) : null

  return (
    <div className={`flex items-start gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
        isUser
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-300'
          : 'bg-gradient-to-br from-blue-400 to-sky-400 text-white shadow-sm'
      }`}>
        {isUser ? <IconUser className="w-4 h-4" /> : <IconSparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`px-4 py-3 leading-relaxed text-sm ${
            isUser
              ? 'bg-primary text-white rounded-2xl rounded-tr-md shadow-sm'
              : isEmpty
                ? 'bg-surface text-foreground-muted rounded-2xl shadow-sm border border-border-light'
                : 'bg-surface text-foreground rounded-2xl rounded-tl-md shadow-sm border border-border-light'
          }`}
        >
          {isUser ? (
            <>
              {message.image_url && (
                <img src={message.image_url} alt="图片" className="max-w-40 rounded-lg mb-2" />
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </>
          ) : isEmpty ? (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : parsed?.hasThinkTag ? (
            <>
              {parsed.think && (
                <details open className="mb-3 bg-surface-hover rounded-lg overflow-hidden border border-border/50">
                  <summary className="text-xs cursor-pointer px-3 py-2 text-foreground-muted hover:text-foreground-secondary select-none flex items-center gap-1.5">
                    思考过程
                  </summary>
                  <div className="px-3 pb-2 text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                    {parsed.think}
                  </div>
                </details>
              )}
              {parsed.response ? (
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-code:bg-blue-50 dark:prose-code:bg-blue-900/50 prose-code:text-blue-700 dark:prose-code:text-blue-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return match ? (
                          <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
                        ) : (
                          <code className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>
                        )
                      },
                    }}
                  >
                    {parsed.response}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-code:bg-blue-50 dark:prose-code:bg-blue-900/50 prose-code:text-blue-700 dark:prose-code:text-blue-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                      <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
                    ) : (
                      <code className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && !isEmpty && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <CopyButton text={parsed?.hasThinkTag ? parsed.response || parsed.think : message.content} className="text-foreground-dim hover:text-foreground-secondary" />
          </div>
        )}
      </div>
    </div>
  )
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string, imageBase64?: string) => void
  isLoading: boolean
  currentRole: string
  onExport: (format: 'json' | 'markdown' | 'txt') => void
  onClear: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function ChatInterface({ messages, onSendMessage, isLoading, currentRole, onExport, onClear, theme, onToggleTheme }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const roleInfo = AI_ROLES[currentRole] || AI_ROLES.assistant

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 100)
  }, [])

  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, autoScroll])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setImageBase64(reader.result as string); setImagePreview(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim(), imageBase64 || undefined)
      setInput('')
      setImageBase64(null)
      setImagePreview(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Top bar */}
      <div className="bg-surface/80 backdrop-blur-sm border-b border-border-light px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-sky-400 flex items-center justify-center text-white shadow-sm">
            <IconSparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{roleInfo.name}</h1>
            <p className="text-[11px] text-foreground-muted">在线 · 随时为你服务</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleTheme}
            className="text-xs p-2 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:border-border transition-colors bg-surface">
            {theme === 'light' ? <IconMoon className="w-4 h-4" /> : <IconSun className="w-4 h-4" />}
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:border-border transition-colors bg-surface">
              导出
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 bg-surface rounded-xl shadow-lg border border-border z-10 py-1 w-24 overflow-hidden">
                <button onClick={() => { onExport('json'); setShowExportMenu(false) }} className="w-full px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-surface-hover">JSON</button>
                <button onClick={() => { onExport('markdown'); setShowExportMenu(false) }} className="w-full px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-surface-hover">Markdown</button>
                <button onClick={() => { onExport('txt'); setShowExportMenu(false) }} className="w-full px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-surface-hover">纯文本</button>
              </div>
            )}
          </div>
          <button onClick={onClear}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground-muted hover:text-red-400 hover:border-red-200 transition-colors bg-surface">
            清空
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 dark:from-blue-900/30 to-sky-50 dark:to-sky-900/30 flex items-center justify-center mb-4 shadow-sm">
              <IconSparkles className="w-7 h-7 text-blue-400 dark:text-blue-300" />
            </div>
            <p className="text-sm text-foreground-muted">开始和 {roleInfo.name} 对话</p>
            <p className="text-xs text-foreground-dim mt-1">输入你的问题，AI 将为你解答</p>
          </div>
        ) : (
          <>
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="bg-surface border-t border-border-light px-5 py-2.5 flex items-center gap-3">
          <img src={imagePreview} alt="" className="h-10 w-10 object-cover rounded-lg shadow-sm border border-border-light" />
          <button onClick={() => { setImageBase64(null); setImagePreview(null) }} className="text-xs text-red-400 hover:text-red-500">取消</button>
        </div>
      )}

      {/* Input area */}
      <div className="bg-surface border-t border-border-light px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 flex items-end gap-1.5 bg-surface-hover border border-border rounded-2xl px-3 py-2 focus-within:border-blue-300 dark:focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50 transition-all">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-lg text-foreground-muted hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center transition-colors disabled:opacity-50">
              <IconImage className="w-4 h-4" />
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={`向 ${roleInfo.name} 提问...`} disabled={isLoading}
              className="flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-foreground-muted disabled:opacity-50 text-foreground" />
            {isLoading ? (
              <button type="button" onClick={onClear}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-colors hover:bg-gray-300 dark:hover:bg-gray-600">
                <IconStop className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white transition-colors hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed">
                <IconSend className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
