import React, { useState, useMemo } from 'react'
import type {
  CampaignNode,
  CampaignNodeType,
  CreateCampaignNodePayload,
  PersistentParticipant,
  NodeVisibility,
  NodePermission
} from '../../../../preload/index.d'
import CreateNodeModal from './CreateNodeModal'
import NodeViewerModal from './NodeViewerModal'
import PermissionsModal from './PermissionsModal'

interface ExplorerTabProps {
  nodes: CampaignNode[]
  participants: PersistentParticipant[]
  isGM: boolean
  isLoading: boolean
  onRefresh: () => void
  onCreateNode: (payload: CreateCampaignNodePayload) => Promise<void>
  onUpdateNode: (payload: { id: string; name?: string; description?: string | null; data?: Record<string, unknown> }) => Promise<void>
  onSetNodeAccess: (id: string, visibility: NodeVisibility, sharedWith: string[], permission: NodePermission) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onShowToTable?: (node: CampaignNode) => void
}

export default function ExplorerTab({
  nodes,
  participants,
  isGM,
  isLoading,
  onRefresh,
  onCreateNode,
  onUpdateNode,
  onSetNodeAccess,
  onDeleteNode,
  onShowToTable
}: ExplorerTabProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'folders' | 'characters' | 'notes' | 'images'>('all')

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createInitialType, setCreateInitialType] = useState<CampaignNodeType>('folder')
  const [createInitialParentId, setCreateInitialParentId] = useState<string | null>(null)

  const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const [permissionNode, setPermissionNode] = useState<CampaignNode | null>(null)
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)

  const folderList = useMemo(() => {
    return nodes.filter((n) => n.type === 'folder')
  }, [nodes])

  React.useEffect(() => {
    if (expandedFolders.size === 0 && folderList.length > 0) {
      setExpandedFolders(new Set(folderList.map((f) => f.id)))
    }
  }, [folderList])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Filtragem simples
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesName = node.name.toLowerCase().includes(query)
        const matchesDesc = (node.description || '').toLowerCase().includes(query)
        if (!matchesName && !matchesDesc) return false
      }

      if (filterType === 'folders') return node.type === 'folder'
      if (filterType === 'characters') return node.type === 'character'
      if (filterType === 'notes') return node.type === 'note'
      if (filterType === 'images') return node.type === 'image' || node.type === 'audio' || node.type === 'map'

      return true
    })
  }, [nodes, searchTerm, filterType])

  const { rootNodes, childrenByParent } = useMemo(() => {
    const root: CampaignNode[] = []
    const childrenMap = new Map<string, CampaignNode[]>()

    if (searchTerm.trim() || filterType !== 'all') {
      return { rootNodes: filteredNodes, childrenByParent: childrenMap }
    }

    for (const node of nodes) {
      if (!node.parent_id) {
        root.push(node)
      } else {
        const list = childrenMap.get(node.parent_id) || []
        list.push(node)
        childrenMap.set(node.parent_id, list)
      }
    }

    return { rootNodes: root, childrenByParent: childrenMap }
  }, [nodes, filteredNodes, searchTerm, filterType])

  const openCreate = (parentId: string | null = null, defaultType: CampaignNodeType = 'folder') => {
    setCreateInitialParentId(parentId)
    setCreateInitialType(defaultType)
    setCreateModalOpen(true)
  }

  const openPermissions = (e: React.MouseEvent, node: CampaignNode) => {
    e.stopPropagation()
    setPermissionNode(node)
    setPermissionModalOpen(true)
  }

  const getBadge = (node: CampaignNode) => {
    if (node.visibility === 'gm_only') {
      return (
        <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-vtt-dark-gray text-neutral-400 border border-vtt-light-gray/30'>
          Vazia (Mestre)
        </span>
      )
    }
    if (node.visibility === 'all') {
      return (
        <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60'>
          Todos
        </span>
      )
    }
    const count = (node.shared_with || []).length
    return (
      <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-vtt-golden border border-amber-800/60'>
        {count} {count === 1 ? 'Jogador' : 'Jogadores'}
      </span>
    )
  }

  const renderNode = (node: CampaignNode, depth: number = 0) => {
    const isFolder = node.type === 'folder'
    const isExpanded = expandedFolders.has(node.id)
    const children = childrenByParent.get(node.id) || []
    const paddingLeft = `${depth * 14 + 8}px`

    return (
      <div key={node.id} className='flex flex-col select-none'>
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.id)
            } else {
              setSelectedNode(node)
              setViewerOpen(true)
            }
          }}
          className='group flex items-center justify-between py-1.5 pr-2 rounded hover:bg-vtt-dark-gray/60 cursor-pointer transition-colors text-xs'
          style={{ paddingLeft }}
        >
          {/* Lado Esquerdo: Ícone + Nome */}
          <div className='flex items-center gap-1.5 min-w-0 flex-1 mr-2'>
            {isFolder ? (
              <span className='w-3 text-[10px] text-neutral-400'>
                {isExpanded ? '▼' : '▶'}
              </span>
            ) : (
              <span className='w-3' />
            )}

            <span className='text-xs'>
              {node.type === 'folder' ? '📁' : node.type === 'character' ? '👤' : node.type === 'note' ? '📝' : '🖼️'}
            </span>

            <span className='truncate text-vtt-light font-medium' title={node.name}>
              {node.name}
            </span>
          </div>

          {/* Lado Direito: Badge e Ações */}
          <div className='flex items-center gap-1.5 shrink-0'>
            {isGM ? (
              <button
                type='button'
                onClick={(e) => openPermissions(e, node)}
                className='cursor-pointer hover:opacity-80 transition-opacity'
                title='Gerenciar permissões de acesso'
              >
                {getBadge(node)}
              </button>
            ) : (
              node.permission === 'edit' && (
                <span className='px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800/60'>
                  Editável
                </span>
              )
            )}

            {isGM && (
              <div className='hidden group-hover:flex items-center gap-1'>
                {isFolder && (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation()
                      openCreate(node.id, 'note')
                    }}
                    className='p-0.5 px-1 rounded bg-vtt-dark-gray hover:bg-neutral-600 text-neutral-300 text-[10px] border border-vtt-light-gray/30'
                    title='Adicionar arquivo nesta pasta'
                  >
                    +
                  </button>
                )}
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Excluir "${node.name}"?`)) {
                      onDeleteNode(node.id)
                    }
                  }}
                  className='p-0.5 px-1 rounded bg-vtt-dark-gray hover:bg-vtt-red text-neutral-400 hover:text-white text-[10px] border border-vtt-light-gray/30'
                  title='Excluir'
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filhos da pasta */}
        {isFolder && isExpanded && children.length > 0 && (
          <div className='flex flex-col border-l border-vtt-dark-gray ml-3 my-0.5'>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full overflow-hidden text-vtt-light select-none bg-vtt-dark'>
      {/* Barra de Ferramentas Simples */}
      <div className='p-3 border-b border-vtt-dark-gray flex flex-col gap-2 bg-vtt-dark'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-bold text-vtt-golden uppercase tracking-wide font-cinzel'>
            Conteúdo
          </span>

          <div className='flex items-center gap-1.5'>
            {isGM && (
              <>
                <button
                  type='button'
                  onClick={() => openCreate(null, 'folder')}
                  className='px-2 py-1 rounded bg-vtt-dark-gray hover:bg-neutral-700 text-vtt-light text-xs border border-vtt-light-gray/40 cursor-pointer font-medium'
                >
                  + Pasta
                </button>
                <button
                  type='button'
                  onClick={() => openCreate(null, 'note')}
                  className='px-2 py-1 rounded bg-vtt-red hover:bg-vtt-dark-red text-white text-xs cursor-pointer font-semibold shadow'
                >
                  + Arquivo
                </button>
              </>
            )}

            <button
              type='button'
              onClick={onRefresh}
              className='p-1 px-1.5 rounded bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-300 text-xs border border-vtt-light-gray/40 cursor-pointer'
              title='Recarregar'
            >
              🔄
            </button>
          </div>
        </div>

        {/* Campo de Busca Simples */}
        <input
          type='text'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder='Buscar arquivos...'
          className='w-full px-2.5 py-1 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-vtt-golden'
        />

        {/* Filtros */}
        <div className='flex gap-1 overflow-x-auto text-[11px]'>
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'folders', label: 'Pastas' },
            { id: 'characters', label: 'Fichas' },
            { id: 'notes', label: 'Notas' },
            { id: 'images', label: 'Imagens' }
          ].map((tab) => (
            <button
              key={tab.id}
              type='button'
              onClick={() => setFilterType(tab.id as typeof filterType)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                filterType === tab.id
                  ? 'bg-vtt-dark-gray text-white border border-vtt-light-gray/50 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Árvore de Diretórios */}
      <div className='flex-1 overflow-y-auto p-2 flex flex-col gap-0.5'>
        {isLoading && nodes.length === 0 ? (
          <div className='p-4 text-center text-neutral-500 text-xs'>Carregando...</div>
        ) : rootNodes.length === 0 ? (
          <div className='p-6 text-center text-neutral-400 text-xs flex flex-col items-center gap-2'>
            <span>Nenhum item nesta pasta.</span>
            {isGM && (
              <button
                type='button'
                onClick={() => openCreate(null, 'folder')}
                className='px-3 py-1.5 rounded-lg bg-vtt-red hover:bg-vtt-dark-red text-white font-semibold text-xs cursor-pointer shadow mt-1'
              >
                + Criar Primeira Pasta
              </button>
            )}
          </div>
        ) : (
          rootNodes.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* Modais */}
      <CreateNodeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={onCreateNode}
        folders={folderList}
        participants={participants}
        initialParentId={createInitialParentId}
        initialType={createInitialType}
      />

      <NodeViewerModal
        node={selectedNode}
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false)
          setSelectedNode(null)
        }}
        isGM={isGM}
        onUpdate={onUpdateNode}
        onDelete={onDeleteNode}
        onShowToTable={onShowToTable}
      />

      <PermissionsModal
        node={permissionNode}
        isOpen={permissionModalOpen}
        onClose={() => {
          setPermissionModalOpen(false)
          setPermissionNode(null)
        }}
        participants={participants}
        onSave={async (payload) => {
          await onSetNodeAccess(payload.nodeId, payload.visibility, payload.sharedWith, payload.permission)
        }}
      />
    </div>
  )
}
