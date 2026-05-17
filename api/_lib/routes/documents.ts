import { Router, Response, Request } from 'express'
import { verifyToken } from '../middleware/auth'
import { sql, initDB } from '../db'

interface AuthRequest extends Request { userId?: number; userRole?: string }

const router = Router()

function authMiddleware(req: AuthRequest, res: Response, next: Function) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return }
  const payload = verifyToken(header.slice(7))
  if (!payload) { res.status(401).json({ error: '登录已过期，请重新登录' }); return }
  req.userId = payload.userId
  next()
}

async function adminMiddleware(req: AuthRequest, res: Response, next: Function) {
  if (!req.userId) { res.status(401).json({ error: '未登录' }); return }
  await initDB()
  const { rows } = await sql`SELECT role FROM users WHERE id = ${req.userId}`
  const role = (rows[0] as any)?.role || 'user'
  if (role !== 'admin') { res.status(403).json({ error: '仅管理员可执行此操作' }); return }
  req.userRole = role
  next()
}

router.use(authMiddleware as any)
router.use(adminMiddleware as any)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    await initDB()
    const { rows } = await sql`
      SELECT id, filename, filepath, filesize, filetype, created_at
      FROM documents WHERE user_id = ${req.userId}
      ORDER BY created_at DESC
    `
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: '获取文档列表失败' })
  }
})

router.get('/:id/content', async (req: AuthRequest, res: Response) => {
  try {
    const docId = String(req.params.id)
    await initDB()
    const { rows: docs } = await sql`SELECT id, filename FROM documents WHERE id = ${docId} AND user_id = ${req.userId}`
    if (!docs.length) { res.status(404).json({ error: '文档不存在' }); return }
    const { rows: chunks } = await sql`
      SELECT content FROM document_chunks WHERE document_id = ${docId} ORDER BY chunk_index ASC
    `
    const text = chunks.map((r: any) => r.content).join('\n')
    res.json({ id: docs[0].id, filename: docs[0].filename, content: text })
  } catch (err: any) {
    res.status(500).json({ error: '获取内容失败' })
  }
})

router.post('/upload', async (req: AuthRequest, res: Response) => {
  try {
    const { filename, filepath, filetype, filesize, chunks } = req.body
    if (!filename || !chunks || !chunks.length) {
      res.status(400).json({ error: '请提供文件名和内容' })
      return
    }

    await initDB()
    const { rows: docResult } = await sql`
      INSERT INTO documents (user_id, filename, filepath, filesize, filetype)
      VALUES (${req.userId}, ${filename}, ${filepath || filename}, ${filesize || 0}, ${filetype || 'txt'})
      RETURNING id
    `
    const docId = (docResult[0] as any).id

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!chunk.content?.trim()) continue
      let embeddingJson = null
      if (chunk.embedding?.length) {
        embeddingJson = JSON.stringify(chunk.embedding)
      }
      await sql`
        INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
        VALUES (${docId}, ${i}, ${chunk.content}, ${embeddingJson ? embeddingJson : null}::jsonb)
      `
    }

    res.json({ id: docId, filename, chunks: chunks.length })
  } catch (err: any) {
    console.error('文档上传失败:', err)
    res.status(500).json({ error: err.message || '上传处理失败' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const docId = String(req.params.id)
    await initDB()
    const { rows } = await sql`SELECT id FROM documents WHERE id = ${docId} AND user_id = ${req.userId}`
    if (!rows.length) { res.status(404).json({ error: '文档不存在' }); return }
    await sql`DELETE FROM documents WHERE id = ${docId}`
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: '删除失败' })
  }
})

// RAG search helper
export async function searchRelevantChunks(query: string, userId: number, topK = 3): Promise<string[]> {
  try {
    await initDB()
    const { rows } = await sql`
      SELECT dc.content, dc.embedding
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE d.user_id = ${userId}
      ORDER BY d.created_at DESC
    `
    if (!rows.length) return []

    // Try embedding-based search if ZHIPU key is available
    const ZHIPU_API_KEY = process.env.VITE_ZHIPU_API_KEY || ''
    if (ZHIPU_API_KEY) {
      try {
        const embRes = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ZHIPU_API_KEY}` },
          body: JSON.stringify({ model: 'embedding-3', input: query }),
        })
        if (embRes.ok) {
          const embData = await embRes.json()
          const queryEmb = embData.data[0].embedding
          const scored = rows.map((r: any) => {
            if (!r.embedding) return { content: r.content, score: 0 }
            try {
              const emb = typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding
              let dot = 0, normA = 0, normB = 0
              for (let i = 0; i < queryEmb.length; i++) {
                dot += queryEmb[i] * emb[i]
                normA += queryEmb[i] * queryEmb[i]
                normB += emb[i] * emb[i]
              }
              const score = dot / (Math.sqrt(normA) * Math.sqrt(normB))
              return { content: r.content, score }
            } catch { return { content: r.content, score: 0 } }
          })
          scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score)
          return scored.slice(0, topK).map((s: { content: string }) => s.content).filter(Boolean)
        }
      } catch (e) { console.warn('Embedding search failed, using recent docs:', e) }
    }

    // Fallback: return most recent chunks
    return rows.slice(0, topK).map((r: any) => (r as any).content).filter(Boolean)
  } catch (err) {
    console.error('搜索文档块失败:', err)
    return []
  }
}

export default router
