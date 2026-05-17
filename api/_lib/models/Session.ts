import { sql } from '../db'
import { initDB } from '../db'

export interface SessionRow {
  id: number
  user_id: number
  title: string
  role: string
  created_at: string
}

export const Session = {
  async findByUser(userId: number): Promise<SessionRow[]> {
    await initDB()
    const { rows } = await sql`
      SELECT id, title, role, created_at
      FROM sessions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
    return rows as SessionRow[]
  },

  async create(userId: number, role: string, title: string): Promise<number> {
    await initDB()
    const { rows } = await sql`
      INSERT INTO sessions (user_id, role, title) VALUES (${userId}, ${role}, ${title})
      RETURNING id
    `
    return (rows[0] as any).id
  },

  async verifyOwner(sessionId: number, userId: number): Promise<boolean> {
    await initDB()
    const { rows } = await sql`
      SELECT id FROM sessions WHERE id = ${sessionId} AND user_id = ${userId}
    `
    return rows.length > 0
  },

  async update(sessionId: number, fields: { title?: string; role?: string }): Promise<void> {
    await initDB()
    const sets: string[] = []
    const vals: any[] = []
    let i = 1
    if (fields.title !== undefined) { sets.push(`title = $${i++}`); vals.push(fields.title) }
    if (fields.role !== undefined) { sets.push(`role = $${i++}`); vals.push(fields.role) }
    if (sets.length === 0) return
    vals.push(sessionId)
    await sql.query(
      `UPDATE sessions SET ${sets.join(', ')} WHERE id = $${i}`,
      vals,
    )
  },

  async delete(sessionId: number): Promise<void> {
    await initDB()
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`
  },
}
