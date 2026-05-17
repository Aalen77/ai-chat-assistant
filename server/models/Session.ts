import { getPool } from '../db'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface SessionRow {
  id: number
  user_id: number
  title: string
  role: string
  created_at: Date
}

export class Session {
  static async create(userId: number, role: string = 'assistant', title: string = '新对话'): Promise<number> {
    const [result] = await getPool().query<ResultSetHeader>(
      'INSERT INTO sessions (user_id, role, title) VALUES (?, ?, ?)',
      [userId, role, title]
    )
    return result.insertId
  }

  static async findByUser(userId: number) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT id, title, role, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    return rows as Omit<SessionRow, 'user_id'>[]
  }

  static async update(id: number, data: { title?: string; role?: string }) {
    const updates: string[] = []
    const values: (string | number)[] = []
    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title) }
    if (data.role !== undefined) { updates.push('role = ?'); values.push(data.role) }
    if (updates.length === 0) return
    values.push(id)
    await getPool().query<ResultSetHeader>(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
  }

  static async delete(id: number) {
    await getPool().query<ResultSetHeader>('DELETE FROM sessions WHERE id = ?', [id])
  }

  static async verifyOwner(sessionId: number, userId: number) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    )
    return rows.length > 0
  }
}
