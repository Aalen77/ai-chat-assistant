import { Router, Response } from 'express'
import multer from 'multer'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth'
import { getPool } from '../db'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

const router = Router()
router.use(authMiddleware)
router.use(adminMiddleware)

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const ZHIPU_API_KEY = process.env.VITE_ZHIPU_API_KEY || ''
const EMBEDDING_MODEL = 'embedding-3'
const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

// 生成 embedding
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ZHIPU_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Embedding API 异常: ${res.status} ${text}`)
  }
  const data = await res.json()
  return data.data[0].embedding
}

// 文本分块
function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = start + CHUNK_SIZE
    if (end >= text.length) {
      chunks.push(text.slice(start))
      break
    }
    // 尽量在换行处断开
    const newline = text.lastIndexOf('\n', end)
    if (newline > start) end = newline
    chunks.push(text.slice(start, end))
    start = end - CHUNK_OVERLAP
  }
  return chunks
}

// 余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// 列出用户的文档
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT id, filename, filepath, filesize, filetype, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC",
      [req.userId]
    )
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: '获取文档列表失败' })
  }
})

// 获取文档原始内容（拼接所有 chunks）
router.get('/:id/content', async (req: AuthRequest, res: Response) => {
  try {
    const [docs] = await getPool().query<RowDataPacket[]>(
      'SELECT id, filename FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    if (!docs.length) { res.status(404).json({ error: '文档不存在' }); return }
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC',
      [req.params.id]
    )
    const text = rows.map((r: any) => r.content).join('\n')
    res.json({ id: docs[0].id, filename: docs[0].filename, content: text })
  } catch (err: any) {
    res.status(500).json({ error: '获取内容失败' })
  }
})

// 上传文档
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file
    if (!file) { res.status(400).json({ error: '请选择文件' }); return }
    if (!file.buffer) { res.status(400).json({ error: '文件内容为空' }); return }

    const filename = file.originalname
    const filepath = req.body?.filepath || filename
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt'

    // 根据文件类型提取文本
    let content = ''
    if (ext === 'pdf') {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) })
      const result = await parser.getText()
      content = result.text || ''
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer: file.buffer })
      content = result.value || ''
    } else if (['png', 'jpg', 'jpeg', 'bmp', 'webp'].includes(ext)) {
      // 图片文件：尝试 OCR 识别文字
      try {
        const T = await import('tesseract.js')
        const worker = await T.createWorker('chi_sim+eng')
        const { data } = await worker.recognize(file.buffer)
        await worker.terminate()
        content = data.text || ''
      } catch (ocrErr) {
        console.warn('OCR 识别失败:', ocrErr)
        content = ''
      }
    } else {
      content = file.buffer.toString('utf-8')
    }

    if (!content.trim()) { res.status(400).json({ error: '文件内容为空或无法提取文本' }); return }

    // 插入文档记录
    const [docResult] = await getPool().query<ResultSetHeader>(
      'INSERT INTO documents (user_id, filename, filepath, filesize, filetype) VALUES (?, ?, ?, ?, ?)',
      [req.userId, filename, filepath, file.size, ext]
    )
    const docId = docResult.insertId

    // 分块并生成 embedding
    const chunks = chunkText(content)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim()
      if (!chunk) continue
      let embedding: number[] = []
      try {
        embedding = await getEmbedding(chunk)
      } catch (err) {
        console.warn(`块 ${i} embedding 失败，跳过:`, err)
      }
      await getPool().query<ResultSetHeader>(
        'INSERT INTO document_chunks (document_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)',
        [docId, i, chunk, embedding.length ? JSON.stringify(embedding) : null]
      )
    }

    res.json({ id: docId, filename, chunks: chunks.length })
  } catch (err: any) {
    console.error('文档上传失败:', err)
    res.status(500).json({ error: err.message || '上传处理失败' })
  }
})

// 删除文档
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT id FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    if (!rows.length) { res.status(404).json({ error: '文档不存在' }); return }
    await getPool().query<ResultSetHeader>('DELETE FROM documents WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: '删除失败' })
  }
})

// 搜索相关文档块（供 chat 流调用）
export async function searchRelevantChunks(query: string, userId: number, topK = 3): Promise<string[]> {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT dc.content, dc.embedding
       FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       ORDER BY d.created_at DESC`
    )
    if (!rows.length) return []

    let queryEmbedding: number[]
    try {
      queryEmbedding = await getEmbedding(query)
    } catch {
      return rows.slice(0, topK).map(r => r.content)
    }

    const scored: { content: string; score: number }[] = []
    for (const row of rows) {
      if (row.embedding && queryEmbedding) {
        try {
          const emb = JSON.parse(row.embedding)
          const score = cosineSimilarity(queryEmbedding, emb)
          scored.push({ content: row.content, score })
        } catch {
          scored.push({ content: row.content, score: 0 })
        }
      } else {
        scored.push({ content: row.content, score: 0 })
      }
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK).map(s => s.content).filter(Boolean)
  } catch (err) {
    console.error('搜索文档块失败:', err)
    return []
  }
}

export default router
