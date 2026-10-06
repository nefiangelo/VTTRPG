import { getDb } from './db'

export type CampaignNodeType = 'folder' | 'character' | 'note' | 'image' | 'audio' | 'map'
export type NodeVisibility = 'gm_only' | 'all' | 'custom'
export type NodePermission = 'view' | 'edit'

export interface CampaignNode {
  id: string
  campaign_id: number
  parent_id: string | null
  type: CampaignNodeType
  name: string
  description?: string | null
  visibility: NodeVisibility
  permission: NodePermission
  shared_with: string[]
  data: Record<string, unknown>
  order_index: number
  created_at: string
  updated_at: string
}

export interface CreateCampaignNodePayload {
  id?: string
  campaign_id: number
  parent_id?: string | null
  type: CampaignNodeType
  name: string
  description?: string
  visibility?: NodeVisibility
  permission?: NodePermission
  shared_with?: string[]
  data?: Record<string, unknown>
  order_index?: number
}

export interface UpdateCampaignNodePayload {
  id: string
  name?: string
  description?: string | null
  parent_id?: string | null
  visibility?: NodeVisibility
  permission?: NodePermission
  shared_with?: string[]
  data?: Record<string, unknown>
  order_index?: number
}

interface DbNodeRow {
  id: string
  campaign_id: number
  parent_id: string | null
  type: string
  name: string
  description: string | null
  visibility: string
  permission: string
  shared_with: string
  data: string
  order_index: number
  created_at: string
  updated_at: string
}

function rowToNode(row: DbNodeRow): CampaignNode {
  let sharedWith: string[] = []
  let data: Record<string, unknown> = {}

  try {
    sharedWith = JSON.parse(row.shared_with || '[]')
  } catch {
    sharedWith = []
  }

  try {
    data = JSON.parse(row.data || '{}')
  } catch {
    data = {}
  }

  return {
    id: row.id,
    campaign_id: row.campaign_id,
    parent_id: row.parent_id,
    type: row.type as CampaignNodeType,
    name: row.name,
    description: row.description,
    visibility: row.visibility as NodeVisibility,
    permission: row.permission as NodePermission,
    shared_with: Array.isArray(sharedWith) ? sharedWith : [],
    data: data && typeof data === 'object' ? data : {},
    order_index: row.order_index,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

/**
 * Obtém todos os nós da campanha, aplicando regras de visibilidade caso não seja o Mestre.
 */
export function getCampaignNodes(
  campaignId: number,
  isGM: boolean = true,
  username?: string
): CampaignNode[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM campaign_nodes WHERE campaign_id = ? ORDER BY order_index ASC, name ASC')
    .all(campaignId) as DbNodeRow[]

  const allNodes = rows.map(rowToNode)

  if (isGM) {
    return allNodes
  }

  // Filtragem para jogador:
  // 1. Mapeia todos os nós por id
  const nodeMap = new Map<string, CampaignNode>()
  allNodes.forEach((n) => nodeMap.set(n.id, n))

  // Função auxiliar para verificar se um nó é visível para o jogador
  const isNodeDirectlyVisible = (n: CampaignNode): boolean => {
    if (n.visibility === 'all') return true
    if (n.visibility === 'custom' && username && n.shared_with.includes(username)) return true
    return false
  }

  // Verifica se todos os ancestrais de um nó permitem visibilidade
  const areAncestorsVisible = (node: CampaignNode): boolean => {
    let curParentId = node.parent_id
    while (curParentId) {
      const parent = nodeMap.get(curParentId)
      if (!parent) break
      if (!isNodeDirectlyVisible(parent)) {
        return false // Se alguma pasta pai for gm_only, o filho fica oculto
      }
      curParentId = parent.parent_id
    }
    return true
  }

  // Encontra os nós elegíveis
  const visibleNodes = new Set<CampaignNode>()
  for (const node of allNodes) {
    if (isNodeDirectlyVisible(node) && areAncestorsVisible(node)) {
      visibleNodes.add(node)

      // Garante que todas as pastas ancestrais sejam incluídas para manter a árvore intacta
      let pId = node.parent_id
      while (pId) {
        const pNode = nodeMap.get(pId)
        if (pNode) {
          visibleNodes.add(pNode)
          pId = pNode.parent_id
        } else {
          break
        }
      }
    }
  }

  return Array.from(visibleNodes).sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index
    return a.name.localeCompare(b.name)
  })
}

/**
 * Cria uma nova pasta ou arquivo no diretório da campanha.
 */
export function createCampaignNode(payload: CreateCampaignNodePayload): {
  success: boolean
  node?: CampaignNode
  error?: string
} {
  const db = getDb()

  if (!payload.name?.trim()) {
    return { success: false, error: 'O nome do item é obrigatório.' }
  }

  const id = payload.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const parentId = payload.parent_id || null
  const visibility = payload.visibility || 'gm_only'
  const permission = payload.permission || 'view'
  const sharedWith = JSON.stringify(payload.shared_with || [])
  const data = JSON.stringify(payload.data || {})
  const orderIndex = payload.order_index ?? 0

  try {
    // Se foi passado parent_id, valida se existe e pertence à mesma campanha
    if (parentId) {
      const parent = db.prepare('SELECT id, campaign_id, type FROM campaign_nodes WHERE id = ?').get(parentId) as
        | { id: string; campaign_id: number; type: string }
        | undefined
      if (!parent || parent.campaign_id !== payload.campaign_id) {
        return { success: false, error: 'Pasta de destino não encontrada nesta campanha.' }
      }
      if (parent.type !== 'folder') {
        return { success: false, error: 'O item pai deve ser uma pasta.' }
      }
    }

    db.prepare(`
      INSERT INTO campaign_nodes (
        id, campaign_id, parent_id, type, name, description,
        visibility, permission, shared_with, data, order_index,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `).run(
      id,
      payload.campaign_id,
      parentId,
      payload.type,
      payload.name.trim(),
      payload.description?.trim() || null,
      visibility,
      permission,
      sharedWith,
      data,
      orderIndex
    )

    const created = db.prepare('SELECT * FROM campaign_nodes WHERE id = ?').get(id) as DbNodeRow
    return { success: true, node: rowToNode(created) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Falha ao criar item: ${msg}` }
  }
}

/**
 * Atualiza propriedades de um nó (nome, visibilidade, permissões, etc.)
 */
export function updateCampaignNode(payload: UpdateCampaignNodePayload): {
  success: boolean
  node?: CampaignNode
  error?: string
} {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM campaign_nodes WHERE id = ?').get(payload.id) as DbNodeRow | undefined

  if (!existing) {
    return { success: false, error: 'Item não encontrado.' }
  }

  // Previne mover uma pasta para dentro de si mesma
  if (payload.parent_id !== undefined && payload.parent_id !== null) {
    if (payload.parent_id === payload.id) {
      return { success: false, error: 'Não é possível mover uma pasta para dentro de si mesma.' }
    }

    // Previne mover para um descendente
    let checkParent: string | null = payload.parent_id
    while (checkParent) {
      const p = db.prepare('SELECT parent_id FROM campaign_nodes WHERE id = ?').get(checkParent) as
        | { parent_id: string | null }
        | undefined
      if (p?.parent_id === payload.id) {
        return { success: false, error: 'Não é possível mover uma pasta para dentro de uma de suas subpastas.' }
      }
      checkParent = p?.parent_id || null
    }
  }

  const name = payload.name !== undefined ? payload.name.trim() : existing.name
  const description =
    payload.description !== undefined ? (payload.description ? payload.description.trim() : null) : existing.description
  const parentId = payload.parent_id !== undefined ? payload.parent_id : existing.parent_id
  const visibility = payload.visibility !== undefined ? payload.visibility : existing.visibility
  const permission = payload.permission !== undefined ? payload.permission : existing.permission
  const sharedWith =
    payload.shared_with !== undefined ? JSON.stringify(payload.shared_with) : existing.shared_with
  const data = payload.data !== undefined ? JSON.stringify(payload.data) : existing.data
  const orderIndex = payload.order_index !== undefined ? payload.order_index : existing.order_index

  try {
    db.prepare(`
      UPDATE campaign_nodes SET
        name = ?,
        description = ?,
        parent_id = ?,
        visibility = ?,
        permission = ?,
        shared_with = ?,
        data = ?,
        order_index = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, parentId, visibility, permission, sharedWith, data, orderIndex, payload.id)

    const updated = db.prepare('SELECT * FROM campaign_nodes WHERE id = ?').get(payload.id) as DbNodeRow
    return { success: true, node: rowToNode(updated) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Falha ao atualizar item: ${msg}` }
  }
}

/**
 * Exclui um nó e recursivamente todos os seus filhos.
 */
export function deleteCampaignNode(id: string): { success: boolean; error?: string } {
  const db = getDb()

  try {
    // Coleta IDs recursivamente para exclusão segura
    const toDelete: string[] = [id]
    let index = 0

    while (index < toDelete.length) {
      const curId = toDelete[index]
      const children = db.prepare('SELECT id FROM campaign_nodes WHERE parent_id = ?').all(curId) as { id: string }[]
      for (const c of children) {
        toDelete.push(c.id)
      }
      index++
    }

    const placeholders = toDelete.map(() => '?').join(',')
    db.prepare(`DELETE FROM campaign_nodes WHERE id IN (${placeholders})`).run(...toDelete)

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Falha ao excluir item: ${msg}` }
  }
}
