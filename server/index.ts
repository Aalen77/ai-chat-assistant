import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { initDB } from './db'
import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'
import chatRoutes from './routes/chat'
import documentRoutes from './routes/documents'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/documents', documentRoutes)

const PORT = process.env.SERVER_PORT || 3000

async function startMCPServer() {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY 未配置')

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    env: { FIRECRAWL_API_KEY: apiKey },
  })

  const client = new Client(
    { name: 'ai-chat-backend', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  console.log('FireCrawl MCP 服务器已连接')

  transport.onerror = (err) => {
    console.warn('FireCrawl MCP 传输错误（不影响核心服务）:', err)
  }

  return { client, transport }
}

initDB().then(async () => {
  let mcpTransport: StdioClientTransport | null = null

  try {
    const mcp = await startMCPServer()
    app.set('mcpClient', mcp.client)
    mcpTransport = mcp.transport
  } catch (err) {
    console.warn('FireCrawl MCP 启动失败，AI 将无法联网:', err)
    app.set('mcpClient', null)
  }

  const server = app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })

  const cleanup = () => {
    server.close()
    mcpTransport?.close()
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  // 防止 MCP 子进程 EPIPE 崩溃整个服务器
  process.on('uncaughtException', (err) => {
    if ((err as any).code === 'EPIPE' && err.message.includes('broken pipe')) {
      console.warn('忽略 MCP EPIPE 错误（子进程已退出）')
    } else {
      console.error('未捕获的异常:', err)
    }
  })
  process.on('unhandledRejection', (err) => {
    if ((err as any)?.code === 'EPIPE' || (err as any)?.message?.includes?.('broken pipe')) {
      // 忽略 MCP 相关的 EPIPE
    } else {
      console.error('未处理的 Promise 拒绝:', err)
    }
  })
})
