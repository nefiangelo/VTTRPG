import React, { useState, useEffect, useCallback } from 'react'
import type {
  Session,
  CampaignWithDetails,
  ConnectedParticipant,
  CampaignNode,
  CreateCampaignNodePayload,
  PersistentParticipant,
  NodeVisibility,
  NodePermission
} from '../../../../preload/index.d'
import type { LibraryClient } from '../../services/libraryClient'
import type { LogEntry } from './LogsTab'
import ExplorerTab from './ExplorerTab'
import ChatTab from './ChatTab'
import ParticipantsTab from './ParticipantsTab'
import LogsTab from './LogsTab'
import SettingsTab from './SettingsTab'

type ActiveSidebarTab = 'explorer' | 'chat' | 'participants' | 'logs' | 'settings'

interface SessionSidebarProps {
  isPlayerMode: boolean
  session: Session | null
  campaign: CampaignWithDetails | null
  system: unknown
  participants: ConnectedParticipant[]
  isConnected: boolean
  connectionStatus: string
  currentPing: number | null
  syncStatus: string
  lastSyncTime: string | null
  accessCode: string
  serverUrl: string
  serverPort: number
  localAddresses: string[]
  logs: LogEntry[]
  setChatMessage: (v: string) => void
  libraryClient: LibraryClient | null
  persistentParticipants?: PersistentParticipant[]
  onSync: () => void
  onPing: () => void
  onRoll: (formula: string) => void
  onSendChat: (e: React.FormEvent) => void
  onClearLogs: () => void
  onLeave: () => void
  onEndSession: () => void
  onMarkEnded?: () => void
  onShowToTable?: (node: CampaignNode) => void
  onLibraryChanged?: () => void
}

export default function SessionSidebar({
  isPlayerMode,
  session,
  campaign,
  system,
  participants,
  isConnected,
  currentPing,
  syncStatus,
  lastSyncTime,
  accessCode,
  serverUrl,
  serverPort,
  localAddresses,
  logs,
  setChatMessage,
  libraryClient,
  persistentParticipants: externalParticipants,
  onSync,
  onPing,
  onRoll,
  onSendChat,
  onClearLogs,
  onLeave,
  onEndSession,
  onMarkEnded,
  onShowToTable,
  onLibraryChanged
}: SessionSidebarProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveSidebarTab>('explorer')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Lista de arquivos e pastas
  const [nodes, setNodes] = useState<CampaignNode[]>([])
  const [isLoadingNodes, setIsLoadingNodes] = useState(false)

  // Lista persistente de participantes que acessaram a sessão
  const [persistentParticipants, setPersistentParticipants] = useState<PersistentParticipant[]>(
    externalParticipants || []
  )

  useEffect(() => {
    if (externalParticipants && externalParticipants.length > 0) {
      setPersistentParticipants(externalParticipants)
    }
  }, [externalParticipants])

  const loadNodes = useCallback(async () => {
    if (!libraryClient) return
    setIsLoadingNodes(true)
    try {
      const fetched = await libraryClient.getNodes()
      setNodes(fetched)
    } catch (err) {
      console.error('Erro ao carregar nós:', err)
    } finally {
      setIsLoadingNodes(false)
    }
  }, [libraryClient])

  const loadParticipants = useCallback(async () => {
    if (!libraryClient) return
    try {
      const fetched = await libraryClient.getPersistentParticipants()
      setPersistentParticipants(fetched)
    } catch (err) {
      console.error('Erro ao buscar participantes persistentes:', err)
    }
  }, [libraryClient])

  useEffect(() => {
    loadNodes()
    loadParticipants()
  }, [loadNodes, loadParticipants])

  const handleCreateNode = async (payload: CreateCampaignNodePayload): Promise<void> => {
    if (!libraryClient) return
    const res = await libraryClient.createNode(payload)
    if (res.success) {
      await loadNodes()
      onLibraryChanged?.()
    } else {
      throw new Error(res.error || 'Falha ao criar item.')
    }
  }

  const handleUpdateNode = async (payload: { id: string; name?: string; description?: string | null; data?: Record<string, unknown> }): Promise<void> => {
    if (!libraryClient) return
    const res = await libraryClient.updateNode(payload)
    if (res.success) {
      await loadNodes()
      onLibraryChanged?.()
    } else {
      throw new Error(res.error || 'Falha ao atualizar item.')
    }
  }

  const handleSetNodeAccess = async (
    id: string,
    visibility: NodeVisibility,
    sharedWith: string[],
    permission: NodePermission
  ): Promise<void> => {
    if (!libraryClient) return
    const res = await libraryClient.setNodeAccess(id, visibility, sharedWith, permission)
    if (res.success) {
      await loadNodes()
      onLibraryChanged?.()
    } else {
      throw new Error(res.error || 'Falha ao atualizar permissões de acesso.')
    }
  }

  const handleDeleteNode = async (id: string): Promise<void> => {
    if (!libraryClient) return
    const res = await libraryClient.deleteNode(id)
    if (res.success) {
      await loadNodes()
      onLibraryChanged?.()
    } else {
      throw new Error(res.error || 'Falha ao excluir item.')
    }
  }

  const handleMoveNode = async (
    id: string,
    newParentId: string | null,
    orderIndex?: number
  ): Promise<void> => {
    if (!libraryClient) return
    const res = await libraryClient.moveNode(id, newParentId, orderIndex)
    if (res.success) {
      await loadNodes()
      onLibraryChanged?.()
    } else {
      throw new Error(res.error || 'Falha ao mover item.')
    }
  }

  const chatMessages = logs
    .filter((l) => l.type === 'chat' || l.type === 'dice')
    .map((l) => ({
      id: l.id,
      user: {
        username: l.message.includes(':') ? l.message.split(':')[0].replace(/^[^\w\s]+/, '').trim() : 'Mesa',
        role: l.type === 'dice' ? 'dice' : 'player'
      },
      text: l.message,
      type: l.type,
      timestamp: ''
    }))

  const tabs: { id: ActiveSidebarTab; label: string; icon: string }[] = [
    { id: 'explorer', label: 'Conteúdo', icon: '📁' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'participants', label: 'Jogadores', icon: '👥' },
    { id: 'logs', label: 'Logs', icon: '📜' },
    { id: 'settings', label: 'Sessão', icon: '⚙️' }
  ]

  return (
    <aside
      className={`h-screen flex flex-col bg-vtt-dark border-r border-vtt-dark-gray select-none shrink-0 transition-all duration-200 ${
        isCollapsed ? 'w-14' : 'w-80'
      }`}
    >
      {/* Header da Barra Lateral */}
      <div className='p-3 border-b border-vtt-dark-gray flex items-center justify-between min-h-12 bg-vtt-dark'>
        {!isCollapsed && (
          <div className='flex flex-col min-w-0 pr-1'>
            <h1 className='text-sm font-bold text-vtt-golden truncate font-cinzel'>
              {campaign?.title || 'Campanha'}
            </h1>
            <span className='text-[11px] text-neutral-400 truncate'>
              {session?.title || 'Sessão'} • <strong className={isPlayerMode ? 'text-blue-400' : 'text-vtt-red'}>{isPlayerMode ? 'Jogador' : 'Mestre'}</strong>
            </span>
          </div>
        )}

        <button
          type='button'
          onClick={() => setIsCollapsed(!isCollapsed)}
          className='w-7 h-7 rounded hover:bg-vtt-dark-gray flex items-center justify-center text-xs text-vtt-light cursor-pointer'
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? '»' : '«'}
        </button>
      </div>

      {/* Navegação entre Abas */}
      <div className='flex border-b border-vtt-dark-gray bg-vtt-dark-gray/30'>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => {
                setActiveTab(tab.id)
                if (isCollapsed) setIsCollapsed(false)
              }}
              className={`flex-1 py-2 text-center text-xs font-semibold transition-colors cursor-pointer border-b-2 flex flex-col items-center justify-center gap-0.5 ${
                isActive
                  ? 'border-vtt-red text-white bg-vtt-dark-gray/50'
                  : 'border-transparent text-neutral-400 hover:text-vtt-light'
              }`}
              title={tab.label}
            >
              <span>{tab.icon}</span>
              {!isCollapsed && <span className='text-[10px]'>{tab.label}</span>}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da Aba */}
      {!isCollapsed && (
        <div className='flex-1 overflow-hidden flex flex-col bg-vtt-dark'>
          {activeTab === 'explorer' && (
            <ExplorerTab
              nodes={nodes}
              participants={persistentParticipants}
              isGM={!isPlayerMode}
              isLoading={isLoadingNodes}
              onRefresh={() => {
                loadNodes()
                loadParticipants()
              }}
              onCreateNode={handleCreateNode}
              onUpdateNode={handleUpdateNode}
              onSetNodeAccess={handleSetNodeAccess}
              onDeleteNode={handleDeleteNode}
              onMoveNode={handleMoveNode}
              onShowToTable={onShowToTable}
            />
          )}

          {activeTab === 'chat' && (
            <ChatTab
              chatMessages={chatMessages}
              onSendMessage={(text) => {
                setChatMessage(text)
                onSendChat({ preventDefault: () => {} } as React.FormEvent)
              }}
              onRollDice={onRoll}
              isConnected={isConnected}
            />
          )}

          {activeTab === 'participants' && (
            <ParticipantsTab
              accessCode={accessCode}
              serverUrl={serverUrl}
              serverPort={serverPort}
              localAddresses={localAddresses}
              participants={participants}
              isConnected={isConnected}
              currentPing={currentPing}
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              onPing={onPing}
              onSync={onSync}
              isGM={!isPlayerMode}
            />
          )}

          {activeTab === 'logs' && <LogsTab logs={logs} onClear={onClearLogs} />}

          {activeTab === 'settings' && (
            <SettingsTab
              session={session}
              campaign={campaign}
              system={system as any}
              isGM={!isPlayerMode}
              onEndSession={onEndSession}
              onLeaveSession={onLeave}
              onMarkEnded={onMarkEnded}
            />
          )}
        </div>
      )}
    </aside>
  )
}
