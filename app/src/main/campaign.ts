import { getDb } from './db'

export interface Campaign {
  id: number
  title: string
  description: string | null
  status: 'active' | 'paused' | 'finished'
  rpg_system_id: number
  owner_id: number
  is_downloaded?: number
  my_role?: 'gm' | 'player' | 'observer'
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
    SELECT c.*, cm.role as my_role
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

export interface CampaignMemberWithUser {
  id: number
  campaign_id: number
  user_id: number
  username: string
  role: 'gm' | 'player' | 'observer'
  joined_at: string
}

export interface CampaignWithDetails extends Campaign {
  system_name?: string
  system_slug?: string
  owner_username?: string
}

export function getCampaignById(id: number): CampaignWithDetails | null {
  const db = getDb()
  const campaign = db.prepare(`
    SELECT c.*, s.name as system_name, s.slug as system_slug, u.username as owner_username
    FROM campaigns c
    LEFT JOIN rpg_systems s ON s.id = c.rpg_system_id
    LEFT JOIN users u ON u.id = c.owner_id
    WHERE c.id = ?
  `).get(id) as CampaignWithDetails | undefined
  return campaign ?? null
}

export function getCampaignMembers(campaignId: number): CampaignMemberWithUser[] {
  const db = getDb()
  return db.prepare(`
    SELECT cm.id, cm.campaign_id, cm.user_id, cm.role, cm.joined_at, u.username
    FROM campaign_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.campaign_id = ?
    ORDER BY CASE cm.role WHEN 'gm' THEN 1 WHEN 'player' THEN 2 ELSE 3 END, cm.joined_at ASC
  `).all(campaignId) as CampaignMemberWithUser[]
}

