import { getDb } from './db'

export interface Session {
  id: number
  campaign_id: number
  title: string | null
  status: 'scheduled' | 'active' | 'completed'
  started_at: string | null
  ended_at: string | null
  notes: string | null
  access_code?: string | null
  created_at: string
}

export interface SessionResult {
  success: boolean
  session?: Session
  error?: string
}

export interface CreateSessionPayload {
  campaign_id: number
  title?: string
  notes?: string
}

export interface UpdateSessionPayload {
  id: number
  title?: string
  notes?: string
  status?: 'scheduled' | 'active' | 'completed'
}

/**
 * Retorna todas as sessões de uma campanha, ordenadas priorizando a sessão ativa,
 * depois as agendadas, concluídas e por id mais recente.
 */
export function getSessionsByCampaign(campaignId: number): Session[] {
  const db = getDb()
  return db.prepare(`
    SELECT *
    FROM sessions
    WHERE campaign_id = ?
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'scheduled' THEN 2
        WHEN 'completed' THEN 3
        ELSE 4
      END ASC,
      id DESC
  `).all(campaignId) as Session[]
}

/**
 * Busca uma sessão específica pelo seu ID.
 */
export function getSessionById(id: number): Session | null {
  const db = getDb()
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  return session ?? null
}

/**
 * Cria uma nova sessão no estado agendada ('scheduled').
 * Se nenhum título for especificado, gera um número sequencial automático.
 */
export function createSession(payload: CreateSessionPayload): SessionResult {
  const db = getDb()

  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(payload.campaign_id)
  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada.' }
  }

  let title = payload.title?.trim()
  if (!title) {
    const countRow = db
      .prepare('SELECT COUNT(*) as count FROM sessions WHERE campaign_id = ?')
      .get(payload.campaign_id) as { count: number }
    const nextNumber = (countRow?.count ?? 0) + 1
    title = `Sessão #${nextNumber}`
  }

  const insert = db.prepare(`
    INSERT INTO sessions (campaign_id, title, status, notes)
    VALUES (?, ?, 'scheduled', ?)
  `)

  const info = insert.run(payload.campaign_id, title, payload.notes?.trim() ?? null)
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid) as Session

  return { success: true, session }
}

/**
 * Atualiza título e/ou anotações de uma sessão.
 */
export function updateSession(payload: UpdateSessionPayload): SessionResult {
  const db = getDb()
  const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get(payload.id) as Session | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }

  const title = payload.title !== undefined ? payload.title.trim() : current.title
  const notes = payload.notes !== undefined ? payload.notes : current.notes
  const status = payload.status !== undefined ? payload.status : current.status

  db.prepare(`
    UPDATE sessions
    SET title = ?, notes = ?, status = ?
    WHERE id = ?
  `).run(title, notes, status, payload.id)

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(payload.id) as Session
  return { success: true, session: updated }
}

/**
 * Inicia/Abre uma sessão de jogo:
 * Atualiza status para 'active' e preenche started_at (se ainda não preenchido).
 */
export function startSession(id: number): SessionResult {
  const db = getDb()
  const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }

  db.prepare(`
    UPDATE sessions
    SET status = 'active',
        started_at = COALESCE(started_at, datetime('now')),
        ended_at = NULL
    WHERE id = ?
  `).run(id)

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session
  return { success: true, session: updated }
}

/**
 * Encerra uma sessão de jogo:
 * Atualiza status para 'completed', preenche ended_at e opcionalmente adiciona notas finais.
 */
export function endSession(id: number, notes?: string): SessionResult {
  const db = getDb()
  const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }

  const finalNotes = notes !== undefined ? notes : current.notes

  db.prepare(`
    UPDATE sessions
    SET status = 'completed',
        ended_at = datetime('now'),
        notes = ?
    WHERE id = ?
  `).run(finalNotes, id)

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session
  return { success: true, session: updated }
}

/**
 * Reabre uma sessão encerrada, voltando para o estado 'active'.
 */
export function reopenSession(id: number): SessionResult {
  const db = getDb()
  const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }

  db.prepare(`
    UPDATE sessions
    SET status = 'active',
        ended_at = NULL
    WHERE id = ?
  `).run(id)

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session
  return { success: true, session: updated }
}

/**
 * Exclui uma sessão existente.
 */
export function deleteSession(id: number): { success: boolean; error?: string } {
  const db = getDb()
  const info = db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  if (info.changes === 0) {
    return { success: false, error: 'Sessão não encontrada.' }
  }
  return { success: true }
}

/**
 * Define ou atualiza o código de acesso da sessão.
 */
export function setSessionAccessCode(id: number, code: string): void {
  const db = getDb()
  db.prepare('UPDATE sessions SET access_code = ? WHERE id = ?').run(code.trim().toUpperCase(), id)
}

/**
 * Busca uma sessão ativa ou agendada pelo código de acesso.
 */
export function getSessionByCode(code: string): Session | null {
  const db = getDb()
  const clean = code.trim().toUpperCase()
  const session = db.prepare('SELECT * FROM sessions WHERE UPPER(access_code) = ?').get(clean) as Session | undefined
  return session ?? null
}
