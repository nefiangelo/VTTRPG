import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../context/CampaignContext'
import type {
  RpgSystemFull,
  SystemStructure,
  AttributeGroup,
  AttributeField,
  ContentType,
  CreateRpgSystemPayload,
  UpdateRpgSystemPayload,
} from '../../../preload/index.d'
import { CONTENT_TYPE_LIST, DEFAULT_CONTENT_FIELDS } from '../utils/contentPresets'

/* ─── Helpers ─────────────────────────────────────────────────── */
function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

const GENRE_OPTIONS = ['Fantasy', 'Sci-Fi', 'Horror', 'Western', 'Modern', 'Post-Apocalyptic', 'Cyberpunk', 'Steampunk', 'Medieval', 'Outro']

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
const IconDice = (): React.JSX.Element => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8-8a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" /></svg>
)
const IconArrowLeft = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
)
const IconScroll = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
)

/* ─── Attribute Field Row ────────────────────────────────────── */
function FieldRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: AttributeField
  onUpdate: (f: AttributeField) => void
  onRemove: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 bg-vtt-dark-gray/40 rounded-lg p-2.5 group/field">
      <input
        type="text"
        value={field.label}
        onChange={e => {
          const newLabel = e.target.value
          const oldSlug = field.label.trim().replace(/\s+/g, '_').toLowerCase()
          const shouldAutoKey = !field.key || field.key.startsWith('campo_') || field.key === oldSlug
          onUpdate({
            ...field,
            label: newLabel,
            key: shouldAutoKey
              ? newLabel
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-zA-Z0-9_]/g, '_')
                  .toLowerCase()
              : field.key,
          })
        }}
        placeholder="Nome do campo (ex: Dado de Vida)"
        className="flex-1 min-w-[120px] bg-transparent border-b border-vtt-light-gray text-vtt-light text-sm
                   placeholder:text-neutral-600 outline-none focus:border-vtt-green transition-colors py-0.5"
      />
      <input
        type="text"
        value={field.key}
        onChange={e => onUpdate({ ...field, key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
        placeholder="chave (ex: hit_die)"
        className="w-28 bg-transparent border-b border-vtt-light-gray text-neutral-400 text-xs
                   placeholder:text-neutral-600 outline-none focus:border-vtt-green transition-colors py-0.5 font-mono"
      />
      <select
        value={field.type}
        onChange={e => onUpdate({ ...field, type: e.target.value as AttributeField['type'] })}
        className="bg-vtt-dark border border-vtt-light-gray rounded text-vtt-light text-xs py-1 px-2
                   outline-none focus:border-vtt-green transition-colors cursor-pointer"
      >
        <option value="text">Texto</option>
        <option value="number">Número</option>
        <option value="textarea">Área de Texto</option>
        <option value="list">Lista</option>
        <option value="checkbox">Checkbox</option>
      </select>
      {field.type === 'number' && (
        <input
          type="number"
          value={field.max ?? ''}
          onChange={e => onUpdate({ ...field, max: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Max"
          min={1}
          className="w-14 bg-transparent border-b border-vtt-light-gray text-neutral-400 text-xs
                     placeholder:text-neutral-600 outline-none focus:border-vtt-green transition-colors py-0.5 text-center"
        />
      )}
      <input
        type="text"
        value={field.placeholder ?? ''}
        onChange={e => onUpdate({ ...field, placeholder: e.target.value })}
        placeholder="Dica / Placeholder"
        className="w-32 bg-transparent border-b border-vtt-light-gray text-neutral-400 text-xs
                   placeholder:text-neutral-600 outline-none focus:border-vtt-green transition-colors py-0.5"
      />
      <button
        type="button"
        onClick={onRemove}
        title="Excluir campo"
        className="text-neutral-600 hover:text-vtt-red transition-colors opacity-0 group-hover/field:opacity-100 cursor-pointer p-1"
      >
        <IconTrash />
      </button>
    </div>
  )
}

/* ─── Attribute Group Card ───────────────────────────────────── */
function GroupCard({
  group,
  onUpdate,
  onRemove,
}: {
  group: AttributeGroup
  onUpdate: (g: AttributeGroup) => void
  onRemove: () => void
}): React.JSX.Element {
  const addField = (): void => {
    onUpdate({
      ...group,
      fields: [...group.fields, { key: uid(), label: '', type: 'number' }],
    })
  }

  const updateField = (i: number, f: AttributeField): void => {
    const fields = [...group.fields]
    fields[i] = f
    onUpdate({ ...group, fields })
  }

  const removeField = (i: number): void => {
    onUpdate({ ...group, fields: group.fields.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="border border-vtt-dark-gray rounded-xl bg-vtt-dark overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-vtt-dark-gray/30 border-b border-vtt-dark-gray">
        <input
          type="text"
          value={group.label}
          onChange={e => onUpdate({ ...group, label: e.target.value })}
          placeholder="Nome do grupo (ex: Atributos Principais)"
          className="flex-1 bg-transparent text-vtt-light font-semibold text-sm
                     placeholder:text-neutral-500 outline-none border-b border-transparent
                     focus:border-vtt-green transition-colors"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-500 hover:text-vtt-red transition-colors cursor-pointer"
          title="Remover grupo"
        >
          <IconTrash />
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-2 p-4">
        {group.fields.length === 0 && (
          <p className="text-neutral-600 text-xs text-center py-2">Nenhum campo ainda. Adicione abaixo.</p>
        )}
        {group.fields.map((f, i) => (
          <FieldRow key={f.key} field={f} onUpdate={nf => updateField(i, nf)} onRemove={() => removeField(i)} />
        ))}

        <button
          type="button"
          onClick={addField}
          className="mt-1 flex items-center gap-1.5 text-xs text-vtt-green hover:text-vtt-light-green
                     transition-colors font-medium cursor-pointer w-fit"
        >
          <IconPlus /> Adicionar campo
        </button>
      </div>
    </div>
  )
}

/* ─── System Form Modal ──────────────────────────────────────── */
interface SystemFormProps {
  initial?: RpgSystemFull
  userId: number
  onClose: () => void
  onSaved: () => void
}

function SystemFormModal({ initial, userId, onClose, onSaved }: SystemFormProps): React.JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [version, setVersion] = useState(initial?.version ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [groups, setGroups] = useState<AttributeGroup[]>(
    initial?.structure?.attributeGroups ?? []
  )
  const [contentFields, setContentFields] = useState<Partial<Record<ContentType, AttributeField[]>>>(() => {
    return initial?.structure?.contentFields ?? {}
  })
  const [activeBuilderTab, setActiveBuilderTab] = useState<'content' | 'character'>('content')
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('class')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const addGroup = (): void => {
    setGroups(prev => [...prev, { id: uid(), label: '', fields: [] }])
  }

  const updateGroup = (i: number, g: AttributeGroup): void => {
    setGroups(prev => { const next = [...prev]; next[i] = g; return next })
  }

  const removeGroup = (i: number): void => {
    setGroups(prev => prev.filter((_, idx) => idx !== i))
  }

  const addContentField = (): void => {
    const newField: AttributeField = {
      key: `campo_${uid().slice(0, 4)}`,
      label: '',
      type: 'text',
      placeholder: '',
    }
    setContentFields(prev => ({
      ...prev,
      [selectedContentType]: [...(prev[selectedContentType] ?? []), newField],
    }))
  }

  const updateContentField = (idx: number, updated: AttributeField): void => {
    setContentFields(prev => {
      const list = [...(prev[selectedContentType] ?? [])]
      list[idx] = updated
      return { ...prev, [selectedContentType]: list }
    })
  }

  const removeContentField = (idx: number): void => {
    setContentFields(prev => {
      const list = (prev[selectedContentType] ?? []).filter((_, i) => i !== idx)
      return { ...prev, [selectedContentType]: list }
    })
  }

  const loadDefaultPreset = (ct: ContentType): void => {
    const preset = DEFAULT_CONTENT_FIELDS[ct] ?? []
    setContentFields(prev => ({
      ...prev,
      [ct]: [...preset],
    }))
  }

  const loadAllPresets = (): void => {
    setContentFields(prev => ({
      ...DEFAULT_CONTENT_FIELDS,
      ...prev,
    }))
  }

  const clearContentFields = (ct: ContentType): void => {
    setContentFields(prev => {
      const next = { ...prev }
      next[ct] = []
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const structure: SystemStructure = {
      ...(initial?.structure ?? {}),
      attributeGroups: groups,
      contentFields,
    }

    if (initial) {
      const payload: UpdateRpgSystemPayload = {
        id: initial.id, name, version: version || undefined,
        genre: genre || undefined, description: description || undefined, structure,
      }
      const res = await window.api.systems.update(payload)
      if (!res.success) { setError(res.error ?? 'Erro ao salvar.'); setLoading(false); return }
    } else {
      const payload: CreateRpgSystemPayload = {
        name, version: version || undefined, genre: genre || undefined,
        description: description || undefined, structure, created_by: userId,
      }
      const res = await window.api.systems.create(payload)
      if (!res.success) { setError(res.error ?? 'Erro ao criar.'); setLoading(false); return }
    }

    setLoading(false)
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-vtt-dark border border-vtt-dark-gray
                   rounded-2xl flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-vtt-dark-gray shrink-0">
          <h2 className="text-xl font-bold text-vtt-light">
            {initial ? 'Editar Sistema RPG' : 'Novo Sistema RPG'}
          </h2>
          <button type="button" onClick={onClose}
            className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col gap-6 p-8">
          {error && (
            <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Basic info row */}
          <div className="flex gap-4">
            <label className="flex-[2] flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Nome *</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="ex: D&D 5e"
                className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                           py-1.5 text-sm outline-none focus:border-vtt-green transition-colors" />
            </label>
            <label className="flex-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Versão</span>
              <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                placeholder="ex: 5.1"
                className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                           py-1.5 text-sm outline-none focus:border-vtt-green transition-colors" />
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Gênero</span>
              <select value={genre} onChange={e => setGenre(e.target.value)}
                className="bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-1.5 px-3
                           text-sm outline-none focus:border-vtt-green transition-colors cursor-pointer">
                <option value="">Selecionar...</option>
                {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="flex-[2] flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Descrição</span>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Breve descrição do sistema..."
                className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                           py-1.5 text-sm outline-none focus:border-vtt-green transition-colors" />
            </label>
          </div>

          {/* Builder section tabs */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-vtt-dark-gray pb-2 flex-wrap gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveBuilderTab('content')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeBuilderTab === 'content'
                      ? 'bg-vtt-dark-green/40 text-vtt-light-green border border-vtt-green/40'
                      : 'text-neutral-400 hover:text-vtt-light bg-vtt-dark-gray/30'
                  }`}
                >
                  <span>📦 Campos por Tipo de Conteúdo</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                    {Object.values(contentFields).reduce((acc, f) => acc + (f?.length ?? 0), 0)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBuilderTab('character')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeBuilderTab === 'character'
                      ? 'bg-vtt-dark-green/40 text-vtt-light-green border border-vtt-green/40'
                      : 'text-neutral-400 hover:text-vtt-light bg-vtt-dark-gray/30'
                  }`}
                >
                  <span>📑 Ficha de Personagem</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                    {groups.length}
                  </span>
                </button>
              </div>

              {activeBuilderTab === 'content' && (
                <button
                  type="button"
                  onClick={loadAllPresets}
                  className="flex items-center gap-1.5 text-xs text-vtt-light-green hover:underline cursor-pointer"
                  title="Preencher todos os tipos de conteúdo com modelos padrão de D&D"
                >
                  ✨ Carregar Todos os Padrões D&D
                </button>
              )}
            </div>

            {/* TAB: CONTENT FIELDS BY TYPE */}
            {activeBuilderTab === 'content' && (
              <div className="flex flex-col gap-4">
                {/* Horizontal Content Types Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {CONTENT_TYPE_LIST.map(ct => {
                    const count = (contentFields[ct.value] ?? []).length
                    const isSelected = selectedContentType === ct.value
                    return (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => setSelectedContentType(ct.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-vtt-green text-white border-vtt-green shadow-xs'
                            : 'bg-vtt-dark-gray/40 border-vtt-dark-gray text-neutral-400 hover:text-vtt-light hover:bg-vtt-dark-gray'
                        }`}
                      >
                        <span>{ct.emoji}</span>
                        <span>{ct.label}</span>
                        {count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              isSelected ? 'bg-black/30 text-white' : 'bg-vtt-dark text-neutral-400'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Type Card */}
                {(() => {
                  const meta = CONTENT_TYPE_LIST.find(c => c.value === selectedContentType)!
                  const currentFields = contentFields[selectedContentType] ?? []
                  return (
                    <div className="border border-vtt-dark-gray rounded-xl bg-vtt-dark overflow-hidden flex flex-col gap-3 p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-vtt-dark-gray/60">
                        <div>
                          <h4 className="text-sm font-bold text-vtt-light flex items-center gap-2">
                            <span>{meta.emoji}</span>
                            <span>Campos Fixos de {meta.label}</span>
                          </h4>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {meta.description}. Estes campos aparecerão automaticamente ao cadastrar um(a) {meta.singularLabel.toLowerCase()}.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadDefaultPreset(selectedContentType)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green hover:bg-vtt-dark-green/60 transition-colors cursor-pointer"
                          >
                            ✨ Carregar Padrão D&D
                          </button>
                          {currentFields.length > 0 && (
                            <button
                              type="button"
                              onClick={() => clearContentFields(selectedContentType)}
                              className="text-xs text-neutral-500 hover:text-vtt-red transition-colors cursor-pointer px-2 py-1"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Field list for this type */}
                      <div className="flex flex-col gap-2">
                        {currentFields.length === 0 && (
                          <div className="text-center py-6 text-neutral-500 text-xs border border-dashed border-vtt-dark-gray rounded-lg flex flex-col items-center gap-2">
                            <p>Nenhum campo fixo definido para {meta.label} ainda.</p>
                            <button
                              type="button"
                              onClick={() => loadDefaultPreset(selectedContentType)}
                              className="text-xs text-vtt-light-green underline cursor-pointer"
                            >
                              Clique aqui para carregar os campos padrão de D&D
                            </button>
                          </div>
                        )}
                        {currentFields.map((f, i) => (
                          <FieldRow
                            key={f.key + i}
                            field={f}
                            onUpdate={nf => updateContentField(i, nf)}
                            onRemove={() => removeContentField(i)}
                          />
                        ))}

                        <button
                          type="button"
                          onClick={addContentField}
                          className="mt-1 flex items-center gap-1.5 text-xs text-vtt-green hover:text-vtt-light-green
                                     transition-colors font-medium cursor-pointer w-fit"
                        >
                          <IconPlus /> Adicionar campo em {meta.singularLabel}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* TAB: CHARACTER ATTRIBUTE GROUPS */}
            {activeBuilderTab === 'character' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-vtt-light uppercase tracking-widest">Grupos de Atributos da Ficha</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Atributos principais do personagem (ex: Força, Destreza, Constituição).</p>
                  </div>
                  <button type="button" onClick={addGroup}
                    className="flex items-center gap-1.5 text-xs font-semibold text-vtt-green hover:text-vtt-light-green
                               transition-colors cursor-pointer px-3 py-1.5 rounded-lg border border-vtt-green/40
                               hover:border-vtt-green bg-vtt-dark-green/20 hover:bg-vtt-dark-green/40">
                    <IconPlus /> Novo Grupo
                  </button>
                </div>

                {groups.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 text-sm border border-dashed border-vtt-dark-gray rounded-xl">
                    Nenhum grupo ainda. Clique em "Novo Grupo" para começar a definir os atributos da ficha.
                  </div>
                )}

                {groups.map((g, i) => (
                  <GroupCard key={g.id} group={g} onUpdate={ng => updateGroup(i, ng)} onRemove={() => removeGroup(i)} />
                ))}
              </div>
            )}
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
            {loading ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Sistema'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Delete Confirm Modal ────────────────────────────────────── */
function DeleteModal({ system, onClose, onDeleted }: { system: RpgSystemFull; onClose: () => void; onDeleted: () => void }): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (): Promise<void> => {
    setLoading(true)
    const res = await window.api.systems.delete(system.id)
    if (!res.success) { setError(res.error ?? 'Erro ao excluir.'); setLoading(false); return }
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
        <h2 className="text-lg font-bold text-vtt-light">Excluir Sistema</h2>
        <p className="text-neutral-400 text-sm">Tem certeza que deseja excluir <span className="text-vtt-light font-semibold">{system.name}</span>? Esta ação não pode ser desfeita e removerá todo o conteúdo associado.</p>
        {error && <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-neutral-400 transition-colors cursor-pointer">Cancelar</button>
          <button type="button" onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-vtt-red text-white text-sm font-semibold hover:bg-vtt-dark-red transition-colors disabled:opacity-50 cursor-pointer">
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── System Card ────────────────────────────────────────────── */
function SystemCard({ system, onEdit, onDelete, onView }: {
  system: RpgSystemFull
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}): React.JSX.Element {
  const groups = system.structure?.attributeGroups ?? []
  const attrCount = groups.reduce((s, g) => s + (g.fields?.length ?? 0), 0)
  const groupCount = groups.length

  return (
    <article className="group relative border border-vtt-dark-gray bg-vtt-dark rounded-xl p-5
                        hover:border-vtt-green transition-all duration-300
                        hover:shadow-[0_0_24px_rgba(46,111,64,0.2)] flex flex-col gap-4 select-none">
      {/* Top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h3 className="text-vtt-light font-bold text-base leading-tight group-hover:text-white transition-colors truncate">{system.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {system.version && <span className="text-[10px] text-neutral-500 font-mono">v{system.version}</span>}
            {system.genre && (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full
                               bg-vtt-dark-green/40 text-vtt-light-green border border-vtt-green/30">
                {system.genre}
              </span>
            )}
          </div>
        </div>
        <div className="text-vtt-dark-gray group-hover:text-vtt-green transition-colors shrink-0">
          <IconDice />
        </div>
      </div>

      {system.description && (
        <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2">{system.description}</p>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-xs text-neutral-500">
        <span>{groupCount} grupo{groupCount !== 1 ? 's' : ''}</span>
        <span>•</span>
        <span>{attrCount} atributo{attrCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button type="button" onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg
                     bg-vtt-green text-white text-xs font-semibold hover:bg-vtt-light-green
                     transition-all duration-200 cursor-pointer">
          <IconScroll /> Conteúdo
        </button>
        <button type="button" onClick={onEdit}
          className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg
                     border border-vtt-dark-gray bg-vtt-dark-gray/60 hover:bg-vtt-dark-gray
                     text-neutral-300 hover:text-white text-xs font-medium transition-all duration-200 cursor-pointer">
          <IconEdit />
        </button>
        <button type="button" onClick={onDelete}
          className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg
                     border border-vtt-dark-gray bg-vtt-dark-gray/60 hover:bg-red-950/40
                     text-neutral-400 hover:text-vtt-red hover:border-red-600/50 text-xs
                     font-medium transition-all duration-200 cursor-pointer">
          <IconTrash />
        </button>
      </div>
    </article>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function SystemsPage(): React.JSX.Element {
  const { user } = useAuth()
  const { fetchSystems } = useCampaigns()
  const navigate = useNavigate()
  const [systems, setSystems] = useState<RpgSystemFull[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RpgSystemFull | undefined>(undefined)
  const [deleting, setDeleting] = useState<RpgSystemFull | undefined>(undefined)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    const data = await window.api.systems.getAll()
    setSystems(data)
    fetchSystems()
    setLoading(false)
  }, [fetchSystems])

  useEffect(() => { load() }, [load])

  const openCreate = (): void => { setEditing(undefined); setShowForm(true) }
  const openEdit = (s: RpgSystemFull): void => { setEditing(s); setShowForm(true) }
  const closeForm = (): void => { setShowForm(false); setEditing(undefined) }
  const onSaved = (): void => { closeForm(); load() }
  const onDeleted = (): void => { setDeleting(undefined); load() }

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button type="button" onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-vtt-light text-sm transition-colors mb-4">
              <IconArrowLeft /> Voltar
            </button>
            <h1 className="text-3xl font-bold text-vtt-light">Sistemas RPG</h1>
            <p className="text-neutral-400 text-sm mt-1">Gerencie os sistemas de regras e seus atributos.</p>
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vtt-green text-white
                       font-semibold text-sm hover:bg-vtt-light-green transition-colors cursor-pointer
                       shadow-[0_0_16px_rgba(46,111,64,0.3)] hover:shadow-[0_0_24px_rgba(67,161,93,0.4)]">
            <IconPlus /> Novo Sistema
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-vtt-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : systems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="text-6xl opacity-20"><IconDice /></div>
            <p className="text-neutral-500 text-sm">Nenhum sistema cadastrado ainda.</p>
            <button type="button" onClick={openCreate}
              className="px-6 py-2.5 rounded-xl bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-colors cursor-pointer">
              Criar primeiro sistema
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systems.map(s => (
              <SystemCard
                key={s.id}
                system={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleting(s)}
                onView={() => navigate(`/systems/${s.id}/content`)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && user && (
        <SystemFormModal
          initial={editing}
          userId={user.id}
          onClose={closeForm}
          onSaved={onSaved}
        />
      )}

      {deleting && (
        <DeleteModal
          system={deleting}
          onClose={() => setDeleting(undefined)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
