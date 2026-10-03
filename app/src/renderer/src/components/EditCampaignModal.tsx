import React, { useState, useEffect } from 'react'
import type { Campaign } from '../../../preload/index.d'
import { useCampaigns } from '../context/CampaignContext'
import { STATUS_LABEL, STATUS_COLOR } from '../utils/campaignConstants'

interface EditCampaignModalProps {
  campaign: Campaign
  onClose: () => void
  onUpdated?: (updated: Campaign) => void
  onDeleted?: (campaignId: number) => void
}

export default function EditCampaignModal({
  campaign,
  onClose,
  onUpdated,
  onDeleted
}: EditCampaignModalProps): React.JSX.Element {
  const { systems, fetchSystems, updateCampaign, deleteCampaign } = useCampaigns()

  const [title, setTitle] = useState(campaign.title)
  const [description, setDescription] = useState(campaign.description || '')
  const [status, setStatus] = useState<Campaign['status']>(campaign.status || 'active')
  const [systemId, setSystemId] = useState<number>(campaign.rpg_system_id)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Danger zone confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isPlayerMode = Boolean(campaign.is_downloaded || campaign.my_role === 'player')

  useEffect(() => {
    if (systems.length === 0) {
      fetchSystems()
    }
  }, [systems.length, fetchSystems])

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (isPlayerMode) return

    if (!title.trim()) {
      setError('O título da campanha não pode ser vazio.')
      return
    }

    setError(null)
    setSuccessMsg(null)
    setIsLoading(true)

    const err = await updateCampaign({
      id: campaign.id,
      title: title.trim(),
      description: description.trim() || null,
      status,
      rpg_system_id: Number(systemId)
    })

    setIsLoading(false)

    if (err) {
      setError(err)
      return
    }

    setSuccessMsg('Campanha atualizada com sucesso!')
    if (onUpdated) {
      onUpdated({
        ...campaign,
        title: title.trim(),
        description: description.trim() || null,
        status,
        rpg_system_id: Number(systemId)
      })
    }

    setTimeout(() => {
      onClose()
    }, 600)
  }

  const handleDelete = async (): Promise<void> => {
    if (!isPlayerMode && confirmTitle.trim() !== campaign.title.trim()) {
      setError('Digite o nome exato da campanha para confirmar a exclusão.')
      return
    }

    setIsDeleting(true)
    setError(null)

    const err = await deleteCampaign(campaign.id)
    setIsDeleting(false)

    if (err) {
      setError(err)
      return
    }

    if (onDeleted) {
      onDeleted(campaign.id)
    }
    onClose()
  }

  // Quick status buttons
  const handleQuickStatusChange = async (newStatus: Campaign['status']): Promise<void> => {
    if (isPlayerMode) return
    setStatus(newStatus)
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto'>
      <div className='bg-vtt-dark border border-vtt-light-gray rounded-xl w-full max-w-xl p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-lg bg-vtt-dark-gray border border-vtt-light-gray flex items-center justify-center text-lg'>
              ⚙️
            </div>
            <div>
              <h2 className='text-xl font-bold text-white leading-tight'>
                {isPlayerMode ? 'Gerenciar Campanha' : 'Editar Campanha'}
              </h2>
              <p className='text-xs text-neutral-400 mt-0.5'>
                {isPlayerMode
                  ? 'Visualização de detalhes e opções da campanha'
                  : 'Altere as configurações, controle o status ou exclua a campanha'}
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='text-neutral-400 hover:text-white text-xl p-1 transition-colors cursor-pointer rounded-lg hover:bg-vtt-dark-gray'
            title='Fechar'
          >
            ✕
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className='bg-red-950/70 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 flex items-center justify-between'>
            <span>{error}</span>
            <button
              type='button'
              onClick={() => setError(null)}
              className='text-red-400 hover:text-red-200 font-bold ml-2 cursor-pointer'
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className='bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-sm rounded-lg px-4 py-3 flex items-center justify-between'>
            <span>✓ {successMsg}</span>
          </div>
        )}

        {/* Player mode info banner */}
        {isPlayerMode && (
          <div className='bg-blue-950/40 border border-blue-700/50 text-blue-200 text-xs rounded-xl p-3.5 flex items-start gap-3'>
            <span className='text-base shrink-0'>ℹ️</span>
            <div>
              <p className='font-semibold text-blue-100'>Modo Jogador</p>
              <p className='text-blue-300/80 mt-0.5'>
                Você participa desta campanha como jogador. Apenas o Mestre pode alterar nome, descrição, sistema e status da campanha.
              </p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSave} className='flex flex-col gap-5'>
          {/* Status Section */}
          <div className='flex flex-col gap-2 p-4 rounded-xl bg-vtt-dark-gray/60 border border-vtt-dark-gray'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                Status da Campanha
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${STATUS_COLOR[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>

            {!isPlayerMode ? (
              <>
                <p className='text-xs text-neutral-400'>
                  Alterne o status da campanha para pausar sessões ou encerrar a história:
                </p>
                <div className='grid grid-cols-3 gap-2 mt-1'>
                  {/* Ativa */}
                  <button
                    type='button'
                    onClick={() => handleQuickStatusChange('active')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      status === 'active'
                        ? 'bg-green-950/80 border-green-600 text-green-300 shadow-xs'
                        : 'bg-vtt-dark border-vtt-dark-gray text-neutral-400 hover:text-white hover:border-neutral-500'
                    }`}
                  >
                    <span>▶️</span>
                    <span>Ativa</span>
                  </button>

                  {/* Pausada */}
                  <button
                    type='button'
                    onClick={() => handleQuickStatusChange('paused')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      status === 'paused'
                        ? 'bg-yellow-950/80 border-yellow-600 text-yellow-300 shadow-xs'
                        : 'bg-vtt-dark border-vtt-dark-gray text-neutral-400 hover:text-white hover:border-neutral-500'
                    }`}
                  >
                    <span>⏸️</span>
                    <span>Pausar</span>
                  </button>

                  {/* Finalizada */}
                  <button
                    type='button'
                    onClick={() => handleQuickStatusChange('finished')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      status === 'finished'
                        ? 'bg-neutral-800 border-neutral-500 text-neutral-200 shadow-xs'
                        : 'bg-vtt-dark border-vtt-dark-gray text-neutral-400 hover:text-white hover:border-neutral-500'
                    }`}
                  >
                    <span>🏁</span>
                    <span>Encerrar</span>
                  </button>
                </div>
              </>
            ) : (
              <p className='text-xs text-neutral-400 mt-1'>
                Status atual definido pelo Mestre: <strong className='text-white'>{STATUS_LABEL[status]}</strong>
              </p>
            )}
          </div>

          {/* Title */}
          <label className='flex flex-col gap-1.5'>
            <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
              Título da Campanha *
            </span>
            <input
              type='text'
              value={title}
              disabled={isPlayerMode}
              onChange={e => setTitle(e.target.value)}
              placeholder='Ex: A Maldição de Strahd'
              required
              maxLength={120}
              className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none focus:border-vtt-red disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
            />
          </label>

          {/* Description */}
          <label className='flex flex-col gap-1.5'>
            <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
              Descrição <span className='normal-case font-normal text-neutral-500'>(opcional)</span>
            </span>
            <textarea
              value={description}
              disabled={isPlayerMode}
              onChange={e => setDescription(e.target.value)}
              placeholder='Resumo do enredo, objetivos do grupo, avisos de cenário...'
              rows={3}
              maxLength={1000}
              className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none resize-none focus:border-vtt-red disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
            />
          </label>

          {/* RPG System */}
          <label className='flex flex-col gap-1.5'>
            <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>
              Sistema de Regras (RPG System)
            </span>
            <select
              value={systemId}
              disabled={isPlayerMode}
              onChange={e => setSystemId(Number(e.target.value))}
              className='bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-white p-2.5 text-sm outline-none focus:border-vtt-red disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
            >
              {systems.map(s => (
                <option key={s.id} value={s.id} className='bg-vtt-dark text-white'>
                  {s.name} {s.genre ? `(${s.genre})` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Actions Bar */}
          {!isPlayerMode && (
            <div className='flex items-center justify-end gap-3 pt-2 border-t border-vtt-dark-gray'>
              <button
                type='button'
                onClick={onClose}
                className='px-5 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer'
              >
                Cancelar
              </button>
              <button
                type='submit'
                disabled={isLoading}
                className='px-6 py-2.5 rounded-lg bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-colors cursor-pointer disabled:opacity-50'
              >
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          )}
        </form>

        {/* ── DANGER ZONE: EXCLUIR CAMPANHA ───────────────────────────── */}
        <div className='border-t border-red-900/50 pt-5 flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-bold text-red-400 flex items-center gap-1.5'>
                <span>⚠️</span>
                <span>Zona de Perigo</span>
              </h4>
              <p className='text-xs text-neutral-400 mt-0.5'>
                {isPlayerMode
                  ? 'Remova a cópia baixada desta campanha do seu computador local.'
                  : 'A exclusão é permanente e removerá todas as sessões, fichas e mensagens associadas.'}
              </p>
            </div>

            {!showDeleteConfirm && (
              <button
                type='button'
                onClick={() => setShowDeleteConfirm(true)}
                className='px-4 py-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900/80 hover:text-white transition-all text-xs font-semibold cursor-pointer shrink-0 ml-4'
              >
                {isPlayerMode ? 'Remover Campanha' : 'Excluir Campanha'}
              </button>
            )}
          </div>

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className='p-4 rounded-xl bg-red-950/40 border border-red-800/80 flex flex-col gap-3 animate-in fade-in duration-150'>
              <p className='text-xs text-red-200 leading-relaxed'>
                {isPlayerMode ? (
                  <>
                    Tem certeza que deseja remover esta campanha baixada? Ela não aparecerá mais na sua lista local.
                  </>
                ) : (
                  <>
                    Tem certeza absoluta? Para confirmar a exclusão definitiva, digite o nome da campanha{' '}
                    <strong className='text-white underline'>{campaign.title}</strong> abaixo:
                  </>
                )}
              </p>

              {!isPlayerMode && (
                <input
                  type='text'
                  value={confirmTitle}
                  onChange={e => setConfirmTitle(e.target.value)}
                  placeholder={campaign.title}
                  className='bg-vtt-dark border border-red-700/60 rounded-lg text-white p-2 text-xs outline-none focus:border-red-500 transition-colors'
                />
              )}

              <div className='flex items-center justify-end gap-2.5 pt-1'>
                <button
                  type='button'
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setConfirmTitle('')
                  }}
                  className='px-3.5 py-1.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-xs font-semibold hover:border-neutral-400 transition-colors cursor-pointer'
                >
                  Cancelar
                </button>
                <button
                  type='button'
                  disabled={isDeleting || (!isPlayerMode && confirmTitle.trim() !== campaign.title.trim())}
                  onClick={handleDelete}
                  className='px-4 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isDeleting ? 'Excluindo...' : isPlayerMode ? 'Confirmar Remoção' : 'Sim, Excluir Campanha'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
