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

/* -- Window API --------------------------------------------- */
interface API {
  auth: {
    login: (username: string, password: string) => Promise<AuthResult>
    register: (username: string, password: string, email?: string) => Promise<AuthResult>
  }
  campaigns: {
    create: (payload: CreateCampaignPayload) => Promise<CampaignResult>
    getByUser: (userId: number) => Promise<Campaign[]>
    getSystems: () => Promise<RpgSystem[]>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
