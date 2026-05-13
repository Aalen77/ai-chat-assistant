import { getPool } from '../db'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface MessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  timestamp: number
}

export class Message {
  static async create(sessionId: number, message: MessageData) {
    const { id, role, content, image_url, timestamp } = message
    await getPool().query<ResultSetHeader>(
      'INSERT INTO messages (session_id, id, role, content, image_url, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, id, role, content, image_url || null, timestamp]
    )
  }

  static async getBySessionId(sessionId: number) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT id, role, content, image_url, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    )
    return rows as MessageData[]
  }

  static async clearBySessionId(sessionId: number) {
    await getPool().query<ResultSetHeader>(
      'DELETE FROM messages WHERE session_id = ?',
      [sessionId]
    )
  }
}
