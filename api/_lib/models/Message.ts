import { sql } from '../db'
import { initDB } from '../db'

export interface MessageRow {
  id: string
  session_id: number
  role: 'user' | 'assistant'
  content: string
  image_url: string | null
  timestamp: number
}

export const Message = {
  async getBySessionId(sessionId: number): Promise<MessageRow[]> {
    await initDB()
    const { rows } = await sql`
      SELECT id, session_id, role, content, image_url, timestamp
      FROM messages
      WHERE session_id = ${sessionId}
      ORDER BY timestamp ASC
    `
    return rows as MessageRow[]
  },

  async create(sessionId: number, msg: { id: string; role: string; content: string; image_url?: string | null; timestamp: number }): Promise<void> {
    await initDB()
    const imageUrl = msg.image_url || null
    await sql`
      INSERT INTO messages (id, session_id, role, content, image_url, timestamp)
      VALUES (${msg.id}, ${sessionId}, ${msg.role}, ${msg.content}, ${imageUrl}, ${msg.timestamp})
    `
  },

  async clearBySessionId(sessionId: number): Promise<void> {
    await initDB()
    await sql`DELETE FROM messages WHERE session_id = ${sessionId}`
  },
}
