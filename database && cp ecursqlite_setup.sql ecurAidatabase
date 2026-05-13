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

-- 验证表结构
DESCRIBE sessions;
DESCRIBE messages;