# MySQL对话历史保存功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现使用MySQL数据库自动保存和读取对话历史，包括自动保存每次对话更新、页面加载时读取历史记录，以及清空对话功能。

**Architecture:** 使用Node.js + Express创建后端API，MySQL作为数据库，前端通过现有的messageService与后端交互。采用会话表+消息表的数据库设计，自动创建会话，单用户支持。

**Tech Stack:** React (前端), Node.js + Express (后端), MySQL (数据库), TypeORM (ORM)

---

## 文件结构

### 后端文件
- `backend/app.js` - Express应用入口
- `backend/config/database.js` - 数据库配置
- `backend/models/Session.js` - 会话模型
- `backend/models/Message.js` - 消息模型  
- `backend/routes/messages.js` - 消息API路由
- `backend/package.json` - 后端依赖

### 前端文件修改
- `Ai/src/services/messageService.ts` - 修改以使用新的API端点
- `Ai/src/hooks/useChat.ts` - 确保与后端API兼容

---

## 任务 1: 创建后端项目结构

**Files:**
- Create: `backend/app.js`
- Create: `backend/config/database.js` 
- Create: `backend/models/Session.js`
- Create: `backend/models/Message.js`
- Create: `backend/routes/messages.js`
- Create: `backend/package.json`

- [ ] **Step 1: 创建后端package.json**

```json
{
  "name": "ai-chat-backend",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

- [ ] **Step 2: 创建数据库配置文件**

```javascript
// backend/config/database.js
const mysql = require('mysql2/promise')

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'ai_chat_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

const pool = mysql.createPool(dbConfig)

module.exports = pool
```

- [ ] **Step 3: 创建会话模型**

```javascript
// backend/models/Session.js
const db = require('../config/database')

class Session {
  static async create() {
    const [result] = await db.query(
      'INSERT INTO sessions (created_at) VALUES (NOW())'
    )
    return result.insertId
  }

  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM sessions WHERE id = ?',
      [id]
    )
    return rows[0]
  }
}

module.exports = Session
```

- [ ] **Step 4: 创建消息模型**

```javascript
// backend/models/Message.js
const db = require('../config/database')

class Message {
  static async create(sessionId, message) {
    const { id, role, content, timestamp } = message
    await db.query(
      'INSERT INTO messages (session_id, id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [sessionId, id, role, content, timestamp]
    )
  }

  static async getBySessionId(sessionId) {
    const [rows] = await db.query(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )
    return rows
  }

  static async clearBySessionId(sessionId) {
    await db.query(
      'DELETE FROM messages WHERE session_id = ?',
      [sessionId]
    )
  }

  static async clearAll() {
    await db.query('DELETE FROM messages')
  }
}

module.exports = Message
```

- [ ] **Step 5: 创建消息路由**

```javascript
// backend/routes/messages.js
const express = require('express')
const router = express.Router()
const Session = require('../models/Session')
const Message = require('../models/Message')

// 获取消息历史
router.get('/', async (req, res) => {
  try {
    const [latestSession] = await db.query(
      'SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1'
    )
    
    if (latestSession.length === 0) {
      return res.json([])
    }
    
    const messages = await Message.getBySessionId(latestSession[0].id)
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 保存消息
router.post('/', async (req, res) => {
  try {
    const [latestSession] = await db.query(
      'SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1'
    )
    
    if (latestSession.length === 0) {
      const sessionId = await Session.create()
      await Message.create(sessionId, req.body)
    } else {
      await Message.create(latestSession[0].id, req.body)
    }
    
    res.status(201).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 清空消息
router.delete('/', async (req, res) => {
  try {
    const [latestSession] = await db.query(
      'SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1'
    )
    
    if (latestSession.length > 0) {
      await Message.clearBySessionId(latestSession[0].id)
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
```

- [ ] **Step 6: 创建Express应用入口**

```javascript
// backend/app.js
const express = require('express')
const cors = require('cors')
const messagesRouter = require('./routes/messages')

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/messages', messagesRouter)

// 启动服务器
app.listen(PORT, () => {
  console.log(`后端服务器运行在端口 ${PORT}`)
})
```

- [ ] **Step 7: 初始化后端依赖**

```bash
cd backend
npm install
```

---

## 任务 2: 创建数据库表

- [ ] **Step 1: 创建数据库和表**

```sql
-- 创建数据库
CREATE DATABASE ai_chat_db;

-- 使用数据库
USE ai_chat_db;

-- 创建会话表
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建消息表
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  session_id INT,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

- [ ] **Step 2: 验证数据库连接**

```bash
mysql -u root -p ai_chat_db
```

---

## 任务 3: 修改前端代码以使用新的后端API

**Files:**
- Modify: `Ai/src/services/messageService.ts`

- [ ] **Step 1: 修改messageService.ts以使用新的API端点**

```javascript
// Ai/src/services/messageService.ts
import type { Message } from '../types'

const API_BASE = 'http://localhost:3000/api'

export async function getMessages(): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/messages`)
  if (!response.ok) throw new Error('获取消息失败')
  return response.json()
}

export async function saveMessage(message: Message): Promise<void> {
  const response = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
  if (!response.ok) throw new Error('保存消息失败')
}

export async function clearMessages(): Promise<void> {
  const response = await fetch(`${API_BASE}/messages`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('清空消息失败')
}
```

- [ ] **Step 2: 验证前端与后端集成**

确保前端能够正确调用新的API端点，保持现有的useChat钩子功能不变。

---

## 任务 4: 测试和部署

- [ ] **Step 1: 启动后端服务器**

```bash
cd backend
npm start
```

- [ ] **Step 2: 启动前端开发服务器**

```bash
cd Ai
npm run dev
```

- [ ] **Step 3: 测试功能**
  - 验证页面加载时历史记录是否正确加载
  - 发送消息并验证是否自动保存
  - 点击"清空对话"按钮验证是否清除历史记录

- [ ] **Step 4: 生产部署准备**
  - 配置环境变量
  - 设置MySQL生产数据库连接
  - 优化API性能

---

## 验证清单

- [ ] 前端页面加载时自动读取历史记录
- [ ] 每次对话更新后自动保存到数据库
- [ ] "清空对话"按钮正确清除历史记录
- [ ] 数据库表结构正确
- [ ] API端点正常工作
- [ ] 错误处理正常

计划完成，现在可以开始实施。建议使用subagent-driven-development进行任务执行，这样可以确保每个任务独立完成并得到验证。