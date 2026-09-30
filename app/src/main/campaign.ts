import { getDb } from './db'

export interface Campaign {
  id: number
  title: string
  description: string | null
  status: 'active' | 'paused' | 'finished'
  rpg_system_id: number
  owner_id: number
  created_at: string
  updated_at: string
}

export interface CampaignResult {
  success: boolean
  campaign?: Campaign
  error?: string
}

export interface CreateCampaignPayload {
  title: string
  description?: string
  rpg_system_id: number
  owner_id: number
}

export interface RpgSystem {
  id: number
  name: string
  slug: string
  genre: string | null
}

export function createCampaign(payload: CreateCampaignPayload): CampaignResult {
  const db = getDb()

  if (!payload.title?.trim())
    return { success: false, error: 'O titulo da campanha e obrigatorio.' }

  const system = db.prepare('SELECT id FROM rpg_systems WHERE id = ?').get(payload.rpg_system_id)
  if (!system)
    return { success: false, error: 'Sistema RPG invalido.' }

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (title, description, rpg_system_id, owner_id)
    VALUES (@title, @description, @rpg_system_id, @owner_id)
  `)

  const insertMember = db.prepare(`
    INSERT INTO campaign_members (campaign_id, user_id, role)
    VALUES (@campaign_id, @user_id, 'gm')
  `)

  const createWithMember = db.transaction((p: CreateCampaignPayload) => {
    const info = insertCampaign.run({
      title: p.title.trim(),
      description: p.description?.trim() ?? null,
      rpg_system_id: p.rpg_system_id,
      owner_id: p.owner_id,
    })
    insertMember.run({ campaign_id: info.lastInsertRowid, user_id: p.owner_id })
    return info.lastInsertRowid
  })

  const newId = createWithMember(payload)
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(newId) as Campaign
  return { success: true, campaign }
}

export function getCampaignsByUser(userId: number): Campaign[] {
  const db = getDb()
  return db.prepare(`
    SELECT c.*
    FROM campaigns c
    JOIN campaign_members cm ON cm.campaign_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.updated_at DESC
  `).all(userId) as Campaign[]
}

export function getRpgSystems(): RpgSystem[] {
  const db = getDb()
  return db.prepare('SELECT id, name, slug, genre FROM rpg_systems ORDER BY name ASC').all() as RpgSystem[]
}
