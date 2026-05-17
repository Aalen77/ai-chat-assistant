import { useState, useEffect, useRef, useCallback } from 'react'
import { documentApi, type DocumentInfo } from '../services/api'

const SUPPORTED_EXTENSIONS = new Set(['txt', 'md', 'pdf', 'docx', 'json', 'csv', 'png', 'jpg', 'jpeg', 'bmp', 'webp'])

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function isSupportedFile(file: File): boolean {
  return SUPPORTED_EXTENSIONS.has(getFileExtension(file.name))
}

// 递归遍历拖入的文件/文件夹
async function traverseDropItems(items: DataTransferItem[]): Promise<File[]> {
  const files: File[] = []
  const queue: { entry: FileSystemEntry; relativePath: string }[] = []

  for (const item of items) {
    const entry = item.webkitGetAsEntry()
    if (entry) queue.push({ entry, relativePath: '' })
  }

  while (queue.length > 0) {
    const { entry, relativePath } = queue.shift()!
    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) => (entry as FileSystemFileEntry).file(resolve))
      if (file && isSupportedFile(file)) {
        // 保留文件夹结构路径
        Object.defineProperty(file, 'webkitRelativePath', { value: relativePath ? relativePath + '/' + file.name : file.name })
        files.push(file)
      }
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve))
      for (const child of entries) {
        const childPath = relativePath ? relativePath + '/' + entry.name : entry.name
        queue.push({ entry: child, relativePath: childPath })
      }
    }
  }

  return files
}

function IconUpload({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function IconFolder({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}

function IconFile({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function IconTrash({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function IconChevronRight({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function IconArrowLeft({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

interface TreeNode {
  name: string
  type: 'folder' | 'file'
  children?: TreeNode[]
  doc?: DocumentInfo
}

function buildTree(docs: DocumentInfo[]): TreeNode[] {
  const root: TreeNode[] = []
  const sorted = [...docs].sort((a, b) => (a.filepath || a.filename).localeCompare(b.filepath || b.filename))
  for (const doc of sorted) {
    const path = doc.filepath || doc.filename
    const parts = path.replace(/\\/g, '/').split('/')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        current.push({ name: part, type: 'file', doc })
      } else {
        let folder = current.find(n => n.name === part && n.type === 'folder')
        if (!folder) {
          folder = { name: part, type: 'folder', children: [] }
          current.push(folder)
        }
        current = folder.children!
      }
    }
  }
  return root
}

function TreeNodeRow({
  node,
  depth,
  onSelect,
  onDelete,
}: {
  node: TreeNode
  depth: number
  onSelect: (doc: DocumentInfo) => void
  onDelete: (doc: DocumentInfo) => void
}) {
  const [expanded, setExpanded] = useState(depth < 1)

  if (node.type === 'folder') {
    return (
      <div>
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 px-1 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors text-left">
          <IconChevronRight className={`w-3 h-3 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
          <IconFolder className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div className="ml-2 border-l border-border pl-1.5">
            {node.children.map((child, i) => (
              <TreeNodeRow key={child.name + i} node={child} depth={depth + 1} onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1.5 px-1 py-1.5 rounded-lg text-xs text-foreground hover:bg-surface-hover cursor-pointer transition-colors"
      onClick={() => node.doc && onSelect(node.doc)}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}>
      <IconFile className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
      <span className="flex-1 truncate">{node.name}</span>
      <button onClick={(e) => { e.stopPropagation(); node.doc && onDelete(node.doc) }}
        className="text-foreground-dim hover:text-red-400 p-0.5 rounded hover:bg-sidebar-hover opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
        <IconTrash className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function LearningModule() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [viewingDoc, setViewingDoc] = useState<{ id: number; filename: string; content: string } | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const dragCounterRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = async () => {
    setLoading(true)
    try {
      const docs = await documentApi.list()
      setDocuments(docs)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '加载失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDocs() }, [])

  const uploadFile = async (file: File) => {
    await documentApi.upload(file)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      await uploadFile(file)
      setMessage({ type: 'success', text: `"${file.name}" 上传成功` })
      e.target.value = ''
      loadDocs()
    } catch (err: any) {
      setMessage({ type: 'error', text: `"${file.name}": ${err.message || '上传失败'}` })
    } finally {
      setUploading(false)
    }
  }

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setMessage(null)
    let success = 0
    let failed = 0
    let lastError = ''
    for (const file of Array.from(files)) {
      try {
        await uploadFile(file)
        success++
      } catch (err: any) {
        failed++
        lastError = err.message || '上传失败'
      }
    }
    e.target.value = ''
    loadDocs()
    if (failed === 0) {
      setMessage({ type: 'success', text: `成功上传 ${success} 个文件` })
    } else {
      setMessage({ type: 'error', text: `${success} 个成功，${failed} 个失败${lastError ? '：' + lastError : ''}` })
    }
    setUploading(false)
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items.length > 0) setDragOver(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    dragCounterRef.current = 0

    if (uploading) return

    const items = Array.from(e.dataTransfer.items)
    const files = await traverseDropItems(items)
    if (files.length === 0) return

    setUploading(true)
    setMessage(null)
    let success = 0
    let failed = 0
    let lastError = ''
    for (const file of files) {
      try {
        await uploadFile(file)
        success++
      } catch (err: any) {
        failed++
        lastError = err.message || '上传失败'
      }
    }
    loadDocs()
    if (failed === 0) {
      setMessage({ type: 'success', text: `成功上传 ${success} 个文件` })
    } else {
      setMessage({ type: 'error', text: `${success} 个成功，${failed} 个失败${lastError ? '：' + lastError : ''}` })
    }
    setUploading(false)
  }, [uploading])

  const handleView = async (doc: DocumentInfo) => {
    setLoadingContent(true)
    try {
      const data = await documentApi.getContent(doc.id)
      setViewingDoc(data)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '加载内容失败' })
    } finally {
      setLoadingContent(false)
    }
  }

  const handleDelete = async (doc: DocumentInfo) => {
    try {
      await documentApi.delete(doc.id)
      setMessage({ type: 'success', text: `"${doc.filename}" 已删除` })
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      if (viewingDoc?.id === doc.id) setViewingDoc(null)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '删除失败' })
    }
  }

  const tree = buildTree(documents)

  // ---- Content Detail View ----
  if (viewingDoc) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden px-2 py-2">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setViewingDoc(null)}
            className="p-1 rounded-lg hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors">
            <IconArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-xs font-medium text-foreground truncate flex-1">{viewingDoc.filename}</p>
        </div>
        <div className="flex-1 overflow-y-auto bg-surface-hover rounded-xl p-3">
          {loadingContent ? (
            <p className="text-xs text-foreground-muted text-center mt-8">加载中...</p>
          ) : (
            <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">{viewingDoc.content}</pre>
          )}
        </div>
      </div>
    )
  }

  // ---- Default List View ----
  return (
    <div className="flex-1 flex flex-col overflow-hidden px-2 py-2 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>
      <div className="mb-2">
        <p className="text-[11px] text-foreground-muted px-1">支持 PDF / Word / TXT / MD / 图片，AI 将根据内容回答</p>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleUpload}
        accept=".txt,.md,.pdf,.docx,.json,.csv,.png,.jpg,.jpeg,.bmp,.webp" className="hidden" />
      <input type="file" ref={folderInputRef} onChange={handleFolderUpload}
        /* @ts-ignore */
        webkitdirectory="" multiple className="hidden" />

      <div className="flex gap-2 mb-2">
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border text-foreground-muted hover:text-primary hover:border-primary text-xs transition-colors disabled:opacity-50">
          {uploading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              处理中...
            </span>
          ) : (
            <>
              <IconUpload className="w-3.5 h-3.5" />
              上传文件
            </>
          )}
        </button>
        <button onClick={() => folderInputRef.current?.click()} disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border text-foreground-muted hover:text-primary hover:border-primary text-xs transition-colors disabled:opacity-50">
          <IconFolder className="w-3.5 h-3.5" />
          上传文件夹
        </button>
      </div>

      {message && (
        <div className={`mb-2 px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500'
        }`}>
          {message.type === 'success' && <IconFile className="w-3 h-3 flex-shrink-0" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Drop zone overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 m-2 rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <IconUpload className="w-8 h-8 text-primary" />
            <p className="text-sm font-medium text-primary">释放以上传文件/文件夹</p>
            <p className="text-[11px] text-foreground-muted">支持 PNG / JPG / JPEG / PDF / Word / TXT / MD</p>
          </div>
        </div>
      )}

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto space-y-0.5 relative">
        {loading ? (
          <p className="text-center text-foreground-dim text-xs mt-6">加载中...</p>
        ) : tree.length === 0 ? (
          <p className="text-center text-foreground-dim text-xs mt-6">暂无文档</p>
        ) : (
          tree.map((node, i) => (
            <TreeNodeRow key={node.name + i} node={node} depth={0} onSelect={handleView} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  )
}
