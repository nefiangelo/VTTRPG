import type {
  CampaignNode,
  CreateCampaignNodePayload,
  UpdateCampaignNodePayload,
  NodeVisibility,
  NodePermission,
  PersistentParticipant
} from '../../../preload/index.d'

export interface LibraryClient {
  getNodes: () => Promise<CampaignNode[]>
  createNode: (payload: CreateCampaignNodePayload) => Promise<{ success: boolean; node?: CampaignNode; error?: string }>
  updateNode: (payload: UpdateCampaignNodePayload) => Promise<{ success: boolean; node?: CampaignNode; error?: string }>
  deleteNode: (id: string) => Promise<{ success: boolean; error?: string }>
  moveNode: (id: string, newParentId: string | null, orderIndex?: number) => Promise<{ success: boolean; error?: string }>
  toggleVisibility: (id: string, visibility: NodeVisibility) => Promise<{ success: boolean; error?: string }>
  togglePermission: (id: string, permission: NodePermission) => Promise<{ success: boolean; error?: string }>
  setNodeAccess: (
    id: string,
    visibility: NodeVisibility,
    sharedWith: string[],
    permission: NodePermission
  ) => Promise<{ success: boolean; node?: CampaignNode; error?: string }>
  getPersistentParticipants: () => Promise<PersistentParticipant[]>
}

/**
 * Cliente local utilizado pelo Mestre (grava diretamente no SQLite via IPC Electron)
 */
export function createLocalLibraryClient(
  campaignId: number,
  _userId: number,
  sessionId?: number
): LibraryClient {
  return {
    getNodes: async () => {
      try {
        return await window.api.campaignNodes.getByCampaign(campaignId, true)
      } catch (err) {
        console.error('Erro ao buscar nós da biblioteca local:', err)
        return []
      }
    },

    createNode: async (payload) => {
      return await window.api.campaignNodes.create({
        ...payload,
        campaign_id: campaignId
      })
    },

    updateNode: async (payload) => {
      return await window.api.campaignNodes.update(payload, campaignId)
    },

    deleteNode: async (id) => {
      return await window.api.campaignNodes.delete(id, campaignId)
    },

    moveNode: async (id, newParentId, orderIndex) => {
      const payload: UpdateCampaignNodePayload = { id, parent_id: newParentId }
      if (orderIndex !== undefined) {
        payload.order_index = orderIndex
      }
      return await window.api.campaignNodes.update(payload, campaignId)
    },

    toggleVisibility: async (id, visibility) => {
      return await window.api.campaignNodes.update({ id, visibility }, campaignId)
    },

    togglePermission: async (id, permission) => {
      return await window.api.campaignNodes.update({ id, permission }, campaignId)
    },

    setNodeAccess: async (id, visibility, sharedWith, permission) => {
      return await window.api.campaignNodes.update(
        {
          id,
          visibility,
          shared_with: sharedWith,
          permission
        },
        campaignId
      )
    },

    getPersistentParticipants: async () => {
      try {
        return await window.api.sessions.getParticipants(sessionId, campaignId)
      } catch (err) {
        console.error('Erro ao buscar participantes persistentes:', err)
        return []
      }
    }
  }
}

/**
 * Cliente remoto utilizado pelo Jogador (conecta via HTTP REST no servidor Express do Mestre)
 */
export function createRemoteLibraryClient(config: {
  serverUrl: string
  code: string
  username: string
}): LibraryClient {
  const baseUrl = config.serverUrl.replace(/\/+$/, '')

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-session-code': config.code,
    'x-player-username': config.username
  }

  return {
    getNodes: async () => {
      try {
        const query = new URLSearchParams({
          code: config.code,
          username: config.username
        }).toString()
        const res = await fetch(`${baseUrl}/api/session/nodes?${query}`, {
          headers: authHeaders
        })
        if (!res.ok) return []
        const data = await res.json()
        return data.nodes || []
      } catch (err) {
        console.error('Erro ao buscar nós remotos da biblioteca:', err)
        return []
      }
    },

    createNode: async (payload) => {
      try {
        const res = await fetch(`${baseUrl}/api/session/nodes`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    updateNode: async (payload) => {
      try {
        const res = await fetch(`${baseUrl}/api/session/nodes/${payload.id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify(payload)
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    deleteNode: async (id) => {
      try {
        const res = await fetch(`${baseUrl}/api/session/nodes/${id}`, {
          method: 'DELETE',
          headers: authHeaders
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    moveNode: async (id, newParentId, orderIndex) => {
      try {
        const body: Record<string, unknown> = { parent_id: newParentId }
        if (orderIndex !== undefined) {
          body.order_index = orderIndex
        }
        const res = await fetch(`${baseUrl}/api/session/nodes/${id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify(body)
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    toggleVisibility: async (id, visibility) => {
      try {
        const res = await fetch(`${baseUrl}/api/session/nodes/${id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ visibility })
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    togglePermission: async (id, permission) => {
      try {
        const res = await fetch(`${baseUrl}/api/session/nodes/${id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ permission })
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    setNodeAccess: async (id, visibility, sharedWith, permission) => {
      try {
        const res = await fetch(`${baseUrl}/api/session/nodes/${id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            visibility,
            shared_with: sharedWith,
            permission
          })
        })
        return await res.json()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    },

    getPersistentParticipants: async () => {
      try {
        const query = new URLSearchParams({
          code: config.code
        }).toString()
        const res = await fetch(`${baseUrl}/api/session/participants?${query}`, {
          headers: authHeaders
        })
        if (!res.ok) return []
        const data = await res.json()
        return data.participants || []
      } catch (err) {
        console.error('Erro ao buscar participantes persistentes remotos:', err)
        return []
      }
    }
  }
}
