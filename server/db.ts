import mysql from 'mysql2/promise'

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
}

const DB_NAME = process.env.DB_NAME || 'ai_chat'

let pool: mysql.Pool | null = null

export async function initDB() {
  // 先创建数据库（如果不存在）
  const tmp = await mysql.createConnection(DB_CONFIG)
  await tmp.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await tmp.end()

  // 创建连接池
  pool = mysql.createPool({
    ...DB_CONFIG,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  })

  const conn = await pool.getConnection()
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) DEFAULT '新对话',
      role VARCHAR(50) DEFAULT 'assistant',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      session_id INT,
      role ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      timestamp BIGINT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `)
  conn.release()
  console.log('数据库初始化完成')
}

export function getPool(): mysql.Pool {
  if (!pool) throw new Error('数据库未初始化')
  return pool
}
