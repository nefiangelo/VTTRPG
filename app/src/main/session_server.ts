import http from 'http'
import os from 'os'
import express from 'express'
import cors from 'cors'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { getDb } from './db'
import { getSessionById, getSessionsByCampaign, setSessionAccessCode } from './session'
import { getCampaignById, getCampaignMembers } from './campaign'
import { getRpgSystemById, getSystemContent } from './rpg_system'

export interface ConnectedParticipant {
  socketId: string
  userId?: number
  username: string
  role: 'gm' | 'player' | 'observer'
  joinedAt: string
  pingMs?: number
  downloadedContent?: boolean
}

export interface SessionServerStatus {
  isRunning: boolean
  sessionId?: number
  campaignId?: number
  port?: number
  accessCode?: string
  localAddresses?: string[]
  participantsCount?: number
  participants?: ConnectedParticipant[]
}

export interface ServerStartResult {
  success: boolean
  port?: number
  accessCode?: string
  localAddresses?: string[]
  error?: string
}

let activeHttpServer: http.Server | null = null
let activeIo: SocketIOServer | null = null
let activeSessionId: number | null = null
let activeCampaignId: number | null = null
let activeCode: string | null = null
let activePort: number | null = null
const participantsMap = new Map<string, ConnectedParticipant>()

/**
 * Retorna todos os endereços IPv4 locais da máquina (LAN + localhost)
 */
export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces()
  const addresses: string[] = []

  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name]
    if (!list) continue
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address)
      }
    }
  }

  if (!addresses.includes('127.0.0.1')) {
    addresses.push('127.0.0.1')
  }

  return addresses
}

/**
 * Gera um código de acesso alfanumérico único de 6 caracteres (sem caracteres confusos)
 */
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Retorna status atual do servidor de sessão
 */
export function getSessionServerStatus(): SessionServerStatus {
  if (!activeHttpServer || !activePort || !activeSessionId || !activeCode) {
    return { isRunning: false }
  }

  return {
    isRunning: true,
    sessionId: activeSessionId,
    campaignId: activeCampaignId ?? undefined,
    port: activePort,
    accessCode: activeCode,
    localAddresses: getLocalIpAddresses(),
    participantsCount: participantsMap.size,
    participants: Array.from(participantsMap.values())
  }
}

export interface SyncCheckPayload {
  code: string
  campaignId: number
  campaignUpdatedAt?: string
  systemId?: number
  systemUpdatedAt?: string
  sessions?: Array<{ id: number; updatedAt?: string; status: string; title?: string }>
  characters?: Array<{
    id?: number
    name: string
    avatar_url?: string | null
    role?: 'pc' | 'npc' | 'enemy'
    sheet_data?: Record<string, unknown> | string
    updated_at: string
  }>
  userId?: number
  username?: string
}

export interface SyncCheckResult {
  success: boolean
  isUpToDate: boolean
  obsoleteElements: string[]
  updatedData: {
    campaign?: unknown
    system?: unknown
    content?: unknown[]
    sessions?: unknown[]
    characters?: unknown[]
  }
  playerCharactersAccepted: number
  serverTime: string
  error?: string
}

/**
 * Realiza checagem de dados obsoletos entre o Mestre e o Jogador conectado.
 * Se o jogador possuir fichas de personagem alteradas offline, atualiza a base do Mestre.
 * Se o Mestre tiver atualizações de regras, sessões, campanhas ou fichas, envia para o jogador.
 */
export function performSyncCheck(payload: SyncCheckPayload): SyncCheckResult {
  const cleanCode = (payload?.code || '').trim().toUpperCase()
  if (!cleanCode || cleanCode !== activeCode) {
    return {
      success: false,
      isUpToDate: true,
      obsoleteElements: [],
      updatedData: {},
      playerCharactersAccepted: 0,
      serverTime: new Date().toISOString(),
      error: 'Código de sessão inválido ou incorreto.'
    }
  }

  const currentSession = getSessionById(activeSessionId!)
  if (!currentSession) {
    return {
      success: false,
      isUpToDate: true,
      obsoleteElements: [],
      updatedData: {},
      playerCharactersAccepted: 0,
      serverTime: new Date().toISOString(),
      error: 'Sessão ativa não encontrada.'
    }
  }

  const campaign = getCampaignById(currentSession.campaign_id)
  if (!campaign) {
    return {
      success: false,
      isUpToDate: true,
      obsoleteElements: [],
      updatedData: {},
      playerCharactersAccepted: 0,
      serverTime: new Date().toISOString(),
      error: 'Campanha não encontrada.'
    }
  }

  const db = getDb()
  const obsoleteElements: string[] = []
  const updatedData: SyncCheckResult['updatedData'] = {}
  let playerCharactersAccepted = 0

  // 1. Checagem da Campanha
  if (payload.campaignUpdatedAt) {
    const playerCampTime = new Date(payload.campaignUpdatedAt).getTime()
    const gmCampTime = new Date(campaign.updated_at).getTime()
    if (gmCampTime > playerCampTime) {
      obsoleteElements.push('Campanha')
      updatedData.campaign = {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        status: campaign.status,
        updated_at: campaign.updated_at
      }
    }
  }

  // 2. Checagem do Sistema e Catálogo de Regras
  const system = getRpgSystemById(campaign.rpg_system_id)
  if (system) {
    let systemNeedsUpdate = false
    if (!payload.systemId || payload.systemId !== system.id) {
      systemNeedsUpdate = true
    } else if (payload.systemUpdatedAt) {
      const playerSysTime = new Date(payload.systemUpdatedAt).getTime()
      const gmSysTime = new Date(system.updated_at).getTime()
      if (gmSysTime > playerSysTime) {
        systemNeedsUpdate = true
      }
    }

    if (systemNeedsUpdate) {
      obsoleteElements.push('Sistema RPG')
      updatedData.system = system
      updatedData.content = getSystemContent(system.id)
    }
  }

  // 3. Checagem de Sessões
  const allSessions = getSessionsByCampaign(campaign.id)
  let sessionsNeedUpdate = false
  if (!payload.sessions || payload.sessions.length !== allSessions.length) {
    sessionsNeedUpdate = true
  } else {
    for (const gmSess of allSessions) {
      const playerSess = payload.sessions.find(s => s.id === gmSess.id)
      if (!playerSess || playerSess.status !== gmSess.status) {
        sessionsNeedUpdate = true
        break
      }
      if (gmSess.updated_at && playerSess.updatedAt) {
        if (new Date(gmSess.updated_at).getTime() > new Date(playerSess.updatedAt).getTime()) {
          sessionsNeedUpdate = true
          break
        }
      }
    }
  }

  if (sessionsNeedUpdate) {
    obsoleteElements.push('Sessões')
    updatedData.sessions = allSessions.map(s => ({
      ...s,
      access_code: s.id === currentSession.id ? activeCode : s.access_code
    }))
  }

  // 4. Checagem Bidirecional de Fichas de Personagens (Fichas editadas offline pelo jogador)
  const charactersToSendToPlayer: unknown[] = []
  if (payload.characters && Array.isArray(payload.characters)) {
    for (const char of payload.characters) {
      if (!char.name) continue
      const existing = db
        .prepare('SELECT * FROM characters WHERE campaign_id = ? AND name = ?')
        .get(campaign.id, char.name.trim()) as Record<string, unknown> | undefined

      const sheetStr =
        typeof char.sheet_data === 'string'
          ? char.sheet_data
          : JSON.stringify(char.sheet_data ?? {})

      if (!existing) {
        // Personagem novo criado offline pelo jogador: GM aceita e armazena na sua base
        try {
          db.prepare(`
            INSERT INTO characters (campaign_id, user_id, name, avatar_url, role, sheet_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
          `).run(
            campaign.id,
            payload.userId || 1,
            char.name.trim(),
            char.avatar_url || null,
            char.role || 'pc',
            sheetStr,
            char.updated_at || new Date().toISOString()
          )
          playerCharactersAccepted++
        } catch (e) {
          console.error('Erro ao salvar personagem offline do jogador no GM:', e)
        }
      } else {
        const playerCharTime = new Date(char.updated_at).getTime()
        const gmCharTime = new Date(existing.updated_at as string).getTime()

        if (playerCharTime > gmCharTime) {
          // Jogador alterou sua ficha offline mais recentemente: GM atualiza os dados
          try {
            db.prepare(`
              UPDATE characters
              SET sheet_data = ?,
                  role = ?,
                  avatar_url = COALESCE(?, avatar_url),
                  updated_at = ?
              WHERE id = ?
            `).run(
              sheetStr,
              char.role || 'pc',
              char.avatar_url || null,
              char.updated_at,
              existing.id
            )
            playerCharactersAccepted++
          } catch (e) {
            console.error('Erro ao atualizar personagem offline no GM:', e)
          }
        } else if (gmCharTime > playerCharTime) {
          // Mestre tem versão mais recente da ficha: envia ao jogador para atualizar
          charactersToSendToPlayer.push(existing)
        }
      }
    }
  }

  // Se o Mestre possui fichas de personagens da campanha que o jogador não tem localmente:
  try {
    const allGmChars = db.prepare('SELECT * FROM characters WHERE campaign_id = ?').all(campaign.id) as Record<string, unknown>[]
    for (const gmChar of allGmChars) {
      const foundInPlayer = (payload.characters || []).some(
        c => c.name?.trim().toLowerCase() === String(gmChar.name).trim().toLowerCase()
      )
      if (!foundInPlayer && !charactersToSendToPlayer.some((c: any) => c.id === gmChar.id)) {
        charactersToSendToPlayer.push(gmChar)
      }
    }
  } catch (e) {
    console.error('Erro ao checar personagens do GM:', e)
  }

  if (charactersToSendToPlayer.length > 0) {
    obsoleteElements.push('Fichas de Personagem')
    updatedData.characters = charactersToSendToPlayer
  }

  return {
    success: true,
    isUpToDate: obsoleteElements.length === 0,
    obsoleteElements,
    updatedData,
    playerCharactersAccepted,
    serverTime: new Date().toISOString()
  }
}

/**
 * Inicia o servidor Node.js Express + Socket.io para a sessão do mestre
 */
export async function startSessionServer(
  sessionId: number,
  preferredPort: number = 3001
): Promise<ServerStartResult> {
  // Se já estiver rodando para a mesma sessão, retorna os dados atuais
  if (activeHttpServer && activeSessionId === sessionId && activePort && activeCode) {
    return {
      success: true,
      port: activePort,
      accessCode: activeCode,
      localAddresses: getLocalIpAddresses()
    }
  }

  // Se estiver rodando para outra sessão, encerra a anterior
  if (activeHttpServer) {
    await stopSessionServer()
  }

  const session = getSessionById(sessionId)
  if (!session) {
    return { success: false, error: 'Sessão não encontrada.' }
  }

  activeSessionId = sessionId
  activeCampaignId = session.campaign_id

  // Usa código existente ou gera um novo
  let code = session.access_code?.trim().toUpperCase()
  if (!code) {
    code = generateSessionCode()
    setSessionAccessCode(sessionId, code)
  }
  activeCode = code
  participantsMap.clear()

  const app = express()
  app.use(cors({ origin: '*' }))
  app.use(express.json())

  // Status / Health Check
  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'ok',
      isRunning: true,
      sessionId: activeSessionId,
      accessCode: activeCode,
      participantsCount: participantsMap.size
    })
  })

  // Download do Conteúdo da Sessão (Sistema, Regras, Catálogo de Conteúdo, Dados da Campanha)
  app.get('/api/session/bundle', (req, res) => {
    const queryCode = String(req.query.code || req.headers['x-session-code'] || '').trim().toUpperCase()

    if (!queryCode || queryCode !== activeCode) {
      return res.status(403).json({
        success: false,
        error: 'Código de acesso da sessão incorreto ou expirado.'
      })
    }

    const currentSession = getSessionById(activeSessionId!)
    if (!currentSession) {
      return res.status(404).json({ success: false, error: 'Sessão não encontrada.' })
    }

    const campaign = getCampaignById(currentSession.campaign_id)
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campanha não encontrada.' })
    }

    const system = getRpgSystemById(campaign.rpg_system_id)
    const content = system ? getSystemContent(system.id) : []
    const allSessions = getSessionsByCampaign(campaign.id)
    const members = getCampaignMembers(campaign.id)

    // Opcional: Se veio nome de usuário do jogador na requisição, registra na campanha local do host
    const joinUsername = String(req.query.username || req.headers['x-player-username'] || '').trim()
    if (joinUsername && activeCampaignId) {
      try {
        const db = getDb()
        let memberUser = db
          .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
          .get(joinUsername) as { id: number } | undefined
        if (!memberUser) {
          const res = db
            .prepare(`INSERT INTO users (username, password, created_at) VALUES (?, 'network_player', datetime('now'))`)
            .run(joinUsername)
          memberUser = { id: Number(res.lastInsertRowid) }
        }
        db.prepare(`
          INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
          VALUES (?, ?, 'player', datetime('now'))
          ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = role
        `).run(activeCampaignId, memberUser.id)
      } catch (err) {
        console.error('Erro ao registrar membro no host via HTTP:', err)
      }
    }

    const db = getDb()
    let campaignCharacters: unknown[] = []
    try {
      campaignCharacters = db.prepare('SELECT * FROM characters WHERE campaign_id = ?').all(campaign.id)
    } catch (e) {
      console.error('Erro ao carregar personagens para bundle:', e)
    }

    return res.json({
      success: true,
      session: {
        id: currentSession.id,
        title: currentSession.title,
        status: currentSession.status,
        started_at: currentSession.started_at,
        notes: currentSession.notes,
        access_code: activeCode
      },
      allSessions: allSessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        started_at: s.started_at,
        notes: s.notes,
        access_code: s.id === currentSession.id ? activeCode : s.access_code
      })),
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        status: campaign.status,
        rpg_system_id: campaign.rpg_system_id,
        owner_username: campaign.owner_username,
        members: members
      },
      system: system
        ? {
            id: system.id,
            name: system.name,
            slug: system.slug,
            genre: system.genre,
            version: system.version,
            description: system.description,
            structure: system.structure
          }
        : null,
      content: content,
      characters: campaignCharacters,
      stats: {
        totalContentItems: content.length,
        attributeGroupsCount: system?.structure?.attributeGroups?.length || 0
      },
      serverTime: new Date().toISOString()
    })
  })

  // Checagem e Sincronização de Dados Obsoletos (HTTP)
  app.post('/api/session/sync-check', (req, res) => {
    const result = performSyncCheck(req.body)
    return res.status(result.success ? 200 : 400).json(result)
  })

  // Cliente Web Integrado para Navegador (permite que jogadores conectem via navegador na rede/localhost)
  app.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(generateWebClientHtml(activeCode!))
  })

  const server = http.createServer(app)
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  activeIo = io

  // Handlers do Socket.io
  io.on('connection', (socket: Socket) => {
    // Jogador ou Mestre se conecta à sala da sessão
    socket.on(
      'session:join',
      (payload: {
        code: string
        user: { id?: number; username: string; role?: 'gm' | 'player' | 'observer' }
      }) => {
        const { code, user } = payload || {}
        const cleanCode = (code || '').trim().toUpperCase()

        if (!cleanCode || cleanCode !== activeCode) {
          socket.emit('session:error', { message: 'Código de sessão inválido ou incorreto.' })
          return
        }

        const participant: ConnectedParticipant = {
          socketId: socket.id,
          userId: user?.id,
          username: user?.username?.trim() || `Jogador_${socket.id.slice(0, 4)}`,
          role: user?.role || 'player',
          joinedAt: new Date().toISOString(),
          downloadedContent: true
        }

        participantsMap.set(socket.id, participant)
        socket.join(`session_${activeSessionId}`)

        // Se o participante for jogador, registra-o na tabela de membros da campanha no host
        if (activeCampaignId && user?.username) {
          try {
            const db = getDb()
            let memberUser = db
              .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
              .get(user.username.trim()) as { id: number } | undefined
            if (!memberUser) {
              const res = db
                .prepare(`INSERT INTO users (username, password, created_at) VALUES (?, 'network_player', datetime('now'))`)
                .run(user.username.trim())
              memberUser = { id: Number(res.lastInsertRowid) }
            }
            db.prepare(`
              INSERT INTO campaign_members (campaign_id, user_id, role, joined_at)
              VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(campaign_id, user_id) DO UPDATE SET role = role
            `).run(activeCampaignId, memberUser.id, user.role || 'player')
          } catch (err) {
            console.error('Erro ao registrar participante no host via socket:', err)
          }
        }

        // Confirmação para o próprio usuário que entrou
        socket.emit('session:joined', {
          participant,
          participants: Array.from(participantsMap.values()),
          sessionId: activeSessionId,
          accessCode: activeCode
        })

        // Notifica toda a sala (incluindo Mestre)
        io.to(`session_${activeSessionId}`).emit('session:participants_changed', {
          event: 'join',
          participant,
          participants: Array.from(participantsMap.values())
        })
      }
    )

    // Checagem e sincronização de dados obsoletos ao conectar/reconectar
    socket.on('session:sync_check', (payload: SyncCheckPayload) => {
      const result = performSyncCheck(payload)
      socket.emit('session:sync_result', result)

      if (result.playerCharactersAccepted > 0 && activeSessionId) {
        io.to(`session_${activeSessionId}`).emit('session:chat_received', {
          id: `sync_${Date.now()}`,
          user: { username: payload?.username || 'Sistema', role: 'system' },
          text: `Ficha de personagem sincronizada com o Mestre.`,
          type: 'system',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Mestre encerra a sessão via socket
    socket.on('session:end', (payload: { sessionId: number; campaignId?: number; notes?: string }) => {
      io.to(`session_${activeSessionId}`).emit('session:ended', {
        sessionId: payload.sessionId,
        campaignId: payload.campaignId || activeCampaignId,
        status: 'completed',
        notes: payload.notes || 'Sessão encerrada pelo Mestre.',
        ended_at: new Date().toISOString()
      })
      io.to(`session_${activeSessionId}`).emit('session:closed', {
        sessionId: payload.sessionId,
        campaignId: payload.campaignId || activeCampaignId,
        status: 'completed',
        message: 'O Mestre encerrou a sessão de jogo.'
      })
    })

    // Teste de Ping / Latência
    socket.on('session:ping', (payload: { timestamp: number }) => {
      const participant = participantsMap.get(socket.id)
      if (participant && payload?.timestamp) {
        const latency = Math.max(1, Date.now() - payload.timestamp)
        participant.pingMs = latency
        participantsMap.set(socket.id, participant)

        socket.emit('session:pong', { latency, serverTime: Date.now() })

        io.to(`session_${activeSessionId}`).emit('session:participants_changed', {
          event: 'ping',
          participant,
          participants: Array.from(participantsMap.values())
        })
      }
    })

    // Rolar Dados de Teste
    socket.on(
      'session:dice',
      (payload: { formula: string; result: number; breakdown?: string }) => {
        const participant = participantsMap.get(socket.id)
        const eventData = {
          id: `dice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          user: participant || { username: 'Anônimo', role: 'player' },
          formula: payload.formula || '1d20',
          result: payload.result,
          breakdown: payload.breakdown || '',
          timestamp: new Date().toISOString()
        }

        // Salva na tabela session_messages do SQLite
        try {
          const db = getDb()
          db.prepare(`
            INSERT INTO session_messages (session_id, user_id, type, content)
            VALUES (?, ?, 'roll', ?)
          `).run(
            activeSessionId,
            participant?.userId ?? null,
            JSON.stringify({ formula: payload.formula, result: payload.result, breakdown: payload.breakdown })
          )
        } catch (e) {
          console.error('Erro ao salvar roll na sessão:', e)
        }

        io.to(`session_${activeSessionId}`).emit('session:dice_rolled', eventData)
      }
    )

    // Chat / Mensagens de Teste
    socket.on('session:chat', (payload: { text: string; type?: string }) => {
      const participant = participantsMap.get(socket.id)
      if (!payload?.text?.trim()) return

      const eventData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user: participant || { username: 'Anônimo', role: 'player' },
        text: payload.text.trim(),
        type: payload.type || 'ooc',
        timestamp: new Date().toISOString()
      }

      try {
        const db = getDb()
        db.prepare(`
          INSERT INTO session_messages (session_id, user_id, type, content)
          VALUES (?, ?, ?, ?)
        `).run(
          activeSessionId,
          participant?.userId ?? null,
          payload.type || 'ooc',
          payload.text.trim()
        )
      } catch (e) {
        console.error('Erro ao salvar mensagem na sessão:', e)
      }

      io.to(`session_${activeSessionId}`).emit('session:chat_received', eventData)
    })

    // Desconexão
    socket.on('disconnect', () => {
      const participant = participantsMap.get(socket.id)
      if (participant) {
        participantsMap.delete(socket.id)
        io.to(`session_${activeSessionId}`).emit('session:participants_changed', {
          event: 'leave',
          participant,
          participants: Array.from(participantsMap.values())
        })
      }
    })
  })

  // Encontrar porta livre
  let bindPort = preferredPort
  const maxAttempts = 10

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            server.close()
            bindPort++
            resolve() // Tentar próxima
          } else {
            reject(err)
          }
        })

        server.listen(bindPort, '0.0.0.0', () => {
          activePort = bindPort
          activeHttpServer = server
          resolve()
        })
      })

      if (activeHttpServer && activePort) {
        break
      }
    } catch (err) {
      return {
        success: false,
        error: `Falha ao iniciar servidor HTTP/Socket.io: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  if (!activePort) {
    return {
      success: false,
      error: 'Não foi possível encontrar uma porta livre para iniciar o servidor da sessão.'
    }
  }

  return {
    success: true,
    port: activePort,
    accessCode: activeCode,
    localAddresses: getLocalIpAddresses()
  }
}

/**
 * Encerra o servidor de sessão ativo
 */
export async function stopSessionServer(endedInfo?: { sessionId?: number; notes?: string }): Promise<{ success: boolean }> {
  if (activeIo && activeSessionId) {
    const sId = endedInfo?.sessionId || activeSessionId
    activeIo.to(`session_${activeSessionId}`).emit('session:ended', {
      sessionId: sId,
      campaignId: activeCampaignId,
      status: 'completed',
      notes: endedInfo?.notes || 'Sessão encerrada pelo Mestre.',
      ended_at: new Date().toISOString()
    })
    activeIo.to(`session_${activeSessionId}`).emit('session:closed', {
      sessionId: sId,
      campaignId: activeCampaignId,
      status: 'completed',
      message: 'O Mestre encerrou a sessão.'
    })
    // Dá uma breve pausa para que os buffers de rede enviem o pacote antes de fechar os sockets
    await new Promise((resolve) => setTimeout(resolve, 600))
    activeIo.close()
    activeIo = null
  }

  if (activeHttpServer) {
    await new Promise<void>((resolve) => {
      activeHttpServer!.close(() => resolve())
    })
    activeHttpServer = null
  }

  activeSessionId = null
  activeCampaignId = null
  activeCode = null
  activePort = null
  participantsMap.clear()

  return { success: true }
}

/**
 * Gera uma página HTML completa e estilizada para permitir testes rápidos via navegador
 */
function generateWebClientHtml(initialCode: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VTT RPG - Conexão de Jogador</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #141414; color: #f5f5f5; display: flex; flex-direction: column; min-height: 100vh; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 20px; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #2e2e2e; padding-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; color: #ffffff; }
    .badge { padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-red { background-color: #450a0a; color: #f87171; border: 1px solid #991b1b; }
    .badge-green { background-color: #064e3b; color: #34d399; border: 1px solid #059669; }
    .card { background-color: #1e1e1e; border: 1px solid #2e2e2e; border-radius: 12px; padding: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #a3a3a3; margin-bottom: 6px; }
    input, button { width: 100%; padding: 12px; border-radius: 8px; font-size: 14px; outline: none; }
    input { background-color: #141414; border: 1px solid #333; color: #fff; margin-bottom: 14px; }
    input:focus { border-color: #e50914; }
    button { background-color: #e50914; color: white; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; }
    button:hover { background-color: #b80710; }
    .btn-secondary { background-color: #2e2e2e; color: #ddd; margin-top: 8px; }
    .btn-secondary:hover { background-color: #3e3e3e; }
    .steps { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
    .step-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #888; }
    .step-item.active { color: #f59e0b; font-weight: 600; }
    .step-item.done { color: #10b981; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
    .participant-list { list-style: none; display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
    .participant-item { display: flex; align-items: center; justify-content: space-between; background: #141414; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
    .log-box { background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 12px; height: 180px; overflow-y: auto; font-family: monospace; font-size: 12px; color: #4ade80; display: flex; flex-direction: column; gap: 4px; }
    .controls { display: flex; gap: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>VTT RPG - Acesso de Jogador</h1>
        <p style="font-size: 13px; color: #888; margin-top: 4px;">Conecte-se à sessão do Mestre e sincronize as regras do sistema</p>
      </div>
      <span id="connectionBadge" class="badge badge-red">Desconectado</span>
    </header>

    <!-- TELA 1: LOGIN / ACESSO -->
    <div id="joinView" class="card">
      <h2 style="font-size: 18px; margin-bottom: 14px; color: #fff;">Entrar na Sessão</h2>
      
      <label>Seu Nome de Jogador:</label>
      <input type="text" id="usernameInput" placeholder="Ex: Gandalf, Legolas..." value="Jogador Web" />

      <label>Código da Sessão (6 dígitos):</label>
      <input type="text" id="codeInput" placeholder="Ex: ${initialCode}" value="${initialCode}" maxlength="6" style="text-transform: uppercase; font-weight: bold; letter-spacing: 2px;" />

      <button id="connectBtn" onclick="startJoinFlow()">1. Baixar Conteúdo e Conectar</button>

      <div id="stepsContainer" class="steps" style="display: none;">
        <div id="step1" class="step-item active">⏳ 1. Baixando regras do sistema e catálogo de conteúdo...</div>
        <div id="step2" class="step-item">⏳ 2. Estabelecendo conexão em tempo real (Socket.io)...</div>
        <div id="step3" class="step-item">⏳ 3. Sincronizado e pronto para jogar!</div>
      </div>
    </div>

    <!-- TELA 2: SALA CONECTADA (ABSTRAÇÃO DA SESSÃO ABERTA) -->
    <div id="sessionView" class="card" style="display: none;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #2e2e2e; padding-bottom: 12px;">
        <div>
          <h2 id="sessionTitle" style="font-size: 20px; color: #fff;">Sessão Conectada</h2>
          <p id="campaignTitle" style="font-size: 14px; color: #aaa; margin-top: 2px;">Campanha</p>
        </div>
        <button onclick="leaveSession()" style="width: auto; padding: 6px 14px; font-size: 12px; background: #333;">Desconectar</button>
      </div>

      <div class="grid">
        <!-- Detalhes do Conteúdo Baixado -->
        <div class="card" style="background: #141414;">
          <h3 style="font-size: 14px; color: #10b981; margin-bottom: 10px;">📦 Conteúdo Baixado com Sucesso</h3>
          <p style="font-size: 13px; color: #ccc;">Sistema: <strong id="systemName" style="color: #fff;">—</strong></p>
          <p style="font-size: 13px; color: #ccc; margin-top: 4px;">Mestre da Mesa: <strong id="gmName" style="color: #fff;">—</strong></p>
          <p style="font-size: 13px; color: #ccc; margin-top: 4px;">Itens/Regras no Catálogo: <strong id="contentCount" style="color: #fff;">0</strong></p>
          <p style="font-size: 13px; color: #ccc; margin-top: 4px;">Grupos de Atributos: <strong id="attrCount" style="color: #fff;">0</strong></p>
        </div>

        <!-- Participantes Conectados -->
        <div class="card" style="background: #141414;">
          <h3 style="font-size: 14px; color: #60a5fa; margin-bottom: 10px;">👥 Participantes (<span id="userCount">0</span>)</h3>
          <ul id="participantsList" class="participant-list"></ul>
        </div>
      </div>

      <!-- Testes de Funcionamento em Tempo Real -->
      <div style="margin-top: 20px;">
        <h3 style="font-size: 14px; color: #e50914; margin-bottom: 10px;">⚡ Testes de Verificação do Socket.io</h3>
        <div class="controls">
          <button onclick="sendPing()" style="background: #2563eb;">📡 Testar Latência (Ping)</button>
          <button onclick="rollDice('1d20')" style="background: #059669;">🎲 Rolar 1d20</button>
          <button onclick="sendTestChat()" style="background: #d97706;">💬 Testar Chat</button>
        </div>
      </div>

      <!-- Log de Eventos -->
      <div style="margin-top: 16px;">
        <label>Feed de Eventos da Sessão:</label>
        <div id="logBox" class="log-box"></div>
      </div>
    </div>
  </div>

  <script>
    let socket = null;
    let downloadedBundle = null;
    let currentUser = null;

    function log(msg) {
      const box = document.getElementById('logBox');
      const time = new Date().toLocaleTimeString();
      const p = document.createElement('div');
      p.textContent = '[' + time + '] ' + msg;
      box.appendChild(p);
      box.scrollTop = box.scrollHeight;
    }

    async function startJoinFlow() {
      const username = document.getElementById('usernameInput').value.trim() || 'Jogador Web';
      const code = document.getElementById('codeInput').value.trim().toUpperCase();

      if (!code) {
        alert('Por favor, informe o código de acesso da sessão.');
        return;
      }

      document.getElementById('stepsContainer').style.display = 'flex';
      document.getElementById('connectBtn').disabled = true;

      // PASSO 1: BAIXAR CONTEÚDO VIA HTTP EXPRESS
      try {
        const res = await fetch('/api/session/bundle?code=' + encodeURIComponent(code));
        const data = await res.json();

        if (!data.success) {
          alert('Erro ao baixar conteúdo: ' + (data.error || 'Código inválido'));
          document.getElementById('connectBtn').disabled = false;
          return;
        }

        downloadedBundle = data;
        document.getElementById('step1').className = 'step-item done';
        document.getElementById('step1').textContent = '✓ 1. Regras do sistema e conteúdo baixados (' + data.stats.totalContentItems + ' itens)';
      } catch (err) {
        alert('Falha na comunicação com o servidor: ' + err.message);
        document.getElementById('connectBtn').disabled = false;
        return;
      }

      // PASSO 2: CONECTAR VIA SOCKET.IO
      document.getElementById('step2').className = 'step-item active';

      currentUser = { username: username, role: 'player' };
      socket = io();

      socket.on('connect', () => {
        socket.emit('session:join', {
          code: code,
          user: currentUser
        });
      });

      socket.on('session:joined', (info) => {
        document.getElementById('step2').className = 'step-item done';
        document.getElementById('step2').textContent = '✓ 2. Conectado via Socket.io com sucesso!';
        document.getElementById('step3').className = 'step-item done';
        document.getElementById('step3').textContent = '✓ 3. Pronto!';

        setTimeout(() => {
          showSessionView(info);
        }, 500);
      });

      socket.on('session:error', (err) => {
        alert(err.message || 'Erro ao conectar à sessão');
        socket.disconnect();
        document.getElementById('connectBtn').disabled = false;
      });

      socket.on('session:participants_changed', (data) => {
        updateParticipants(data.participants);
        if (data.event === 'join') {
          log(data.participant.username + ' entrou na sessão.');
        } else if (data.event === 'leave') {
          log(data.participant.username + ' saiu da sessão.');
        }
      });

      socket.on('session:pong', (data) => {
        log('Pong recebido! Latência: ' + data.latency + 'ms');
      });

      socket.on('session:dice_rolled', (data) => {
        log(data.user.username + ' rolou ' + data.formula + ': [' + data.result + ']');
      });

      socket.on('session:chat_received', (data) => {
        log(data.user.username + ': ' + data.text);
      });

      socket.on('session:closed', (data) => {
        alert(data.message || 'Sessão encerrada.');
        leaveSession();
      });
    }

    function showSessionView(joinedInfo) {
      document.getElementById('joinView').style.display = 'none';
      document.getElementById('sessionView').style.display = 'block';

      const badge = document.getElementById('connectionBadge');
      badge.className = 'badge badge-green';
      badge.textContent = 'Conectado';

      document.getElementById('sessionTitle').textContent = downloadedBundle.session.title || 'Sessão de Jogo';
      document.getElementById('campaignTitle').textContent = 'Campanha: ' + (downloadedBundle.campaign.title || 'VTT');
      document.getElementById('systemName').textContent = downloadedBundle.system ? downloadedBundle.system.name : 'Personalizado';
      document.getElementById('gmName').textContent = downloadedBundle.campaign.owner_username || 'Mestre';
      document.getElementById('contentCount').textContent = downloadedBundle.stats.totalContentItems + ' itens carregados';
      document.getElementById('attrCount').textContent = downloadedBundle.stats.attributeGroupsCount + ' grupos';

      updateParticipants(joinedInfo.participants);
      log('Conectado com sucesso à sessão #' + downloadedBundle.session.id + '!');
      log('Regras e catálogo do sistema carregados.');
    }

    function updateParticipants(list) {
      const ul = document.getElementById('participantsList');
      ul.innerHTML = '';
      document.getElementById('userCount').textContent = list.length;

      list.forEach(p => {
        const li = document.createElement('li');
        li.className = 'participant-item';
        const roleTag = p.role === 'gm' ? '<span style="color:#ef4444; font-weight:bold;">[Mestre]</span> ' : '';
        const pingTag = p.pingMs ? ' <span style="color:#10b981; font-size:11px;">(' + p.pingMs + 'ms)</span>' : '';
        li.innerHTML = '<span>' + roleTag + p.username + pingTag + '</span><span style="color:#10b981;">●</span>';
        ul.appendChild(li);
      });
    }

    function sendPing() {
      if (!socket) return;
      log('Enviando Ping para o servidor...');
      socket.emit('session:ping', { timestamp: Date.now() });
    }

    function rollDice(formula) {
      if (!socket) return;
      const result = Math.floor(Math.random() * 20) + 1;
      socket.emit('session:dice', { formula: formula, result: result });
    }

    function sendTestChat() {
      if (!socket) return;
      const text = prompt('Digite a mensagem de teste:', 'Olá Mestre e jogadores!');
      if (text) {
        socket.emit('session:chat', { text: text });
      }
    }

    function leaveSession() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      location.reload();
    }
  </script>
</body>
</html>`
}
