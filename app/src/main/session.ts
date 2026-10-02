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
  }
  error?: string
}

/**
 * Importa o pacote de sessão baixado pelo jogador para o SQLite local,
 * preenchendo as tabelas de sistemas (rpg_systems, system_content), campanhas (campaigns, campaign_members)
 * e sessões (sessions).
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
          .prepare('SELECT id FROM rpg_systems WHERE slug = ? OR name = ?')
          .get(slug, sys.name) as { id: number } | undefined

        if (existingSystem) {
          db.prepare(`
            UPDATE rpg_systems
            SET name = ?,
                slug = ?,
                version = ?,
                genre = ?,
                description = ?,
                structure = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(
            sys.name,
            slug,
            sys.version || null,
            sys.genre || null,
            sys.description || null,
            structureJson,
            existingSystem.id
          )
          localSystemId = existingSystem.id
        } else {
          const idTaken = db.prepare('SELECT id FROM rpg_systems WHERE id = ?').get(sys.id)
          if (!idTaken && sys.id) {
            db.prepare(`
              INSERT INTO rpg_systems (id, name, slug, version, genre, description, structure, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
              INSERT INTO rpg_systems (name, slug, version, genre, description, structure, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
      let localOwnerId: number
      const ownerUsername = bundle.campaign.owner_username?.trim() || 'Mestre'
      const existingUser = db
        .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
        .get(ownerUsername) as { id: number } | undefined
      if (existingUser) {
        localOwnerId = existingUser.id
      } else {
        const info = db
          .prepare(`
            INSERT INTO users (username, password, created_at)
            VALUES (?, 'remote_gm_placeholder', datetime('now'))
          `)
          .run(ownerUsername)
        localOwnerId = Number(info.lastInsertRowid)
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
              INSERT INTO rpg_systems (name, slug, structure, created_at, updated_at)
              VALUES ('Sistema RPG', 'sistema-rpg', '{}', datetime('now'), datetime('now'))
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
              updated_at = datetime('now')
          WHERE id = ?
        `).run(campTitle, campDesc, campStatus, validSystemId, existingCampaign.id)
        localCampaignId = existingCampaign.id
      } else {
        const idTaken = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(camp.id)
        if (!idTaken && camp.id) {
          db.prepare(`
            INSERT INTO campaigns (id, title, description, status, rpg_system_id, owner_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(camp.id, campTitle, campDesc, campStatus, validSystemId, localOwnerId)
          localCampaignId = camp.id
        } else {
          const info = db.prepare(`
            INSERT INTO campaigns (title, description, status, rpg_system_id, owner_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(campTitle, campDesc, campStatus, validSystemId, localOwnerId)
          localCampaignId = Number(info.lastInsertRowid)
        }
      }

      // 5. Campaign Members (campaign_members)
      // Add current player
      db.prepare(`
        INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
        VALUES (?, ?, 'player', datetime('now'))
        ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = excluded.role
      `).run(localCampaignId, userId)

      // Ensure GM is also member
      if (localOwnerId !== userId) {
        db.prepare(`
          INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
          VALUES (?, ?, 'gm', datetime('now'))
          ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = excluded.role
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
                server_url = ?
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
              INSERT INTO sessions (id, campaign_id, title, status, started_at, notes, access_code, server_url, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
              INSERT INTO sessions (campaign_id, title, status, started_at, notes, access_code, server_url, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
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

      return {
        success: true,
        campaignId: localCampaignId,
        sessionId: localSessionId,
        systemId: localSystemId || undefined,
        stats: {
          importedSystem: !!localSystemId,
          importedContentCount: contentCount,
          importedCampaign: true,
          importedSessionsCount: sessionsCount
        }
      }
    })

    return importTransaction()
  } catch (err: unknown) {
    console.error('Error importing session bundle:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

