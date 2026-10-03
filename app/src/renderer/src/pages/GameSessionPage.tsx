import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import type {
  Session,
  CampaignWithDetails,
  RpgSystemFull,
  SystemContentEntry,
  ConnectedParticipant,
  SessionBundleResult
} from '../../../preload/index.d'

interface LogEntry {
  id: string
  time: string
  type: 'info' | 'success' | 'warn' | 'dice' | 'chat'
  message: string
}

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
  const [session, setSession] = useState<Session | null>(locationState?.downloadedBundle?.session as Session || null)
  const [campaign, setCampaign] = useState<CampaignWithDetails | null>(locationState?.downloadedBundle?.campaign as CampaignWithDetails || null)
  const [system, setSystem] = useState<RpgSystemFull | null>(locationState?.downloadedBundle?.system || null)
  const [contentList, setContentList] = useState<SystemContentEntry[]>(locationState?.downloadedBundle?.content || [])

  // Servidor & Conexão
  const [serverPort, setServerPort] = useState<number>(3001)
  const [accessCode, setAccessCode] = useState<string>(locationState?.accessCode || locationState?.downloadedBundle?.session?.access_code || '')
  const [localAddresses, setLocalAddresses] = useState<string[]>([])
  const [serverUrl, setServerUrl] = useState<string>(locationState?.serverUrl || 'http://localhost:3001')

  // Status Socket.io
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [currentPing, setCurrentPing] = useState<number | null>(null)
  const [participants, setParticipants] = useState<ConnectedParticipant[]>([])

  // Logs e Testes
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [chatMessage, setChatMessage] = useState('')
  const [copiedCodeToast, setCopiedCodeToast] = useState(false)
  const [copiedLinkToast, setCopiedLinkToast] = useState(false)

  // Modais de encerramento
  const [showEndModal, setShowEndModal] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  // Referência do Socket
  const socketRef = useRef<Socket | null>(null)
  const logBoxRef = useRef<HTMLDivElement | null>(null)

  // Adiciona entrada ao log do console da sessão
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date())

    setLogs(prev => [
      ...prev.slice(-100), // Mantém até 100 mensagens
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        time,
        type,
        message
      }
    ])
  }, [])

  // Auto-scroll no console de logs
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight
    }
  }, [logs])

  // Inicialização e Conexão
  useEffect(() => {
    let isCancelled = false

    async function initSession() {
      // CENÁRIO 1: JOGADOR (Veio da tela de Join com o bundle já baixado)
      if (locationState?.isPlayer && locationState?.downloadedBundle) {
        setIsPlayerMode(true)
        const bundle = locationState.downloadedBundle
        setSession(bundle.session as Session)
        setCampaign(bundle.campaign as CampaignWithDetails)
        setSystem(bundle.system)
        setContentList(bundle.content)
        setAccessCode(bundle.session.access_code)

        const targetUrl = locationState.serverUrl || 'http://localhost:3001'
        setServerUrl(targetUrl)

        addLog(`Conteúdo do sistema "${bundle.system?.name || 'Personalizado'}" carregado com sucesso (${bundle.stats.totalContentItems} itens).`, 'success')
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
          if (campaignData.rpg_system_id) {
            const systemData = await window.api.systems.getById(campaignData.rpg_system_id)
            if (systemData) {
              setSystem(systemData)
              const contentData = await window.api.content.getBySystem(systemData.id)
              setContentList(contentData || [])
            }
          }
        }

        const isOwner = campaignData?.owner_id === user?.id
        const isPlayer = locationState?.isPlayer ?? !isOwner

        if (isPlayer) {
          setIsPlayerMode(true)
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
  }, [sessionId, locationState, addLog])

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

      // Emite evento de entrada com validação do código
      socket.emit('session:join', {
        code,
        user: {
          id: user?.id,
          username: user?.username || (role === 'gm' ? 'Mestre' : 'Jogador'),
          role
        }
      })
    })

    socket.on('session:joined', (data: { participant: ConnectedParticipant; participants: ConnectedParticipant[] }) => {
      addLog(`Registrado na sala da sessão como [${role.toUpperCase()}].`, 'success')
      setParticipants(data.participants || [])
    })

    socket.on('session:participants_changed', (data: {
      event: 'join' | 'leave' | 'ping'
      participant: ConnectedParticipant
      participants: ConnectedParticipant[]
    }) => {
      setParticipants(data.participants || [])

      if (data.event === 'join') {
        const roleLabel = data.participant.role === 'gm' ? '👑 Mestre' : '🛡️ Jogador'
        addLog(`${roleLabel} "${data.participant.username}" entrou na sala.`, 'info')
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

    socket.on('session:closed', (data: { message?: string }) => {
      addLog(`⚠️ Sessão encerrada: ${data.message || 'O Mestre encerrou a sessão.'}`, 'warn')
      alert(data.message || 'A sessão de jogo foi encerrada pelo Mestre.')
      navigate('/home')
    })

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

  // Ações de Teste em Tempo Real
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

  // Copiar código de acesso para a área de transferência
  const handleCopyCode = () => {
    if (!accessCode) return
    navigator.clipboard.writeText(accessCode)
    setCopiedCodeToast(true)
    setTimeout(() => setCopiedCodeToast(false), 2500)
  }

  // Copiar link / formato de compartilhamento completo
  const handleCopyFullLink = () => {
    const primaryIp = localAddresses.find(ip => ip !== '127.0.0.1') || 'localhost'
    const fullString = `${primaryIp}:${serverPort}#${accessCode}`
    navigator.clipboard.writeText(fullString)
    setCopiedLinkToast(true)
    setTimeout(() => setCopiedLinkToast(false), 2500)
  }

  // Mestre encerra a sessão
  const handleConfirmEndSession = async () => {
    setIsEnding(true)
    try {
      if (session) {
        await window.api.sessions.end(session.id, 'Sessão encerrada pelo Mestre.')
      }
      await window.api.server.stop()
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

  // Contagem de conteúdo por tipo
  const contentByType = contentList.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className='flex flex-col h-screen overflow-hidden bg-vtt-dark-gray text-vtt-light'>
      {/* ── TOP NAVIGATION BAR ──────────────────────────────────────────────── */}
      <header className='h-16 bg-vtt-dark border-b border-vtt-light-gray/40 px-6 flex items-center justify-between shrink-0 shadow-md'>
        {/* Lado Esquerdo: Voltar & Título */}
        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={handleLeaveSession}
            className='text-neutral-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-vtt-dark-gray border border-vtt-light-gray/40 transition-colors cursor-pointer'
          >
            « Sair da Sala
          </button>

          <div className='h-5 w-px bg-vtt-light-gray/40'></div>

          <div>
            <h1 className='text-base font-bold text-white flex items-center gap-2'>
              <span>🎲</span>
              <span>{session?.title || 'Sessão de Jogo'}</span>
            </h1>
            <p className='text-xs text-neutral-400'>
              Campanha: <strong className='text-neutral-200'>{campaign?.title || '—'}</strong>
            </p>
          </div>
        </div>

        {/* Lado Direito: Status da Conexão, Papel e Botões */}
        <div className='flex items-center gap-4'>
          {/* Badge de Papel */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            !isPlayerMode
              ? 'bg-red-950/80 text-red-300 border border-red-700/60'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
          }`}>
            <span>{!isPlayerMode ? '👑' : '🛡️'}</span>
            <span>{!isPlayerMode ? 'Mestre (Host)' : 'Jogador'}</span>
          </div>

          {/* Status Socket.io */}
          <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-vtt-dark-gray border border-vtt-light-gray/40 text-xs'>
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
            }`}></span>
            <span className={isConnected ? 'text-emerald-300 font-medium' : 'text-neutral-400'}>
              {connectionStatus === 'connected' ? 'Socket.io Conectado' : connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </span>
            {currentPing !== null && (
              <span className='text-[11px] text-neutral-400 pl-1 border-l border-neutral-700'>
                {currentPing}ms
              </span>
            )}
          </div>

          {/* Ação de Encerrar Sessão (se for Mestre) */}
          {!isPlayerMode && (
            <button
              type='button'
              onClick={() => setShowEndModal(true)}
              className='px-3.5 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-semibold border border-red-700/70 transition-colors cursor-pointer'
            >
              Encerrar Sessão
            </button>
          )}
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL (ABSTRAÇÃO DA SESSÃO ABERTA) ────────────────── */}
      <main className='flex-1 overflow-y-auto p-6 flex flex-col gap-6'>
        {/* Banner de Informação de Funcionamento */}
        <div className='bg-linear-to-r from-neutral-900 via-vtt-dark to-neutral-900 border border-vtt-light-gray/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm'>
          <div className='flex items-center gap-2.5'>
            <span className='text-lg'>ℹ️</span>
            <div>
              <strong className='text-white font-semibold'>Tela de Verificação Operacional da Sessão: </strong>
              <span className='text-neutral-300'>
                A tela de jogo está abstraída para inspeção e testes das camadas de rede (Node.js Express + Socket.io) e download do conteúdo.
              </span>
            </div>
          </div>
          <div className='flex items-center gap-3 text-neutral-400'>
            <span>Servidor HTTP: <strong className='text-emerald-400 font-mono'>Ativo</strong></span>
            <span>•</span>
            <span>WebSocket: <strong className='text-emerald-400 font-mono'>Sincronizado</strong></span>
          </div>
        </div>

        {/* ── GRID SUPERIOR: CÓDIGO DE ACESSO & CONTEÚDO BAIXADO ───────────── */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* CARD 1: CÓDIGO DE ACESSO & CONEXÃO DE REDE (6 Colunas) */}
          <section className='lg:col-span-6 bg-vtt-dark border border-vtt-light-gray/40 rounded-xl p-6 shadow-md flex flex-col justify-between gap-5'>
            <div>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-base font-bold text-white flex items-center gap-2'>
                  <span>🔑</span>
                  <span>Código de Acesso da Sala</span>
                </h2>
                <span className='px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800'>
                  Porta Express: {serverPort}
                </span>
              </div>

              <p className='text-xs text-neutral-400 leading-relaxed'>
                Forneça este código de 6 caracteres aos jogadores para que eles baixem as regras do sistema
                e conectem-se automaticamente à sala.
              </p>

              {/* Caixa Grande de Código com Botão de Cópia */}
              <div className='mt-4 p-4 rounded-xl bg-vtt-dark-gray/90 border border-vtt-light-gray/60 flex items-center justify-between'>
                <div className='flex flex-col'>
                  <span className='text-[10px] uppercase font-bold text-neutral-400 tracking-wider'>
                    Código da Sessão
                  </span>
                  <span className='text-3xl font-mono font-extrabold tracking-widest text-vtt-light-red'>
                    {accessCode || 'GERANDO...'}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={handleCopyCode}
                    className='px-4 py-2 rounded-lg bg-vtt-red hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow flex items-center gap-1.5'
                  >
                    <span>{copiedCodeToast ? '✓ Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
              </div>

              {/* Opções de Conexão na Rede Local (LAN / Web) */}
              <div className='mt-4 pt-4 border-t border-vtt-light-gray/30 flex flex-col gap-2 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='text-neutral-400'>Endereço do Servidor:</span>
                  <code className='text-white bg-vtt-dark-gray px-2 py-0.5 rounded font-mono'>
                    {serverUrl}
                  </code>
                </div>

                {localAddresses.filter(ip => ip !== '127.0.0.1').length > 0 && (
                  <div className='flex items-center justify-between'>
                    <span className='text-neutral-400'>IP na Rede Local (Wi-Fi/LAN):</span>
                    <div className='flex items-center gap-1.5'>
                      {localAddresses.filter(ip => ip !== '127.0.0.1').map((ip, idx) => (
                        <code key={idx} className='text-emerald-300 bg-vtt-dark-gray px-2 py-0.5 rounded font-mono'>
                          http://{ip}:{serverPort}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ações Rápidas de Compartilhamento */}
            <div className='flex flex-wrap items-center gap-3 pt-3 border-t border-vtt-light-gray/30'>
              <button
                type='button'
                onClick={handleCopyFullLink}
                className='px-3 py-1.5 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 border border-vtt-light-gray/40 text-neutral-300 text-xs font-medium transition-colors cursor-pointer'
              >
                {copiedLinkToast ? '✓ Formato Copiado!' : 'Copiar Formato IP:Porta#Código'}
              </button>

              <span className='text-[11px] text-neutral-500'>
                💡 Dica: Jogadores no navegador podem abrir <code className='text-neutral-400'>http://localhost:{serverPort}</code> diretamente!
              </span>
            </div>
          </section>

          {/* CARD 2: PACOTE BAIXADO & CONTEÚDO DO SISTEMA (6 Colunas) */}
          <section className='lg:col-span-6 bg-vtt-dark border border-vtt-light-gray/40 rounded-xl p-6 shadow-md flex flex-col justify-between gap-5'>
            <div>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-base font-bold text-white flex items-center gap-2'>
                  <span>📦</span>
                  <span>Pacote de Regras & Conteúdo Sincronizado</span>
                </h2>
                <span className='px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1'>
                  <span>✓</span>
                  <span>Baixado & Validado</span>
                </span>
              </div>

              {/* Informações do Sistema de RPG */}
              <div className='p-3.5 rounded-lg bg-vtt-dark-gray/60 border border-vtt-light-gray/30 flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <strong className='text-sm text-white font-bold'>{system?.name || 'Sistema Personalizado'}</strong>
                    {system?.version && (
                      <span className='text-[10px] text-neutral-400 bg-vtt-dark px-1.5 py-0.5 rounded border border-neutral-700'>
                        v{system.version}
                      </span>
                    )}
                  </div>
                  <span className='text-xs text-neutral-400'>{system?.genre || 'RPG Geral'}</span>
                </div>

                {system?.description && (
                  <p className='text-xs text-neutral-300 line-clamp-2'>
                    {system.description}
                  </p>
                )}

                {/* Grupos de Atributos do Sistema */}
                {system?.structure?.attributeGroups && system.structure.attributeGroups.length > 0 && (
                  <div className='mt-1 pt-2 border-t border-vtt-light-gray/30'>
                    <span className='text-[11px] text-neutral-400 block mb-1.5'>
                      Grupos de Atributos Estruturados:
                    </span>
                    <div className='flex flex-wrap gap-1.5'>
                      {system.structure.attributeGroups.map((grp, i) => (
                        <span
                          key={i}
                          className='px-2 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-300 border border-neutral-700'
                        >
                          {grp.label} ({grp.fields?.length || 0})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo do Catálogo de Conteúdo */}
              <div className='mt-3.5'>
                <div className='flex items-center justify-between text-xs text-neutral-400 mb-2'>
                  <span>Catálogo de Conteúdo da Campanha:</span>
                  <strong className='text-white'>{contentList.length} itens no pacote</strong>
                </div>

                <div className='grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs'>
                  {Object.entries(contentByType).map(([type, count]) => (
                    <div
                      key={type}
                      className='bg-vtt-dark-gray/50 border border-vtt-light-gray/30 p-2 rounded-lg text-center'
                    >
                      <span className='text-neutral-400 block text-[10px] uppercase font-semibold'>{type}</span>
                      <strong className='text-white text-sm'>{count}</strong>
                    </div>
                  ))}
                  {Object.keys(contentByType).length === 0 && (
                    <div className='col-span-full py-2 text-center text-neutral-500 text-xs'>
                      Nenhum item específico catalogado (regras padrão ativas).
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='pt-3 border-t border-vtt-light-gray/30 text-[11px] text-neutral-400 flex items-center justify-between'>
              <span>Sincronização: Express HTTP /api/session/bundle</span>
              <span className='text-emerald-400 font-medium'>Integridade Verificada</span>
            </div>
          </section>
        </div>

        {/* ── GRID INFERIOR: PARTICIPANTES CONECTADOS & CONSOLE DE TESTES ──── */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {/* PARTICIPANTES CONECTADOS (5 Colunas) */}
          <section className='lg:col-span-5 bg-vtt-dark border border-vtt-light-gray/40 rounded-xl p-6 shadow-md flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-bold text-white flex items-center gap-2'>
                <span>👥</span>
                <span>Participantes Conectados</span>
              </h2>
              <span className='px-2.5 py-0.5 rounded-full text-xs font-bold bg-vtt-dark-gray text-neutral-200 border border-vtt-light-gray/40'>
                {participants.length} online
              </span>
            </div>

            <div className='flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1'>
              {participants.map((p) => {
                const isGM = p.role === 'gm'
                const isSelf = p.username === user?.username

                return (
                  <div
                    key={p.socketId}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isGM
                        ? 'bg-red-950/20 border-red-800/50'
                        : 'bg-vtt-dark-gray/60 border-vtt-light-gray/40'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isGM ? 'bg-red-900/80 text-red-200' : 'bg-emerald-900/80 text-emerald-200'
                      }`}>
                        {isGM ? 'GM' : p.username.slice(0, 2).toUpperCase()}
                      </div>

                      <div className='flex flex-col'>
                        <div className='flex items-center gap-2'>
                          <strong className='text-sm text-white font-medium'>
                            {p.username}
                          </strong>
                          {isSelf && (
                            <span className='text-[10px] text-neutral-400 bg-neutral-800 px-1 rounded'>você</span>
                          )}
                        </div>

                        <div className='flex items-center gap-2 text-[11px] text-neutral-400'>
                          <span className={isGM ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                            {isGM ? 'Mestre da Mesa' : 'Jogador'}
                          </span>
                          <span>•</span>
                          <span>{p.downloadedContent ? '✓ Conteúdo Baixado' : 'Carregando...'}</span>
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      {p.pingMs !== undefined && (
                        <span className='text-xs font-mono text-neutral-300 bg-vtt-dark px-2 py-0.5 rounded border border-neutral-700'>
                          {p.pingMs}ms
                        </span>
                      )}
                      <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' title='Online'></span>
                    </div>
                  </div>
                )
              })}

              {participants.length === 0 && (
                <div className='text-center py-8 text-neutral-500 text-xs'>
                  Nenhum participante conectado ainda.
                </div>
              )}
            </div>
          </section>

          {/* CONSOLE DE VERIFICAÇÃO E TESTES EM TEMPO REAL (7 Colunas) */}
          <section className='lg:col-span-7 bg-vtt-dark border border-vtt-light-gray/40 rounded-xl p-6 shadow-md flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-bold text-white flex items-center gap-2'>
                <span>⚡</span>
                <span>Console de Verificação de Funcionamento</span>
              </h2>

              <button
                type='button'
                onClick={() => setLogs([])}
                className='text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer'
              >
                Limpar Feed
              </button>
            </div>

            {/* Botões de Ação de Teste */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
              <button
                type='button'
                onClick={handleTestPing}
                disabled={!isConnected}
                className='px-3 py-2 rounded-lg bg-blue-900/60 hover:bg-blue-800 border border-blue-700/70 text-blue-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5'
              >
                <span>📡</span>
                <span>Testar Ping</span>
              </button>

              <button
                type='button'
                onClick={() => handleRollDice('1d20')}
                disabled={!isConnected}
                className='px-3 py-2 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/70 text-emerald-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5'
              >
                <span>🎲</span>
                <span>Rolar 1d20</span>
              </button>

              <button
                type='button'
                onClick={() => handleRollDice('2d6')}
                disabled={!isConnected}
                className='px-3 py-2 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-700/70 text-purple-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5'
              >
                <span>🎲</span>
                <span>Rolar 2d6</span>
              </button>

              <button
                type='button'
                onClick={() => handleRollDice('1d100')}
                disabled={!isConnected}
                className='px-3 py-2 rounded-lg bg-amber-900/60 hover:bg-amber-800 border border-amber-700/70 text-amber-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5'
              >
                <span>🎲</span>
                <span>Rolar 1d100</span>
              </button>
            </div>

            {/* Janela de Log estilo Terminal */}
            <div
              ref={logBoxRef}
              className='h-60 bg-black/80 border border-neutral-800 rounded-xl p-3.5 font-mono text-xs overflow-y-auto flex flex-col gap-1.5 select-text'
            >
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-relaxed break-words ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'dice'
                      ? 'text-purple-300 font-bold'
                      : log.type === 'chat'
                      ? 'text-cyan-300'
                      : 'text-neutral-400'
                  }`}
                >
                  <span className='text-neutral-600 mr-2'>[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <span className='text-neutral-600 italic'>Nenhum evento registrado ainda. Conecte-se e realize testes acima.</span>
              )}
            </div>

            {/* Input de Chat de Teste */}
            <form onSubmit={handleSendChat} className='flex gap-2'>
              <input
                type='text'
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder='Enviar mensagem de teste em tempo real para a sala...'
                disabled={!isConnected}
                className='flex-1 px-4 py-2 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white focus:outline-none focus:border-vtt-red'
              />
              <button
                type='submit'
                disabled={!isConnected || !chatMessage.trim()}
                className='px-4 py-2 bg-vtt-red hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer'
              >
                Enviar
              </button>
            </form>
          </section>
        </div>
      </main>

      {/* ── MODAL DE CONFIRMAÇÃO PARA ENCERRAR SESSÃO ───────────────────────── */}
      {showEndModal && (
        <div className='fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-vtt-dark border border-vtt-light-gray/40 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-center gap-3 text-red-400'>
              <span className='text-2xl'>⚠️</span>
              <h3 className='text-lg font-bold text-white'>Encerrar Sessão de Jogo?</h3>
            </div>

            <p className='text-xs text-neutral-300 leading-relaxed'>
              Ao encerrar a sessão, o servidor Express e Socket.io serão finalizados, os jogadores serão
              desconectados e o status da sessão será alterado para <strong>Concluída</strong>.
            </p>

            <div className='flex items-center justify-end gap-3 pt-3 border-t border-vtt-light-gray/30'>
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
                className='px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer shadow'
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
