import React, { useState, useMemo, useRef } from 'react'
import type {
  CampaignNode,
  CampaignNodeType,
  CreateCampaignNodePayload,
  PersistentParticipant,
  NodeVisibility,
  NodePermission,
  RpgSystemFull
} from '../../../../preload/index.d'
import CreateNodeModal from './CreateNodeModal'
import NodeViewerModal from './NodeViewerModal'
import PermissionsModal from './PermissionsModal'
import {
  Folder,
  FolderOpen,
  FileText,
  User,
  Image as ImageIcon,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  ArrowDownToLine,
  Search
} from 'lucide-react'

interface ExplorerTabProps {
  nodes: CampaignNode[]
  participants: PersistentParticipant[]
  isGM: boolean
  isLoading: boolean
  system?: RpgSystemFull | null
  onRefresh: () => void
  onCreateNode: (payload: CreateCampaignNodePayload) => Promise<void>
  onUpdateNode: (payload: { id: string; name?: string; description?: string | null; data?: Record<string, unknown> }) => Promise<void>
  onMoveNode: (id: string, newParentId: string | null, orderIndex?: number) => Promise<void>
  onSetNodeAccess: (id: string, visibility: NodeVisibility, sharedWith: string[], permission: NodePermission) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onShowToTable?: (node: CampaignNode) => void
  onRoll?: (formula: string, label: string) => void
}

type DropPosition = 'before' | 'inside' | 'after'

interface DropTargetInfo {
  id: string | 'root'
  position: DropPosition
}

/**
 * Verifica se targetId é o próprio parentId ou um descendente dele (evita ciclos ao mover pastas)
 */
function isDescendant(nodes: CampaignNode[], parentId: string, potentialChildId: string): boolean {
  if (parentId === potentialChildId) return true
  const nodeMap = new Map<string, CampaignNode>()
  nodes.forEach((n) => nodeMap.set(n.id, n))

  let current = nodeMap.get(potentialChildId)
  while (current && current.parent_id) {
    if (current.parent_id === parentId) return true
    current = nodeMap.get(current.parent_id)
  }
  return false
}

export default function ExplorerTab({
  nodes,
  participants,
  isGM,
  isLoading,
  system,
  onRefresh,
  onCreateNode,
  onUpdateNode,
  onMoveNode,
  onSetNodeAccess,
  onDeleteNode,
  onShowToTable,
  onRoll
}: ExplorerTabProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'folders' | 'characters' | 'notes' | 'images'>('all')

  // Pastas recolhidas (por padrão todas começam expandidas)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())

  // Estado de Drag & Drop para Reorganização
  const [draggedNode, setDraggedNode] = useState<CampaignNode | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTargetInfo | null>(null)
  const [isMoving, setIsMoving] = useState<boolean>(false)
  const hoverFolderTimeoutRef = useRef<number | null>(null)

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false)
  const [createInitialType, setCreateInitialType] = useState<CampaignNodeType>('folder')
  const [createInitialParentId, setCreateInitialParentId] = useState<string | null>(null)

  const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
  const [viewerOpen, setViewerOpen] = useState<boolean>(false)

  const [permissionNode, setPermissionNode] = useState<CampaignNode | null>(null)
  const [permissionModalOpen, setPermissionModalOpen] = useState<boolean>(false)

  const folderList = useMemo((): CampaignNode[] => {
    return nodes.filter((n) => n.type === 'folder')
  }, [nodes])

  const toggleFolder = (id: string): void => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandFolder = (id: string): void => {
    setCollapsedFolders((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Filtragem
  const filteredNodes = useMemo((): CampaignNode[] => {
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

  const { rootNodes, childrenByParent } = useMemo((): {
    rootNodes: CampaignNode[]
    childrenByParent: Map<string, CampaignNode[]>
  } => {
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

  const openCreate = (parentId: string | null = null, defaultType: CampaignNodeType = 'folder'): void => {
    setCreateInitialParentId(parentId)
    setCreateInitialType(defaultType)
    setCreateModalOpen(true)
  }

  const openPermissions = (e: React.MouseEvent, node: CampaignNode): void => {
    e.stopPropagation()
    setPermissionNode(node)
    setPermissionModalOpen(true)
  }

  // --- Lógica de Drag & Drop ---

  const clearHoverFolderTimeout = (): void => {
    if (hoverFolderTimeoutRef.current) {
      window.clearTimeout(hoverFolderTimeoutRef.current)
      hoverFolderTimeoutRef.current = null
    }
  }

  const handleDragStart = (e: React.DragEvent, node: CampaignNode): void => {
    const canDrag = isGM || node.permission === 'edit'
    if (!canDrag) {
      e.preventDefault()
      return
    }

    e.dataTransfer.setData('text/plain', node.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedNode(node)
  }

  const handleDragEnd = (): void => {
    clearHoverFolderTimeout()
    setDraggedNode(null)
    setDropTarget(null)
  }

  const handleDragOverNode = (e: React.DragEvent, targetNode: CampaignNode): void => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNode || draggedNode.id === targetNode.id) return

    // Previne soltar uma pasta dentro dela mesma ou de seus descendentes
    if (draggedNode.type === 'folder' && isDescendant(nodes, draggedNode.id, targetNode.id)) {
      e.dataTransfer.dropEffect = 'none'
      setDropTarget(null)
      return
    }

    e.dataTransfer.dropEffect = 'move'

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const height = rect.height
    let position: DropPosition

    if (targetNode.type === 'folder') {
      if (offsetY < height * 0.25) {
        position = 'before'
      } else if (offsetY > height * 0.75) {
        position = 'after'
      } else {
        position = 'inside'
      }
    } else {
      position = offsetY < height * 0.5 ? 'before' : 'after'
    }

    // Auto-expande pasta fechada ao pairar por 600ms
    if (position === 'inside' && targetNode.type === 'folder' && collapsedFolders.has(targetNode.id)) {
      if (!hoverFolderTimeoutRef.current) {
        hoverFolderTimeoutRef.current = window.setTimeout((): void => {
          expandFolder(targetNode.id)
          hoverFolderTimeoutRef.current = null
        }, 600)
      }
    } else {
      clearHoverFolderTimeout()
    }

    setDropTarget({ id: targetNode.id, position })
  }

  const handleDragLeaveNode = (e: React.DragEvent, targetNode: CampaignNode): void => {
    e.stopPropagation()
    const related = e.relatedTarget as Node | null
    if (!e.currentTarget.contains(related)) {
      if (dropTarget?.id === targetNode.id) {
        setDropTarget(null)
      }
      clearHoverFolderTimeout()
    }
  }

  const handleDropOnNode = async (e: React.DragEvent, targetNode: CampaignNode): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    clearHoverFolderTimeout()

    if (!draggedNode || draggedNode.id === targetNode.id || !dropTarget) {
      setDropTarget(null)
      setDraggedNode(null)
      return
    }

    // Validação de segurança anti-ciclo para pastas
    if (draggedNode.type === 'folder' && isDescendant(nodes, draggedNode.id, targetNode.id)) {
      alert('Não é possível mover uma pasta para dentro de si mesma ou de uma de suas subpastas.')
      setDropTarget(null)
      setDraggedNode(null)
      return
    }

    setIsMoving(true)
    try {
      if (dropTarget.position === 'inside' && targetNode.type === 'folder') {
        // Mover para dentro da pasta
        const siblings = (childrenByParent.get(targetNode.id) || []).filter((n) => n.id !== draggedNode.id)
        const newOrder = siblings.length > 0 ? (siblings[siblings.length - 1].order_index || 0) + 10 : 0
        await onMoveNode(draggedNode.id, targetNode.id, newOrder)
        // Garante que a pasta fica aberta para o usuário ver o arquivo inserido
        expandFolder(targetNode.id)
      } else {
        // Mover antes ou depois de targetNode (mesmo parent que targetNode)
        const targetParentId = targetNode.parent_id
        const siblings = (targetParentId ? childrenByParent.get(targetParentId) || [] : rootNodes).filter(
          (n) => n.id !== draggedNode.id
        )

        const targetIdx = siblings.findIndex((n) => n.id === targetNode.id)
        let newOrder: number

        if (dropTarget.position === 'before') {
          if (targetIdx <= 0) {
            newOrder = (targetNode.order_index || 0) - 10
          } else {
            const prevOrder = siblings[targetIdx - 1]?.order_index ?? (targetNode.order_index - 10)
            const nextOrder = targetNode.order_index || 0
            newOrder = Math.round((prevOrder + nextOrder) / 2)
            if (newOrder === nextOrder || newOrder === prevOrder) {
              newOrder = nextOrder - 1
            }
          }
        } else {
          // 'after'
          if (targetIdx === -1 || targetIdx === siblings.length - 1) {
            newOrder = (targetNode.order_index || 0) + 10
          } else {
            const nextOrder = siblings[targetIdx + 1]?.order_index ?? (targetNode.order_index + 10)
            newOrder = Math.round(((targetNode.order_index || 0) + nextOrder) / 2)
            if (newOrder === targetNode.order_index || newOrder === nextOrder) {
              newOrder = (targetNode.order_index || 0) + 1
            }
          }
        }

        await onMoveNode(draggedNode.id, targetParentId, newOrder)
      }
    } catch (err: unknown) {
      console.error('Erro ao reorganizar nó:', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Falha ao reorganizar item: ${msg}`)
    } finally {
      setIsMoving(false)
      setDraggedNode(null)
      setDropTarget(null)
    }
  }

  const handleDropOnRoot = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    clearHoverFolderTimeout()

    if (!draggedNode) return

    // Se já estiver na raiz e não houver reordenação direta, não precisa mover
    if (!draggedNode.parent_id && dropTarget?.id === 'root') {
      setDropTarget(null)
      setDraggedNode(null)
      return
    }

    setIsMoving(true)
    try {
      const rootSiblings = rootNodes.filter((n) => n.id !== draggedNode.id)
      const newOrder = rootSiblings.length > 0 ? (rootSiblings[rootSiblings.length - 1].order_index || 0) + 10 : 0
      await onMoveNode(draggedNode.id, null, newOrder)
    } catch (err: unknown) {
      console.error('Erro ao mover para a raiz:', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Falha ao mover para a raiz: ${msg}`)
    } finally {
      setIsMoving(false)
      setDraggedNode(null)
      setDropTarget(null)
    }
  }

  const getBadge = (node: CampaignNode): React.JSX.Element => {
    if (node.visibility === 'gm_only') {
      return (
        <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-vtt-dark-gray text-neutral-400 border border-vtt-light-gray/30'>
          Mestre
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

  const renderNodeIcon = (type: CampaignNodeType, isFolderOpen: boolean): React.JSX.Element => {
    switch (type) {
      case 'folder':
        return isFolderOpen ? (
          <FolderOpen className='w-4 h-4 text-amber-400 shrink-0' />
        ) : (
          <Folder className='w-4 h-4 text-amber-400 shrink-0' />
        )
      case 'character':
        return <User className='w-4 h-4 text-cyan-400 shrink-0' />
      case 'note':
        return <FileText className='w-4 h-4 text-vtt-golden shrink-0' />
      case 'image':
      default:
        return <ImageIcon className='w-4 h-4 text-emerald-400 shrink-0' />
    }
  }

  const renderNode = (node: CampaignNode, depth = 0): React.JSX.Element => {
    const isFolder = node.type === 'folder'
    const isExpanded = !collapsedFolders.has(node.id)
    const children = childrenByParent.get(node.id) || []
    const paddingLeft = `${depth * 14 + 6}px`

    const isBeingDragged = draggedNode?.id === node.id
    const isTarget = dropTarget?.id === node.id
    const targetPos = isTarget ? dropTarget?.position : null

    // Verifica se este item é um alvo proibido para a pasta que está sendo arrastada
    const isInvalidTarget =
      draggedNode &&
      draggedNode.id !== node.id &&
      draggedNode.type === 'folder' &&
      isDescendant(nodes, draggedNode.id, node.id)

    const canDrag = isGM || node.permission === 'edit'

    return (
      <div key={node.id} className='flex flex-col select-none relative'>
        {/* Indicador de Soltura: ANTES (Before) */}
        {isTarget && targetPos === 'before' && (
          <div className='absolute -top-1 left-2 right-2 h-0.5 bg-vtt-golden rounded-full shadow-[0_0_8px_#E9D180] z-20 pointer-events-none flex items-center'>
            <div className='w-2 h-2 rounded-full bg-vtt-golden -ml-1' />
          </div>
        )}

        <div
          draggable={canDrag}
          onDragStart={(e): void => handleDragStart(e, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(e): void => handleDragOverNode(e, node)}
          onDragLeave={(e): void => handleDragLeaveNode(e, node)}
          onDrop={(e): void => {
            handleDropOnNode(e, node)
          }}
          onClick={(): void => {
            if (isFolder) {
              toggleFolder(node.id)
            } else {
              setSelectedNode(node)
              setViewerOpen(true)
            }
          }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-all duration-150 text-xs relative ${isBeingDragged
            ? 'opacity-40 scale-[0.98] border border-dashed border-vtt-golden/60 bg-neutral-900/40'
            : isTarget && targetPos === 'inside'
              ? 'ring-2 ring-vtt-golden bg-amber-950/40 text-vtt-golden shadow-md'
              : isInvalidTarget
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-vtt-dark-gray/70 text-vtt-light'
            }`}
          style={{ paddingLeft }}
        >
          {/* Lado Esquerdo: Grip Handle + Ícone + Nome */}
          <div className='flex items-center gap-1.5 min-w-0 flex-1 mr-2'>
            {/* Ícone de Drag & Drop para indicar que é reordenável */}
            {canDrag && (
              <span
                className='text-neutral-500 hover:text-vtt-golden cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity -ml-1'
                title='Arraste para reorganizar'
                onClick={(e): void => e.stopPropagation()}
              >
                <GripVertical className='w-3 h-3' />
              </span>
            )}

            {isFolder ? (
              <button
                type='button'
                onClick={(e): void => {
                  e.stopPropagation()
                  toggleFolder(node.id)
                }}
                className='p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer'
              >
                {isExpanded ? (
                  <ChevronDown className='w-3 h-3' />
                ) : (
                  <ChevronRight className='w-3 h-3' />
                )}
              </button>
            ) : (
              <span className='w-3' />
            )}

            {renderNodeIcon(node.type, isExpanded)}

            <span className='truncate font-medium' title={node.name}>
              {node.name}
            </span>

            {/* Badge visual quando uma pasta é alvo de inserção */}
            {isTarget && targetPos === 'inside' && (
              <span className='text-[10px] text-vtt-golden font-semibold animate-pulse ml-1 shrink-0'>
                (Soltar dentro)
              </span>
            )}
          </div>

          {/* Lado Direito: Badge e Ações */}
          <div className='flex items-center gap-1.5 shrink-0'>
            {isGM ? (
              <button
                type='button'
                onClick={(e): void => openPermissions(e, node)}
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
                    onClick={(e): void => {
                      e.stopPropagation()
                      openCreate(node.id, 'note')
                    }}
                    className='p-1 rounded bg-vtt-dark-gray hover:bg-neutral-600 text-neutral-300 text-[10px] border border-vtt-light-gray/30 cursor-pointer'
                    title='Adicionar nota nesta pasta'
                  >
                    <Plus className='w-3 h-3' />
                  </button>
                )}
                <button
                  type='button'
                  onClick={(e): void => {
                    e.stopPropagation()
                    if (window.confirm(`Excluir "${node.name}"?`)) {
                      onDeleteNode(node.id)
                    }
                  }}
                  className='p-1 rounded bg-vtt-dark-gray hover:bg-vtt-red text-neutral-400 hover:text-white text-[10px] border border-vtt-light-gray/30 cursor-pointer transition-colors'
                  title='Excluir'
                >
                  <Trash2 className='w-3 h-3' />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Indicador de Soltura: DEPOIS (After) */}
        {isTarget && targetPos === 'after' && (
          <div className='absolute -bottom-1 left-2 right-2 h-0.5 bg-vtt-golden rounded-full shadow-[0_0_8px_#E9D180] z-20 pointer-events-none flex items-center'>
            <div className='w-2 h-2 rounded-full bg-vtt-golden -ml-1' />
          </div>
        )}

        {/* Filhos da pasta */}
        {isFolder && isExpanded && children.length > 0 && (
          <div className='flex flex-col border-l border-vtt-dark-gray/60 ml-3.5 my-0.5'>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full overflow-hidden text-vtt-light select-none bg-vtt-dark'>
      {/* Barra de Ferramentas */}
      <div className='p-3 border-b border-vtt-dark-gray flex flex-col gap-2 bg-vtt-dark'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-bold text-vtt-golden uppercase tracking-wide font-cinzel'>
            Biblioteca da Campanha
          </span>

          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              onClick={onRefresh}
              className='p-1.5 rounded bg-vtt-dark-gray hover:bg-neutral-700 text-neutral-300 text-xs border border-vtt-light-gray/40 cursor-pointer transition-colors'
              title='Recarregar lista'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-vtt-golden' : ''}`} />
            </button>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className='relative'>
          <Search className='w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-500' />
          <input
            type='text'
            value={searchTerm}
            onChange={(e): void => setSearchTerm(e.target.value)}
            placeholder='Buscar arquivos e pastas...'
            className='w-full pl-8 pr-2.5 py-1 bg-vtt-dark-gray border border-vtt-light-gray/40 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-vtt-golden transition-colors'
          />
        </div>

        {/* Filtros */}
        <div className='flex gap-1 overflow-x-auto text-[11px] pb-0.5'>
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
              onClick={(): void => setFilterType(tab.id as typeof filterType)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${filterType === tab.id
                ? 'bg-vtt-dark-gray text-vtt-golden border border-vtt-light-gray/50 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isGM && (
        <div className='w-full flex gap-3 my-2 px-4'>
          <button
            type='button'
            onClick={(): void => openCreate(null, 'folder')}
            className='w-1/2 flex items-center gap-1 px-2 py-1 rounded bg-vtt-dark-gray hover:bg-neutral-700 text-vtt-light text-xs border border-vtt-light-gray/40 cursor-pointer font-medium transition-colors'
            title='Criar nova pasta na raiz'
          >
            <Folder className='w-3 h-3 text-amber-400' />
            <span>Pasta</span>
          </button>
          <button
            type='button'
            onClick={(): void => openCreate(null, 'note')}
            className='w-1/2 flex items-center gap-1 px-2 py-1 rounded bg-vtt-red hover:bg-vtt-dark-red text-white text-xs cursor-pointer font-semibold shadow transition-colors'
            title='Criar novo arquivo na raiz'
          >
            <Plus className='w-3 h-3' />
            <span>Arquivo</span>
          </button>
        </div>
      )}

      {/* Árvore de Diretórios (Drop Zone na Raiz) */}
      <div
        onDragOver={(e): void => {
          e.preventDefault()
          if (draggedNode && draggedNode.parent_id !== null) {
            setDropTarget({ id: 'root', position: 'inside' })
          }
        }}
        onDrop={(e): void => {
          handleDropOnRoot(e)
        }}
        className='flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 relative'
      >
        {isMoving && (
          <div className='absolute inset-0 bg-black/40 backdrop-blur-2xs z-30 flex items-center justify-center text-xs text-vtt-golden font-cinzel animate-pulse'>
            Reorganizando...
          </div>
        )}

        {isLoading && nodes.length === 0 ? (
          <div className='p-6 text-center text-neutral-500 text-xs flex flex-col items-center gap-2'>
            <RefreshCw className='w-5 h-5 animate-spin text-neutral-600' />
            <span>Carregando biblioteca...</span>
          </div>
        ) : rootNodes.length === 0 ? (
          <div className='p-8 text-center text-neutral-400 text-xs flex flex-col items-center gap-2'>
            <span>Nenhum item encontrado nesta exibição.</span>
            {isGM && (
              <button
                type='button'
                onClick={(): void => openCreate(null, 'folder')}
                className='px-3 py-1.5 rounded-lg bg-vtt-red hover:bg-vtt-dark-red text-white font-semibold text-xs cursor-pointer shadow mt-1 transition-colors'
              >
                + Criar Primeira Pasta
              </button>
            )}
          </div>
        ) : (
          rootNodes.map((node) => renderNode(node, 0))
        )}

        {/* Zona de Drop Especial para Mover para a Raiz */}
        {draggedNode && draggedNode.parent_id !== null && (
          <div
            onDragOver={(e): void => {
              e.preventDefault()
              e.stopPropagation()
              setDropTarget({ id: 'root', position: 'inside' })
            }}
            onDragLeave={(e): void => {
              e.stopPropagation()
              if (dropTarget?.id === 'root') {
                setDropTarget(null)
              }
            }}
            onDrop={(e): void => {
              handleDropOnRoot(e)
            }}
            className={`p-3 mt-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${dropTarget?.id === 'root'
              ? 'border-vtt-golden bg-amber-950/40 text-vtt-golden scale-[1.01] shadow-lg'
              : 'border-neutral-700/60 text-neutral-400 hover:border-neutral-500 bg-neutral-900/30'
              }`}
          >
            <ArrowDownToLine className='w-4 h-4' />
            <span>Soltar aqui para mover para a raiz</span>
          </div>
        )}
      </div>

      {/* Modais */}
      <CreateNodeModal
        isOpen={createModalOpen}
        onClose={(): void => setCreateModalOpen(false)}
        onSave={onCreateNode}
        folders={folderList}
        participants={participants}
        initialParentId={createInitialParentId}
        initialType={createInitialType}
      />

      <NodeViewerModal
        node={selectedNode}
        isOpen={viewerOpen}
        onClose={(): void => {
          setViewerOpen(false)
          setSelectedNode(null)
        }}
        isGM={isGM}
        system={system}
        onRoll={onRoll}
        onUpdate={onUpdateNode}
        onDelete={onDeleteNode}
        onShowToTable={onShowToTable}
      />

      <PermissionsModal
        node={permissionNode}
        isOpen={permissionModalOpen}
        onClose={(): void => {
          setPermissionModalOpen(false)
          setPermissionNode(null)
        }}
        participants={participants}
        onSave={async (payload): Promise<void> => {
          await onSetNodeAccess(payload.nodeId, payload.visibility, payload.sharedWith, payload.permission)
        }}
      />
    </div>
  )
}
