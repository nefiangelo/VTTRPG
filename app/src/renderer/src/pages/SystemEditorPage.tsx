import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../context/CampaignContext'
import type {
  RpgSystemFull,
  SystemStructure,
  AttributeField,
  ContentType,
  CreateRpgSystemPayload,
  UpdateRpgSystemPayload,
  SheetLayoutConfig,
} from '../../../preload/index.d'
import {
  CONTENT_TYPE_LIST,
  DEFAULT_CONTENT_FIELDS,
  DEFAULT_MODULAR_SECTIONS,
  DEFAULT_CUSTOM_SHEET_SECTIONS,
} from '../utils/contentPresets'
import SheetLayoutBuilder from '../components/sheet/SheetLayoutBuilder'

/* ─── Helpers ─────────────────────────────────────────────────── */
function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

const GENRE_OPTIONS = [
  'Fantasy',
  'Sci-Fi',
  'Horror',
  'Western',
  'Modern',
  'Post-Apocalyptic',
  'Cyberpunk',
  'Steampunk',
  'Medieval',
  'Outro',
]

/* ─── Icons ──────────────────────────────────────────────────── */
const IconArrowLeft = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconPlus = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconTrash = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const IconGrip = (): React.JSX.Element => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="8.5" cy="6" r="1.5" />
    <circle cx="15.5" cy="6" r="1.5" />
    <circle cx="8.5" cy="12" r="1.5" />
    <circle cx="15.5" cy="12" r="1.5" />
    <circle cx="8.5" cy="18" r="1.5" />
    <circle cx="15.5" cy="18" r="1.5" />
  </svg>
)
const IconBox = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
)
const IconCharacter = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
)
const IconInfo = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)
const IconLayers = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)
const IconAlert = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
)
const IconSave = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

/* ─── Attribute Field Row ────────────────────────────────────── */
function FieldRow({
  field,
  index,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isOver,
}: {
  field: AttributeField
  index: number
  onUpdate: (f: AttributeField) => void
  onRemove: () => void
  onDragStart?: (e: React.DragEvent, index: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, index: number) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  isOver?: boolean
}): React.JSX.Element {
  const [isHandlePressed, setIsHandlePressed] = useState(false)

  return (
    <div
      draggable={isHandlePressed}
      onDragStart={e => {
        e.stopPropagation()
        onDragStart?.(e, index)
      }}
      onDragOver={e => {
        e.stopPropagation()
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver?.(e, index)
      }}
      onDragLeave={e => {
        e.stopPropagation()
        onDragLeave?.(e)
      }}
      onDrop={e => {
        e.stopPropagation()
        e.preventDefault()
        setIsHandlePressed(false)
        onDrop?.(e, index)
      }}
      onDragEnd={e => {
        e.stopPropagation()
        setIsHandlePressed(false)
        onDragEnd?.(e)
      }}
      className={`flex items-center gap-2 bg-vtt-dark-gray/40 rounded-lg p-2.5 group/field transition-all duration-150 border ${
        isDragging
          ? 'opacity-40 border-dashed border-vtt-red/60 scale-[0.99] bg-vtt-dark-gray/20'
          : isOver
            ? 'border-vtt-red/80 ring-2 ring-vtt-red/50 bg-red-950/20 shadow-[0_0_12px_rgba(211,47,47,0.25)]'
            : 'border-transparent hover:border-vtt-dark-gray'
      }`}
    >
      <div
        onMouseDown={() => setIsHandlePressed(true)}
        onMouseUp={() => setIsHandlePressed(false)}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-500 hover:text-vtt-light transition-colors select-none flex items-center justify-center shrink-0"
        title="Arraste para reorganizar"
      >
        <IconGrip />
      </div>

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

/* ─── Page Component ─────────────────────────────────────────── */
export default function SystemEditorPage(): React.JSX.Element {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchSystems } = useCampaigns()

  const isEditing = Boolean(id)
  const systemId = id ? Number(id) : null

  const [initialLoading, setInitialLoading] = useState(isEditing)
  const [initialSystem, setInitialSystem] = useState<RpgSystemFull | null>(null)

  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [genre, setGenre] = useState('')
  const [description, setDescription] = useState('')
  const [contentFields, setContentFields] = useState<Partial<Record<ContentType, AttributeField[]>>>({})
  const [sheetLayout, setSheetLayout] = useState<SheetLayoutConfig>({
    type: 'custom',
    theme: 'dnd',
    sections: DEFAULT_CUSTOM_SHEET_SECTIONS,
    modularSections: DEFAULT_MODULAR_SECTIONS,
  })

  const [activeBuilderTab, setActiveBuilderTab] = useState<'content' | 'sheet_layout'>('content')
  const [isGeneralInfoOpen, setIsGeneralInfoOpen] = useState(true)
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('class')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  /* ─── Content Fields DnD ───────────────────────────────────── */
  const [draggedContentField, setDraggedContentField] = useState<number | null>(null)
  const [overContentField, setOverContentField] = useState<number | null>(null)

  const handleContentFieldDragStart = (_e: React.DragEvent, index: number): void => {
    setDraggedContentField(index)
  }

  const handleContentFieldDragOver = (e: React.DragEvent, index: number): void => {
    if (draggedContentField === null || draggedContentField === index) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overContentField !== index) {
      setOverContentField(index)
    }
  }

  const handleContentFieldDragLeave = (): void => {
    setOverContentField(null)
  }

  const handleContentFieldDrop = (e: React.DragEvent, targetIndex: number): void => {
    e.preventDefault()
    if (draggedContentField !== null && draggedContentField !== targetIndex) {
      setContentFields(prev => {
        const list = prev[selectedContentType] ?? []
        return {
          ...prev,
          [selectedContentType]: reorder(list, draggedContentField, targetIndex),
        }
      })
    }
    setDraggedContentField(null)
    setOverContentField(null)
  }

  const handleContentFieldDragEnd = (): void => {
    setDraggedContentField(null)
    setOverContentField(null)
  }

  const addContentField = (): void => {
    const newField: AttributeField = {
      id: uid(),
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
      list[idx] = { ...updated, id: updated.id || list[idx]?.id || uid() }
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
      [ct]: preset.map(f => ({ ...f, id: uid() })),
    }))
  }

  const clearContentFields = (ct: ContentType): void => {
    setContentFields(prev => {
      const next = { ...prev }
      next[ct] = []
      return next
    })
  }

  // Load system if editing
  useEffect(() => {
    if (!systemId) {
      setInitialLoading(false)
      return
    }

    let isMounted = true
    const fetchSystem = async (): Promise<void> => {
      try {
        const sys = await window.api.systems.getById(systemId)
        if (!isMounted) return

        if (!sys) {
          setError('Sistema RPG não encontrado.')
          setInitialLoading(false)
          return
        }

        setInitialSystem(sys)
        setName(sys.name ?? '')
        setVersion(sys.version ?? '')
        setGenre(sys.genre ?? '')
        setDescription(sys.description ?? '')

        // Content Fields
        const raw = sys.structure?.contentFields ?? {}
        const fieldsResult: Partial<Record<ContentType, AttributeField[]>> = {}
        for (const [ct, list] of Object.entries(raw)) {
          if (list) {
            fieldsResult[ct as ContentType] = list.map(f => ({ ...f, id: f.id || uid() }))
          }
        }
        setContentFields(fieldsResult)

        // Sheet Layout
        const fallbackTheme =
          sys.structure?.sheetLayout?.theme ||
          (sys.genre?.toLowerCase().includes('cyber') || sys.genre?.toLowerCase().includes('sci-fi')
            ? 'cyberpunk'
            : sys.genre?.toLowerCase().includes('horror')
              ? 'horror'
              : 'dnd')

        if (sys.structure?.sheetLayout?.sections && sys.structure.sheetLayout.sections.length > 0) {
          setSheetLayout({
            ...sys.structure.sheetLayout,
            theme: sys.structure.sheetLayout.theme || fallbackTheme,
          })
        } else if (sys.structure?.attributeGroups && sys.structure.attributeGroups.length > 0) {
          setSheetLayout({
            type: 'custom',
            theme: fallbackTheme,
            sections: sys.structure.attributeGroups.map(g => ({
              id: g.id || uid(),
              title: g.label,
              fields: (g.fields || []).map(f => ({
                id: f.id || uid(),
                key: f.key,
                label: f.label,
                type: (f.type === 'list' ? 'reference' : f.type) as any,
                width: '1/2' as const,
                placeholder: f.placeholder,
              })),
            })),
            modularSections: sys.structure.sheetLayout?.modularSections || DEFAULT_MODULAR_SECTIONS,
          })
        } else {
          setSheetLayout({
            type: 'custom',
            theme: fallbackTheme,
            sections: DEFAULT_CUSTOM_SHEET_SECTIONS,
            modularSections: DEFAULT_MODULAR_SECTIONS,
          })
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message ?? 'Erro ao carregar sistema.')
      } finally {
        if (isMounted) setInitialLoading(false)
      }
    }

    fetchSystem()
    return () => {
      isMounted = false
    }
  }, [systemId])

  const isReadOnly = Boolean(initialSystem?.is_downloaded)

  const handleSubmit = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault()
    if (isReadOnly) return

    if (!name.trim()) {
      setError('O nome do sistema é obrigatório.')
      return
    }

    setError(null)
    setLoading(true)

    const sectionsToSave = sheetLayout.sections || DEFAULT_CUSTOM_SHEET_SECTIONS
    const structure: SystemStructure = {
      ...(initialSystem?.structure ?? {}),
      contentFields,
      sheetLayout: {
        ...sheetLayout,
        type: 'custom',
        theme: sheetLayout.theme || 'dnd',
        sections: sectionsToSave,
        modularSections: sheetLayout.modularSections || DEFAULT_MODULAR_SECTIONS,
      },
      attributeGroups: sectionsToSave.map(s => ({
        id: s.id,
        label: s.title,
        fields: s.fields.map(f => ({
          id: f.id,
          key: f.key,
          label: f.label,
          type: f.type === 'reference' ? 'text' : (f.type as any),
          placeholder: f.placeholder,
        })),
      })),
    }

    if (initialSystem) {
      const payload: UpdateRpgSystemPayload = {
        id: initialSystem.id,
        name: name.trim(),
        version: version.trim() || undefined,
        genre: genre.trim() || undefined,
        description: description.trim() || undefined,
        structure,
      }
      const res = await window.api.systems.update(payload)
      if (!res.success) {
        setError(res.error ?? 'Erro ao salvar sistema.')
        setLoading(false)
        return
      }
    } else {
      if (!user) {
        setError('Usuário não autenticado.')
        setLoading(false)
        return
      }
      const payload: CreateRpgSystemPayload = {
        name: name.trim(),
        version: version.trim() || undefined,
        genre: genre.trim() || undefined,
        description: description.trim() || undefined,
        structure,
        created_by: user.id,
      }
      const res = await window.api.systems.create(payload)
      if (!res.success) {
        setError(res.error ?? 'Erro ao criar sistema.')
        setLoading(false)
        return
      }
    }

    setLoading(false)
    await fetchSystems()
    navigate('/systems')
  }

  if (initialLoading) {
    return (
      <div className="flex flex-row h-screen overflow-hidden bg-vtt-dark">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-vtt-golden border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (isEditing && !initialSystem && error) {
    return (
      <div className="flex flex-row h-screen overflow-hidden bg-vtt-dark">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
          <p className="text-red-400 text-lg font-medium">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/systems')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vtt-dark-gray text-vtt-golden hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <IconArrowLeft /> Voltar para Sistemas
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-row h-screen overflow-hidden bg-vtt-dark">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho da Página */}
        <div className="px-8 py-5 border-b border-vtt-dark-gray shrink-0 bg-vtt-dark z-20">
          <button
            type="button"
            onClick={() => navigate('/systems')}
            className="flex items-center gap-1.5 text-vtt-light/70 hover:text-vtt-golden text-sm transition-colors mb-3 group cursor-pointer w-fit"
          >
            <div className="transform group-hover:-translate-x-1 transition-transform">
              <IconArrowLeft />
            </div>
            Sistemas
          </button>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-vtt-golden">
                {isReadOnly
                  ? `Visualizar ${name || 'Sistema'} (Somente Leitura)`
                  : isEditing
                    ? `Editar Sistema: ${name || 'Sem Nome'}`
                    : 'Novo Sistema RPG'}
              </h1>
              {isReadOnly && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  Baixado
                </span>
              )}
            </div>

            {/* Ações do Topo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/systems')}
                className="px-5 py-2 rounded-xl border border-vtt-dark-gray text-neutral-300 text-sm font-semibold hover:border-vtt-red hover:text-vtt-light transition-colors cursor-pointer"
              >
                {isReadOnly ? 'Voltar' : 'Cancelar'}
              </button>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-lg shadow-vtt-green/20"
                >
                  <IconSave />
                  {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Sistema'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Corpo do Editor */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col p-6 sm:p-10 [scrollbar-color:#3a3a3a_transparent] scrollbar-thin"
        >
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
            {isReadOnly && (
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-700/50 flex items-center gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="font-semibold text-blue-100">Sistema Baixado — Somente Visualização</p>
                  <p className="text-xs text-blue-300/80 mt-0.5">
                    Este sistema foi baixado de uma sessão remota. Suas regras e estrutura estão disponíveis para consulta e não podem ser alteradas.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <fieldset disabled={isReadOnly} className="flex flex-col gap-6">
              {/* SESSÃO 1: INFORMAÇÕES GERAIS */}
              <section className="flex flex-col gap-4 bg-[#222222] p-5 rounded-xl border border-vtt-dark-gray/50 shadow-inner">
                <div
                  className="flex items-center justify-between cursor-pointer select-none border-b border-vtt-dark-gray/60 pb-2"
                  onClick={() => setIsGeneralInfoOpen(!isGeneralInfoOpen)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded bg-vtt-golden/20 text-vtt-golden">
                      <IconInfo />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-vtt-golden uppercase tracking-widest">Informações Gerais</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-neutral-400 hover:text-vtt-golden transition-colors font-medium cursor-pointer"
                  >
                    {isGeneralInfoOpen ? '▲ Recolher' : '▼ Expandir'}
                  </button>
                </div>

                {isGeneralInfoOpen && (
                  <>
                    <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                      <label className="flex-[2] min-w-[200px] flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Nome *</span>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                          placeholder="ex: D&D 5e"
                          className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors"
                        />
                      </label>
                      <label className="flex-1 min-w-[140px] flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Versão</span>
                        <input
                          type="text"
                          value={version}
                          onChange={e => setVersion(e.target.value)}
                          placeholder="ex: 5.1"
                          className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors"
                        />
                      </label>
                    </div>

                    <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                      <label className="flex-1 min-w-[140px] flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Gênero</span>
                        <select
                          value={genre}
                          onChange={e => setGenre(e.target.value)}
                          className="bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-1.5 px-3 text-sm outline-none focus:border-vtt-golden transition-colors cursor-pointer"
                        >
                          <option value="">Selecionar...</option>
                          {GENRE_OPTIONS.map(g => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex-[2] min-w-[200px] flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Descrição</span>
                        <input
                          type="text"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Breve descrição do sistema..."
                          className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors"
                        />
                      </label>
                    </div>
                  </>
                )}
              </section>

              {/* SESSÃO 2: ESTRUTURA DO SISTEMA (ABAS) */}
              <section className="flex flex-col gap-4 bg-[#222222] p-6 rounded-xl border border-vtt-dark-gray/50 shadow-inner">
                <div className="flex items-center gap-3 mb-2 border-b border-vtt-dark-gray pb-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded bg-vtt-golden/20 text-vtt-golden">
                    <IconLayers />
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-vtt-golden uppercase tracking-widest">Estrutura de Atributos</h3>
                  </div>
                </div>

                {/* Builder section tabs */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <div className="flex gap-2 bg-vtt-dark-gray/30 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setActiveBuilderTab('content')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          activeBuilderTab === 'content'
                            ? 'bg-vtt-dark-gray text-vtt-golden shadow-sm'
                            : 'text-neutral-500 hover:text-vtt-light'
                        }`}
                      >
                        <IconBox />
                        <span>Tipos de Conteúdo</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                          {Object.values(contentFields).reduce((acc, f) => acc + (f?.length ?? 0), 0)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveBuilderTab('sheet_layout')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          activeBuilderTab === 'sheet_layout'
                            ? 'bg-vtt-dark-gray text-vtt-golden shadow-sm'
                            : 'text-neutral-500 hover:text-vtt-light'
                        }`}
                      >
                        <IconCharacter />
                        <span>Ficha de Personagem (Layout & Campos)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                          {(sheetLayout.sections || DEFAULT_CUSTOM_SHEET_SECTIONS).length} seções
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* TAB: CONTENT FIELDS BY TYPE */}
                  {activeBuilderTab === 'content' && (
                    <div className="flex flex-col gap-4 mt-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                        {CONTENT_TYPE_LIST.map(ct => {
                          const count = (contentFields[ct.value] ?? []).length
                          const isSelected = selectedContentType === ct.value
                          return (
                            <button
                              key={ct.value}
                              type="button"
                              onClick={() => setSelectedContentType(ct.value)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                                isSelected
                                  ? 'bg-vtt-golden/10 text-vtt-golden border-vtt-golden/30 shadow-sm'
                                  : 'bg-vtt-dark-gray/40 border-transparent text-neutral-400 hover:text-vtt-golden hover:bg-vtt-dark-gray'
                              }`}
                            >
                              <span>{ct.label}</span>
                              {count > 0 && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                                    isSelected ? 'bg-vtt-golden/20 text-vtt-golden' : 'bg-vtt-dark text-neutral-400'
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
                                <h4 className="text-sm font-bold text-vtt-golden flex items-center gap-2">
                                  <IconBox />
                                  <span>{meta.label}</span>
                                </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => loadDefaultPreset(selectedContentType)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-vtt-dark-gray hover:bg-neutral-700 transition-colors cursor-pointer text-vtt-golden"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                  Padrão D&D
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
                                  <p>Nenhum campo fixo definido.</p>
                                  <button
                                    type="button"
                                    onClick={() => loadDefaultPreset(selectedContentType)}
                                    className="text-xs text-vtt-golden/80 hover:text-vtt-golden underline cursor-pointer"
                                  >
                                    Carregar campos padrão
                                  </button>
                                </div>
                              )}
                              {currentFields.map((f, i) => (
                                <FieldRow
                                  key={f.id || (f.key ? `${f.key}-${i}` : String(i))}
                                  field={f}
                                  index={i}
                                  onUpdate={nf => updateContentField(i, nf)}
                                  onRemove={() => removeContentField(i)}
                                  onDragStart={handleContentFieldDragStart}
                                  onDragOver={handleContentFieldDragOver}
                                  onDragLeave={handleContentFieldDragLeave}
                                  onDrop={handleContentFieldDrop}
                                  onDragEnd={handleContentFieldDragEnd}
                                  isDragging={draggedContentField === i}
                                  isOver={overContentField === i}
                                />
                              ))}

                              <button
                                type="button"
                                onClick={addContentField}
                                className="mt-1 flex items-center gap-1.5 text-xs text-vtt-light hover:text-vtt-golden transition-colors font-medium cursor-pointer w-fit"
                              >
                                <IconPlus /> Adicionar
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* TAB: CHARACTER SHEET CUSTOM LAYOUT BUILDER */}
                  {activeBuilderTab === 'sheet_layout' && (
                    <div className="mt-2">
                      <SheetLayoutBuilder sheetLayout={sheetLayout} onChangeLayout={setSheetLayout} />
                    </div>
                  )}
                </div>
              </section>
            </fieldset>

            {/* SESSÃO 3: ZONA DE PERIGO (Só aparece ao editar um sistema existente) */}
            {!isReadOnly && initialSystem && (
              <section className="flex flex-col gap-4 bg-red-950/10 p-6 rounded-xl border border-vtt-red/30 shadow-inner mt-4">
                <div className="flex items-center gap-3 border-b border-vtt-red/20 pb-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded bg-vtt-red/20 text-vtt-red">
                    <IconAlert />
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-vtt-red uppercase tracking-widest flex items-center gap-2">
                      Zona de Perigo
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="text-vtt-light text-sm font-semibold">Excluir este sistema</h4>
                    <p className="text-neutral-500 text-xs mt-1 max-w-md">
                      Esta ação é permanente e removerá todas as regras, campos e conteúdos associados.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      if (!confirmDelete) {
                        setConfirmDelete(true)
                        setTimeout(() => setConfirmDelete(false), 3000)
                        return
                      }
                      setLoading(true)
                      const res = await window.api.systems.delete(initialSystem.id)
                      if (!res.success) {
                        setError(res.error ?? 'Erro ao excluir sistema.')
                        setLoading(false)
                        return
                      }
                      await fetchSystems()
                      navigate('/systems')
                    }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                      confirmDelete
                        ? 'bg-vtt-red text-white shadow-[0_0_16px_rgba(211,47,47,0.5)] scale-105'
                        : 'bg-transparent border border-vtt-red/50 text-vtt-red hover:bg-vtt-red hover:text-white'
                    }`}
                  >
                    {confirmDelete ? 'Tem certeza?!?' : 'Apagar Sistema'}
                  </button>
                </div>
              </section>
            )}

            {/* Ações inferiores */}
            <div className="flex items-center justify-end gap-3 pt-4 pb-8 border-t border-vtt-dark-gray/50">
              <button
                type="button"
                onClick={() => navigate('/systems')}
                className="px-6 py-2.5 rounded-xl border border-vtt-dark-gray text-neutral-300 text-sm font-semibold hover:border-vtt-red hover:text-vtt-light transition-colors cursor-pointer"
              >
                {isReadOnly ? 'Voltar para Sistemas' : 'Cancelar'}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-vtt-green text-white text-sm font-semibold hover:bg-vtt-light-green transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-lg shadow-vtt-green/20"
                >
                  <IconSave />
                  {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Sistema'}
                </button>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
