import { sql } from '../db'
import { initDB } from '../db'

export interface UserRow {
  id: number
  username: string
  password_hash: string
  role: string
  created_at: string
}

export const User = {
  async findByUsername(username: string): Promise<UserRow | null> {
    await initDB()
    const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`
    return (rows[0] as UserRow) || null
  },

  async create(username: string, passwordHash: string): Promise<number> {
    await initDB()
    const { rows } = await sql`
      INSERT INTO users (username, password_hash) VALUES (${username}, ${passwordHash})
      RETURNING id
    `
    return (rows[0] as any).id
  },

  async findById(id: number): Promise<UserRow | null> {
    await initDB()
    const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`
    return (rows[0] as UserRow) || null
  },
}
