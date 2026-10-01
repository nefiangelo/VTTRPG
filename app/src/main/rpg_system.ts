import { getDb } from './db'

/* ─── Types ──────────────────────────────────────────────────── */

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

export interface RpgSystemResult {
  success: boolean
  system?: RpgSystemFull
  error?: string
}

export const CONTENT_TYPES = ['class','race','subclass','spell','item','feat','background','monster'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

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

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

function parseStructure(raw: string | null): SystemStructure {
  try {
    if (!raw) return { attributeGroups: [], contentFields: {} }
    const parsed = JSON.parse(raw) as SystemStructure
    return {
      attributeGroups: parsed.attributeGroups ?? [],
      contentFields: parsed.contentFields ?? {},
      ...parsed,
    }
  } catch {
    return { attributeGroups: [], contentFields: {} }
  }
}

function parseData(raw: string | null): Record<string, unknown> {
  try { return raw ? (JSON.parse(raw) as Record<string, unknown>) : {} }
  catch { return {} }
}

function hydrateSystem(row: Record<string, unknown>): RpgSystemFull {
  return { ...(row as Omit<RpgSystemFull,'structure'>), structure: parseStructure(row.structure as string | null) }
}

function hydrateContent(row: Record<string, unknown>): SystemContentEntry {
  return { ...(row as Omit<SystemContentEntry,'data'>), data: parseData(row.data as string | null) }
}

export function getRpgSystemsFull(): RpgSystemFull[] {
  const db = getDb()
  return (db.prepare('SELECT * FROM rpg_systems ORDER BY name ASC').all() as Record<string, unknown>[]).map(hydrateSystem)
}

export function getRpgSystemById(id: number): RpgSystemFull | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM rpg_systems WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? hydrateSystem(row) : null
}

export function createRpgSystem(payload: CreateRpgSystemPayload): RpgSystemResult {
  const db = getDb()
  if (!payload.name?.trim()) return { success: false, error: 'Nome do sistema e obrigatorio.' }
  const slug = payload.slug?.trim() || slugify(payload.name.trim())
  try {
    const info = db.prepare(`INSERT INTO rpg_systems (name,slug,version,genre,description,structure,created_by) VALUES (@name,@slug,@version,@genre,@description,@structure,@created_by)`).run({
      name: payload.name.trim(), slug,
      version: payload.version?.trim() ?? null,
      genre: payload.genre?.trim() ?? null,
      description: payload.description?.trim() ?? null,
      structure: JSON.stringify(payload.structure ?? { attributeGroups: [] }),
      created_by: payload.created_by,
    })
    return { success: true, system: getRpgSystemById(Number(info.lastInsertRowid))! }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE')) return { success: false, error: 'Ja existe um sistema com esse nome ou slug.' }
    return { success: false, error: msg }
  }
}

export function updateRpgSystem(payload: UpdateRpgSystemPayload): RpgSystemResult {
  const db = getDb()
  const existing = getRpgSystemById(payload.id)
  if (!existing) return { success: false, error: 'Sistema nao encontrado.' }
  const name = payload.name?.trim() ?? existing.name
  const slug = payload.slug?.trim() ?? (payload.name ? slugify(name) : existing.slug)
  const version = payload.version !== undefined ? (payload.version?.trim() ?? null) : existing.version
  const genre = payload.genre !== undefined ? (payload.genre?.trim() ?? null) : existing.genre
  const description = payload.description !== undefined ? (payload.description?.trim() ?? null) : existing.description
  const structure = payload.structure !== undefined ? JSON.stringify(payload.structure) : JSON.stringify(existing.structure)
  try {
    db.prepare(`UPDATE rpg_systems SET name=@name,slug=@slug,version=@version,genre=@genre,description=@description,structure=@structure,updated_at=datetime('now') WHERE id=@id`).run({ name, slug, version, genre, description, structure, id: payload.id })
    return { success: true, system: getRpgSystemById(payload.id)! }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE')) return { success: false, error: 'Ja existe um sistema com esse nome ou slug.' }
    return { success: false, error: msg }
  }
}

export function deleteRpgSystem(id: number): { success: boolean; error?: string } {
  const db = getDb()
  try {
    const info = db.prepare('DELETE FROM rpg_systems WHERE id = ?').run(id)
    if (info.changes === 0) return { success: false, error: 'Sistema nao encontrado.' }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function getSystemContent(rpgSystemId: number, type?: ContentType): SystemContentEntry[] {
  const db = getDb()
  const rows = type
    ? db.prepare('SELECT * FROM system_content WHERE rpg_system_id=? AND type=? ORDER BY name ASC').all(rpgSystemId, type) as Record<string, unknown>[]
    : db.prepare('SELECT * FROM system_content WHERE rpg_system_id=? ORDER BY type, name ASC').all(rpgSystemId) as Record<string, unknown>[]
  return rows.map(hydrateContent)
}

export function createSystemContent(payload: CreateContentPayload): ContentResult {
  const db = getDb()
  if (!payload.name?.trim()) return { success: false, error: 'Nome e obrigatorio.' }
  if (!CONTENT_TYPES.includes(payload.type)) return { success: false, error: 'Tipo invalido.' }
  try {
    const info = db.prepare(`INSERT INTO system_content (rpg_system_id,homebrew_id,type,name,data) VALUES (@rpg_system_id,@homebrew_id,@type,@name,@data)`).run({
      rpg_system_id: payload.rpg_system_id,
      homebrew_id: payload.homebrew_id ?? null,
      type: payload.type,
      name: payload.name.trim(),
      data: JSON.stringify(payload.data ?? {}),
    })
    const entry = db.prepare('SELECT * FROM system_content WHERE id=?').get(Number(info.lastInsertRowid)) as Record<string, unknown>
    return { success: true, entry: hydrateContent(entry) }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function updateSystemContent(payload: UpdateContentPayload): ContentResult {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM system_content WHERE id=?').get(payload.id) as Record<string, unknown> | undefined
  if (!existing) return { success: false, error: 'Conteudo nao encontrado.' }
  const name = payload.name?.trim() ?? (existing.name as string)
  const data = payload.data !== undefined ? JSON.stringify(payload.data) : (existing.data as string)
  try {
    db.prepare('UPDATE system_content SET name=@name, data=@data WHERE id=@id').run({ name, data, id: payload.id })
    const entry = db.prepare('SELECT * FROM system_content WHERE id=?').get(payload.id) as Record<string, unknown>
    return { success: true, entry: hydrateContent(entry) }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function deleteSystemContent(id: number): { success: boolean; error?: string } {
  const db = getDb()
  const info = db.prepare('DELETE FROM system_content WHERE id=?').run(id)
  if (info.changes === 0) return { success: false, error: 'Conteudo nao encontrado.' }
  return { success: true }
}
