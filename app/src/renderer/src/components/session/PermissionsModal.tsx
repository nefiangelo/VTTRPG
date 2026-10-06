import React, { useState, useEffect } from 'react'
import type {
  CampaignNode,
  NodeVisibility,
  NodePermission,
  PersistentParticipant
} from '../../../../preload/index.d'

interface PermissionsModalProps {
  node: CampaignNode | null
  isOpen: boolean
  onClose: () => void
  participants: PersistentParticipant[]
  onSave: (payload: {
    nodeId: string
    visibility: NodeVisibility
    sharedWith: string[]
    permission: NodePermission
  }) => Promise<void>
}

export default function PermissionsModal({
  node,
  isOpen,
  onClose,
  participants,
  onSave
}: PermissionsModalProps): React.JSX.Element | null {
  if (!isOpen || !node) return null

  // Filtra apenas participantes que são jogadores (exclui o GM da lista de compartilhamento)
  const playerParticipants = participants.filter((p) => p.role !== 'gm')

  const [mode, setMode] = useState<'empty' | 'all' | 'custom'>('empty')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [permission, setPermission] = useState<NodePermission>('view')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (node) {
      if (node.visibility === 'gm_only') {
        setMode('empty')
        setSelectedUsers([])
      } else if (node.visibility === 'all') {
        setMode('all')
        setSelectedUsers([])
      } else {
        setMode('custom')
        setSelectedUsers(node.shared_with || [])
      }
      setPermission(node.permission || 'view')
      setError(null)
    }
  }, [node])

  const toggleUser = (username: string) => {
    setSelectedUsers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    )
  }

  const selectAll = () => {
    setSelectedUsers(playerParticipants.map((p) => p.username))
  }

  const clearSelection = () => {
    setSelectedUsers([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    let visibility: NodeVisibility = 'gm_only'
    let sharedWith: string[] = []

    if (mode === 'empty') {
      visibility = 'gm_only'
      sharedWith = []
    } else if (mode === 'all') {
      visibility = 'all'
      sharedWith = []
    } else {
      visibility = 'custom'
      sharedWith = selectedUsers
    }

    try {
      await onSave({
        nodeId: node.id,
        visibility,
        sharedWith,
        permission
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Erro ao salvar permissões: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none'>
      <div className='bg-vtt-dark border border-vtt-dark-gray rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150'>
        {/* Cabeçalho */}
        <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3'>
          <div>
            <h3 className='text-base font-bold text-vtt-golden font-cinzel'>
              Permissões de Acesso
            </h3>
            <p className='text-xs text-neutral-400 truncate max-w-xs mt-0.5'>
              {node.type === 'folder' ? 'Pasta' : 'Arquivo'}: <strong className='text-vtt-light'>{node.name}</strong>
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='text-neutral-400 hover:text-white text-base p-1 rounded hover:bg-vtt-dark-gray cursor-pointer'
          >
            ✕
          </button>
        </div>

        {error && (
          <div className='bg-red-950/70 border border-red-700 text-red-300 text-xs rounded-lg p-2.5'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='flex flex-col gap-4 text-xs'>
          {/* Opções de Visibilidade: Vazia, Todos, Jogadores Específicos */}
          <div className='flex flex-col gap-2'>
            <span className='font-semibold text-vtt-light'>Quem pode acessar:</span>

            {/* 1. Vazia (Apenas Mestre) */}
            <label
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                mode === 'empty'
                  ? 'bg-vtt-dark-gray border-vtt-red text-white'
                  : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-300 hover:bg-vtt-dark-gray/50'
              }`}
            >
              <input
                type='radio'
                name='permissionMode'
                checked={mode === 'empty'}
                onChange={() => setMode('empty')}
                className='accent-vtt-red'
              />
              <div className='flex flex-col'>
                <span className='font-semibold text-white'>Vazia (Apenas o Mestre)</span>
                <span className='text-[11px] text-neutral-400'>Nenhum jogador verá ou terá acesso.</span>
              </div>
            </label>

            {/* 2. Todos os Jogadores */}
            <label
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                mode === 'all'
                  ? 'bg-vtt-dark-gray border-vtt-red text-white'
                  : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-300 hover:bg-vtt-dark-gray/50'
              }`}
            >
              <input
                type='radio'
                name='permissionMode'
                checked={mode === 'all'}
                onChange={() => setMode('all')}
                className='accent-vtt-red'
              />
              <div className='flex flex-col'>
                <span className='font-semibold text-white'>Todos (Todos os Jogadores)</span>
                <span className='text-[11px] text-neutral-400'>Qualquer jogador que entrar na sessão terá acesso.</span>
              </div>
            </label>

            {/* 3. Jogadores Específicos */}
            <label
              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                mode === 'custom'
                  ? 'bg-vtt-dark-gray border-vtt-red text-white'
                  : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-300 hover:bg-vtt-dark-gray/50'
              }`}
            >
              <input
                type='radio'
                name='permissionMode'
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className='accent-vtt-red'
              />
              <div className='flex flex-col'>
                <span className='font-semibold text-white'>Jogadores Específicos</span>
                <span className='text-[11px] text-neutral-400'>Escolha individualmente quais jogadores terão acesso.</span>
              </div>
            </label>
          </div>

          {/* Lista de Participantes Persistentes (quando custom selecionado) */}
          {mode === 'custom' && (
            <div className='p-3 bg-vtt-dark-gray/50 border border-vtt-dark-gray rounded-lg flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-vtt-golden text-[11px] uppercase tracking-wide'>
                  Jogadores da Sessão ({playerParticipants.length}):
                </span>
                {playerParticipants.length > 0 && (
                  <div className='flex gap-2 text-[11px]'>
                    <button
                      type='button'
                      onClick={selectAll}
                      className='text-vtt-golden hover:underline cursor-pointer'
                    >
                      Selecionar Todos
                    </button>
                    <span className='text-neutral-600'>•</span>
                    <button
                      type='button'
                      onClick={clearSelection}
                      className='text-neutral-400 hover:underline cursor-pointer'
                    >
                      Desmarcar
                    </button>
                  </div>
                )}
              </div>

              {playerParticipants.length === 0 ? (
                <div className='py-3 px-2 text-center text-neutral-400 text-xs italic bg-vtt-dark/50 rounded'>
                  Nenhum jogador acessou esta sessão ainda.
                  <br />
                  <span className='text-[11px] text-neutral-500'>
                    Assim que um jogador conectar, ele aparecerá aqui para ser selecionado.
                  </span>
                </div>
              ) : (
                <div className='max-h-36 overflow-y-auto flex flex-col gap-1 pr-1'>
                  {playerParticipants.map((p) => {
                    const isSelected = selectedUsers.includes(p.username)
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-vtt-dark border-vtt-red/60 text-white'
                            : 'bg-vtt-dark/40 border-transparent text-neutral-300 hover:text-white'
                        }`}
                      >
                        <div className='flex items-center gap-2'>
                          <input
                            type='checkbox'
                            checked={isSelected}
                            onChange={() => toggleUser(p.username)}
                            className='accent-vtt-red'
                          />
                          <span className='font-medium text-xs'>{p.username}</span>
                        </div>
                        <span className='text-[10px] text-neutral-500'>
                          {p.last_joined ? new Date(p.last_joined).toLocaleDateString() : ''}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Permissão: Somente Leitura vs Edição */}
          {mode !== 'empty' && (
            <div className='pt-2 border-t border-vtt-dark-gray flex items-center justify-between'>
              <span className='text-neutral-300 font-medium'>Nível de acesso do jogador:</span>
              <div className='flex gap-1 bg-vtt-dark-gray p-0.5 rounded-lg border border-vtt-light-gray/20'>
                <button
                  type='button'
                  onClick={() => setPermission('view')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    permission === 'view'
                      ? 'bg-vtt-dark text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Leitura
                </button>
                <button
                  type='button'
                  onClick={() => setPermission('edit')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    permission === 'edit'
                      ? 'bg-vtt-red text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Edição
                </button>
              </div>
            </div>
          )}

          {/* Rodapé com botões padrão */}
          <div className='flex items-center justify-end gap-3 pt-3 border-t border-vtt-dark-gray'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSaving}
              className='px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={isSaving}
              className='px-5 py-2 rounded-lg bg-vtt-red hover:bg-vtt-dark-red text-white text-xs font-semibold transition-colors cursor-pointer shadow'
            >
              {isSaving ? 'Salvando...' : 'Salvar Permissões'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
