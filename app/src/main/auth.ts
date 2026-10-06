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

export interface UpdateProfilePayload {
  userId: number
  currentPassword: string
  username?: string
  email?: string | null
  newPassword?: string
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthResult> {
  const db = getDb()
  const { userId, currentPassword, username, email, newPassword } = payload

  if (!currentPassword) return { success: false, error: 'Current password is required.' }

  const row = db.prepare('SELECT id, password FROM users WHERE id = ?').get(userId) as
    | { id: number; password: string }
    | undefined
  if (!row) return { success: false, error: 'User not found.' }

  const valid = await bcrypt.compare(currentPassword, row.password)
  if (!valid) return { success: false, error: 'Current password is incorrect.' }

  const newUsername = username?.trim()
  if (newUsername !== undefined) {
    if (newUsername.length < 3)
      return { success: false, error: 'Username must be at least 3 characters.' }
    const taken = db
      .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
      .get(newUsername, userId)
    if (taken) return { success: false, error: 'Username is already taken.' }
  }

  const newEmail = email === undefined ? undefined : email?.trim() || null
  if (newEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return { success: false, error: 'Invalid email address.' }
    const taken = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(newEmail, userId)
    if (taken) return { success: false, error: 'Email is already in use.' }
  }

  if (newPassword !== undefined && newPassword !== '' && newPassword.length < 6)
    return { success: false, error: 'Password must be at least 6 characters.' }

  if (newUsername !== undefined)
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, userId)
  if (newEmail !== undefined) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, userId)
  if (newPassword) {
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId)
  }

  const user = db
    .prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
    .get(userId) as AuthUser
  return { success: true, user }
}
