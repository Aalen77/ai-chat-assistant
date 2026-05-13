-- 创建SQLite数据库文件
-- 在SQLite中，我们不需要显式创建数据库，直接创建表即可

-- 创建会话表
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建消息表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,  -- 使用TEXT代替VARCHAR(36)以适应UUID
  session_id INTEGER,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 验证表结构
PRAGMA table_info(sessions);
PRAGMA table_info(messages);