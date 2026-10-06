import React, { useState, useEffect } from 'react'
import type { CampaignNode } from '../../../../preload/index.d'

interface NodeViewerModalProps {
  node: CampaignNode | null
  isOpen: boolean
  onClose: () => void
  isGM: boolean
  onUpdate: (payload: { id: string; name?: string; description?: string | null; data?: Record<string, unknown> }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onShowToTable?: (node: CampaignNode) => void
}

export default function NodeViewerModal({
  node,
  isOpen,
  onClose,
  isGM,
  onUpdate,
  onDelete,
  onShowToTable
}: NodeViewerModalProps): React.JSX.Element | null {
  if (!isOpen || !node) return null

  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view')
  const [name, setName] = useState(node.name)
  const [description, setDescription] = useState(node.description || '')
  const [noteMarkdown, setNoteMarkdown] = useState<string>(
    typeof node.data?.markdown === 'string' ? node.data.markdown : ''
  )
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const canEdit = isGM || node.permission === 'edit'

  useEffect(() => {
    if (node) {
      setName(node.name)
      setDescription(node.description || '')
      setNoteMarkdown(typeof node.data?.markdown === 'string' ? node.data.markdown : '')
      setActiveTab('view')
      setShowConfirmDelete(false)
    }
  }, [node])

  const handleSave = async () => {
    if (!canEdit) return
    setIsSaving(true)
    try {
      const updatedData = { ...node.data }
      if (node.type === 'note') {
        updatedData.markdown = noteMarkdown
      }
      await onUpdate({
        id: node.id,
        name: name.trim() || node.name,
        description: description.trim() || null,
        data: updatedData
      })
      setActiveTab('view')
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar alterações.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(node.id)
      onClose()
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir item.')
    }
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none'>
      <div className='bg-vtt-dark border border-vtt-light-gray/40 rounded-2xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-vtt-dark-gray pb-3'>
          <div className='flex items-center gap-2 min-w-0'>
            <span className='text-xs font-semibold px-2 py-0.5 rounded bg-vtt-dark-gray text-neutral-300 border border-vtt-light-gray/40'>
              {node.type === 'folder' ? 'Pasta' : node.type === 'character' ? 'Ficha' : node.type === 'note' ? 'Nota' : 'Imagem'}
            </span>
            <h2 className='text-base font-bold text-white truncate font-cinzel'>{node.name}</h2>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            {onShowToTable && (node.type === 'image' || node.type === 'note') && (
              <button
                type='button'
                onClick={() => onShowToTable(node)}
                className='px-2.5 py-1 rounded-lg bg-green-950 border border-green-800 text-green-300 hover:bg-green-900 text-xs font-semibold cursor-pointer'
              >
                Apresentar na Mesa
              </button>
            )}

            <button
              type='button'
              onClick={onClose}
              className='text-neutral-400 hover:text-white text-lg p-1 rounded hover:bg-vtt-dark-gray cursor-pointer'
            >
              ✕
            </button>
          </div>
        </div>

        {/* Abas Leitura vs Edição para notas */}
        {node.type === 'note' && canEdit && (
          <div className='flex gap-1 border-b border-vtt-dark-gray pb-2'>
            <button
              type='button'
              onClick={() => setActiveTab('view')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeTab === 'view' ? 'bg-vtt-dark-gray text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Leitura
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeTab === 'edit' ? 'bg-vtt-dark-gray text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Editar
            </button>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className='flex-1 overflow-y-auto text-xs text-vtt-light flex flex-col gap-3 py-1'>
          {node.type === 'note' && (
            activeTab === 'view' ? (
              <div className='p-4 bg-vtt-dark-gray rounded-xl leading-relaxed whitespace-pre-wrap select-text'>
                {noteMarkdown || 'Nenhum conteúdo nesta nota.'}
              </div>
            ) : (
              <div className='flex flex-col gap-2'>
                <textarea
                  value={noteMarkdown}
                  onChange={(e) => setNoteMarkdown(e.target.value)}
                  rows={12}
                  className='w-full p-3 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-vtt-red'
                />
                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={handleSave}
                    disabled={isSaving}
                    className='px-4 py-1.5 rounded-lg bg-vtt-red hover:bg-red-700 text-white font-bold cursor-pointer'
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )
          )}

          {node.type === 'image' && (
            <div className='flex flex-col items-center gap-3'>
              <div className='max-h-80 w-full flex items-center justify-center bg-black/60 rounded-xl overflow-hidden p-2'>
                <img
                  src={String(node.data?.url || '')}
                  alt={node.name}
                  className='max-h-72 max-w-full object-contain rounded'
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/600x400?text=Imagem+N%C3%A3o+Encontrada'
                  }}
                />
              </div>
              {node.description && <p className='text-neutral-400 italic'>{node.description}</p>}
            </div>
          )}

          {node.type === 'character' && (
            <div className='flex flex-col gap-3 p-4 bg-vtt-dark-gray rounded-xl'>
              <div className='flex items-center justify-between'>
                <span className='font-bold text-white text-sm'>{node.name}</span>
                <span className='px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-800 text-neutral-300'>
                  {String(node.data?.role || 'Personagem')}
                </span>
              </div>
              <div className='flex gap-4 text-xs'>
                <div>
                  <span className='text-neutral-400'>HP:</span>{' '}
                  <strong className='text-red-400'>
                    {(node.data?.hp as { current?: number })?.current ?? 20} /{' '}
                    {(node.data?.hp as { max?: number })?.max ?? 20}
                  </strong>
                </div>
                <div>
                  <span className='text-neutral-400'>CA:</span>{' '}
                  <strong className='text-amber-400'>{Number(node.data?.ac ?? 10)}</strong>
                </div>
              </div>
              {node.description && <p className='text-neutral-300 mt-2'>{node.description}</p>}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className='flex items-center justify-between border-t border-vtt-dark-gray pt-3'>
          {isGM ? (
            showConfirmDelete ? (
              <div className='flex items-center gap-2'>
                <span className='text-red-400 text-xs font-bold'>Confirmar exclusão?</span>
                <button
                  type='button'
                  onClick={handleDelete}
                  className='px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs font-bold cursor-pointer'
                >
                  Sim
                </button>
                <button
                  type='button'
                  onClick={() => setShowConfirmDelete(false)}
                  className='text-neutral-400 hover:text-white text-xs cursor-pointer'
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setShowConfirmDelete(true)}
                className='text-neutral-400 hover:text-red-400 text-xs cursor-pointer'
              >
                Excluir
              </button>
            )
          ) : (
            <div />
          )}

          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 rounded-lg bg-vtt-dark-gray hover:bg-neutral-700 text-white text-xs font-semibold cursor-pointer'
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
