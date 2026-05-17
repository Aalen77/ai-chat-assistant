import { getPool } from '../db'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface UserRow {
  id: number
  username: string
  password_hash: string
  role: string
  created_at: Date
}

export class User {
  static async create(username: string, passwordHash: string): Promise<number> {
    const [result] = await getPool().query<ResultSetHeader>(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    )
    return result.insertId
  }

  static async findByUsername(username: string) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )
    return rows[0] as UserRow | undefined
  }

}
