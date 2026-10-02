import { ElectronAPI } from '@electron-toolkit/preload'

/* -- Auth --------------------------------------------------- */
export interface AuthUser {
  id: number
  username: string
  email: string | null
  created_at: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/* -- Campaigns ---------------------------------------------- */
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

export interface CampaignMember {
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

/* -- Sessions ----------------------------------------------- */
export interface Session {
  id: number
  campaign_id: number
  title: string | null
  status: 'scheduled' | 'active' | 'completed'
  started_at: string | null
  ended_at: string | null
  notes: string | null
  created_at: string
}

export interface SessionResult {
  success: boolean
  session?: Session
  error?: string
}

export interface CreateSessionPayload {
  campaign_id: number
  title?: string
  notes?: string
}

export interface UpdateSessionPayload {
  id: number
  title?: string
  notes?: string
  status?: 'scheduled' | 'active' | 'completed'
}

/* -- RPG Systems Full ---------------------------------------- */
export interface AttributeField {
  key: string
  label: string
  type: 'number' | 'text' | 'checkbox' | 'textarea' | 'list'
  max?: number
  placeholder?: string
}

export interface AttributeGroup {
  id: string
  label: string
  fields: AttributeField[]
}

export interface SystemStructure {
  attributeGroups?: AttributeGroup[]
  contentFields?: Partial<Record<ContentType, AttributeField[]>>
  [key: string]: unknown
}

export interface RpgSystemFull {
  id: number
  name: string
  slug: string
  version: string | null
  genre: string | null
  description: string | null
  structure: SystemStructure
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface RpgSystemResult {
  success: boolean
  system?: RpgSystemFull
  error?: string
}

export interface CreateRpgSystemPayload {
  name: string
  slug?: string
  version?: string
  genre?: string
  description?: string
  structure?: SystemStructure
  created_by: number
}

export interface UpdateRpgSystemPayload {
  id: number
  name?: string
  slug?: string
  version?: string
  genre?: string
  description?: string
  structure?: SystemStructure
}

/* -- System Content ------------------------------------------ */
export type ContentType = 'class' | 'race' | 'subclass' | 'spell' | 'item' | 'feat' | 'background' | 'monster'

export interface SystemContentEntry {
  id: number
  rpg_system_id: number
  homebrew_id: number | null
  type: ContentType
  name: string
  data: Record<string, unknown>
  created_at: string
}

export interface CreateContentPayload {
  rpg_system_id: number
  homebrew_id?: number
  type: ContentType
  name: string
  data: Record<string, unknown>
}

export interface UpdateContentPayload {
  id: number
  name?: string
  data?: Record<string, unknown>
}

export interface ContentResult {
  success: boolean
  entry?: SystemContentEntry
  error?: string
}

/* -- Window API --------------------------------------------- */
interface API {
  auth: {
    login: (username: string, password: string) => Promise<AuthResult>
    register: (username: string, password: string, email?: string) => Promise<AuthResult>
  }
  campaigns: {
    create: (payload: CreateCampaignPayload) => Promise<CampaignResult>
    getByUser: (userId: number) => Promise<Campaign[]>
    getById: (id: number) => Promise<CampaignWithDetails | null>
    getMembers: (campaignId: number) => Promise<CampaignMember[]>
    getSystems: () => Promise<RpgSystem[]>
  }
  sessions: {
    getByCampaign: (campaignId: number) => Promise<Session[]>
    getById: (id: number) => Promise<Session | null>
    create: (payload: CreateSessionPayload) => Promise<SessionResult>
    update: (payload: UpdateSessionPayload) => Promise<SessionResult>
    start: (id: number) => Promise<SessionResult>
    end: (id: number, notes?: string) => Promise<SessionResult>
    reopen: (id: number) => Promise<SessionResult>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
  }
  systems: {
    getAll: () => Promise<RpgSystemFull[]>
    getById: (id: number) => Promise<RpgSystemFull | null>
    create: (payload: CreateRpgSystemPayload) => Promise<RpgSystemResult>
    update: (payload: UpdateRpgSystemPayload) => Promise<RpgSystemResult>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
  }
  content: {
    getBySystem: (rpgSystemId: number, type?: ContentType) => Promise<SystemContentEntry[]>
    create: (payload: CreateContentPayload) => Promise<ContentResult>
    update: (payload: UpdateContentPayload) => Promise<ContentResult>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
