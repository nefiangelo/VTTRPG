import { randomUUID } from 'crypto'
import { getDb } from './db'

export interface CharacterEntry {
  id: number
  uuid?: string
  campaign_id: number | null
  user_id: number
  rpg_system_id: number | null
  system_slug: string | null
  system_name?: string | null
  genre?: string | null
  name: string
  avatar_url: string | null
  role: 'pc' | 'npc' | 'enemy'
  sheet_data: Record<string, unknown>
  origin_character_uuid?: string | null
  created_at: string
  updated_at: string
}

export interface SaveCharacterPayload {
  id?: number
  uuid?: string
  campaign_id?: number | null
  user_id: number
  rpg_system_id?: number | null
  system_slug?: string | null
  name: string
  avatar_url?: string | null
  role?: 'pc' | 'npc' | 'enemy'
  sheet_data?: Record<string, unknown> | string
  origin_character_uuid?: string | null
}

export interface ImportCharacterPayload {
  characterId?: number
  characterUuid?: string
  campaignId: number
  userId: number
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
    uuid: (row.uuid as string) || '',
    campaign_id: row.campaign_id !== null && row.campaign_id !== undefined ? Number(row.campaign_id) : null,
    user_id: Number(row.user_id),
    rpg_system_id: row.rpg_system_id !== null && row.rpg_system_id !== undefined ? Number(row.rpg_system_id) : null,
    system_slug: (row.system_slug as string) || null,
    system_name: (row.system_name as string) || null,
    genre: (row.genre as string) || null,
    name: String(row.name),
    avatar_url: (row.avatar_url as string) || null,
    role: (row.role as 'pc' | 'npc' | 'enemy') || 'pc',
    sheet_data: sheetData,
    origin_character_uuid: (row.origin_character_uuid as string) || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  }
}

/**
 * Retorna as fichas do cofre pessoal (Vault) do usuário (aquelas criadas fora de campanhas).
 */
export function getVaultCharacters(userId: number): CharacterEntry[] {
  const db = getDb()
  const rows = db
    .prepare(`
      SELECT c.*, s.name as system_name, s.genre as genre, s.slug as system_slug
      FROM characters c
      LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id
      WHERE c.campaign_id IS NULL AND c.user_id = ?
      ORDER BY c.updated_at DESC, c.name ASC
    `)
    .all(userId) as Record<string, unknown>[]

  return rows.map(hydrateCharacter)
}

/**
 * Retorna personagens pertencentes a uma campanha.
 * Se userId for especificado, prioriza os do jogador logado.
 */
export function getCharactersByCampaign(campaignId: number, userId?: number): CharacterEntry[] {
  const db = getDb()
  const rows = userId
    ? (db
        .prepare(
          `SELECT c.*, s.name as system_name, s.genre as genre, s.slug as system_slug
           FROM characters c
           LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id
           WHERE c.campaign_id = ? AND (c.user_id = ? OR c.role = 'pc') 
           ORDER BY CASE WHEN c.user_id = ? THEN 0 ELSE 1 END, c.name ASC`
        )
        .all(campaignId, userId, userId) as Record<string, unknown>[])
    : (db
        .prepare(
          `SELECT c.*, s.name as system_name, s.genre as genre, s.slug as system_slug
           FROM characters c
           LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id
           WHERE c.campaign_id = ? 
           ORDER BY c.name ASC`
        )
        .all(campaignId) as Record<string, unknown>[])

  return rows.map(hydrateCharacter)
}

/**
 * Busca personagem por ID numérico.
 */
export function getCharacterById(id: number): CharacterEntry | null {
  const db = getDb()
  const row = db
    .prepare(`
      SELECT c.*, s.name as system_name, s.genre as genre, s.slug as system_slug
      FROM characters c
      LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id
      WHERE c.id = ?
    `)
    .get(id) as Record<string, unknown> | undefined

  return row ? hydrateCharacter(row) : null
}

/**
 * Busca personagem por UUID global.
 */
export function getCharacterByUuid(uuid: string): CharacterEntry | null {
  const db = getDb()
  const row = db
    .prepare(`
      SELECT c.*, s.name as system_name, s.genre as genre, s.slug as system_slug
      FROM characters c
      LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id
      WHERE c.uuid = ?
    `)
    .get(uuid) as Record<string, unknown> | undefined

  return row ? hydrateCharacter(row) : null
}

/**
 * Salva (cria ou atualiza) uma ficha de personagem (tanto no Vault quanto em Campanha).
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
  const charUuid = payload.uuid || randomUUID()

  // Se tem campanha mas não especificou rpg_system_id, herda da campanha
  let sysId = payload.rpg_system_id ?? null
  let sysSlug = payload.system_slug ?? null

  if (payload.campaign_id && (!sysId || !sysSlug)) {
    const camp = db
      .prepare('SELECT c.rpg_system_id, s.slug FROM campaigns c LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id WHERE c.id = ?')
      .get(payload.campaign_id) as { rpg_system_id: number; slug: string } | undefined
    if (camp) {
      sysId = sysId ?? camp.rpg_system_id
      sysSlug = sysSlug ?? camp.slug
    }
  }

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
            rpg_system_id = COALESCE(?, rpg_system_id),
            system_slug = COALESCE(?, system_slug),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        payload.name.trim(),
        payload.avatar_url !== undefined ? payload.avatar_url : (existing.avatar_url as string | null),
        role,
        sheetDataStr,
        sysId,
        sysSlug,
        payload.id
      )

      const updated = getCharacterById(payload.id)
      return { success: true, character: updated! }
    } else {
      const info = db.prepare(`
        INSERT INTO characters (
          uuid, campaign_id, user_id, rpg_system_id, system_slug,
          name, avatar_url, role, sheet_data, origin_character_uuid,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        charUuid,
        payload.campaign_id ?? null,
        payload.user_id,
        sysId,
        sysSlug,
        payload.name.trim(),
        payload.avatar_url ?? null,
        role,
        sheetDataStr,
        payload.origin_character_uuid ?? null
      )

      const created = getCharacterById(Number(info.lastInsertRowid))
      return { success: true, character: created! }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Clona de forma totalmente independente uma ficha do Vault para dentro de uma Campanha.
 * Uma vez importada, a versão da campanha pertence à campanha e alterações futuras
 * na ficha fora dela não afetarão a ficha da campanha (e vice-versa).
 */
export function importCharacterToCampaign(payload: ImportCharacterPayload): CharacterResult {
  const db = getDb()
  try {
    let source: CharacterEntry | null = null
    if (payload.characterId) {
      source = getCharacterById(payload.characterId)
    } else if (payload.characterUuid) {
      source = getCharacterByUuid(payload.characterUuid)
    }

    if (!source) {
      return { success: false, error: 'Ficha de origem não encontrada no cofre.' }
    }

    const campaign = db
      .prepare(`
        SELECT c.*, s.slug as system_slug 
        FROM campaigns c
        LEFT JOIN rpg_systems s ON c.rpg_system_id = s.id
        WHERE c.id = ?
      `)
      .get(payload.campaignId) as { id: number; rpg_system_id: number; system_slug: string } | undefined

    if (!campaign) {
      return { success: false, error: 'Campanha de destino não encontrada.' }
    }

    const systemId = campaign.rpg_system_id || source.rpg_system_id
    const systemSlug = campaign.system_slug || source.system_slug

    // Snapshot independente dos dados da ficha
    const clonedSheetData = JSON.parse(JSON.stringify(source.sheet_data || {}))
    const campaignCharUuid = randomUUID()

    const info = db.prepare(`
      INSERT INTO characters (
        uuid, campaign_id, user_id, rpg_system_id, system_slug,
        name, avatar_url, role, sheet_data, origin_character_uuid,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      campaignCharUuid,
      payload.campaignId,
      payload.userId,
      systemId,
      systemSlug,
      source.name,
      source.avatar_url,
      'pc',
      JSON.stringify(clonedSheetData),
      source.uuid
    )

    const clonedChar = getCharacterById(Number(info.lastInsertRowid))
    if (!clonedChar) {
      return { success: false, error: 'Erro ao gerar cópia da ficha para a campanha.' }
    }

    // Criar nó correspondente na biblioteca da campanha (para listagem no explorer/sessão)
    try {
      const rawAttrs = (clonedChar.sheet_data as { attributes?: Record<string, unknown> })?.attributes || {}
      const hpCur = Number(rawAttrs.hp_current ?? rawAttrs.hp ?? 20)
      const hpMax = Number(rawAttrs.hp_max ?? 20)
      const acVal = Number(rawAttrs.armor_class ?? rawAttrs.ac ?? 10)

      db.prepare(`
        INSERT INTO campaign_nodes (
          id, campaign_id, parent_id, type, name, description,
          visibility, permission, shared_with, data, order_index,
          created_at, updated_at
        )
        VALUES (?, ?, NULL, 'character', ?, ?, 'all', 'edit', '[]', ?, 0, datetime('now'), datetime('now'))
      `).run(
        randomUUID(),
        payload.campaignId,
        clonedChar.name,
        `Ficha importada do cofre pessoal`,
        JSON.stringify({
          characterId: clonedChar.id,
          characterUuid: clonedChar.uuid,
          originVaultUuid: source.uuid,
          role: clonedChar.role,
          sheet_data: clonedChar.sheet_data,
          hp: { current: hpCur, max: hpMax },
          ac: acVal
        })
      )
    } catch (nodeErr) {
      console.warn('Aviso: nó da biblioteca não pôde ser criado automaticamente:', nodeErr)
    }

    return { success: true, character: clonedChar }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Exclui personagem. Jogador só pode excluir o próprio personagem (a menos que seja o GM).
 */
export function deleteCharacter(id: number, userId?: number, isGM: boolean = false): { success: boolean; error?: string } {
  const db = getDb()
  try {
    const existing = db.prepare('SELECT user_id, campaign_id FROM characters WHERE id = ?').get(id) as
      | { user_id: number; campaign_id: number | null }
      | undefined
    if (!existing) {
      return { success: false, error: 'Personagem não encontrado.' }
    }

    // Se for ficha do Vault, apenas o dono pode deletar
    if (existing.campaign_id === null) {
      if (userId && existing.user_id !== userId) {
        return { success: false, error: 'Você não tem permissão para excluir esta ficha do cofre.' }
      }
    } else {
      if (!isGM && userId && existing.user_id !== userId) {
        return { success: false, error: 'Você não tem permissão para excluir este personagem da campanha.' }
      }
    }

    db.prepare('DELETE FROM characters WHERE id = ?').run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
