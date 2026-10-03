import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'
import type { Session, CampaignWithDetails, CampaignMember } from '../../../preload/index.d'

export default function CampaignSessionsPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const campaignId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [campaign, setCampaign] = useState<CampaignWithDetails | null>(null)
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'completed'>('all')

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [startImmediately, setStartImmediately] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  const [editSession, setEditSession] = useState<Session | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [endSessionModal, setEndSessionModal] = useState<Session | null>(null)
  const [endNotes, setEndNotes] = useState('')
  const [endLoading, setEndLoading] = useState(false)

  const [deleteSessionModal, setDeleteSessionModal] = useState<Session | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [actionError, setActionError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!campaignId || isNaN(campaignId)) return
    setIsLoading(true)
    try {
      const [camp, mems, sess] = await Promise.all([
        window.api.campaigns.getById(campaignId),
        window.api.campaigns.getMembers(campaignId),
        window.api.sessions.getByCampaign(campaignId),
      ])
      setCampaign(camp)
      setMembers(mems)
      setSessions(sess)
    } catch (err) {
      console.error('Erro ao carregar dados da campanha:', err)
      setActionError('Falha ao carregar informações da campanha.')
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Identificar sessão ativa
  const activeSession = sessions.find(s => s.status === 'active')

  // Próximo número de sessão sugerido
  const nextSessionNumber = sessions.length + 1

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setCreateTitle(`Sessão #${nextSessionNumber}`)
    setCreateNotes('')
    setStartImmediately(false)
    setActionError(null)
    setShowCreateModal(true)
  }

  // Criar sessão
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setActionError(null)
    try {
      const res = await window.api.sessions.create({
        campaign_id: campaignId,
        title: createTitle.trim() || undefined,
        notes: createNotes.trim() || undefined,
      })

      if (!res.success || !res.session) {
        setActionError(res.error || 'Erro ao criar sessão.')
        setCreateLoading(false)
        return
      }

      let createdSession = res.session
      // Se marcou para iniciar imediatamente
      if (startImmediately) {
        const startRes = await window.api.sessions.start(createdSession.id)
        if (startRes.success && startRes.session) {
          createdSession = startRes.session
        }
      }

      setShowCreateModal(false)
      setCreateTitle('')
      setCreateNotes('')
      await loadData()

      if (startImmediately) {
        navigate(`/sessions/${createdSession.id}`)
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro inesperado ao criar sessão.')
    } finally {
      setCreateLoading(false)
    }
  }

  // Iniciar/Abrir sessão existente
  const handleStartSession = async (session: Session) => {
    setActionError(null)
    try {
      const res = await window.api.sessions.start(session.id)
      if (res.success) {
        await loadData()
      } else {
        setActionError(res.error || 'Falha ao iniciar sessão.')
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro ao iniciar sessão.')
    }
  }

  // Abrir modal de encerramento
  const handleOpenEndModal = (session: Session) => {
    setEndSessionModal(session)
    setEndNotes(session.notes || '')
    setActionError(null)
  }

  // Confirmar encerramento da sessão
  const handleConfirmEndSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!endSessionModal) return
    setEndLoading(true)
    setActionError(null)
    try {
      const res = await window.api.sessions.end(endSessionModal.id, endNotes.trim() || undefined)
      if (res.success) {
        // Encerra também o servidor se estiver rodando para esta sessão
        try {
          const status = await window.api.server.getStatus()
          if (status.isRunning && status.sessionId === endSessionModal.id) {
            await window.api.server.stop({
              sessionId: endSessionModal.id,
              notes: endNotes.trim() || undefined
            })
          }
        } catch (serverErr) {
          console.error('Erro ao verificar/parar servidor:', serverErr)
        }
        setEndSessionModal(null)
        await loadData()
      } else {
        setActionError(res.error || 'Falha ao encerrar sessão.')
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro ao encerrar sessão.')
    } finally {
      setEndLoading(false)
    }
  }

  // Jogador marca sessão como encerrada em seu histórico local (caso o Mestre tenha encerrado enquanto offline)
  const handlePlayerMarkAsCompleted = async (sessionToClose: Session) => {
    if (!campaignId) return
    const confirmed = window.confirm(
      `Deseja marcar a "${sessionToClose.title || 'Sessão'}" como encerrada no seu histórico local?`
    )
    if (!confirmed) return

    try {
      const res = await window.api.sessions.applySyncUpdate(
        {
          campaignId,
          sessions: [
            {
              id: sessionToClose.id,
              status: 'completed',
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        },
        user?.id
      )
      if (res.success) {
        await loadData()
      } else {
        setActionError(res.error || 'Falha ao atualizar sessão no histórico local.')
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro ao atualizar sessão no histórico.')
    }
  }

  // Reabrir sessão encerrada
  const handleReopenSession = async (session: Session) => {
    setActionError(null)
    try {
      const res = await window.api.sessions.reopen(session.id)
      if (res.success) {
        await loadData()
      } else {
        setActionError(res.error || 'Falha ao reabrir sessão.')
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro ao reabrir sessão.')
    }
  }

  // Abrir modal de edição
  const handleOpenEditModal = (session: Session) => {
    setEditSession(session)
    setEditTitle(session.title || '')
    setEditNotes(session.notes || '')
    setActionError(null)
  }

  // Salvar edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editSession) return
    setEditLoading(true)
    setActionError(null)
    try {
      const res = await window.api.sessions.update({
        id: editSession.id,
        title: editTitle.trim(),
        notes: editNotes.trim(),
      })
      if (res.success) {
        setEditSession(null)
        await loadData()
      } else {
        setActionError(res.error || 'Falha ao atualizar sessão.')
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro ao atualizar sessão.')
    } finally {
      setEditLoading(false)
    }
  }

  // Excluir sessão
  const handleConfirmDelete = async () => {
    if (!deleteSessionModal) return
    setDeleteLoading(true)
    setActionError(null)
    try {
      const res = await window.api.sessions.delete(deleteSessionModal.id)
      if (res.success) {
        setDeleteSessionModal(null)
        await loadData()
      } else {
        setActionError(res.error || 'Falha ao excluir sessão.')
      }
    } catch (err) {
      console.error(err)
      setActionError('Erro ao excluir sessão.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Formatação de data
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Cálculo de duração formatada
  const formatDuration = (started?: string | null, ended?: string | null) => {
    if (!started) return null
    const start = new Date(started).getTime()
    const end = ended ? new Date(ended).getTime() : Date.now()
    if (isNaN(start) || isNaN(end) || end < start) return null

    const diffMinutes = Math.floor((end - start) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    if (hours === 0) return `${minutes}m`
    return `${hours}h ${minutes}m`
  }

  // Filtragem de sessões
  const filteredSessions = sessions.filter(s => {
    if (filter === 'all') return true
    return s.status === filter
  })

  // Permissão de mestre (Campanhas baixadas são sempre apenas para visualização do jogador)
  const isGM = !campaign?.is_downloaded && (campaign?.owner_id === user?.id || members.some(m => m.user_id === user?.id && m.role === 'gm'))

  return (
    <div className='flex flex-row h-screen overflow-hidden'>
      <Sidebar />

      <main className='flex-1 overflow-y-auto p-10 flex flex-col gap-8'>
        {/* Top Navigation */}
        <div className='flex items-center justify-between'>
          <button
            type='button'
            onClick={() => navigate('/home')}
            className='text-neutral-400 hover:text-vtt-light text-sm flex items-center gap-1.5 transition-colors cursor-pointer'
          >
            « Voltar para Campanhas
          </button>

          {isGM && (
            <button
              type='button'
              onClick={handleOpenCreateModal}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-vtt-red text-white text-sm font-semibold
                         hover:bg-red-700 transition-colors cursor-pointer shadow-md'
            >
              <span>+</span>
              <span>Nova Sessão</span>
            </button>
          )}
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className='bg-red-950/70 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 flex items-center justify-between'>
            <span>{actionError}</span>
            <button
              type='button'
              onClick={() => setActionError(null)}
              className='text-red-400 hover:text-red-200 text-sm font-bold cursor-pointer'
            >
              ✕
            </button>
          </div>
        )}

        {/* Banner de Campanha Baixada */}
        {campaign?.is_downloaded ? (
          <div className='bg-blue-950/40 border border-blue-700/50 text-blue-200 text-sm rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-md'>
            <span className='text-xl shrink-0'>ℹ️</span>
            <div>
              <p className='font-semibold text-blue-100'>Campanha Baixada — Somente Visualização</p>
              <p className='text-xs text-blue-300/80 mt-0.5'>
                Você baixou esta campanha ao conectar à sessão do Mestre. Como jogador, o conteúdo e histórico de sessões estão disponíveis apenas para consulta. Suas fichas de personagens locais serão sincronizadas automaticamente ao reconectar com o Mestre.
              </p>
            </div>
          </div>
        ) : null}

        {/* Campaign Header Details */}
        {isLoading ? (
          <div className='h-36 rounded-xl bg-vtt-dark border border-vtt-dark-gray animate-pulse' />
        ) : campaign ? (
          <header className='bg-vtt-dark border border-vtt-dark-gray rounded-xl p-6 flex flex-col gap-4 shadow-sm'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-3'>
                  <h1 className='text-3xl font-bold text-vtt-light tracking-tight'>{campaign.title}</h1>
                  <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700'>
                    {campaign.system_name || 'Sistema Customizado'}
                  </span>
                  <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-950 text-green-400 border border-green-800/60'>
                    {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                  </span>
                </div>
                {campaign.description && (
                  <p className='text-neutral-400 text-sm mt-2 max-w-3xl leading-relaxed'>
                    {campaign.description}
                  </p>
                )}
              </div>

              {/* GM Badge */}
              <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vtt-dark-gray border border-vtt-light-gray/40 text-xs text-neutral-300'>
                <span className='w-2 h-2 rounded-full bg-vtt-red'></span>
                <span>Mestre: <strong className='text-white'>{campaign.owner_username || 'Você'}</strong></span>
              </div>
            </div>

            {/* Campaign Stats Bar */}
            <div className='pt-3 border-t border-vtt-dark-gray flex flex-wrap items-center gap-6 text-xs text-neutral-400'>
              <div>
                Total de Sessões: <strong className='text-white'>{sessions.length}</strong>
              </div>
              <div className='h-3 w-px bg-vtt-light-gray'></div>
              <div>
                Sessão Ativa:{' '}
                <strong className={activeSession ? 'text-green-400' : 'text-neutral-500'}>
                  {activeSession ? activeSession.title : 'Nenhuma no momento'}
                </strong>
              </div>
              <div className='h-3 w-px bg-vtt-light-gray'></div>
              <div>
                Concluídas:{' '}
                <strong className='text-white'>{sessions.filter(s => s.status === 'completed').length}</strong>
              </div>
              <div className='h-3 w-px bg-vtt-light-gray'></div>
              <div>
                Agendadas:{' '}
                <strong className='text-white'>{sessions.filter(s => s.status === 'scheduled').length}</strong>
              </div>
              <div className='h-3 w-px bg-vtt-light-gray'></div>
              <div>
                Jogadores Cadastrados:{' '}
                <strong className='text-white'>{members.filter(m => m.role === 'player').length}</strong>
              </div>
            </div>
          </header>
        ) : (
          <div className='bg-red-950/40 border border-red-800 text-red-300 p-6 rounded-xl'>
            Campanha não encontrada.
          </div>
        )}

        {/* ACTIVE SESSION HERO BANNER (When an active session is running) */}
        {activeSession && (
          <section className='bg-linear-to-r from-emerald-950/40 via-vtt-dark to-vtt-dark border-2 border-emerald-500/60 rounded-xl p-6 shadow-lg relative overflow-hidden'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center gap-2'>
                  <span className='flex h-2.5 w-2.5 relative'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                    <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500'></span>
                  </span>
                  <span className='text-xs font-bold uppercase tracking-wider text-emerald-400'>
                    Sessão em Andamento
                  </span>
                  {activeSession.started_at && (
                    <span className='text-xs text-neutral-400 ml-2'>
                      Iniciada às {formatDate(activeSession.started_at)}
                      {formatDuration(activeSession.started_at) && (
                        <span className='text-emerald-300 ml-1.5 font-medium'>
                          ({formatDuration(activeSession.started_at)} decorridos)
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <h2 className='text-2xl font-bold text-white'>{activeSession.title}</h2>

                {activeSession.notes && (
                  <p className='text-sm text-neutral-300 line-clamp-2 max-w-2xl mt-1'>
                    {activeSession.notes}
                  </p>
                )}
              </div>

              {/* Actions for Active Session */}
              <div className='flex items-center gap-3'>
                {isGM ? (
                  <button
                    type='button'
                    onClick={() => handleOpenEndModal(activeSession)}
                    className='px-4 py-2 rounded-lg border border-red-700/60 text-red-300 text-sm font-semibold
                               hover:bg-red-950 hover:border-red-500 transition-colors cursor-pointer'
                  >
                    Encerrar Sessão
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => handlePlayerMarkAsCompleted(activeSession)}
                    className='px-3.5 py-2 rounded-lg border border-neutral-600 hover:border-amber-500 text-neutral-300 hover:text-amber-200 text-xs font-semibold
                               hover:bg-amber-950/40 transition-colors cursor-pointer'
                    title='Se o Mestre já encerrou a sessão, conclua no seu histórico local'
                  >
                    Marcar como Encerrada
                  </button>
                )}

                <button
                  type='button'
                  onClick={() =>
                    navigate(`/sessions/${activeSession.id}`, {
                      state: {
                        isPlayer: !isGM,
                        serverUrl: activeSession.server_url || 'http://localhost:3001',
                        accessCode: activeSession.access_code || ''
                      }
                    })
                  }
                  className='flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold
                             hover:bg-emerald-500 transition-colors cursor-pointer shadow-md'
                >
                  <span>Acessar Sala</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Sessions Section */}
        <section className='flex flex-col gap-5'>
          {/* Section Header with Status Filters */}
          <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-4'>
            <div className='flex items-center gap-3'>
              <h2 className='text-xl font-bold text-vtt-light'>Lista de Sessões</h2>
              <span className='text-xs text-neutral-400 bg-vtt-dark-gray px-2 py-0.5 rounded-full'>
                {filteredSessions.length}
              </span>
            </div>

            {/* Filter Pills */}
            <div className='flex items-center gap-1.5 bg-vtt-dark p-1 rounded-lg border border-vtt-dark-gray text-xs'>
              <button
                type='button'
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'all' ? 'bg-vtt-dark-gray text-white font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Todas ({sessions.length})
              </button>
              <button
                type='button'
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'active' ? 'bg-emerald-900/60 text-emerald-300 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Em Andamento ({sessions.filter(s => s.status === 'active').length})
              </button>
              <button
                type='button'
                onClick={() => setFilter('scheduled')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'scheduled' ? 'bg-amber-900/60 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Agendadas ({sessions.filter(s => s.status === 'scheduled').length})
              </button>
              <button
                type='button'
                onClick={() => setFilter('completed')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'completed' ? 'bg-neutral-800 text-neutral-200 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Concluídas ({sessions.filter(s => s.status === 'completed').length})
              </button>
            </div>
          </div>

          {/* Sessions List */}
          {isLoading ? (
            <div className='flex flex-col gap-4'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='h-28 rounded-xl bg-vtt-dark border border-vtt-dark-gray animate-pulse' />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className='bg-vtt-dark border border-vtt-dark-gray rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4'>
              <div className='w-12 h-12 rounded-full bg-vtt-dark-gray flex items-center justify-center text-neutral-400 text-xl font-bold'>
                🎲
              </div>
              <div>
                <h3 className='text-lg font-bold text-vtt-light'>Nenhuma sessão encontrada</h3>
                <p className='text-neutral-400 text-sm mt-1 max-w-md'>
                  {filter === 'all'
                    ? 'Esta campanha ainda não possui sessões criadas. Clique no botão abaixo para criar a primeira sessão de jogo.'
                    : `Não há sessões com o filtro "${filter}" no momento.`}
                </p>
              </div>
              {filter === 'all' && isGM && (
                <button
                  type='button'
                  onClick={handleOpenCreateModal}
                  className='mt-2 px-5 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer'
                >
                  Criar Primeira Sessão
                </button>
              )}
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
              {filteredSessions.map(session => {
                const isActive = session.status === 'active'
                const isScheduled = session.status === 'scheduled'
                const isCompleted = session.status === 'completed'
                const duration = formatDuration(session.started_at, session.ended_at)

                return (
                  <article
                    key={session.id}
                    className={`bg-vtt-dark border rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all duration-200 ${
                      isActive
                        ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : isScheduled
                        ? 'border-amber-700/50 hover:border-amber-500/70'
                        : 'border-vtt-dark-gray hover:border-vtt-light-gray'
                    }`}
                  >
                    {/* Session Info */}
                    <div className='flex-1 flex flex-col gap-2'>
                      <div className='flex flex-wrap items-center gap-3'>
                        <h3 className='text-lg font-bold text-white'>{session.title}</h3>

                        {/* Status Badge */}
                        {isActive && (
                          <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-700 flex items-center gap-1.5'>
                            <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse'></span>
                            Em Andamento
                          </span>
                        )}
                        {isScheduled && (
                          <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800'>
                            Agendada
                          </span>
                        )}
                        {isCompleted && (
                          <span className='px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700'>
                            Concluída
                          </span>
                        )}

                        {duration && (
                          <span className='text-xs text-neutral-400 bg-vtt-dark-gray px-2 py-0.5 rounded-md'>
                            Duração: <strong className='text-neutral-200'>{duration}</strong>
                          </span>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className='flex flex-wrap items-center gap-4 text-xs text-neutral-400'>
                        <div>
                          Criada em: <span>{formatDate(session.created_at)}</span>
                        </div>
                        {session.started_at && (
                          <>
                            <span className='text-neutral-600'>•</span>
                            <div>
                              Iniciada: <span>{formatDate(session.started_at)}</span>
                            </div>
                          </>
                        )}
                        {session.ended_at && (
                          <>
                            <span className='text-neutral-600'>•</span>
                            <div>
                              Encerrada: <span>{formatDate(session.ended_at)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Session Notes */}
                      {session.notes && (
                        <div className='mt-1 text-sm text-neutral-300 bg-vtt-dark-gray/50 rounded-lg p-3 border border-vtt-dark-gray/60 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto'>
                          {session.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className='flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end'>
                      {/* Active Session Actions */}
                      {isActive && (
                        <>
                          {isGM ? (
                            <button
                              type='button'
                              onClick={() => handleOpenEndModal(session)}
                              className='px-3.5 py-2 rounded-lg border border-red-700/60 text-red-300 text-xs font-semibold hover:bg-red-950 transition-colors cursor-pointer'
                            >
                              Encerrar
                            </button>
                          ) : (
                            <button
                              type='button'
                              onClick={() => handlePlayerMarkAsCompleted(session)}
                              className='px-3 py-1.5 rounded-lg border border-neutral-700 hover:border-amber-600 text-neutral-400 hover:text-amber-300 text-xs font-medium transition-colors cursor-pointer'
                              title='Marcar como encerrada no histórico local'
                            >
                              Marcar Encerrada
                            </button>
                          )}
                          <button
                            type='button'
                            onClick={() =>
                              navigate(`/sessions/${session.id}`, {
                                state: {
                                  isPlayer: !isGM,
                                  serverUrl: session.server_url || 'http://localhost:3001',
                                  accessCode: session.access_code || ''
                                }
                              })
                            }
                            className='px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors cursor-pointer shadow'
                          >
                            Acessar Sala →
                          </button>
                        </>
                      )}

                      {/* Scheduled Session Actions */}
                      {isScheduled && (
                        <>
                          {isGM ? (
                            <>
                              <button
                                type='button'
                                onClick={() => handleStartSession(session)}
                                className='px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors cursor-pointer shadow flex items-center gap-1.5'
                              >
                                <span>▶</span>
                                <span>Abrir / Iniciar</span>
                              </button>
                              <button
                                type='button'
                                onClick={() => handleOpenEditModal(session)}
                                className='px-3 py-2 rounded-lg border border-vtt-light-gray text-neutral-300 text-xs font-semibold hover:text-white hover:border-neutral-400 transition-colors cursor-pointer'
                              >
                                Editar
                              </button>
                              <button
                                type='button'
                                onClick={() => setDeleteSessionModal(session)}
                                className='px-3 py-2 rounded-lg border border-vtt-dark-gray text-neutral-400 text-xs hover:text-red-400 hover:border-red-900 transition-colors cursor-pointer'
                                title='Excluir Sessão'
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <span className='text-xs text-neutral-500 italic py-2'>
                              Aguardando abertura pelo Mestre
                            </span>
                          )}
                        </>
                      )}

                      {/* Completed Session Actions */}
                      {isCompleted && (
                        <>
                          <button
                            type='button'
                            onClick={() =>
                              navigate(`/sessions/${session.id}`, {
                                state: {
                                  isPlayer: !isGM,
                                  serverUrl: session.server_url || 'http://localhost:3001',
                                  accessCode: session.access_code || ''
                                }
                              })
                            }
                            className='px-3.5 py-2 rounded-lg bg-vtt-dark-gray text-neutral-200 text-xs font-semibold hover:bg-vtt-light-gray transition-colors cursor-pointer'
                          >
                            Ver Sala
                          </button>
                          {isGM && (
                            <>
                              <button
                                type='button'
                                onClick={() => handleReopenSession(session)}
                                className='px-3.5 py-2 rounded-lg border border-amber-700/50 text-amber-300 text-xs font-semibold hover:bg-amber-950 transition-colors cursor-pointer'
                              >
                                Reabrir
                              </button>
                              <button
                                type='button'
                                onClick={() => handleOpenEditModal(session)}
                                className='px-3 py-2 rounded-lg border border-vtt-light-gray text-neutral-300 text-xs font-semibold hover:text-white hover:border-neutral-400 transition-colors cursor-pointer'
                              >
                                Editar Notas
                              </button>
                              <button
                                type='button'
                                onClick={() => setDeleteSessionModal(session)}
                                className='px-3 py-2 rounded-lg border border-vtt-dark-gray text-neutral-400 text-xs hover:text-red-400 hover:border-red-900 transition-colors cursor-pointer'
                                title='Excluir Sessão'
                              >
                                Excluir
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── MODAL: NOVA SESSÃO ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4'>
          <div className='bg-vtt-dark border border-vtt-light-gray rounded-xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3'>
              <h3 className='text-xl font-bold text-white'>Nova Sessão de Jogo</h3>
              <button
                type='button'
                onClick={() => setShowCreateModal(false)}
                className='text-neutral-400 hover:text-white text-lg cursor-pointer'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className='flex flex-col gap-4'>
              {/* Título */}
              <label className='flex flex-col gap-1.5'>
                <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                  Título da Sessão *
                </span>
                <input
                  type='text'
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  placeholder={`Ex: Sessão #${nextSessionNumber}`}
                  required
                  maxLength={100}
                  className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none focus:border-vtt-red transition-colors'
                />
              </label>

              {/* Anotações / Briefing */}
              <label className='flex flex-col gap-1.5'>
                <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                  Anotações de Preparação <span className='text-neutral-500 normal-case'>(opcional)</span>
                </span>
                <textarea
                  value={createNotes}
                  onChange={e => setCreateNotes(e.target.value)}
                  placeholder='Metas da sessão, encontros planejados, ganchos narrativos...'
                  rows={4}
                  className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none resize-none focus:border-vtt-red transition-colors'
                />
              </label>

              {/* Opção: Iniciar Imediatamente */}
              <label className='flex items-center gap-3 p-3 rounded-lg bg-vtt-dark-gray/50 border border-vtt-dark-gray cursor-pointer hover:bg-vtt-dark-gray transition-colors'>
                <input
                  type='checkbox'
                  checked={startImmediately}
                  onChange={e => setStartImmediately(e.target.checked)}
                  className='accent-vtt-red w-4 h-4 cursor-pointer'
                />
                <div className='flex flex-col'>
                  <span className='text-sm font-semibold text-white'>Iniciar e abrir sessão imediatamente</span>
                  <span className='text-xs text-neutral-400'>
                    A sessão será criada como ativa e você será direcionado para a sala de jogo.
                  </span>
                </div>
              </label>

              {/* Botões */}
              <div className='flex items-center gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setShowCreateModal(false)}
                  className='flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={createLoading}
                  className='flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50'
                >
                  {createLoading ? 'Criando...' : startImmediately ? 'Criar e Iniciar' : 'Criar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDITAR SESSÃO ────────────────────────────────────────── */}
      {editSession && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4'>
          <div className='bg-vtt-dark border border-vtt-light-gray rounded-xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3'>
              <h3 className='text-xl font-bold text-white'>Editar Sessão</h3>
              <button
                type='button'
                onClick={() => setEditSession(null)}
                className='text-neutral-400 hover:text-white text-lg cursor-pointer'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className='flex flex-col gap-4'>
              <label className='flex flex-col gap-1.5'>
                <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                  Título *
                </span>
                <input
                  type='text'
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                  maxLength={100}
                  className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none focus:border-vtt-red transition-colors'
                />
              </label>

              <label className='flex flex-col gap-1.5'>
                <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                  Anotações da Sessão
                </span>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={5}
                  className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none resize-none focus:border-vtt-red transition-colors'
                />
              </label>

              <div className='flex items-center gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setEditSession(null)}
                  className='flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={editLoading}
                  className='flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50'
                >
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ENCERRAR SESSÃO ────────────────────────────────────────── */}
      {endSessionModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4'>
          <div className='bg-vtt-dark border border-red-700/60 rounded-xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3'>
              <h3 className='text-xl font-bold text-white'>Encerrar Sessão</h3>
              <button
                type='button'
                onClick={() => setEndSessionModal(null)}
                className='text-neutral-400 hover:text-white text-lg cursor-pointer'
              >
                ✕
              </button>
            </div>

            <p className='text-sm text-neutral-300 leading-relaxed'>
              Você está prestes a encerrar a sessão <strong className='text-white'>{endSessionModal.title}</strong>.
              O status será alterado para <strong className='text-neutral-200'>Concluída</strong> e a data de encerramento será registrada.
            </p>

            <form onSubmit={handleConfirmEndSession} className='flex flex-col gap-4'>
              <label className='flex flex-col gap-1.5'>
                <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                  Resumo / Notas Finais da Sessão
                </span>
                <textarea
                  value={endNotes}
                  onChange={e => setEndNotes(e.target.value)}
                  placeholder='O que aconteceu nesta sessão? Recompensas distribuídas, XP, pistas descobertas...'
                  rows={4}
                  className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none resize-none focus:border-red-500 transition-colors'
                />
              </label>

              <div className='flex items-center gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setEndSessionModal(null)}
                  className='flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer'
                >
                  Continuar Jogando
                </button>
                <button
                  type='submit'
                  disabled={endLoading}
                  className='flex-1 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-50'
                >
                  {endLoading ? 'Encerrando...' : 'Confirmar Encerramento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR EXCLUSÃO ────────────────────────────────────────── */}
      {deleteSessionModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4'>
          <div className='bg-vtt-dark border border-red-800 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200'>
            <h3 className='text-xl font-bold text-red-400'>Excluir Sessão</h3>
            <p className='text-sm text-neutral-300 leading-relaxed'>
              Tem certeza que deseja excluir a sessão <strong className='text-white'>{deleteSessionModal.title}</strong>?
              Esta ação removerá todos os dados e histórico associados a ela e não pode ser desfeita.
            </p>

            <div className='flex items-center gap-3 pt-3'>
              <button
                type='button'
                onClick={() => setDeleteSessionModal(null)}
                className='flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer'
              >
                Cancelar
              </button>
              <button
                type='button'
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className='flex-1 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-50'
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
