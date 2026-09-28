import bcrypt from 'bcryptjs'
import { getDb } from './db'

export interface AuthUser {
  id: number
  username: string
  email: string | null
  created_at: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

const BCRYPT_ROUNDS = 12

export async function register(
  username: string,
  password: string,
  email?: string
): Promise<AuthResult> {
  const db = getDb()

  if (!username || username.trim().length < 3)
    return { success: false, error: 'Username must be at least 3 characters.' }

  if (!password || password.length < 6)
    return { success: false, error: 'Password must be at least 6 characters.' }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())
  if (existing) return { success: false, error: 'Username is already taken.' }

  if (email?.trim()) {
    const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim())
    if (emailTaken) return { success: false, error: 'Email is already in use.' }
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const info = db
    .prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)')
    .run(username.trim(), email?.trim() || null, hash)

  const user = db
    .prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
    .get(info.lastInsertRowid) as AuthUser

  return { success: true, user }
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const db = getDb()

  if (!username || !password)
    return { success: false, error: 'Username and password are required.' }

  const row = db
    .prepare('SELECT id, username, email, password, created_at FROM users WHERE username = ?')
    .get(username.trim()) as (AuthUser & { password: string }) | undefined

  if (!row) return { success: false, error: 'Invalid username or password.' }

  const valid = await bcrypt.compare(password, row.password)
  if (!valid) return { success: false, error: 'Invalid username or password.' }

  const { password: _, ...user } = row
  return { success: true, user: user as AuthUser }
}
