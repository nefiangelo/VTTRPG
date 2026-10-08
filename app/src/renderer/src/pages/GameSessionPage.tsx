import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import type {
  Session,
  CampaignWithDetails,
  RpgSystemFull,
  ConnectedParticipant,
  SessionBundleResult,
  CharacterEntry,
  SyncCheckPayload,
  SyncCheckResult,
  CampaignNode,
  PersistentParticipant
} from '../../../preload/index.d'
import SessionSidebar from '../components/session/SessionSidebar'
import VttGridCanvas, { ActiveHandout } from '../components/session/VttGridCanvas'
import { createLocalLibraryClient, createRemoteLibraryClient, LibraryClient } from '../services/libraryClient'
import type { LogEntry } from '../components/session/LogsTab'

export default function GameSessionPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Estado passado da navegação de Join (se for jogador)
  const locationState = location.state as {
    isPlayer?: boolean
    downloadedBundle?: SessionBundleResult
    serverUrl?: string
    accessCode?: string
  } | null

  // Identificação do papel
  const [isPlayerMode, setIsPlayerMode] = useState<boolean>(!!locationState?.isPlayer)

  // Dados da sessão e da campanha
  const [session, setSession] = useState<Session | null>(
    (locationState?.downloadedBundle?.session as Session) || null
  )
  const [campaign, setCampaign] = useState<CampaignWithDetails | null>(
    (locationState?.downloadedBundle?.campaign as CampaignWithDetails) || null
  )
  const [system, setSystem] = useState<RpgSystemFull | null>(
    locationState?.downloadedBundle?.system || null
  )
  const [_characters, setCharacters] = useState<CharacterEntry[]>([])

  // Sincronização entre Jogador e GM
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'up-to-date' | 'updated' | 'error'>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // Servidor & Conexão
  const [serverPort, setServerPort] = useState<number>(3001)
  const [accessCode, setAccessCode] = useState<string>(
    locationState?.accessCode || locationState?.downloadedBundle?.session?.access_code || ''
  )
  const [localAddresses, setLocalAddresses] = useState<string[]>([])
  const [serverUrl, setServerUrl] = useState<string>(locationState?.serverUrl || 'http://localhost:3001')

  // Status Socket.io
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [currentPing, setCurrentPing] = useState<number | null>(null)
  const [participants, setParticipants] = useState<ConnectedParticipant[]>([])

  // Logs e Chat
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [chatMessage, setChatMessage] = useState('')

  // Apresentação de Handout / Imagem na mesa para todos
  const [activeHandout, setActiveHandout] = useState<ActiveHandout | null>(null)

  // Versão da biblioteca para re-renderizações acionadas por sockets
  const [libraryVersion, setLibraryVersion] = useState(0)

  // Participantes persistentes registrados na sessão/campanha
  const [persistentParticipants, setPersistentParticipants] = useState<PersistentParticipant[]>([])

  // Modais de encerramento
  const [showEndModal, setShowEndModal] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  // Referências para valores atualizados em callbacks assíncronos do socket
  const socketRef = useRef<Socket | null>(null)
  const campaignRef = useRef(campaign)
  campaignRef.current = campaign
  const systemRef = useRef(system)
  systemRef.current = system
  const sessionRef = useRef(session)
  sessionRef.current = session
  const accessCodeRef = useRef(accessCode)
  accessCodeRef.current = accessCode

  // Adiciona entrada ao log do console da sessão
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date())

    setLogs((prev) => [
      ...prev.slice(-100),
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        time,
        type,
        message
      }
    ])
  }, [])

  // Cliente de Conteúdos da Campanha (Pastas, Fichas, Notas, Imagens)
  const libraryClient = useMemo<LibraryClient | null>(() => {
    if (!user) return null
    if (isPlayerMode) {
      return accessCode
        ? createRemoteLibraryClient({ serverUrl, code: accessCode, username: user.username })
        : null
    }
    return campaign?.id ? createLocalLibraryClient(campaign.id, user.id, session?.id) : null
  }, [user, isPlayerMode, accessCode, serverUrl, campaign?.id, session?.id, libraryVersion])

  // Função para checar e sincronizar dados com o Mestre
  const runSyncCheck = useCallback(
    async (customSocket?: Socket) => {
      const activeSocket = customSocket || socketRef.current
      if (!activeSocket || !activeSocket.connected) {
        addLog('Socket não conectado. Não é possível verificar sincronização no momento.', 'warn')
        return
      }

      const curCampaign = campaignRef.current
      if (!curCampaign) {
        addLog('Dados locais da campanha ainda não carregados.', 'warn')
        return
      }

      setSyncStatus('syncing')
      addLog('🔍 Verificando integridade e sincronização de dados com o Mestre...', 'info')

      try {
        const curSystem = systemRef.current
        const [localChars, localSessions] = await Promise.all([
          window.api.characters.getByCampaign(curCampaign.id),
          window.api.sessions.getByCampaign(curCampaign.id)
        ])

        if (localChars) setCharacters(localChars)

        const payload: SyncCheckPayload = {
          code: accessCodeRef.current,
          campaignId: curCampaign.id,
          campaignUpdatedAt: curCampaign.created_at,
          systemId: curSystem?.id,
          systemUpdatedAt: curSystem?.updated_at,
          sessions: (localSessions || []).map((s) => ({
            id: s.id,
            updatedAt: s.updated_at || s.created_at,
            status: s.status,
            title: s.title || undefined
          })),
          characters: (localChars || []).map((c) => ({
            id: c.id,
            name: c.name,
            avatar_url: c.avatar_url,
            role: c.role,
            sheet_data: c.sheet_data,
            updated_at: c.updated_at
          })),
          userId: user?.id,
          username: user?.username
        }

        activeSocket.emit('session:sync_check', payload)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        addLog(`Erro ao preparar verificação de sincronização: ${msg}`, 'warn')
        setSyncStatus('error')
      }
    },
    [user, addLog]
  )

  // Inicialização e Conexão
  useEffect(() => {
    let isCancelled = false

    async function initSession() {
      // CENÁRIO 1: JOGADOR (Veio da tela de Join com bundle baixado)
      if (locationState?.isPlayer && locationState?.downloadedBundle) {
        setIsPlayerMode(true)
        const bundle = locationState.downloadedBundle
        setSession(bundle.session as Session)
        setCampaign(bundle.campaign as CampaignWithDetails)
        setSystem(bundle.system)
        setAccessCode(bundle.session.access_code)

        if (bundle.campaign?.id) {
          window.api.characters.getByCampaign(bundle.campaign.id).then((chars) => {
            if (!isCancelled && chars) setCharacters(chars)
          })
        }

        const targetUrl = locationState.serverUrl || 'http://localhost:3001'
        setServerUrl(targetUrl)

        addLog(`Conteúdo do sistema "${bundle.system?.name || 'Personalizado'}" carregado com sucesso.`, 'success')
        addLog(`Iniciando conexão Socket.io com ${targetUrl}...`, 'info')

        connectSocket(targetUrl, bundle.session.access_code, 'player')
        return
      }

      // CENÁRIO 2: MESTRE (Acesso direto à sessão pelo painel da campanha)
      if (!sessionId || isNaN(sessionId)) {
        addLog('ID de sessão inválido.', 'warn')
        setConnectionStatus('error')
        return
      }

      try {
        addLog('Carregando informações da sessão e campanha no banco local...', 'info')
        const sessionData = await window.api.sessions.getById(sessionId)

        if (!sessionData) {
          addLog('Sessão não encontrada no banco de dados.', 'warn')
          setConnectionStatus('error')
          return
        }

        if (isCancelled) return
        setSession(sessionData)

        const campaignData = await window.api.campaigns.getById(sessionData.campaign_id)
        if (campaignData) {
          setCampaign(campaignData)

          const chars = await window.api.characters.getByCampaign(campaignData.id)
          if (!isCancelled && chars) setCharacters(chars)

          if (campaignData.rpg_system_id) {
            const systemData = await window.api.systems.getById(campaignData.rpg_system_id)
            if (systemData) {
              setSystem(systemData)
            }
          }
        }

        const isOwner = campaignData?.owner_id === user?.id
        const isPlayer = locationState?.isPlayer ?? !isOwner

        if (isPlayer) {
          setIsPlayerMode(true)
          if (sessionData.status === 'completed') {
            addLog('Esta sessão já se encontra encerrada.', 'warn')
            alert('Esta sessão já foi concluída e encerrada.')
            navigate(`/campaigns/${campaignData?.id || sessionData.campaign_id}/sessions`)
            return
          }
          const targetUrl = locationState?.serverUrl || sessionData.server_url || 'http://localhost:3001'
          const targetCode = locationState?.accessCode || sessionData.access_code || ''
          setServerUrl(targetUrl)
          setAccessCode(targetCode)

          addLog(`Iniciando conexão como Jogador com o servidor em ${targetUrl}...`, 'info')
          connectSocket(targetUrl, targetCode, 'player')
          return
        }

        // Inicia o servidor Node.js Express + Socket.io como Mestre
        setIsPlayerMode(false)
        addLog('Iniciando servidor Node.js Express e Socket.io para a sessão...', 'info')
        const startResult = await window.api.server.start(sessionId)

        if (!startResult.success || !startResult.port || !startResult.accessCode) {
          addLog(`Falha ao iniciar servidor: ${startResult.error || 'Erro desconhecido'}`, 'warn')
          setConnectionStatus('error')
          return
        }

        if (isCancelled) return
        setServerPort(startResult.port)
        setAccessCode(startResult.accessCode)
        setLocalAddresses(startResult.localAddresses || [])

        const hostUrl = `http://localhost:${startResult.port}`
        setServerUrl(hostUrl)

        addLog(`✓ Servidor Express ativo na porta ${startResult.port}!`, 'success')
        addLog(`✓ Código de Acesso gerado: ${startResult.accessCode}`, 'success')
        addLog(`Conectando Mestre ao canal de tempo real local...`, 'info')

        if (user?.username && sessionId && campaignData?.id) {
          try {
            await window.api.sessions.recordParticipant({
              sessionId,
              campaignId: campaignData.id,
              username: user.username,
              role: 'gm'
            })
          } catch (e) {
            console.error('Erro ao registrar GM persistentemente:', e)
          }
        }

        try {
          const parts = await window.api.sessions.getParticipants(sessionId, campaignData?.id)
          if (!isCancelled && parts) {
            setPersistentParticipants(parts)
          }
        } catch (e) {
          console.error('Erro ao carregar participantes persistentes:', e)
        }

        connectSocket(hostUrl, startResult.accessCode, 'gm')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        addLog(`Erro ao inicializar sessão: ${msg}`, 'warn')
        setConnectionStatus('error')
      }
    }

    initSession()

    return () => {
      isCancelled = true
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [sessionId, locationState, addLog, navigate, user])

  // Estabelece a conexão Socket.io com os handlers de eventos
  const connectSocket = (url: string, code: string, role: 'gm' | 'player') => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }

    setConnectionStatus('connecting')

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setConnectionStatus('connected')
      addLog(`✓ Conexão WebSocket estabelecida com sucesso! ID: ${socket.id}`, 'success')

      socket.emit('session:join', {
        code,
        user: {
          id: user?.id,
          username: user?.username || (role === 'gm' ? 'Mestre' : 'Jogador'),
          role
        }
      })
    })

    socket.on(
      'session:joined',
      (data: { participant: ConnectedParticipant; participants: ConnectedParticipant[] }) => {
        addLog(`Registrado na sala da sessão como [${role.toUpperCase()}].`, 'success')
        setParticipants(data.participants || [])

        if (role === 'player') {
          setTimeout(() => {
            runSyncCheck(socket)
          }, 600)
        }
      }
    )

    socket.on('session:sync_result', async (data: SyncCheckResult) => {
      const now = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date())
      setLastSyncTime(now)

      if (!data.success) {
        addLog(`⚠️ Erro na sincronização: ${data.error || 'Falha no servidor do Mestre'}`, 'warn')
        setSyncStatus('error')
        return
      }

      if (data.isUpToDate) {
        addLog('✓ Todos os dados locais estão atualizados com o Mestre.', 'success')
        setSyncStatus('up-to-date')
        return
      }

      addLog(`🔄 Dados obsoletos detectados (${data.obsoleteElements.join(', ')}). Sincronizando com o Mestre...`, 'info')

      try {
        const targetCampaignId = campaignRef.current?.id || session?.campaign_id || 0
        const applyRes = await window.api.sessions.applySyncUpdate(
          {
            campaignId: targetCampaignId,
            ...data.updatedData
          },
          user?.id
        )
        if (!applyRes.success) {
          addLog(`⚠️ Falha ao salvar dados sincronizados no banco local: ${applyRes.error}`, 'warn')
          setSyncStatus('error')
          return
        }

        if (data.updatedData.campaign) {
          setCampaign((prev) =>
            prev ? { ...prev, ...data.updatedData.campaign } : (data.updatedData.campaign as CampaignWithDetails)
          )
        }
        if (data.updatedData.system) {
          setSystem(data.updatedData.system)
        }
        if (data.updatedData.sessions && data.updatedData.sessions.length > 0) {
          const active =
            data.updatedData.sessions.find((s) => s.id === sessionRef.current?.id) || data.updatedData.sessions[0]
          if (active) setSession(active)
        }
        if (data.updatedData.characters) {
          setCharacters(data.updatedData.characters)
        }

        addLog(`✓ Sincronização concluída com sucesso! Atualizados: ${data.obsoleteElements.join(', ')}`, 'success')
        setSyncStatus('updated')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        addLog(`Erro ao aplicar sincronização: ${msg}`, 'warn')
        setSyncStatus('error')
      }
    })

    socket.on('session:persistent_participants_updated', (data: { participants: PersistentParticipant[] }) => {
      if (data?.participants) {
        setPersistentParticipants(data.participants)
        addLog('Lista de participantes persistentes atualizada.', 'info')
      }
    })

    socket.on('session:participants_changed', async (data: {
      event: 'join' | 'leave' | 'ping'
      participant: ConnectedParticipant
      participants: ConnectedParticipant[]
    }) => {
      setParticipants(data.participants || [])

      if (data.event === 'join') {
        const roleLabel = data.participant.role === 'gm' ? '👑 Mestre' : '🛡️ Jogador'
        addLog(`${roleLabel} "${data.participant.username}" entrou na sala.`, 'info')

        try {
          const targetSessionId = sessionRef.current?.id || sessionId
          const targetCampaignId = campaignRef.current?.id
          if (targetSessionId && targetCampaignId && window.api?.sessions?.getParticipants) {
            const parts = await window.api.sessions.getParticipants(targetSessionId, targetCampaignId)
            if (parts && parts.length > 0) {
              setPersistentParticipants(parts)
            }
          }
        } catch {
          // ignora caso não seja host local
        }
      } else if (data.event === 'leave') {
        addLog(`Participante "${data.participant.username}" desconectou da sala.`, 'warn')
      }
    })

    socket.on('session:pong', (data: { latency: number }) => {
      setCurrentPing(data.latency)
      addLog(`📡 Ping respondido pelo servidor: ${data.latency}ms`, 'info')
    })

    socket.on('session:dice_rolled', (data: {
      user: { username: string; role: string }
      formula: string
      result: number
      breakdown?: string
    }) => {
      addLog(`🎲 ${data.user.username} rolou ${data.formula}: [ ${data.result} ]`, 'dice')
    })

    socket.on('session:chat_received', (data: {
      user: { username: string; role: string }
      text: string
    }) => {
      addLog(`💬 ${data.user.username}: ${data.text}`, 'chat')
    })

    // Apresentação de Handout na Mesa
    socket.on('session:handout_shown', (data: ActiveHandout) => {
      setActiveHandout(data)
      addLog(`📢 ${data.by} apresentou na mesa: "${data.title}"`, 'info')
    })

    // Atualização em Tempo Real da Biblioteca de Conteúdo (Pastas/Arquivos)
    socket.on('session:library_updated', () => {
      setLibraryVersion((v) => v + 1)
      addLog('📁 Biblioteca da campanha atualizada em tempo real.', 'info')
    })

    const handleSessionEndedOrClosed = async (data: {
      sessionId?: number
      campaignId?: number
      status?: string
      notes?: string
      ended_at?: string
      message?: string
    }) => {
      const targetSessionId = data?.sessionId || sessionRef.current?.id
      const targetCampaignId =
        data?.campaignId || campaignRef.current?.id || sessionRef.current?.campaign_id

      addLog(`⚠️ Sessão encerrada: ${data?.message || 'O Mestre encerrou a sessão de jogo.'}`, 'warn')

      if (targetCampaignId && targetSessionId) {
        try {
          await window.api.sessions.applySyncUpdate(
            {
              campaignId: targetCampaignId,
              sessions: [
                {
                  id: targetSessionId,
                  status: 'completed',
                  ended_at: data?.ended_at || new Date().toISOString(),
                  notes: data?.notes || undefined,
                  updated_at: new Date().toISOString()
                }
              ]
            },
            user?.id
          )
        } catch (e) {
          console.error('Erro ao salvar status da sessão encerrada no SQLite local:', e)
        }
      }

      setSession((prev) => (prev ? { ...prev, status: 'completed' } : null))
      alert(data?.message || 'A sessão de jogo foi encerrada pelo Mestre.')

      if (targetCampaignId) {
        navigate(`/campaigns/${targetCampaignId}/sessions`)
      } else {
        navigate('/home')
      }
    }

    socket.on('session:ended', handleSessionEndedOrClosed)
    socket.on('session:closed', handleSessionEndedOrClosed)

    socket.on('session:error', (err: { message?: string }) => {
      addLog(`Erro de sessão: ${err.message || 'Código inválido'}`, 'warn')
      setConnectionStatus('error')
    })

    socket.on('disconnect', (reason) => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
      addLog(`Desconectado do servidor Socket.io: ${reason}`, 'warn')
    })

    socket.on('connect_error', (err) => {
      setIsConnected(false)
      setConnectionStatus('error')
      addLog(`Erro de conexão com o servidor: ${err.message}`, 'warn')
    })
  }

  // Ações em Tempo Real
  const handleTestPing = () => {
    if (!socketRef.current || !isConnected) return
    addLog('Enviando Ping para medição de latência...', 'info')
    socketRef.current.emit('session:ping', { timestamp: Date.now() })
  }

  const handleRollDice = (formula: string = '1d20') => {
    if (!socketRef.current || !isConnected) return

    let result = 1
    if (formula === '1d20') {
      result = Math.floor(Math.random() * 20) + 1
    } else if (formula === '2d6') {
      const d1 = Math.floor(Math.random() * 6) + 1
      const d2 = Math.floor(Math.random() * 6) + 1
      result = d1 + d2
    } else if (formula === '1d100') {
      result = Math.floor(Math.random() * 100) + 1
    } else if (formula === '1d8') {
      result = Math.floor(Math.random() * 8) + 1
    } else if (formula === '1d4') {
      result = Math.floor(Math.random() * 4) + 1
    } else if (formula === '1d10') {
      result = Math.floor(Math.random() * 10) + 1
    } else if (formula === '1d12') {
      result = Math.floor(Math.random() * 12) + 1
    } else {
      // Fórmula genérica simples
      result = Math.floor(Math.random() * 20) + 1
    }

    socketRef.current.emit('session:dice', { formula, result })
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || !socketRef.current || !isConnected) return

    socketRef.current.emit('session:chat', {
      text: chatMessage.trim(),
      type: 'ooc'
    })
    setChatMessage('')
  }

  const handleShowToTable = (node: CampaignNode) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('session:show_handout', {
      nodeId: node.id,
      type: node.type,
      title: node.name,
      data: node.data
    })
  }

  const handleLibraryChanged = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('session:library_reload')
    }
  }

  // Mestre encerra a sessão
  const handleConfirmEndSession = async () => {
    setIsEnding(true)
    try {
      if (session) {
        await window.api.sessions.end(session.id, 'Sessão encerrada pelo Mestre.')
      }
      if (socketRef.current) {
        socketRef.current.emit('session:end', {
          sessionId: session?.id,
          campaignId: campaign?.id || session?.campaign_id,
          notes: 'Sessão encerrada pelo Mestre.'
        })
      }
      await window.api.server.stop({
        sessionId: session?.id,
        notes: 'Sessão encerrada pelo Mestre.'
      })
      addLog('Sessão encerrada e servidor finalizado.', 'info')
      setShowEndModal(false)
      navigate(`/campaigns/${campaign?.id || session?.campaign_id || ''}/sessions`)
    } catch (err) {
      console.error(err)
      alert('Erro ao encerrar sessão.')
    } finally {
      setIsEnding(false)
    }
  }

  // Jogador marca sessão como encerrada localmente
  const handlePlayerMarkSessionEnded = async () => {
    const targetCampaignId = campaign?.id || session?.campaign_id
    const targetSessionId = session?.id
    if (targetCampaignId && targetSessionId) {
      try {
        await window.api.sessions.applySyncUpdate(
          {
            campaignId: targetCampaignId,
            sessions: [
              {
                id: targetSessionId,
                status: 'completed',
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          },
          user?.id
        )
      } catch (err) {
        console.error('Erro ao atualizar status local da sessão:', err)
      }
      navigate(`/campaigns/${targetCampaignId}/sessions`)
    } else {
      navigate('/home')
    }
  }

  // Sair da sala sem encerrar
  const handleLeaveSession = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    if (campaign?.id || session?.campaign_id) {
      navigate(`/campaigns/${campaign?.id || session?.campaign_id}/sessions`)
    } else {
      navigate('/home')
    }
  }

  return (
    <div className='flex flex-row h-screen overflow-hidden bg-vtt-dark text-vtt-light font-sans'>
      {/* ── BARRA LATERAL COM ABAS E EXPLORADOR DE CONTEÚDO ── */}
      <SessionSidebar
        isPlayerMode={isPlayerMode}
        session={session}
        campaign={campaign}
        system={system}
        participants={participants}
        persistentParticipants={persistentParticipants}
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        currentPing={currentPing}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        accessCode={accessCode}
        serverUrl={serverUrl}
        serverPort={serverPort}
        localAddresses={localAddresses}
        logs={logs}
        setChatMessage={setChatMessage}
        libraryClient={libraryClient}
        onSync={() => runSyncCheck()}
        onPing={handleTestPing}
        onRoll={handleRollDice}
        onSendChat={handleSendChat}
        onClearLogs={() => setLogs([])}
        onLeave={handleLeaveSession}
        onEndSession={() => setShowEndModal(true)}
        onMarkEnded={handlePlayerMarkSessionEnded}
        onShowToTable={handleShowToTable}
        onLibraryChanged={handleLibraryChanged}
      />

      {/* ── ÁREA DA GRID VTT (OCUPA TODO O RESTANTE DA TELA) ── */}
      <VttGridCanvas
        campaignTitle={campaign?.title}
        sessionTitle={session?.title || undefined}
        activeHandout={activeHandout}
        onCloseHandout={() => setActiveHandout(null)}
        isConnected={isConnected}
        currentPing={currentPing}
      />

      {/* ── MODAL DE CONFIRMAÇÃO PARA ENCERRAR SESSÃO ── */}
      {showEndModal && (
        <div className='fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none'>
          <div className='bg-vtt-dark border border-vtt-dark-gray rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center gap-2.5 text-vtt-red'>
              <span className='text-xl'>⚠️</span>
              <h3 className='text-base font-bold text-vtt-golden font-cinzel'>Encerrar Sessão de Jogo?</h3>
            </div>

            <p className='text-xs text-neutral-300 leading-relaxed'>
              Ao encerrar a sessão, o servidor Express e Socket.io serão finalizados, os jogadores serão
              desconectados e o status da sessão será alterado para <strong>Concluída</strong>.
            </p>

            <div className='flex items-center justify-end gap-3 pt-3 border-t border-vtt-dark-gray'>
              <button
                type='button'
                onClick={() => setShowEndModal(false)}
                disabled={isEnding}
                className='px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer'
              >
                Cancelar
              </button>

              <button
                type='button'
                onClick={handleConfirmEndSession}
                disabled={isEnding}
                className='px-5 py-2 rounded-lg bg-vtt-red hover:bg-vtt-dark-red text-white text-xs font-semibold transition-colors cursor-pointer shadow'
              >
                {isEnding ? 'Encerrando...' : 'Confirmar Encerramento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
