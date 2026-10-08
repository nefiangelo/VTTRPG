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
  server_url?: string | null
  created_at: string
  updated_at?: string
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

  const campaign = db.prepare('SELECT id, is_downloaded FROM campaigns WHERE id = ?').get(payload.campaign_id) as
    | { id: number; is_downloaded?: number }
    | undefined
  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada.' }
  }
  if (campaign.is_downloaded) {
    return { success: false, error: 'Não é possível criar sessões em campanhas baixadas (somente leitura).' }
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
  const current = db.prepare(`
    SELECT s.*, c.is_downloaded
    FROM sessions s
    JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.id = ?
  `).get(payload.id) as (Session & { is_downloaded?: number }) | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }
  if (current.is_downloaded) {
    return { success: false, error: 'Sessões de campanhas baixadas não podem ser alteradas.' }
  }

  const title = payload.title !== undefined ? payload.title.trim() : current.title
  const notes = payload.notes !== undefined ? payload.notes : current.notes
  const status = payload.status !== undefined ? payload.status : current.status

  db.prepare(`
    UPDATE sessions
    SET title = ?, notes = ?, status = ?, updated_at = datetime('now')
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
  const current = db.prepare(`
    SELECT s.*, c.is_downloaded
    FROM sessions s
    JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.id = ?
  `).get(id) as (Session & { is_downloaded?: number }) | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }
  if (current.is_downloaded) {
    return { success: false, error: 'Apenas o Mestre anfitrião pode controlar o ciclo da sessão.' }
  }

  db.prepare(`
    UPDATE sessions
    SET status = 'active',
        started_at = COALESCE(started_at, datetime('now')),
        ended_at = NULL,
        updated_at = datetime('now')
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
  const current = db.prepare(`
    SELECT s.*, c.is_downloaded
    FROM sessions s
    JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.id = ?
  `).get(id) as (Session & { is_downloaded?: number }) | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }
  if (current.is_downloaded) {
    return { success: false, error: 'Apenas o Mestre anfitrião pode controlar o ciclo da sessão.' }
  }

  const finalNotes = notes !== undefined ? notes : current.notes

  db.prepare(`
    UPDATE sessions
    SET status = 'completed',
        ended_at = datetime('now'),
        notes = ?,
        updated_at = datetime('now')
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
  const current = db.prepare(`
    SELECT s.*, c.is_downloaded
    FROM sessions s
    JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.id = ?
  `).get(id) as (Session & { is_downloaded?: number }) | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }
  if (current.is_downloaded) {
    return { success: false, error: 'Apenas o Mestre anfitrião pode controlar o ciclo da sessão.' }
  }

  db.prepare(`
    UPDATE sessions
    SET status = 'active',
        ended_at = NULL,
        updated_at = datetime('now')
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
  const current = db.prepare(`
    SELECT s.*, c.is_downloaded
    FROM sessions s
    JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.id = ?
  `).get(id) as (Session & { is_downloaded?: number }) | undefined
  if (!current) {
    return { success: false, error: 'Sessão não encontrada.' }
  }
  if (current.is_downloaded) {
    return { success: false, error: 'Sessões de campanhas baixadas não podem ser excluídas.' }
  }

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

export interface SessionBundleData {
  session: {
    id: number
    title: string | null
    status: string
    started_at: string | null
    notes: string | null
    access_code: string
    server_url?: string | null
  }
  allSessions?: Array<{
    id: number
    title: string | null
    status: string
    started_at: string | null
    notes: string | null
    access_code?: string | null
    server_url?: string | null
  }>
  campaign: {
    id: number
    title: string
    description: string | null
    status?: string
    rpg_system_id?: number
    owner_username?: string
    members?: Array<{ id?: number; user_id?: number; username: string; role: string }>
  }
  system: {
    id: number
    name: string
    slug: string
    genre?: string | null
    version?: string | null
    description?: string | null
    structure?: unknown
  } | null
  content: Array<{
    id?: number
    rpg_system_id?: number
    type: string
    name: string
    data: Record<string, unknown>
  }>
  characters?: Array<{
    id?: number
    name: string
    avatar_url?: string | null
    role?: 'pc' | 'npc' | 'enemy'
    sheet_data?: Record<string, unknown> | string
    updated_at?: string
  }>
  stats?: {
    totalContentItems: number
    attributeGroupsCount: number
  }
}

export interface ImportBundlePayload {
  bundle: SessionBundleData
  userId: number
  serverUrl?: string
}

export interface ImportBundleResult {
  success: boolean
  campaignId?: number
  sessionId?: number
  systemId?: number
  stats?: {
    importedSystem: boolean
    importedContentCount: number
    importedCampaign: boolean
    importedSessionsCount: number
    importedCharactersCount?: number
  }
  error?: string
}

export interface ApplySyncPayload {
  campaignId: number
  campaign?: {
    title?: string
    description?: string | null
    status?: 'active' | 'paused' | 'finished'
    updated_at?: string
  }
  system?: {
    id: number
    name: string
    slug: string
    version?: string | null
    genre?: string | null
    description?: string | null
    structure?: unknown
    updated_at?: string
  } | null
  content?: Array<{
    type: string
    name: string
    data: unknown
  }>
  sessions?: Array<{
    id: number
    title?: string | null
    status?: string
    started_at?: string | null
    ended_at?: string | null
    notes?: string | null
    access_code?: string | null
    server_url?: string | null
    updated_at?: string
  }>
  characters?: Array<{
    id?: number
    name: string
    avatar_url?: string | null
    role?: 'pc' | 'npc' | 'enemy'
    sheet_data?: unknown
    updated_at: string
  }>
}

export interface ApplySyncResult {
  success: boolean
  updatedElements: string[]
  error?: string
}

/**
 * Importa o pacote de sessão baixado pelo jogador para o SQLite local,
 * preenchendo as tabelas de sistemas (rpg_systems, system_content), campanhas (campaigns, campaign_members)
 * e sessões (sessions). Marca o conteúdo como baixado (somente leitura).
 */
export function importSessionBundle(payload: ImportBundlePayload): ImportBundleResult {
  const db = getDb()
  const { bundle, userId, serverUrl } = payload

  if (!bundle || !bundle.session || !bundle.campaign) {
    return { success: false, error: 'Pacote de sessão inválido ou incompleto.' }
  }

  try {
    const importTransaction = db.transaction(() => {
      // 1. RPG System (rpg_systems)
      let localSystemId: number | null = null
      if (bundle.system) {
        const sys = bundle.system
        const slug = sys.slug?.trim() || sys.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const structureJson = JSON.stringify(sys.structure ?? { attributeGroups: [] })

        const existingSystem = db
          .prepare('SELECT id, created_by FROM rpg_systems WHERE slug = ? OR name = ?')
          .get(slug, sys.name) as { id: number; created_by?: number } | undefined

        // Se o sistema já pertencer ao próprio usuário local, mantém suas permissões; senão, marca is_downloaded = 1
        const isUserSystem = existingSystem?.created_by === userId
        const isDownloaded = isUserSystem ? 0 : 1

        if (existingSystem) {
          db.prepare(`
            UPDATE rpg_systems
            SET name = ?,
                slug = ?,
                version = ?,
                genre = ?,
                description = ?,
                structure = ?,
                is_downloaded = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(
            sys.name,
            slug,
            sys.version || null,
            sys.genre || null,
            sys.description || null,
            structureJson,
            isDownloaded,
            existingSystem.id
          )
          localSystemId = existingSystem.id
        } else {
          const idTaken = db.prepare('SELECT id FROM rpg_systems WHERE id = ?').get(sys.id)
          if (!idTaken && sys.id) {
            db.prepare(`
              INSERT INTO rpg_systems (id, name, slug, version, genre, description, structure, is_downloaded, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            `).run(
              sys.id,
              sys.name,
              slug,
              sys.version || null,
              sys.genre || null,
              sys.description || null,
              structureJson
            )
            localSystemId = sys.id
          } else {
            const info = db.prepare(`
              INSERT INTO rpg_systems (name, slug, version, genre, description, structure, is_downloaded, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            `).run(
              sys.name,
              slug,
              sys.version || null,
              sys.genre || null,
              sys.description || null,
              structureJson
            )
            localSystemId = Number(info.lastInsertRowid)
          }
        }
      }

      // 2. System Content (system_content)
      let contentCount = 0
      if (localSystemId && Array.isArray(bundle.content)) {
        const selectContent = db.prepare(
          'SELECT id FROM system_content WHERE rpg_system_id = ? AND type = ? AND name = ?'
        )
        const updateContent = db.prepare('UPDATE system_content SET data = ? WHERE id = ?')
        const insertContent = db.prepare(`
          INSERT INTO system_content (rpg_system_id, homebrew_id, type, name, data, created_at)
          VALUES (?, NULL, ?, ?, ?, datetime('now'))
        `)

        for (const item of bundle.content) {
          if (!item.name || !item.type) continue
          const dataJson = typeof item.data === 'string' ? item.data : JSON.stringify(item.data ?? {})
          const existing = selectContent.get(localSystemId, item.type, item.name) as
            | { id: number }
            | undefined
          if (existing) {
            updateContent.run(dataJson, existing.id)
          } else {
            insertContent.run(localSystemId, item.type, item.name, dataJson)
          }
          contentCount++
        }
      }

      // 3. Campaign Owner (users)
      // Garante que o owner_id da campanha baixada NUNCA seja o próprio jogador local
      let localOwnerId: number
      const rawOwnerUsername = bundle.campaign.owner_username?.trim() || 'Mestre'
      const existingUser = db
        .prepare('SELECT id, username FROM users WHERE username = ? COLLATE NOCASE')
        .get(rawOwnerUsername) as { id: number; username: string } | undefined

      if (existingUser && existingUser.id !== userId) {
        localOwnerId = existingUser.id
      } else {
        const remoteGmUsername = existingUser?.id === userId ? `${rawOwnerUsername} (GM Remoto)` : rawOwnerUsername
        const remoteGmUser = db
          .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
          .get(remoteGmUsername) as { id: number } | undefined

        if (remoteGmUser) {
          localOwnerId = remoteGmUser.id
        } else {
          const info = db
            .prepare(`
              INSERT INTO users (username, password, created_at)
              VALUES (?, 'remote_gm_placeholder', datetime('now'))
            `)
            .run(remoteGmUsername)
          localOwnerId = Number(info.lastInsertRowid)
        }
      }

      // 4. Campaign (campaigns)
      let localCampaignId: number
      const camp = bundle.campaign
      const campTitle = camp.title?.trim() || 'Campanha Importada'
      const campDesc = camp.description || null
      const campStatus = camp.status || 'active'
      const targetSystemId = localSystemId || camp.rpg_system_id || 1

      // Ensure valid system id exists for foreign key
      let validSystemId = targetSystemId
      const sysCheck = db.prepare('SELECT id FROM rpg_systems WHERE id = ?').get(validSystemId)
      if (!sysCheck) {
        const anySys = db.prepare('SELECT id FROM rpg_systems LIMIT 1').get() as
          | { id: number }
          | undefined
        if (anySys) {
          validSystemId = anySys.id
        } else {
          const fallbackSys = db
            .prepare(`
              INSERT INTO rpg_systems (name, slug, structure, is_downloaded, created_at, updated_at)
              VALUES ('Sistema RPG', 'sistema-rpg', '{}', 1, datetime('now'), datetime('now'))
            `)
            .run()
          validSystemId = Number(fallbackSys.lastInsertRowid)
        }
      }

      const existingCampaign = db
        .prepare('SELECT id FROM campaigns WHERE id = ?')
        .get(camp.id) as { id: number } | undefined

      if (existingCampaign) {
        db.prepare(`
          UPDATE campaigns
          SET title = ?,
              description = ?,
              status = ?,
              rpg_system_id = ?,
              is_downloaded = 1,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(campTitle, campDesc, campStatus, validSystemId, existingCampaign.id)
        localCampaignId = existingCampaign.id
      } else {
        const idTaken = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(camp.id)
        if (!idTaken && camp.id) {
          db.prepare(`
            INSERT INTO campaigns (id, title, description, status, rpg_system_id, owner_id, is_downloaded, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          `).run(camp.id, campTitle, campDesc, campStatus, validSystemId, localOwnerId)
          localCampaignId = camp.id
        } else {
          const info = db.prepare(`
            INSERT INTO campaigns (title, description, status, rpg_system_id, owner_id, is_downloaded, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          `).run(campTitle, campDesc, campStatus, validSystemId, localOwnerId)
          localCampaignId = Number(info.lastInsertRowid)
        }
      }

      // 5. Campaign Members (campaign_members)
      // Jogador entra estritamente como 'player'
      db.prepare(`
        INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
        VALUES (?, ?, 'player', datetime('now'))
        ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = 'player'
      `).run(localCampaignId, userId)

      // Ensure GM is also member
      if (localOwnerId !== userId) {
        db.prepare(`
          INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
          VALUES (?, ?, 'gm', datetime('now'))
          ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = 'gm'
        `).run(localCampaignId, localOwnerId)
      }

      // 6. Sessions (sessions)
      const sessionsToProcess =
        bundle.allSessions && Array.isArray(bundle.allSessions) && bundle.allSessions.length > 0
          ? bundle.allSessions
          : [bundle.session]

      let localSessionId: number = bundle.session.id
      let sessionsCount = 0

      for (const s of sessionsToProcess) {
        const sTitle = s.title || `Sessão #${s.id}`
        const sStatus = s.status || 'active'
        const sAccessCode =
          s.access_code || (s.id === bundle.session.id ? bundle.session.access_code : null)
        const sServerUrl = serverUrl || null

        const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(s.id) as
          | { id: number }
          | undefined

        if (existingSession) {
          db.prepare(`
            UPDATE sessions
            SET campaign_id = ?,
                title = ?,
                status = ?,
                started_at = ?,
                notes = ?,
                access_code = ?,
                server_url = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(
            localCampaignId,
            sTitle,
            sStatus,
            s.started_at || null,
            s.notes || null,
            sAccessCode,
            sServerUrl,
            existingSession.id
          )
          if (s.id === bundle.session.id) {
            localSessionId = existingSession.id
          }
        } else {
          const idTaken = db.prepare('SELECT id FROM sessions WHERE id = ?').get(s.id)
          if (!idTaken && s.id) {
            db.prepare(`
              INSERT INTO sessions (id, campaign_id, title, status, started_at, notes, access_code, server_url, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(
              s.id,
              localCampaignId,
              sTitle,
              sStatus,
              s.started_at || null,
              s.notes || null,
              sAccessCode,
              sServerUrl
            )
            if (s.id === bundle.session.id) {
              localSessionId = s.id
            }
          } else {
            const info = db.prepare(`
              INSERT INTO sessions (campaign_id, title, status, started_at, notes, access_code, server_url, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(
              localCampaignId,
              sTitle,
              sStatus,
              s.started_at || null,
              s.notes || null,
              sAccessCode,
              sServerUrl
            )
            if (s.id === bundle.session.id) {
              localSessionId = Number(info.lastInsertRowid)
            }
          }
        }
        sessionsCount++
      }

      // 7. Characters (characters) se existirem no pacote
      let charactersCount = 0
      if (bundle.characters && Array.isArray(bundle.characters)) {
        for (const char of bundle.characters) {
          if (!char.name) continue
          const sheetStr =
            typeof char.sheet_data === 'string'
              ? char.sheet_data
              : JSON.stringify(char.sheet_data ?? {})

          const existingChar = db
            .prepare('SELECT id FROM characters WHERE campaign_id = ? AND name = ?')
            .get(localCampaignId, char.name.trim()) as { id: number } | undefined

          if (existingChar) {
            db.prepare(`
              UPDATE characters
              SET sheet_data = ?,
                  role = ?,
                  avatar_url = COALESCE(?, avatar_url),
                  updated_at = COALESCE(?, datetime('now'))
              WHERE id = ?
            `).run(sheetStr, char.role || 'pc', char.avatar_url || null, char.updated_at || null, existingChar.id)
          } else {
            db.prepare(`
              INSERT INTO characters (campaign_id, user_id, name, avatar_url, role, sheet_data, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), COALESCE(?, datetime('now')))
            `).run(
              localCampaignId,
              userId,
              char.name.trim(),
              char.avatar_url || null,
              char.role || 'pc',
              sheetStr,
              char.updated_at || null
            )
          }
          charactersCount++
        }
      }

      return {
        success: true,
        campaignId: localCampaignId,
        sessionId: localSessionId,
        systemId: localSystemId || undefined,
        stats: {
          importedSystem: !!localSystemId,
          importedContentCount: contentCount,
          importedCampaign: true,
          importedSessionsCount: sessionsCount,
          importedCharactersCount: charactersCount
        }
      }
    })

    return importTransaction()
  } catch (err: unknown) {
    console.error('Error importing session bundle:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Aplica atualizações de sincronização quando a conexão entre Jogador e GM é reestabelecida
 * e foram detectados dados obsoletos. Mantém estritamente o modo somente leitura para campanhas/sistemas.
 */
export function applySessionSyncUpdate(payload: ApplySyncPayload, userId?: number): ApplySyncResult {
  const db = getDb()
  const { campaignId, campaign, system, content, sessions, characters } = payload
  const updatedElements: string[] = []

  try {
    const syncTx = db.transaction(() => {
      // 1. Atualizar campanha
      if (campaign) {
        db.prepare(`
          UPDATE campaigns
          SET title = COALESCE(?, title),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              is_downloaded = 1,
              updated_at = COALESCE(?, datetime('now'))
          WHERE id = ?
        `).run(
          campaign.title || null,
          campaign.description !== undefined ? campaign.description : null,
          campaign.status || null,
          campaign.updated_at || null,
          campaignId
        )
        updatedElements.push('Campanha')
      }

      // 2. Atualizar sistema RPG e regras
      if (system) {
        const structureJson = JSON.stringify(system.structure ?? { attributeGroups: [] })
        const existingSystem = db.prepare('SELECT id FROM rpg_systems WHERE id = ?').get(system.id) as
          | { id: number }
          | undefined

        if (existingSystem) {
          db.prepare(`
            UPDATE rpg_systems
            SET name = ?,
                slug = ?,
                version = ?,
                genre = ?,
                description = ?,
                structure = ?,
                is_downloaded = 1,
                updated_at = COALESCE(?, datetime('now'))
            WHERE id = ?
          `).run(
            system.name,
            system.slug,
            system.version || null,
            system.genre || null,
            system.description || null,
            structureJson,
            system.updated_at || null,
            system.id
          )
        }
        updatedElements.push('Sistema RPG')
      }

      // 3. Atualizar catálogo de conteúdo do sistema
      if (content && Array.isArray(content) && system?.id) {
        const selectContent = db.prepare(
          'SELECT id FROM system_content WHERE rpg_system_id = ? AND type = ? AND name = ?'
        )
        const updateContent = db.prepare('UPDATE system_content SET data = ? WHERE id = ?')
        const insertContent = db.prepare(`
          INSERT INTO system_content (rpg_system_id, homebrew_id, type, name, data, created_at)
          VALUES (?, NULL, ?, ?, ?, datetime('now'))
        `)

        for (const item of content) {
          if (!item.name || !item.type) continue
          const dataJson = typeof item.data === 'string' ? item.data : JSON.stringify(item.data ?? {})
          const existing = selectContent.get(system.id, item.type, item.name) as
            | { id: number }
            | undefined
          if (existing) {
            updateContent.run(dataJson, existing.id)
          } else {
            insertContent.run(system.id, item.type, item.name, dataJson)
          }
        }
        updatedElements.push('Catálogo de Conteúdo')
      }

      // 4. Atualizar lista de sessões
      if (sessions && Array.isArray(sessions)) {
        for (const s of sessions) {
          const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(s.id) as
            | Session
            | undefined

          const sTitle = s.title !== undefined && s.title !== null ? s.title : existing ? existing.title : `Sessão #${s.id}`
          const sStatus = s.status || existing?.status || 'completed'
          const sStartedAt = s.started_at !== undefined ? s.started_at : existing?.started_at || null
          const sEndedAt =
            s.ended_at !== undefined
              ? s.ended_at
              : sStatus === 'completed'
                ? existing?.ended_at || new Date().toISOString()
                : null
          const sNotes = s.notes !== undefined ? s.notes : existing?.notes || null
          const sAccessCode = s.access_code !== undefined ? s.access_code : existing?.access_code || null
          const sServerUrl = s.server_url !== undefined ? s.server_url : existing?.server_url || null
          const sUpdatedAt = s.updated_at || new Date().toISOString()

          if (existing) {
            db.prepare(`
              UPDATE sessions
              SET title = ?,
                  status = ?,
                  started_at = ?,
                  ended_at = ?,
                  notes = ?,
                  access_code = ?,
                  server_url = ?,
                  updated_at = ?
              WHERE id = ?
            `).run(
              sTitle,
              sStatus,
              sStartedAt,
              sEndedAt,
              sNotes,
              sAccessCode,
              sServerUrl,
              sUpdatedAt,
              existing.id
            )
          } else {
            db.prepare(`
              INSERT INTO sessions (id, campaign_id, title, status, started_at, ended_at, notes, access_code, server_url, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
            `).run(
              s.id,
              campaignId,
              sTitle,
              sStatus,
              sStartedAt,
              sEndedAt,
              sNotes,
              sAccessCode,
              sServerUrl,
              sUpdatedAt
            )
          }
        }
        updatedElements.push('Sessões')
      }

      // 5. Atualizar fichas de personagens recebidas do Mestre
      if (characters && Array.isArray(characters)) {
        for (const char of characters) {
          if (!char.name) continue
          const sheetStr =
            typeof char.sheet_data === 'string'
              ? char.sheet_data
              : JSON.stringify(char.sheet_data ?? {})

          const existingChar = db
            .prepare('SELECT id, updated_at FROM characters WHERE campaign_id = ? AND name = ?')
            .get(campaignId, char.name.trim()) as { id: number; updated_at?: string } | undefined

          if (existingChar) {
            db.prepare(`
              UPDATE characters
              SET sheet_data = ?,
                  role = ?,
                  avatar_url = COALESCE(?, avatar_url),
                  updated_at = COALESCE(?, datetime('now'))
              WHERE id = ?
            `).run(sheetStr, char.role || 'pc', char.avatar_url || null, char.updated_at || null, existingChar.id)
          } else {
            db.prepare(`
              INSERT INTO characters (campaign_id, user_id, name, avatar_url, role, sheet_data, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), COALESCE(?, datetime('now')))
            `).run(
              campaignId,
              userId || 1,
              char.name.trim(),
              char.avatar_url || null,
              char.role || 'pc',
              sheetStr,
              char.updated_at || null
            )
          }
        }
        updatedElements.push('Fichas de Personagem')
      }
    })

    syncTx()
    return { success: true, updatedElements }
  } catch (err) {
    console.error('Erro ao aplicar sincronização:', err)
    return { success: false, updatedElements: [], error: err instanceof Error ? err.message : String(err) }
  }
}

export interface PersistentParticipant {
  id: number
  session_id: number
  campaign_id: number
  user_id: number
  username: string
  role: 'gm' | 'player' | 'observer'
  first_joined: string
  last_joined: string
}

export function recordSessionParticipant(payload: {
  sessionId: number
  campaignId: number
  username: string
  role?: 'gm' | 'player' | 'observer'
}): PersistentParticipant {
  const db = getDb()
  const cleanUsername = payload.username.trim()

  let user = db
    .prepare('SELECT id, username FROM users WHERE username = ? COLLATE NOCASE')
    .get(cleanUsername) as { id: number; username: string } | undefined

  if (!user) {
    const res = db
      .prepare(`INSERT INTO users (username, password, created_at) VALUES (?, 'network_player', datetime('now'))`)
      .run(cleanUsername)
    user = { id: Number(res.lastInsertRowid), username: cleanUsername }
  }

  // Registra em campaign_members
  db.prepare(`
    INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = role
  `).run(payload.campaignId, user.id, payload.role || 'player')

  // Registra em session_participants
  db.prepare(`
    INSERT INTO session_participants (session_id, campaign_id, user_id, username, role, first_joined, last_joined)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(session_id, user_id) DO UPDATE SET
      last_joined = datetime('now'),
      role = excluded.role,
      username = excluded.username
  `).run(payload.sessionId, payload.campaignId, user.id, user.username, payload.role || 'player')

  const row = db
    .prepare('SELECT * FROM session_participants WHERE session_id = ? AND user_id = ?')
    .get(payload.sessionId, user.id) as PersistentParticipant

  return row
}

export function getSessionParticipants(sessionId?: number, campaignId?: number): PersistentParticipant[] {
  const db = getDb()
  const list: PersistentParticipant[] = []
  const seenUsernames = new Set<string>()

  // 1. Participantes registrados em session_participants
  if (sessionId && campaignId) {
    const rows = db.prepare(`
      SELECT 
        MAX(id) as id,
        session_id,
        campaign_id,
        user_id,
        username,
        role,
        MIN(first_joined) as first_joined,
        MAX(last_joined) as last_joined
      FROM session_participants
      WHERE session_id = ? OR campaign_id = ?
      GROUP BY username
      ORDER BY last_joined DESC
    `).all(sessionId, campaignId) as PersistentParticipant[]

    for (const r of rows) {
      if (!seenUsernames.has(r.username.toLowerCase())) {
        seenUsernames.add(r.username.toLowerCase())
        list.push(r)
      }
    }
  } else if (sessionId) {
    const rows = db.prepare(`
      SELECT * FROM session_participants WHERE session_id = ? ORDER BY last_joined DESC
    `).all(sessionId) as PersistentParticipant[]
    for (const r of rows) {
      if (!seenUsernames.has(r.username.toLowerCase())) {
        seenUsernames.add(r.username.toLowerCase())
        list.push(r)
      }
    }
  } else if (campaignId) {
    const rows = db.prepare(`
      SELECT 
        MAX(id) as id,
        session_id,
        campaign_id,
        user_id,
        username,
        role,
        MIN(first_joined) as first_joined,
        MAX(last_joined) as last_joined
      FROM session_participants
      WHERE campaign_id = ?
      GROUP BY username
      ORDER BY last_joined DESC
    `).all(campaignId) as PersistentParticipant[]
    for (const r of rows) {
      if (!seenUsernames.has(r.username.toLowerCase())) {
        seenUsernames.add(r.username.toLowerCase())
        list.push(r)
      }
    }
  }

  // 2. Mescla membros da campanha cadastrados que ainda não estão em session_participants
  if (campaignId) {
    try {
      const members = db.prepare(`
        SELECT cm.id, cm.campaign_id, cm.user_id, u.username, cm.role, cm.joined_at as first_joined, cm.joined_at as last_joined
        FROM campaign_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.campaign_id = ?
      `).all(campaignId) as Array<{
        id: number
        campaign_id: number
        user_id: number
        username: string
        role: string
        first_joined: string
        last_joined: string
      }>

      for (const m of members) {
        if (!seenUsernames.has(m.username.toLowerCase())) {
          seenUsernames.add(m.username.toLowerCase())
          list.push({
            id: m.id,
            session_id: sessionId || 0,
            campaign_id: m.campaign_id,
            user_id: m.user_id,
            username: m.username,
            role: m.role as 'gm' | 'player' | 'observer',
            first_joined: m.first_joined,
            last_joined: m.last_joined
          })
        }
      }
    } catch (e) {
      console.error('Erro ao buscar membros da campanha para participantes:', e)
    }
  }

  return list
}


