import React, { useState, useEffect } from 'react'
import type {
  CampaignNode,
  CampaignNodeType,
  NodeVisibility,
  NodePermission,
  CreateCampaignNodePayload,
  PersistentParticipant
} from '../../../../preload/index.d'

interface CreateNodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: CreateCampaignNodePayload) => Promise<void>
  folders: CampaignNode[]
  participants: PersistentParticipant[]
  initialParentId?: string | null
  initialType?: CampaignNodeType
}

export default function CreateNodeModal({
  isOpen,
  onClose,
  onSave,
  folders,
  participants,
  initialParentId = null,
  initialType = 'folder'
}: CreateNodeModalProps): React.JSX.Element | null {
  const [type, setType] = useState<CampaignNodeType>(initialType)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<string | null>(initialParentId)

  // Permissões: empty (Vazia/Mestre), all (Todos), custom (Jogadores Específicos)
  const [permMode, setPermMode] = useState<'empty' | 'all' | 'custom'>('empty')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [permission, setPermission] = useState<NodePermission>('view')

  // Dados específicos
  const [characterRole, setCharacterRole] = useState<'pc' | 'npc' | 'monster'>('npc')
  const [noteContent, setNoteContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerParticipants = participants.filter((p) => p.role !== 'gm')

  useEffect(() => {
    if (isOpen) {
      setType(initialType)
      setParentId(initialParentId)
      setName('')
      setDescription('')
      setPermMode('empty')
      setSelectedUsers([])
      setPermission('view')
      setError(null)
      setNoteContent('')
      setMediaUrl('')
    }
  }, [isOpen, initialType, initialParentId])

  if (!isOpen) return null

  const toggleUser = (username: string) => {
    setSelectedUsers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Por favor, digite um nome para o item.')
      return
    }

    setIsLoading(true)
    setError(null)

    let visibility: NodeVisibility = 'gm_only'
    let sharedWith: string[] = []

    if (permMode === 'empty') {
      visibility = 'gm_only'
      sharedWith = []
    } else if (permMode === 'all') {
      visibility = 'all'
      sharedWith = []
    } else {
      visibility = 'custom'
      sharedWith = selectedUsers
    }

    let dataPayload: Record<string, unknown> = {}
    if (type === 'character') {
      dataPayload = {
        role: characterRole,
        hp: { current: 20, max: 20 },
        ac: 10,
        notes: description.trim()
      }
    } else if (type === 'note') {
      dataPayload = {
        markdown: noteContent || `# ${name}\n\nEscreva suas anotações aqui...`
      }
    } else if (type === 'image') {
      dataPayload = {
        url: mediaUrl || '',
        caption: name.trim()
      }
    }

    try {
      await onSave({
        campaign_id: 0,
        parent_id: parentId || null,
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        permission,
        shared_with: sharedWith,
        data: dataPayload
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Erro ao salvar: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none'>
      <div className='bg-vtt-dark border border-vtt-dark-gray rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150'>
        {/* Cabeçalho */}
        <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3'>
          <h2 className='text-base font-bold text-vtt-golden font-cinzel'>
            {type === 'folder' ? 'Nova Pasta' : 'Novo Arquivo'}
          </h2>
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

        <form onSubmit={handleSubmit} className='flex flex-col gap-3.5 text-xs'>
          {/* Seletor de Tipo */}
          <div>
            <label className='block font-semibold text-vtt-light mb-1'>Tipo do Item:</label>
            <div className='grid grid-cols-4 gap-1.5'>
              {[
                { type: 'folder', label: 'Pasta', icon: '📁' },
                { type: 'character', label: 'Ficha', icon: '👤' },
                { type: 'note', label: 'Nota', icon: '📝' },
                { type: 'image', label: 'Imagem', icon: '🖼️' }
              ].map((opt) => (
                <button
                  key={opt.type}
                  type='button'
                  onClick={() => setType(opt.type as CampaignNodeType)}
                  className={`py-2 px-1 rounded-lg border text-center transition-colors cursor-pointer flex flex-col items-center gap-0.5 ${
                    type === opt.type
                      ? 'bg-vtt-dark-gray border-vtt-red text-white'
                      : 'bg-vtt-dark-gray/30 border-vtt-light-gray/20 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className='text-sm'>{opt.icon}</span>
                  <span className='font-semibold text-[11px]'>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className='block font-semibold text-vtt-light mb-1'>Nome:</label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ex: Masmorra dos Goblins, Ficha de NPC...'
              autoFocus
              className='w-full px-3 py-2 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-vtt-golden'
            />
          </div>

          {/* Pasta Destino */}
          <div>
            <label className='block font-semibold text-vtt-light mb-1'>Pasta:</label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className='w-full px-3 py-2 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white focus:outline-none focus:border-vtt-golden cursor-pointer'
            >
              <option value=''>Raiz da Campanha</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campos específicos */}
          {type === 'character' && (
            <div>
              <label className='block font-semibold text-vtt-light mb-1'>Categoria:</label>
              <div className='flex gap-1.5'>
                {(['pc', 'npc', 'monster'] as const).map((r) => (
                  <button
                    key={r}
                    type='button'
                    onClick={() => setCharacterRole(r)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      characterRole === r
                        ? 'bg-vtt-dark-gray border-vtt-red text-white'
                        : 'border-vtt-light-gray/20 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r === 'pc' ? 'Jogador' : r === 'npc' ? 'NPC' : 'Monstro'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'image' && (
            <div>
              <label className='block font-semibold text-vtt-light mb-1'>URL da Imagem:</label>
              <input
                type='text'
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder='https://...'
                className='w-full px-3 py-2 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white focus:outline-none focus:border-vtt-golden'
              />
            </div>
          )}

          {/* Permissões: Vazia, Todos, Selecionar */}
          <div className='border-t border-vtt-dark-gray pt-3 flex flex-col gap-2'>
            <span className='font-semibold text-vtt-light'>Permissão de Acesso:</span>
            <div className='grid grid-cols-3 gap-1.5'>
              <button
                type='button'
                onClick={() => setPermMode('empty')}
                className={`py-1.5 px-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  permMode === 'empty'
                    ? 'bg-vtt-dark-gray border-vtt-red text-white'
                    : 'border-vtt-light-gray/20 text-neutral-400 hover:text-white'
                }`}
              >
                Vazia (Mestre)
              </button>
              <button
                type='button'
                onClick={() => setPermMode('all')}
                className={`py-1.5 px-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  permMode === 'all'
                    ? 'bg-vtt-dark-gray border-vtt-red text-white'
                    : 'border-vtt-light-gray/20 text-neutral-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type='button'
                onClick={() => setPermMode('custom')}
                className={`py-1.5 px-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  permMode === 'custom'
                    ? 'bg-vtt-dark-gray border-vtt-red text-white'
                    : 'border-vtt-light-gray/20 text-neutral-400 hover:text-white'
                }`}
              >
                Selecionar
              </button>
            </div>

            {permMode === 'custom' && (
              <div className='p-2.5 bg-vtt-dark-gray/50 border border-vtt-dark-gray rounded-lg flex flex-col gap-1.5 max-h-32 overflow-y-auto'>
                {playerParticipants.length === 0 ? (
                  <span className='text-neutral-500 italic text-[11px]'>
                    Nenhum jogador acessou a sessão ainda.
                  </span>
                ) : (
                  playerParticipants.map((p) => (
                    <label key={p.id} className='flex items-center gap-2 cursor-pointer text-neutral-200'>
                      <input
                        type='checkbox'
                        checked={selectedUsers.includes(p.username)}
                        onChange={() => toggleUser(p.username)}
                        className='accent-vtt-red'
                      />
                      <span>{p.username}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className='flex items-center justify-end gap-3 pt-3 border-t border-vtt-dark-gray'>
            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={isLoading || !name.trim()}
              className='px-5 py-2 rounded-lg bg-vtt-red hover:bg-vtt-dark-red text-white text-xs font-semibold transition-colors cursor-pointer shadow'
            >
              {isLoading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
