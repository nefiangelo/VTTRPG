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
import { CONTENT_TYPE_LIST, getContentFieldsForType } from '../utils/contentPresets'

/* ─── Constants ──────────────────────────────────────────────── */
const CONTENT_TYPES = CONTENT_TYPE_LIST

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
const IconChevronDown = ({ open }: { open: boolean }): React.JSX.Element => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/* ─── Formatted Value Preview (handles objects, arrays, primitives) ── */
function FormattedValue({ value }: { value: unknown }): React.JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-neutral-600 italic">—</span>
  }
  if (typeof value === 'boolean') {
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          value ? 'bg-vtt-green/20 text-vtt-light-green' : 'bg-neutral-800 text-neutral-400'
        }`}
      >
        {value ? 'Sim' : 'Não'}
      </span>
    )
  }
  if (typeof value === 'number') {
    return <span className="text-vtt-light font-mono text-xs">{value}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-neutral-600 text-xs italic">vazio</span>
    const isSimple = value.every(item => typeof item !== 'object' || item === null)
    if (isSimple) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, idx) => (
            <span
              key={idx}
              className="bg-vtt-dark-gray/80 border border-vtt-dark-gray/80 px-2 py-0.5 rounded text-xs text-neutral-300 font-mono"
            >
              {String(item)}
            </span>
          ))}
        </div>
      )
    }
    return (
      <pre className="text-[11px] font-mono bg-black/40 border border-vtt-dark-gray rounded-lg p-2.5 text-emerald-300/90 overflow-x-auto max-h-48 leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  if (typeof value === 'object') {
    return (
      <pre className="text-[11px] font-mono bg-black/40 border border-vtt-dark-gray rounded-lg p-2.5 text-emerald-300/90 overflow-x-auto max-h-48 leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span className="text-neutral-300 text-xs">{String(value)}</span>
}

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
  const baseClass =
    'bg-transparent border border-vtt-light-gray rounded-lg text-vtt-light text-sm py-1.5 px-3 outline-none focus:border-vtt-green transition-colors w-full'

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 accent-vtt-green cursor-pointer"
        />
        <span className="text-neutral-300 text-sm">{field.label}</span>
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
        placeholder={field.max ? `0 – ${field.max}` : (field.placeholder || '0')}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value as string ?? ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full bg-black/20 border border-vtt-light-gray rounded-lg text-vtt-light text-sm py-2 px-3 outline-none focus:border-vtt-green transition-colors resize-y leading-relaxed"
        placeholder={field.placeholder || '—'}
      />
    )
  }

  if (field.type === 'list') {
    const listStr = Array.isArray(value) ? value.join(', ') : (value as string ?? '')
    return (
      <input
        type="text"
        value={listStr}
        onChange={e => {
          const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          onChange(arr)
        }}
        className={baseClass}
        placeholder={field.placeholder || 'item1, item2, item3...'}
      />
    )
  }

  const strValue =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

  return (
    <input
      type="text"
      value={strValue}
      onChange={e => onChange(e.target.value)}
      className={baseClass}
      placeholder={field.placeholder || '—'}
    />
  )
}

/* ─── Extra Field Editor (supports text, lists, and JSON objects) ─ */
type FieldMode = 'text' | 'list' | 'json'

function detectFieldMode(v: unknown): FieldMode {
  if (v === null || v === undefined) return 'text'
  if (Array.isArray(v)) {
    return v.every(item => typeof item !== 'object' || item === null) ? 'list' : 'json'
  }
  if (typeof v === 'object') return 'json'
  return 'text'
}

function ExtraFieldEditor({
  fieldKey,
  value,
  onChange,
  onDelete,
  onValidityChange,
}: {
  fieldKey: string
  value: unknown
  onChange: (v: unknown) => void
  onDelete: () => void
  onValidityChange: (key: string, isValid: boolean) => void
}): React.JSX.Element {
  const [mode, setMode] = useState<FieldMode>(() => detectFieldMode(value))
  const [jsonText, setJsonText] = useState<string>(() => {
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    return String(value ?? '')
  })
  const [listText, setListText] = useState<string>(() => {
    if (Array.isArray(value)) return value.join(', ')
    return String(value ?? '')
  })
  const [textVal, setTextVal] = useState<string>(() => {
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value ?? '')
  })
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      onValidityChange(fieldKey, true)
    }
  }, [fieldKey, onValidityChange])

  const handleModeChange = (newMode: FieldMode): void => {
    setMode(newMode)
    if (newMode === 'json') {
      let targetObj: unknown = value
      if (typeof value !== 'object' || value === null) {
        if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
          try {
            targetObj = JSON.parse(value.trim())
          } catch {
            targetObj = { value }
          }
        } else {
          targetObj = { value }
        }
      }
      const formatted = JSON.stringify(targetObj, null, 2)
      setJsonText(formatted)
      setJsonError(null)
      onValidityChange(fieldKey, true)
      onChange(targetObj)
    } else if (newMode === 'list') {
      let arr: unknown[] = []
      if (Array.isArray(value)) {
        arr = value
      } else if (typeof value === 'string') {
        arr = value.split(',').map(s => s.trim()).filter(Boolean)
      } else if (typeof value === 'object' && value !== null) {
        arr = Object.values(value)
      } else if (value !== undefined && value !== null) {
        arr = [value]
      }
      setListText(arr.join(', '))
      setJsonError(null)
      onValidityChange(fieldKey, true)
      onChange(arr)
    } else {
      const str = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
      setTextVal(str)
      setJsonError(null)
      onValidityChange(fieldKey, true)
      onChange(str)
    }
  }

  const handleJsonChange = (raw: string): void => {
    setJsonText(raw)
    try {
      const parsed = JSON.parse(raw)
      setJsonError(null)
      onValidityChange(fieldKey, true)
      onChange(parsed)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setJsonError(msg)
      onValidityChange(fieldKey, false)
    }
  }

  const handleFormatJson = (): void => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setJsonError(null)
      onValidityChange(fieldKey, true)
      onChange(parsed)
    } catch {
      // Keep as-is if invalid
    }
  }

  const handleListChange = (raw: string): void => {
    setListText(raw)
    const items = raw.split(',').map(s => s.trim()).filter(Boolean)
    onChange(items)
  }

  const handleTextChange = (raw: string): void => {
    setTextVal(raw)
    onChange(raw)
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-vtt-dark-gray/30 border border-vtt-dark-gray/70">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-semibold text-neutral-200 truncate max-w-[220px]" title={fieldKey}>
            {fieldKey}
          </span>
          <div className="flex items-center bg-black/40 border border-vtt-dark-gray rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => handleModeChange('text')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                mode === 'text'
                  ? 'bg-neutral-700 text-white font-medium shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              texto
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('list')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                mode === 'list'
                  ? 'bg-purple-600/60 text-purple-200 font-medium shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              lista
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('json')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                mode === 'json'
                  ? 'bg-blue-600/60 text-blue-200 font-medium shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {mode === 'json' && (
            <button
              type="button"
              onClick={handleFormatJson}
              className="text-[11px] px-2 py-0.5 rounded-md text-neutral-400 hover:text-white bg-vtt-dark-gray/60 hover:bg-vtt-dark-gray transition-colors cursor-pointer"
            >
              Formatar
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title="Excluir campo"
            className="text-neutral-500 hover:text-vtt-red transition-colors cursor-pointer p-1 rounded hover:bg-red-950/30"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {mode === 'json' && (
        <div className="flex flex-col gap-1">
          <textarea
            value={jsonText}
            onChange={e => handleJsonChange(e.target.value)}
            rows={Math.min(9, Math.max(3, jsonText.split('\n').length))}
            spellCheck={false}
            className="w-full font-mono text-xs text-emerald-300/90 bg-black/40 border border-vtt-light-gray/40 rounded-lg p-2.5 outline-none focus:border-vtt-green transition-colors resize-y leading-relaxed"
          />
          {jsonError && (
            <span className="text-[11px] text-red-400 font-mono">
              ⚠️ JSON inválido: {jsonError}
            </span>
          )}
        </div>
      )}

      {mode === 'list' && (
        <input
          type="text"
          value={listText}
          onChange={e => handleListChange(e.target.value)}
          placeholder="Separar itens por vírgula (ex: espada, escudo, armadura)"
          className="w-full bg-black/20 border border-vtt-light-gray rounded-lg text-vtt-light text-sm
                     py-1.5 px-3 outline-none focus:border-vtt-green transition-colors font-mono text-xs"
        />
      )}

      {mode === 'text' && (
        <input
          type="text"
          value={textVal}
          onChange={e => handleTextChange(e.target.value)}
          className="w-full bg-black/20 border border-vtt-light-gray rounded-lg text-vtt-light text-sm
                     py-1.5 px-3 outline-none focus:border-vtt-green transition-colors"
        />
      )}
    </div>
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
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setField = (key: string, value: unknown): void => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const removeField = (key: string): void => {
    setData(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setInvalidFields(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleValidityChange = useCallback((key: string, isValid: boolean): void => {
    setInvalidFields(prev => {
      if (isValid) {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: true }
    })
  }, [])

  // Add a free-form key-value for fields NOT in the structure
  const [extraKey, setExtraKey] = useState('')
  const [extraVal, setExtraVal] = useState('')
  const addExtra = (): void => {
    const key = extraKey.trim()
    if (!key) return
    const raw = extraVal.trim()
    let parsed: unknown = raw
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        // Keep as string if invalid JSON
      }
    } else if (raw === 'true') {
      parsed = true
    } else if (raw === 'false') {
      parsed = false
    } else if (!isNaN(Number(raw)) && raw !== '') {
      parsed = Number(raw)
    }
    setField(key, parsed)
    setExtraKey('')
    setExtraVal('')
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    const invalidKeys = Object.keys(invalidFields)
    if (invalidKeys.length > 0) {
      setError(`Corrija os erros de JSON nos campos: ${invalidKeys.join(', ')}`)
      return
    }

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
  const fixedFields = getContentFieldsForType(system, type)
  const currentTypeMeta = CONTENT_TYPES.find(c => c.value === type) || { label: type, singularLabel: type, emoji: '📄' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-vtt-dark border border-vtt-dark-gray
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

          {/* Fixed content fields for this content type */}
          {fixedFields.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-vtt-light-green flex items-center gap-1.5">
                  <span>{currentTypeMeta.emoji}</span>
                  <span>Campos de {currentTypeMeta.singularLabel}</span>
                </h3>
                <span className="text-[11px] text-neutral-500">
                  Campos fixos do sistema
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-vtt-dark-gray/20 border border-vtt-dark-gray/70 rounded-xl p-4">
                {fixedFields.map(field => {
                  const isFullWidth = field.type === 'textarea' || field.type === 'list'
                  return (
                    <div
                      key={field.key}
                      className={`flex flex-col gap-1.5 ${isFullWidth ? 'md:col-span-2' : ''}`}
                    >
                      {field.type !== 'checkbox' && (
                        <label className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
                          <span>{field.label}</span>
                          <span className="text-[10px] font-mono text-neutral-600">{field.key}</span>
                        </label>
                      )}
                      <DynamicFieldInput
                        field={field}
                        value={data[field.key]}
                        onChange={v => setField(field.key, v)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                Campos Adicionais
              </h3>
              <span className="text-[11px] text-neutral-500">
                Suporta texto, listas e objetos JSON
              </span>
            </div>

            {/* existing extra fields */}
            {Object.entries(data)
              .filter(([k]) => !fixedFields.some(f => f.key === k) && !groups.flatMap(g => g.fields ?? []).some(f => f.key === k))
              .map(([k, v]) => (
                <ExtraFieldEditor
                  key={k}
                  fieldKey={k}
                  value={v}
                  onChange={val => setField(k, val)}
                  onDelete={() => removeField(k)}
                  onValidityChange={handleValidityChange}
                />
              ))}

            {/* Add new extra field */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-vtt-dark-gray/60">
              <input
                type="text"
                value={extraKey}
                onChange={e => setExtraKey(e.target.value)}
                placeholder="Nome do campo (ex: saving_throws)"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }}
                className="w-full sm:w-44 bg-transparent border border-vtt-dark-gray rounded-lg text-neutral-300 text-xs
                           py-1.5 px-3 outline-none focus:border-vtt-green transition-colors font-mono"
              />
              <input
                type="text"
                value={extraVal}
                onChange={e => setExtraVal(e.target.value)}
                placeholder="Valor (texto, lista ou JSON)"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }}
                className="flex-1 bg-transparent border border-vtt-dark-gray rounded-lg text-vtt-light text-xs
                           py-1.5 px-3 outline-none focus:border-vtt-green transition-colors"
              />
              <button
                type="button"
                onClick={addExtra}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-vtt-dark-gray/60 border border-vtt-dark-gray
                           text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer shrink-0"
              >
                <IconPlus /> Adicionar
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
  const [expanded, setExpanded] = useState(false)
  const entries = Object.entries(entry.data)
  const fieldCount = entries.length

  return (
    <div className="border-b border-vtt-dark-gray/50 transition-colors">
      <div
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-vtt-dark-gray/20 cursor-pointer group/row select-none"
      >
        <button
          type="button"
          aria-label={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          className="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
        >
          <IconChevronDown open={expanded} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-vtt-light text-sm font-medium truncate">{entry.name}</p>
          {fieldCount > 0 && (
            <p className="text-neutral-600 text-xs">{fieldCount} campo{fieldCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
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

      {expanded && (
        <div className="px-10 pb-4 pt-1 bg-vtt-dark-gray/10 flex flex-col gap-2.5 border-t border-vtt-dark-gray/30">
          {entries.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-1">Nenhum atributo cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {entries.map(([k, v]) => {
                const isComplex =
                  typeof v === 'object' &&
                  v !== null &&
                  (!Array.isArray(v) || v.some(i => typeof i === 'object'))
                return (
                  <div
                    key={k}
                    className={`flex flex-col gap-1 p-2.5 rounded-lg bg-vtt-dark/70 border border-vtt-dark-gray/60 ${
                      isComplex ? 'md:col-span-2' : ''
                    }`}
                  >
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold truncate" title={k}>
                      {k}
                    </span>
                    <div>
                      <FormattedValue value={v} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
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
