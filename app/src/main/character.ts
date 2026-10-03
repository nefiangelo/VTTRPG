import { getDb } from './db'

export interface CharacterEntry {
  id: number
  campaign_id: number
  user_id: number
  name: string
  avatar_url: string | null
  role: 'pc' | 'npc' | 'enemy'
  sheet_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SaveCharacterPayload {
  id?: number
  campaign_id: number
  user_id: number
  name: string
  avatar_url?: string | null
  role?: 'pc' | 'npc' | 'enemy'
  sheet_data?: Record<string, unknown> | string
}

export interface CharacterResult {
  success: boolean
  character?: CharacterEntry
  error?: string
}

function hydrateCharacter(row: Record<string, unknown>): CharacterEntry {
  let sheetData: Record<string, unknown> = {}
  try {
    if (typeof row.sheet_data === 'string') {
      sheetData = JSON.parse(row.sheet_data)
    } else if (typeof row.sheet_data === 'object' && row.sheet_data !== null) {
      sheetData = row.sheet_data as Record<string, unknown>
    }
  } catch {
    sheetData = {}
  }

  return {
    id: Number(row.id),
    campaign_id: Number(row.campaign_id),
    user_id: Number(row.user_id),
    name: String(row.name),
    avatar_url: (row.avatar_url as string) || null,
    role: (row.role as 'pc' | 'npc' | 'enemy') || 'pc',
    sheet_data: sheetData,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  }
}

/**
 * Retorna personagens de uma campanha.
 * Se userId for especificado para jogador, retorna personagens pertencentes a ele (e outros PCs visíveis).
 */
export function getCharactersByCampaign(campaignId: number, userId?: number): CharacterEntry[] {
  const db = getDb()
  const rows = userId
    ? (db
        .prepare(
          `SELECT * FROM characters 
           WHERE campaign_id = ? AND (user_id = ? OR role = 'pc') 
           ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, name ASC`
        )
        .all(campaignId, userId, userId) as Record<string, unknown>[])
    : (db
        .prepare('SELECT * FROM characters WHERE campaign_id = ? ORDER BY name ASC')
        .all(campaignId) as Record<string, unknown>[])

  return rows.map(hydrateCharacter)
}

/**
 * Busca personagem por id.
 */
export function getCharacterById(id: number): CharacterEntry | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? hydrateCharacter(row) : null
}

/**
 * Salva (cria ou atualiza) uma ficha de personagem.
 * Atualiza o timestamp updated_at para que alterações offline possam ser sincronizadas.
 */
export function saveCharacter(payload: SaveCharacterPayload): CharacterResult {
  const db = getDb()
  if (!payload.name?.trim()) {
    return { success: false, error: 'O nome do personagem é obrigatório.' }
  }

  const sheetDataStr =
    typeof payload.sheet_data === 'string'
      ? payload.sheet_data
      : JSON.stringify(payload.sheet_data || {})

  const role = payload.role || 'pc'

  try {
    if (payload.id) {
      const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(payload.id) as
        | Record<string, unknown>
        | undefined

      if (!existing) {
        return { success: false, error: 'Personagem não encontrado.' }
      }

      db.prepare(`
        UPDATE characters
        SET name = ?,
            avatar_url = ?,
            role = ?,
            sheet_data = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        payload.name.trim(),
        payload.avatar_url ?? (existing.avatar_url as string | null),
        role,
        sheetDataStr,
        payload.id
      )

      const updated = getCharacterById(payload.id)
      return { success: true, character: updated! }
    } else {
      const info = db.prepare(`
        INSERT INTO characters (campaign_id, user_id, name, avatar_url, role, sheet_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        payload.campaign_id,
        payload.user_id,
        payload.name.trim(),
        payload.avatar_url ?? null,
        role,
        sheetDataStr
      )

      const created = getCharacterById(Number(info.lastInsertRowid))
      return { success: true, character: created! }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Exclui personagem. Jogador só pode excluir o próprio personagem.
 */
export function deleteCharacter(id: number, userId?: number, isGM: boolean = false): { success: boolean; error?: string } {
  const db = getDb()
  try {
    const existing = db.prepare('SELECT user_id FROM characters WHERE id = ?').get(id) as
      | { user_id: number }
      | undefined
    if (!existing) {
      return { success: false, error: 'Personagem não encontrado.' }
    }

    if (!isGM && userId && existing.user_id !== userId) {
      return { success: false, error: 'Você não tem permissão para excluir este personagem.' }
    }

    db.prepare('DELETE FROM characters WHERE id = ?').run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
