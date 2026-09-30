import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import type {
  RpgSystemFull,
  SystemContentEntry,
  ContentType,
  AttributeField,
  CreateContentPayload,
  UpdateContentPayload,
} from '../../../preload/index.d'

/* ─── Constants ──────────────────────────────────────────────── */
const CONTENT_TYPES: { value: ContentType; label: string; emoji: string }[] = [
  { value: 'class', label: 'Classes', emoji: '⚔️' },
  { value: 'race', label: 'Raças', emoji: '🧝' },
  { value: 'subclass', label: 'Subclasses', emoji: '🌟' },
  { value: 'spell', label: 'Magias', emoji: '✨' },
  { value: 'item', label: 'Itens', emoji: '🗡️' },
  { value: 'feat', label: 'Talentos', emoji: '💡' },
  { value: 'background', label: 'Históricos', emoji: '📜' },
  { value: 'monster', label: 'Monstros', emoji: '👹' },
]

/* ─── Icons ──────────────────────────────────────────────────── */
const IconPlus = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const IconTrash = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const IconEdit = (): React.JSX.Element => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
)
const IconArrowLeft = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const IconSearch = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)

/* ─── Dynamic field renderer for a content entry ─────────────── */
function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: AttributeField
  value: unknown
  onChange: (v: unknown) => void
}): React.JSX.Element {
  const baseClass = "bg-transparent border border-vtt-light-gray rounded-lg text-vtt-light text-sm py-1.5 px-3 outline-none focus:border-vtt-green transition-colors w-full"

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 accent-vtt-green cursor-pointer"
        />
        <span className="text-neutral-400 text-sm">{field.label}</span>
      </label>
    )
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value as number ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        min={0}
        max={field.max}
        className={baseClass}
        placeholder={field.max ? `0 – ${field.max}` : '0'}
      />
    )
  }

  return (
    <input
      type="text"
      value={value as string ?? ''}
      onChange={e => onChange(e.target.value)}
      className={baseClass}
      placeholder="—"
    />
  )
}

/* ─── Content Form Modal ─────────────────────────────────────── */
interface ContentFormProps {
  system: RpgSystemFull
  initial?: SystemContentEntry
  defaultType?: ContentType
  onClose: () => void
  onSaved: () => void
}

function ContentFormModal({ system, initial, defaultType, onClose, onSaved }: ContentFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<ContentType>(initial?.type ?? defaultType ?? 'class')
  const [data, setData] = useState<Record<string, unknown>>(initial?.data ?? {})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setField = (key: string, value: unknown): void => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  // Add a free-form key-value for fields NOT in the structure
  const [extraKey, setExtraKey] = useState('')
  const [extraVal, setExtraVal] = useState('')
  const addExtra = (): void => {
    if (!extraKey.trim()) return
    setField(extraKey.trim(), extraVal)
    setExtraKey(''); setExtraVal('')
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (initial) {
      const payload: UpdateContentPayload = { id: initial.id, name, data }
      const res = await window.api.content.update(payload)
      if (!res.success) { setError(res.error ?? 'Erro ao salvar.'); setLoading(false); return }
    } else {
      const payload: CreateContentPayload = { rpg_system_id: system.id, type, name, data }
      const res = await window.api.content.create(payload)
      if (!res.success) { setError(res.error ?? 'Erro ao criar.'); setLoading(false); return }
    }

    setLoading(false)
    onSaved()
  }

  const groups = system.structure?.attributeGroups ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-vtt-dark border border-vtt-dark-gray
                   rounded-2xl flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-vtt-dark-gray shrink-0">
          <h2 className="text-lg font-bold text-vtt-light">
            {initial ? 'Editar Conteúdo' : 'Novo Conteúdo'}
          </h2>
          <button type="button" onClick={onClose}
            className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col gap-5 p-8">
          {error && (
            <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Type */}
          {!initial && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Tipo *</span>
              <select value={type} onChange={e => setType(e.target.value as ContentType)}
                className="bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-2 px-3
                           text-sm outline-none focus:border-vtt-green transition-colors cursor-pointer">
                {CONTENT_TYPES.map(ct => (
                  <option key={ct.value} value={ct.value}>{ct.emoji} {ct.label}</option>
                ))}
              </select>
            </label>
          )}

          {/* Name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Nome *</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Nome do conteúdo..."
              className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                         py-1.5 text-sm outline-none focus:border-vtt-green transition-colors" />
          </label>

          {/* Dynamic attribute fields from system structure */}
          {groups.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Atributos do Sistema</h3>
              {groups.map(group => (
                <div key={group.id} className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-neutral-300">{group.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {group.fields.map(field => (
                      <div key={field.key} className="flex flex-col gap-1">
                        {field.type !== 'checkbox' && (
                          <label className="text-[11px] text-neutral-500">{field.label}</label>
                        )}
                        <DynamicFieldInput
                          field={field}
                          value={data[field.key]}
                          onChange={v => setField(field.key, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extra free-form fields */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Campos Adicionais</h3>
            {/* existing extra fields */}
            {Object.entries(data)
              .filter(([k]) => !groups.flatMap(g => g.fields ?? []).some(f => f.key === k))
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-mono w-28 truncate">{k}</span>
                  <input
                    type="text"
                    value={String(v ?? '')}
                    onChange={e => setField(k, e.target.value)}
                    className="flex-1 bg-transparent border border-vtt-light-gray rounded-lg text-vtt-light text-sm
                               py-1.5 px-3 outline-none focus:border-vtt-green transition-colors"
                  />
                  <button type="button" onClick={() => setData(prev => { const next = { ...prev }; delete next[k]; return next })}
                    className="text-neutral-500 hover:text-vtt-red transition-colors cursor-pointer"><IconTrash /></button>
                </div>
              ))}

            {/* Add new extra field */}
            <div className="flex gap-2">
              <input type="text" value={extraKey} onChange={e => setExtraKey(e.target.value)}
                placeholder="Campo" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }}
                className="w-28 bg-transparent border border-vtt-dark-gray rounded-lg text-neutral-400 text-xs
                           py-1.5 px-3 outline-none focus:border-vtt-green transition-colors font-mono" />
              <input type="text" value={extraVal} onChange={e => setExtraVal(e.target.value)}
                placeholder="Valor" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }}
                className="flex-1 bg-transparent border border-vtt-dark-gray rounded-lg text-vtt-light text-xs
                           py-1.5 px-3 outline-none focus:border-vtt-green transition-colors" />
              <button type="button" onClick={addExtra}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-vtt-dark-gray/60 border border-vtt-dark-gray
                           text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer">
                <IconPlus />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-8 py-5 border-t border-vtt-dark-gray shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm
                       font-semibold hover:border-vtt-red hover:text-vtt-light transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-vtt-green text-white text-sm font-semibold
                       hover:bg-vtt-light-green transition-colors disabled:opacity-50 cursor-pointer">
            {loading ? 'Salvando...' : initial ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Content Entry Row ──────────────────────────────────────── */
function EntryRow({ entry, onEdit, onDelete }: {
  entry: SystemContentEntry
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  const fieldCount = Object.keys(entry.data).length
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-vtt-dark-gray/50
                    hover:bg-vtt-dark-gray/20 transition-colors group/row">
      <div className="flex-1 min-w-0">
        <p className="text-vtt-light text-sm font-medium truncate">{entry.name}</p>
        {fieldCount > 0 && (
          <p className="text-neutral-600 text-xs">{fieldCount} campo{fieldCount !== 1 ? 's' : ''}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit}
          className="flex items-center gap-1 py-1 px-2.5 rounded-md border border-vtt-dark-gray
                     bg-vtt-dark-gray/40 hover:bg-vtt-dark-gray text-neutral-300 hover:text-white
                     text-xs transition-all duration-150 cursor-pointer">
          <IconEdit /> Editar
        </button>
        <button type="button" onClick={onDelete}
          className="flex items-center gap-1 py-1 px-2.5 rounded-md border border-vtt-dark-gray
                     bg-vtt-dark-gray/40 hover:bg-red-950/40 text-neutral-400 hover:text-vtt-red
                     hover:border-red-600/50 text-xs transition-all duration-150 cursor-pointer">
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function SystemContentPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [system, setSystem] = useState<RpgSystemFull | null>(null)
  const [entries, setEntries] = useState<SystemContentEntry[]>([])
  const [activeTab, setActiveTab] = useState<ContentType>('class')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SystemContentEntry | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<number | undefined>(undefined)

  const load = useCallback(async (): Promise<void> => {
    if (!id) return
    const [sys, content] = await Promise.all([
      window.api.systems.getById(Number(id)),
      window.api.content.getBySystem(Number(id)),
    ])
    setSystem(sys)
    setEntries(content)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const openCreate = (): void => { setEditing(undefined); setShowForm(true) }
  const openEdit = (e: SystemContentEntry): void => { setEditing(e); setShowForm(true) }
  const closeForm = (): void => { setShowForm(false); setEditing(undefined) }
  const onSaved = (): void => { closeForm(); load() }

  const handleDelete = async (entryId: number): Promise<void> => {
    await window.api.content.delete(entryId)
    setDeletingId(undefined)
    load()
  }

  const filtered = entries
    .filter(e => e.type === activeTab)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="flex flex-row h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-vtt-green border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (!system) {
    return (
      <div className="flex flex-row h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500">Sistema não encontrado.</p>
        </main>
      </div>
    )
  }

  const activeTypeMeta = CONTENT_TYPES.find(ct => ct.value === activeTab)!

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b border-vtt-dark-gray shrink-0">
          <button type="button" onClick={() => navigate('/systems')}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-vtt-light text-sm transition-colors mb-4">
            <IconArrowLeft /> Sistemas
          </button>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-vtt-light">{system.name}</h1>
              <p className="text-neutral-400 text-sm mt-1">
                {system.genre && <span className="text-vtt-light-green mr-2">{system.genre}</span>}
                Gerencie o conteúdo deste sistema.
              </p>
            </div>
            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vtt-green text-white
                         font-semibold text-sm hover:bg-vtt-light-green transition-colors cursor-pointer
                         shadow-[0_0_16px_rgba(46,111,64,0.3)] shrink-0">
              <IconPlus /> Novo Conteúdo
            </button>
          </div>
        </div>

        {/* Tabs + content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left tabs */}
          <nav className="w-48 shrink-0 border-r border-vtt-dark-gray py-4 flex flex-col gap-1 px-2 overflow-y-auto">
            {CONTENT_TYPES.map(ct => {
              const count = entries.filter(e => e.type === ct.value).length
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setActiveTab(ct.value)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm
                              transition-colors cursor-pointer text-left
                              ${activeTab === ct.value
                      ? 'bg-vtt-dark-green/40 text-vtt-light-green border border-vtt-green/30'
                      : 'text-neutral-400 hover:bg-vtt-dark-gray/40 hover:text-vtt-light'}`}
                >
                  <span>{ct.emoji} {ct.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                     ${activeTab === ct.value ? 'bg-vtt-green/30 text-vtt-light-green' : 'bg-vtt-dark-gray text-neutral-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search bar */}
            <div className="px-6 py-4 border-b border-vtt-dark-gray shrink-0">
              <div className="flex items-center gap-2 bg-vtt-dark-gray/30 border border-vtt-dark-gray rounded-lg px-3 py-2">
                <IconSearch />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Buscar ${activeTypeMeta.label}...`}
                  className="flex-1 bg-transparent text-vtt-light text-sm placeholder:text-neutral-600 outline-none"
                />
              </div>
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <p className="text-5xl">{activeTypeMeta.emoji}</p>
                  <p className="text-neutral-500 text-sm">
                    {search ? 'Nenhum resultado encontrado.' : `Nenhum${activeTab === 'item' || activeTab === 'spell' ? 'a' : ''} ${activeTypeMeta.label.toLowerCase().replace(/s$/, '')} cadastrado${activeTab === 'item' || activeTab === 'spell' ? 'a' : ''} ainda.`}
                  </p>
                  {!search && (
                    <button type="button" onClick={openCreate}
                      className="px-5 py-2 rounded-lg bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-colors cursor-pointer">
                      Adicionar
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {filtered.map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onEdit={() => openEdit(entry)}
                      onDelete={() => setDeletingId(entry.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showForm && (
        <ContentFormModal
          system={system}
          initial={editing}
          defaultType={activeTab}
          onClose={closeForm}
          onSaved={onSaved}
        />
      )}

      {/* Simple inline delete confirm */}
      {deletingId !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
            <h2 className="text-lg font-bold text-vtt-light">Excluir entrada?</h2>
            <p className="text-neutral-400 text-sm">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeletingId(undefined)}
                className="flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-vtt-dark-red transition-colors cursor-pointer">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
