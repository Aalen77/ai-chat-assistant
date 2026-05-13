import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message } from '../types'
import { AI_ROLES } from '../types'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string, imageBase64?: string) => void
  isLoading: boolean
  currentRole: string
  onExport: (format: 'json' | 'markdown' | 'txt') => void
  onClear: () => void
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }, [text])
  return (
    <button onClick={handleCopy} className={`transition-colors ${className}`}>
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const code = String(children).replace(/\n$/, '')
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-white/10">
      <div className="flex items-center justify-between bg-[#1e1e2e] px-3 py-1.5 text-xs text-white/40">
        <span>{language || 'code'}</span>
        <CopyButton text={code} className="text-xs px-2 py-0.5 rounded text-white/50 hover:text-white/70" />
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isEmpty = !message.content

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && !isEmpty && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-xs text-amber-700 mr-2.5 mt-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[70%] ${isUser ? '' : 'flex flex-col'}`}>
        <div
          className={`px-4 py-2.5 leading-relaxed ${
            isUser
              ? 'bg-primary text-white rounded-2xl rounded-br-md'
              : isEmpty
                ? 'bg-white text-gray-400 rounded-2xl'
                : 'bg-white text-gray-700 rounded-2xl rounded-bl-md'
          }`}
        >
          {isUser ? (
            <>
              {message.image_url && (
                <img src={message.image_url} alt="图片" className="max-w-40 rounded-lg mb-2" />
              )}
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </>
          ) : isEmpty ? (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                      <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
                    ) : (
                      <code className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>
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
          <div className="flex justify-end mt-0.5 pr-1">
            <CopyButton text={message.content} className="text-[11px] text-gray-300 hover:text-gray-500" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatInterface({ messages, onSendMessage, isLoading, currentRole, onExport, onClear }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  const roleInfo = AI_ROLES[currentRole] || AI_ROLES.assistant

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 100)
  }, [])

  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, autoScroll])

  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('浏览器不支持语音输入'); return }
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return }
    const r = new SR()
    r.lang = 'zh-CN'
    r.continuous = false
    r.interimResults = true
    r.onresult = (e: any) => setInput(p => p + Array.from(e.results).map((x: any) => x[0].transcript).join(''))
    r.onend = () => setIsRecording(false)
    r.onerror = () => setIsRecording(false)
    recognitionRef.current = r
    r.start()
    setIsRecording(true)
  }, [isRecording])

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
      {/* top bar */}
      <div className="bg-white border-b border-amber-100 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{roleInfo.icon}</span>
          <span className="text-sm font-medium text-gray-700">{roleInfo.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 transition-colors">
              导出
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1 w-24">
                <button onClick={() => { onExport('json'); setShowExportMenu(false) }} className="w-full px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-amber-50">JSON</button>
                <button onClick={() => { onExport('markdown'); setShowExportMenu(false) }} className="w-full px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-amber-50">Markdown</button>
                <button onClick={() => { onExport('txt'); setShowExportMenu(false) }} className="w-full px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-amber-50">纯文本</button>
              </div>
            )}
          </div>
          <button onClick={onClear}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 transition-colors">
            清空
          </button>
        </div>
      </div>

      {/* messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl mb-3">
              {roleInfo.icon}
            </div>
            <p className="text-sm">开始和 {roleInfo.name} 对话</p>
          </div>
        )}
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        <div ref={messagesEndRef} />
      </div>

      {/* image preview */}
      {imagePreview && (
        <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center gap-2">
          <img src={imagePreview} alt="" className="h-10 w-10 object-cover rounded-lg" />
          <button onClick={() => { setImageBase64(null); setImagePreview(null) }} className="text-xs text-red-500">取消</button>
        </div>
      )}

      {/* input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading}
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-300 flex items-center justify-center transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button type="button" onClick={toggleVoice} disabled={isLoading}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-50 ${
              isRecording ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-300'
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..." disabled={isLoading}
            className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200 transition-all disabled:bg-gray-50" />
          <button type="submit" disabled={isLoading || !input.trim()}
            className="h-9 px-4 rounded-xl bg-primary text-white text-sm hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            发送
          </button>
        </form>
      </div>
    </div>
  )
}
