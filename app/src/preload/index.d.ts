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

export interface UpdateProfilePayload {
  userId: number
  currentPassword: string
  username?: string
  email?: string | null
  newPassword?: string
}

/* -- Campaigns ---------------------------------------------- */
export interface Campaign {
  id: number
  title: string
  description: string | null
  status: 'active' | 'paused' | 'finished'
  rpg_system_id: number
  owner_id: number
  is_downloaded?: boolean | number
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

export interface UpdateCampaignPayload {
  id: number
  title?: string
  description?: string | null
  status?: 'active' | 'paused' | 'finished'
  rpg_system_id?: number
}

export interface RpgSystem {
  id: number
  name: string
  slug: string
  genre: string | null
  is_downloaded?: boolean
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
  access_code?: string | null
  server_url?: string | null
  created_at: string
  updated_at?: string
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

export interface PersistentParticipant {
  id: number
  session_id: number
  campaign_id: number
  user_id: number
  username: string
  role: 'gm' | 'player' | 'observer'
  first_joined: string
  last_joined: string
}

/* -- RPG Systems Full ---------------------------------------- */
export interface AttributeField {
  id?: string
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

export interface SheetLayoutPin {
  id: string
  key: string
  label: string
  type: 'number' | 'text' | 'checkbox' | 'textarea'
  page: number
  x: number // porcentagem 0 a 100
  y: number // porcentagem 0 a 100
  w: number // porcentagem 0 a 100
  h: number // porcentagem 0 a 100
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  isModifier?: boolean
  formula?: string
}

export interface ModularSectionConfig {
  id: string
  title: string
  contentType?: ContentType
  enabled: boolean
}

export type SheetFieldWidth = '1/4' | '1/3' | '1/2' | '2/3' | '3/4' | 'full'

export interface SheetCustomField {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'reference' | 'textarea' | 'checkbox'
  referenceType?: ContentType | 'custom'
  options?: string[]
  width: SheetFieldWidth
  defaultValue?: string | number | boolean
  placeholder?: string
  isModifier?: boolean
  formula?: string
}

export interface SheetCustomSection {
  id: string
  title: string
  description?: string
  fields: SheetCustomField[]
}

export interface SheetLayoutConfig {
  type?: 'hybrid' | 'modular' | 'custom'
  pages?: string[] // Data URLs ou caminhos das imagens das páginas (legado)
  pins?: SheetLayoutPin[]
  sections?: SheetCustomSection[]
  modularSections: ModularSectionConfig[]
}

export interface DynamicListItem {
  id: string
  name: string
  description?: string
  quantity?: number
  weight?: number
  equipped?: boolean
  level?: number
  data?: Record<string, unknown>
}

export interface CharacterSheetData {
  attributes: Record<string, string | number | boolean>
  lists: Record<string, DynamicListItem[]>
  notes?: string
  [key: string]: unknown
}

export interface SystemStructure {
  attributeGroups?: AttributeGroup[]
  contentFields?: Partial<Record<ContentType, AttributeField[]>>
  sheetLayout?: SheetLayoutConfig
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
  is_downloaded?: boolean
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

/* -- Session Server & Network -------------------------------- */
export interface ConnectedParticipant {
  socketId: string
  userId?: number
  username: string
  role: 'gm' | 'player' | 'observer'
  joinedAt: string
  pingMs?: number
  downloadedContent?: boolean
}

export interface SessionServerStatus {
  isRunning: boolean
  sessionId?: number
  campaignId?: number
  port?: number
  accessCode?: string
  localAddresses?: string[]
  participantsCount?: number
  participants?: ConnectedParticipant[]
}

export interface ServerStartResult {
  success: boolean
  port?: number
  accessCode?: string
  localAddresses?: string[]
  error?: string
}

export interface SessionBundleResult {
  success: boolean
  session: {
    id: number
    title: string | null
    status: string
    started_at: string | null
    notes: string | null
    access_code: string
    server_url?: string | null
  }
  allSessions?: Array<{
    id: number
    title: string | null
    status: string
    started_at: string | null
    notes: string | null
    access_code?: string | null
    server_url?: string | null
  }>
  campaign: {
    id: number
    title: string
    description: string | null
    status?: string
    rpg_system_id?: number
    owner_username?: string
    members?: CampaignMember[]
  }
  system: RpgSystemFull | null
  content: SystemContentEntry[]
  characters?: CharacterEntry[]
  nodes?: CampaignNode[]
  persistentParticipants?: PersistentParticipant[]
  stats: {
    totalContentItems: number
    attributeGroupsCount: number
  }
  serverTime?: string
  error?: string
}

export interface ImportBundlePayload {
  bundle: SessionBundleResult
  userId: number
  serverUrl?: string
}

export interface ImportBundleResult {
  success: boolean
  campaignId?: number
  sessionId?: number
  systemId?: number
  stats?: {
    importedSystem: boolean
    importedContentCount: number
    importedCampaign: boolean
    importedSessionsCount: number
  }
  error?: string
}

/* -- Characters / Fichas de Personagem ----------------------- */
export interface CharacterEntry {
  id: number
  uuid?: string
  campaign_id: number | null
  user_id: number
  rpg_system_id?: number | null
  system_slug?: string | null
  system_name?: string | null
  genre?: string | null
  name: string
  avatar_url?: string | null
  role: 'pc' | 'npc' | 'enemy'
  sheet_data: Record<string, unknown>
  origin_character_uuid?: string | null
  created_at: string
  updated_at: string
}

export interface SaveCharacterPayload {
  id?: number
  uuid?: string
  campaign_id?: number | null
  user_id: number
  rpg_system_id?: number | null
  system_slug?: string | null
  name: string
  avatar_url?: string | null
  role?: 'pc' | 'npc' | 'enemy'
  sheet_data?: Record<string, unknown> | string
  origin_character_uuid?: string | null
}

export interface ImportCharacterToCampaignPayload {
  characterId?: number
  characterUuid?: string
  campaignId: number
  userId: number
}

export interface CharacterResult {
  success: boolean
  character?: CharacterEntry
  error?: string
}

/* -- Sincronização entre GM e Jogador ----------------------- */
export interface ApplySyncPayload {
  campaignId: number
  campaign?: Partial<CampaignWithDetails>
  system?: RpgSystemFull | null
  content?: SystemContentEntry[]
  sessions?: Array<Partial<Session> & { id: number; status?: string }>
  characters?: CharacterEntry[]
}

export interface ApplySyncResult {
  success: boolean
  updatedElements: string[]
  error?: string
}

export interface SyncCheckPayload {
  code: string
  campaignId: number
  campaignUpdatedAt?: string
  systemId?: number
  systemUpdatedAt?: string
  sessions?: Array<{ id: number; updatedAt?: string; status: string; title?: string }>
  characters?: Array<{
    id?: number
    name: string
    avatar_url?: string | null
    role?: 'pc' | 'npc' | 'enemy'
    sheet_data?: Record<string, unknown> | string
    updated_at: string
  }>
  userId?: number
  username?: string
}

export interface SyncCheckResult {
  success: boolean
  isUpToDate: boolean
  obsoleteElements: string[]
  updatedData: {
    campaign?: Partial<CampaignWithDetails>
    system?: RpgSystemFull | null
    content?: SystemContentEntry[]
    sessions?: Session[]
    characters?: CharacterEntry[]
  }
  playerCharactersAccepted: number
  serverTime: string
  error?: string
}

/* -- Window API --------------------------------------------- */
interface API {
  auth: {
    login: (username: string, password: string) => Promise<AuthResult>
    register: (username: string, password: string, email?: string) => Promise<AuthResult>
    updateProfile: (payload: UpdateProfilePayload) => Promise<AuthResult>
  }
  campaigns: {
    create: (payload: CreateCampaignPayload) => Promise<CampaignResult>
    update: (payload: UpdateCampaignPayload) => Promise<CampaignResult>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
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
    importBundle: (payload: ImportBundlePayload) => Promise<ImportBundleResult>
    applySyncUpdate: (payload: ApplySyncPayload, userId?: number) => Promise<ApplySyncResult>
    getParticipants: (sessionId?: number, campaignId?: number) => Promise<PersistentParticipant[]>
    recordParticipant: (payload: { sessionId: number; campaignId: number; username: string; role?: 'gm' | 'player' | 'observer' }) => Promise<PersistentParticipant>
  }
  characters: {
    getByCampaign: (campaignId: number, userId?: number) => Promise<CharacterEntry[]>
    getVault: (userId: number) => Promise<CharacterEntry[]>
    getById: (id: number) => Promise<CharacterEntry | null>
    getByUuid: (uuid: string) => Promise<CharacterEntry | null>
    save: (payload: SaveCharacterPayload) => Promise<CharacterResult>
    importToCampaign: (payload: ImportCharacterToCampaignPayload) => Promise<CharacterResult>
    delete: (id: number, userId: number, isGM?: boolean) => Promise<{ success: boolean; error?: string }>
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
  server: {
    start: (sessionId: number, port?: number) => Promise<ServerStartResult>
    stop: (endedInfo?: { sessionId?: number; notes?: string }) => Promise<{ success: boolean }>
    getStatus: () => Promise<SessionServerStatus>
    getLocalIps: () => Promise<string[]>
  }
  campaignNodes: {
    getByCampaign: (campaignId: number, isGM?: boolean, username?: string) => Promise<CampaignNode[]>
    create: (payload: CreateCampaignNodePayload) => Promise<{ success: boolean; node?: CampaignNode; error?: string }>
    update: (payload: UpdateCampaignNodePayload, campaignId?: number) => Promise<{ success: boolean; node?: CampaignNode; error?: string }>
    delete: (id: string, campaignId?: number) => Promise<{ success: boolean; error?: string }>
  }
}

/* -- Campaign Nodes (Arquivos e Pastas da Biblioteca da Campanha) -- */
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
  data: Record<string, any>
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
  data?: Record<string, any>
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
  data?: Record<string, any>
  order_index?: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
