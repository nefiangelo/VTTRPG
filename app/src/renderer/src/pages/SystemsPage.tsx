import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilterContent } from '../components/FilterContent'
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
  SheetLayoutConfig,
} from '../../../preload/index.d'
import { CONTENT_TYPE_LIST, DEFAULT_CONTENT_FIELDS, DEFAULT_MODULAR_SECTIONS } from '../utils/contentPresets'
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

const GENRE_OPTIONS = ['Fantasy', 'Sci-Fi', 'Horror', 'Western', 'Modern', 'Post-Apocalyptic', 'Cyberpunk', 'Steampunk', 'Medieval', 'Outro']



/* ─── System Banner (Ýcones sem letras e com traço mais grosso) ────────────────────────────── */
function SystemBanner({ genre }: { genre?: string | null; systemName?: string }): React.JSX.Element {
  const lower = genre?.toLowerCase() || ''

  // O strokeWidth foi alterado para "2" em todos os SVGs para deixar as linhas mais marcantes e visíveis.
  let BigIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
      <polyline points="2 15.5 12 8.5 22 15.5" />
      <line x1="12" y1="2" x2="12" y2="8.5" />
    </svg> // D20 (Padrão)
  )

  if (lower.includes('fantasy') || lower.includes('medieval')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
        <line x1="5" y1="14" x2="9" y2="18" />
        <line x1="7" y1="17" x2="4" y2="20" />
        <line x1="3" y1="19" x2="5" y2="21" />
      </svg> // Espadas Cruzadas
    )
  } else if (lower.includes('cyberpunk') || lower.includes('sci-fi')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg> // Microchip
    )
  } else if (lower.includes('horror')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <path d="M8 20v2h8v-2" />
        <path d="M12.5 17l-.5-1-.5 1h1z" />
        <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
      </svg> // Caveira
    )
  } else if (lower.includes('western')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg> // Mira / Crosshair
    )
  } else if (lower.includes('post-apocalyptic')) {
    BigIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M12 12h.01" />
        <path d="M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2 9.2 2 13c0 .5.4 1 1 1h5c.5 0 1-.4 1-1 0-1.8.8-3.4 2-4.5" />
        <path d="M21 13c0-3.8-1.9-7.5-4.2-9.2-.4-.3-1-.1-1.3.4l-2.4 4.1c1.2 1.1 2 2.7 2 4.5 0 .5.4 1 1 1h5c.5 0 1-.4 1-1Z" />
        <path d="M8.2 15.5c-.4.4-.5 1-.2 1.4 1.8 3.1 5.3 4.9 8.5 3.9.5-.1.8-.7.6-1.1l-2.7-4c-.9.9-2.2 1.4-3.6 1.4-1.2 0-2.3-.4-3.2-1-.4-.3-1-.2-1.4.2Z" />
      </svg> // Radiação
    )
  }

  return (
    <div className="w-full h-24 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] relative shrink-0 border-b border-vtt-dark-gray overflow-hidden">
      {/* Ýcone Único 
          - Tamanho mantido w-28 h-28
          - No hover, ganha cor dourada e brilho sutil */}
      <div className="absolute -right-4 -bottom-4 w-28 h-28 text-[#262626] transition-all duration-300 ease-in-out group-hover:text-vtt-golden group-hover:drop-shadow-[0_0_8px_rgba(233,209,128,0.3)] pointer-events-none">
        {BigIcon}
      </div>
    </div>
  )
}


/* ─── Icons ──────────────────────────────────────────────────── */
const IconPlus = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const IconTrash = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const IconDice = (): React.JSX.Element => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8-8a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" /></svg>
)

const IconGears = (): React.JSX.Element => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconScroll = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
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

// IMPORTAR SISTEMAS A PARTIR DE ARQUIVOS
const IconFileImport = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 12v6" />
    <path d="M9 15l3 3 3-3" />
  </svg>
)

/* ─── Import System Modal (EM DEV) ──────────────────────────── */
function ImportModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-vtt-dark border border-vtt-dark-gray rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-vtt-dark-gray pb-3">
          <h2 className="text-lg font-bold text-vtt-golden flex items-center gap-2">
            <IconFileImport /> Importar Sistema
          </h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-vtt-dark-gray rounded-xl bg-vtt-dark-gray/20">
          <div className="text-vtt-golden/50 mb-3 transform scale-150">
            <IconFileImport />
          </div>
          <p className="text-neutral-400 text-sm text-center px-4">
            A importação de sistemas (JSON) estará disponível em atualizações futuras.
          </p>
        </div>

        <div className="flex justify-end mt-2">
          <button type="button" onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-vtt-light-gray text-neutral-300 text-sm font-semibold hover:border-vtt-golden hover:text-vtt-golden transition-colors cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

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
      className={`flex items-center gap-2 bg-vtt-dark-gray/40 rounded-lg p-2.5 group/field transition-all duration-150 border ${isDragging
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

/* ─── Attribute Group Card ───────────────────────────────────── */
function GroupCard({
  group,
  index,
  onUpdate,
  onRemove,
  onDragStartGroup,
  onDragOverGroup,
  onDragLeaveGroup,
  onDropGroup,
  onDragEndGroup,
  isDraggingGroup,
  isOverGroup,
  onFieldDragStart,
  onFieldDragOver,
  onFieldDragLeave,
  onFieldDrop,
  onFieldDragEnd,
  draggedFieldInfo,
  overFieldInfo,
  onDropFieldInEmptyGroup,
}: {
  group: AttributeGroup
  index: number
  onUpdate: (g: AttributeGroup) => void
  onRemove: () => void
  onDragStartGroup?: (e: React.DragEvent, index: number) => void
  onDragOverGroup?: (e: React.DragEvent, index: number) => void
  onDragLeaveGroup?: (e: React.DragEvent) => void
  onDropGroup?: (e: React.DragEvent, index: number) => void
  onDragEndGroup?: (e: React.DragEvent) => void
  isDraggingGroup?: boolean
  isOverGroup?: boolean
  onFieldDragStart?: (e: React.DragEvent, groupId: string, fieldIndex: number) => void
  onFieldDragOver?: (e: React.DragEvent, groupId: string, fieldIndex: number) => void
  onFieldDragLeave?: (e: React.DragEvent) => void
  onFieldDrop?: (e: React.DragEvent, groupId: string, fieldIndex: number) => void
  onFieldDragEnd?: (e: React.DragEvent) => void
  draggedFieldInfo?: { groupId: string; fieldIndex: number } | null
  overFieldInfo?: { groupId: string; fieldIndex: number } | null
  onDropFieldInEmptyGroup?: (e: React.DragEvent, groupId: string) => void
}): React.JSX.Element {
  const [isHandlePressed, setIsHandlePressed] = useState(false)

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
    <div
      draggable={isHandlePressed}
      onDragStart={e => {
        onDragStartGroup?.(e, index)
      }}
      onDragOver={e => {
        if (onDragOverGroup) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          onDragOverGroup(e, index)
        }
      }}
      onDragLeave={e => {
        onDragLeaveGroup?.(e)
      }}
      onDrop={e => {
        setIsHandlePressed(false)
        onDropGroup?.(e, index)
      }}
      onDragEnd={e => {
        setIsHandlePressed(false)
        onDragEndGroup?.(e)
      }}
      className={`border rounded-xl bg-vtt-dark overflow-hidden transition-all duration-150 ${isDraggingGroup
        ? 'opacity-40 border-dashed border-vtt-red/60 scale-[0.99]'
        : isOverGroup
          ? 'border-vtt-red ring-2 ring-vtt-red/50 shadow-[0_0_16px_rgba(211,47,47,0.3)]'
          : 'border-vtt-dark-gray'
        }`}
    >
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-vtt-dark-gray/30 border-b border-vtt-dark-gray">
        <div
          onMouseDown={() => setIsHandlePressed(true)}
          onMouseUp={() => setIsHandlePressed(false)}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-500 hover:text-vtt-light transition-colors select-none flex items-center justify-center shrink-0"
          title="Arraste para reorganizar grupo"
        >
          <IconGrip />
        </div>
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
        {group.fields.length === 0 ? (
          <div
            onDragOver={e => {
              if (draggedFieldInfo) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }
            }}
            onDrop={e => {
              e.preventDefault()
              onDropFieldInEmptyGroup?.(e, group.id)
            }}
            className="text-neutral-500 text-xs text-center py-4 border border-dashed border-vtt-dark-gray rounded-lg transition-colors hover:border-vtt-red/50"
          >
            Nenhum campo ainda. Adicione abaixo ou arraste campos para cá.
          </div>
        ) : (
          group.fields.map((f, i) => (
            <FieldRow
              key={f.key ? `${f.key}-${i}` : String(i)}
              field={f}
              index={i}
              onUpdate={nf => updateField(i, nf)}
              onRemove={() => removeField(i)}
              onDragStart={e => onFieldDragStart?.(e, group.id, i)}
              onDragOver={e => onFieldDragOver?.(e, group.id, i)}
              onDragLeave={onFieldDragLeave}
              onDrop={e => onFieldDrop?.(e, group.id, i)}
              onDragEnd={onFieldDragEnd}
              isDragging={draggedFieldInfo?.groupId === group.id && draggedFieldInfo?.fieldIndex === i}
              isOver={overFieldInfo?.groupId === group.id && overFieldInfo?.fieldIndex === i}
            />
          ))
        )}

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

  const [groups, setGroups] = useState<AttributeGroup[]>(() => {
    return (initial?.structure?.attributeGroups ?? []).map(g => ({
      ...g,
      id: g.id || uid(),
      fields: g.fields ?? [],
    }))
  })
  const [contentFields, setContentFields] = useState<Partial<Record<ContentType, AttributeField[]>>>(() => {
    return initial?.structure?.contentFields ?? {}
  })
  const [sheetLayout, setSheetLayout] = useState<SheetLayoutConfig>(() => {
    return (
      initial?.structure?.sheetLayout ?? {
        type: 'hybrid',
        pages: [],
        pins: [],
        modularSections: DEFAULT_MODULAR_SECTIONS,
      }
    )
  })
  const [activeBuilderTab, setActiveBuilderTab] = useState<'content' | 'character' | 'sheet_layout'>('content')
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

  /* ─── Groups DnD ───────────────────────────────────────────── */
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null)
  const [overGroupIndex, setOverGroupIndex] = useState<number | null>(null)

  const handleGroupDragStart = (_e: React.DragEvent, index: number): void => {
    setDraggedGroupIndex(index)
  }

  const handleGroupDragOver = (e: React.DragEvent, index: number): void => {
    if (draggedGroupIndex === null || draggedGroupIndex === index) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overGroupIndex !== index) {
      setOverGroupIndex(index)
    }
  }

  const handleGroupDragLeave = (): void => {
    setOverGroupIndex(null)
  }

  const handleGroupDrop = (e: React.DragEvent, targetIndex: number): void => {
    e.preventDefault()
    if (draggedGroupIndex !== null && draggedGroupIndex !== targetIndex) {
      setGroups(prev => reorder(prev, draggedGroupIndex, targetIndex))
    }
    setDraggedGroupIndex(null)
    setOverGroupIndex(null)
  }

  const handleGroupDragEnd = (): void => {
    setDraggedGroupIndex(null)
    setOverGroupIndex(null)
  }

  /* ─── Group Fields DnD ─────────────────────────────────────── */
  const [draggedGroupField, setDraggedGroupField] = useState<{ groupId: string; fieldIndex: number } | null>(null)
  const [overGroupField, setOverGroupField] = useState<{ groupId: string; fieldIndex: number } | null>(null)

  const handleFieldDragStart = (_e: React.DragEvent, groupId: string, fieldIndex: number): void => {
    setDraggedGroupField({ groupId, fieldIndex })
  }

  const handleFieldDragOver = (e: React.DragEvent, groupId: string, fieldIndex: number): void => {
    if (!draggedGroupField) return
    if (draggedGroupField.groupId === groupId && draggedGroupField.fieldIndex === fieldIndex) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overGroupField?.groupId !== groupId || overGroupField?.fieldIndex !== fieldIndex) {
      setOverGroupField({ groupId, fieldIndex })
    }
  }

  const handleFieldDragLeave = (): void => {
    setOverGroupField(null)
  }

  const handleFieldDrop = (e: React.DragEvent, targetGroupId: string, targetFieldIndex: number): void => {
    e.preventDefault()
    if (draggedGroupField) {
      const { groupId: srcGroupId, fieldIndex: srcIndex } = draggedGroupField
      if (srcGroupId === targetGroupId) {
        if (srcIndex !== targetFieldIndex) {
          setGroups(prev =>
            prev.map(g => {
              if (g.id !== srcGroupId) return g
              return { ...g, fields: reorder(g.fields, srcIndex, targetFieldIndex) }
            })
          )
        }
      } else {
        setGroups(prev => {
          const next = prev.map(g => ({ ...g, fields: [...g.fields] }))
          const srcGroup = next.find(g => g.id === srcGroupId)
          const tgtGroup = next.find(g => g.id === targetGroupId)
          if (srcGroup && tgtGroup) {
            const [moved] = srcGroup.fields.splice(srcIndex, 1)
            if (moved) {
              tgtGroup.fields.splice(targetFieldIndex, 0, moved)
            }
          }
          return next
        })
      }
    }
    setDraggedGroupField(null)
    setOverGroupField(null)
  }

  const handleFieldDragEnd = (): void => {
    setDraggedGroupField(null)
    setOverGroupField(null)
  }

  const handleDropFieldInEmptyGroup = (e: React.DragEvent, targetGroupId: string): void => {
    e.preventDefault()
    if (draggedGroupField) {
      const { groupId: srcGroupId, fieldIndex: srcIndex } = draggedGroupField
      setGroups(prev => {
        const next = prev.map(g => ({ ...g, fields: [...g.fields] }))
        const srcGroup = next.find(g => g.id === srcGroupId)
        const tgtGroup = next.find(g => g.id === targetGroupId)
        if (srcGroup && tgtGroup) {
          const [moved] = srcGroup.fields.splice(srcIndex, 1)
          if (moved) {
            tgtGroup.fields.push(moved)
          }
        }
        return next
      })
    }
    setDraggedGroupField(null)
    setOverGroupField(null)
  }

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

  const clearContentFields = (ct: ContentType): void => {
    setContentFields(prev => {
      const next = { ...prev }
      next[ct] = []
      return next
    })
  }

  const isReadOnly = Boolean(initial?.is_downloaded)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (isReadOnly) return
    setError(null)
    setLoading(true)

    const structure: SystemStructure = {
      ...(initial?.structure ?? {}),
      attributeGroups: groups,
      contentFields,
      sheetLayout,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full ${
          activeBuilderTab === 'sheet_layout' ? 'max-w-7xl' : 'max-w-4xl'
        } h-[92vh] max-h-[94vh] bg-vtt-dark border border-vtt-dark-gray
                   rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300`}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-vtt-dark-gray shrink-0 bg-vtt-dark z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-vtt-golden">
              {isReadOnly ? 'Visualizar Sistema RPG (Somente Leitura)' : initial ? 'Editar Sistema RPG' : 'Novo Sistema RPG'}
            </h2>
            {isReadOnly && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                Baixado
              </span>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="text-neutral-500 hover:text-vtt-light transition-colors text-xl cursor-pointer">✕</button>
        </div>

        {/* Corpo do Formulário */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 p-6 sm:p-8 [scrollbar-color:#3a3a3a_transparent] scrollbar-thin">
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
            <div className="bg-red-950/60 border border-red-700/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
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
                  <div className="flex gap-4">
                    <label className="flex-[2] flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Nome *</span>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} required
                        placeholder="ex: D&D 5e"
                        className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                                 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors" />
                    </label>
                    <label className="flex-1 flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Versão</span>
                      <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                        placeholder="ex: 5.1"
                        className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                                 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors" />
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex-1 flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Gênero</span>
                      <select value={genre} onChange={e => setGenre(e.target.value)}
                        className="bg-vtt-dark-gray border border-vtt-light-gray rounded-lg text-vtt-light py-1.5 px-3
                                 text-sm outline-none focus:border-vtt-golden transition-colors cursor-pointer">
                        <option value="">Selecionar...</option>
                        {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>
                    <label className="flex-[2] flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Descrição</span>
                      <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Breve descrição do sistema..."
                        className="bg-transparent border-b border-vtt-light-gray text-vtt-light placeholder:text-neutral-600
                                 py-1.5 text-sm outline-none focus:border-vtt-golden transition-colors" />
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
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeBuilderTab === 'content'
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
                      onClick={() => setActiveBuilderTab('character')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeBuilderTab === 'character'
                        ? 'bg-vtt-dark-gray text-vtt-golden shadow-sm'
                        : 'text-neutral-500 hover:text-vtt-light'
                        }`}
                    >
                      <IconCharacter />
                      <span>Ficha de Personagem</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                        {groups.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveBuilderTab('sheet_layout')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeBuilderTab === 'sheet_layout'
                        ? 'bg-vtt-dark-gray text-vtt-golden shadow-sm'
                        : 'text-neutral-500 hover:text-vtt-light'
                        }`}
                    >
                      <IconScroll />
                      <span>Layout Visual da Ficha (PDF)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                        {(sheetLayout.pins || []).length}
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
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer border ${isSelected
                              ? 'bg-vtt-golden/10 text-vtt-golden border-vtt-golden/30 shadow-sm'
                              : 'bg-vtt-dark-gray/40 border-transparent text-neutral-400 hover:text-vtt-golden hover:bg-vtt-dark-gray'
                              }`}
                          >
                            {/* O texto e ícone (se houver no futuro) do tipo de conteúdo */}
                            <span>{ct.label}</span>

                            {count > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${isSelected ? 'bg-vtt-golden/20 text-vtt-golden' : 'bg-vtt-dark text-neutral-400'
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
                                key={f.key ? `${f.key}-${i}` : String(i)}
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
                              className="mt-1 flex items-center gap-1.5 text-xs text-vtt-light hover:text-vtt-golden
                                       transition-colors font-medium cursor-pointer w-fit"
                            >
                              <IconPlus /> Adicionar
                            </button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* TAB: CHARACTER ATTRIBUTE GROUPS */}
                {activeBuilderTab === 'character' && (
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={addGroup}
                        className="flex items-center gap-1.5 text-xs font-semibold text-vtt-golden hover:text-[#FBE8A6]
                                 transition-colors cursor-pointer px-3 py-1.5 rounded-lg border border-vtt-golden/30
                                 hover:border-vtt-golden bg-vtt-golden/10 hover:bg-vtt-golden/20 ml-auto">
                        <IconPlus /> Novo Grupo
                      </button>
                    </div>

                    {groups.length === 0 && (
                      <div className="text-center py-8 text-neutral-500 text-sm border border-dashed border-vtt-dark-gray rounded-xl">
                        Nenhum grupo definido.
                      </div>
                    )}

                    {groups.map((g, i) => (
                      <GroupCard
                        key={g.id || String(i)}
                        group={g}
                        index={i}
                        onUpdate={ng => updateGroup(i, ng)}
                        onRemove={() => removeGroup(i)}
                        onDragStartGroup={handleGroupDragStart}
                        onDragOverGroup={draggedGroupIndex !== null ? handleGroupDragOver : undefined}
                        onDragLeaveGroup={handleGroupDragLeave}
                        onDropGroup={draggedGroupIndex !== null ? handleGroupDrop : undefined}
                        onDragEndGroup={handleGroupDragEnd}
                        isDraggingGroup={draggedGroupIndex === i}
                        isOverGroup={overGroupIndex === i}
                        onFieldDragStart={handleFieldDragStart}
                        onFieldDragOver={handleFieldDragOver}
                        onFieldDragLeave={handleFieldDragLeave}
                        onFieldDrop={handleFieldDrop}
                        onFieldDragEnd={handleFieldDragEnd}
                        draggedFieldInfo={draggedGroupField}
                        overFieldInfo={overGroupField}
                        onDropFieldInEmptyGroup={handleDropFieldInEmptyGroup}
                      />
                    ))}
                  </div>
                )}

                {/* TAB: CHARACTER SHEET PDF LAYOUT BUILDER */}
                {activeBuilderTab === 'sheet_layout' && (
                  <div className="mt-2">
                    <SheetLayoutBuilder
                      sheetLayout={sheetLayout}
                      attributeGroups={groups}
                      onChangeLayout={setSheetLayout}
                    />
                  </div>
                )}
              </div>
            </section>
          </fieldset>

          {/* SESSÃO 3: ZONA DE PERIGO (Só aparece ao editar um sistema existente) */}
          {!isReadOnly && initial && (
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
                  {/* <p className="text-neutral-500 text-xs mt-1 max-w-md">
                    Tem certeza? Essa ação é irreversível.
                  </p> */}
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    // Lógica de confirmação inline (3 segundos para confirmar)
                    if (!confirmDelete) {
                      setConfirmDelete(true)
                      setTimeout(() => setConfirmDelete(false), 3000)
                      return
                    }
                    // Ação real de deletar
                    setLoading(true)
                    const res = await window.api.systems.delete(initial.id)
                    if (!res.success) {
                      setError(res.error ?? 'Erro ao excluir.')
                      setLoading(false)
                      return
                    }
                    onSaved() // Fecha o modal e atualiza a lista de trás
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap ${confirmDelete
                    ? 'bg-vtt-red text-white shadow-[0_0_16px_rgba(211,47,47,0.5)] scale-105'
                    : 'bg-transparent border border-vtt-red/50 text-vtt-red hover:bg-vtt-red hover:text-white'
                    }`}
                >
                  {confirmDelete ? 'Tem certeza?!?' : 'Apagar Sistema'}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Footer com Botões */}
        <div className="flex gap-3 px-8 py-4 border-t border-vtt-dark-gray shrink-0 bg-vtt-dark z-20 rounded-b-2xl">
          {isReadOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-vtt-golden text-vtt-dark text-sm font-semibold hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-vtt-golden/20"
            >
              Fechar
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-vtt-light-gray text-neutral-300 text-sm
                           font-semibold hover:border-vtt-red hover:text-vtt-light transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-vtt-green text-white text-sm font-semibold
                           hover:bg-vtt-light-green transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-vtt-green/20">
                {loading ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Sistema'}
              </button>
            </>
          )}
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

/* ??? System Card ????????????????????????????????? */
function SystemCard({ system, onEdit, onView }: {
  system: RpgSystemFull
  onEdit: () => void
  onDelete?: () => void
  onView: () => void
}): React.JSX.Element {

  return (
    <article className="group relative bg-vtt-dark rounded-xl flex flex-col select-none
                        border border-vtt-dark-gray hover:border-vtt-red/60 
                        transition-all duration-300 shadow-md hover:shadow-[0_4px_24px_rgba(211,47,47,0.15)]
                        hover:-translate-y-1 hover:scale-[1.02]
                        overflow-hidden">

      <div className="absolute -right-4 -bottom-4 w-28 h-28 text-[#262626] transition-all duration-300 ease-in-out group-hover:text-vtt-golden group-hover:drop-shadow-[0_0_8px_rgba(233,209,128,0.3)] pointer-events-none" />

      <SystemBanner genre={system.genre} />

      {/* Corpo de Informacoes */}
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Topo: Nome e Versao */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 w-full">
              <h3 className="text-vtt-golden group-hover:text-[#FBE8A6] font-bold text-lg leading-tight truncate drop-shadow-sm transition-colors duration-300">
                {system.name}
              </h3>

              {system.version && (
                <span className="shrink-0 text-[10px] text-vtt-light/70 font-mono bg-vtt-dark-gray/40 px-1.5 py-0.5 rounded border border-vtt-light/5 mt-0.5">
                  v{system.version}
                </span>
              )}

              {system.is_downloaded && (
                <span className="shrink-0 text-[10px] text-blue-300 font-semibold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60 mt-0.5">
                  Baixado
                </span>
              )}
            </div>
          </div>
        </div>


        {/* Botoes de Acao (Proporcao 2/3 e 1/3) */}
        <div className="flex gap-2 pt-1 border-t border-vtt-dark-gray/50 mt-auto">
          <button type="button" onClick={onEdit}
            className="w-1/3 flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                        bg-transparent hover:bg-vtt-dark-gray/50 border border-transparent hover:border-vtt-light-gray
                        text-vtt-light-gray hover:text-vtt-golden transition-all duration-200 cursor-pointer group/edit"
            title={system.is_downloaded ? "Visualizar Sistema (Somente Leitura)" : "Editar"}>
            <div className="transform group-hover/edit:rotate-45 transition-all duration-300 shrink-0 flex items-center justify-center">
              <IconGears />
            </div>
          </button>
          <button type="button" onClick={onView}
            className="w-2/3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
                       bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-xs font-semibold 
                       hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer">
            <IconScroll /> Conteudo
          </button>
        </div>
      </div>
    </article>
  )
}

export default function SystemsPage(): React.JSX.Element {
  const { user } = useAuth()
  const { fetchSystems } = useCampaigns()
  const navigate = useNavigate()
  const [systems, setSystems] = useState<RpgSystemFull[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<RpgSystemFull | undefined>(undefined)
  const [deleting, setDeleting] = useState<RpgSystemFull | undefined>(undefined)

  const [search, setSearch] = useState('')

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

  // L�GICA DO FILTRO: Cria a lista filtrada baseada no estado 'search'
  const filteredSystems = systems.filter((system) =>
    system.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* <button type="button" onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-vtt-light text-sm transition-colors mb-4">
              <IconArrowLeft /> Voltar
            </button> */}
            <h1 className="text-3xl font-bold text-vtt-golden">Sistemas RPG</h1>
            {/* <p className="text-neutral-400 text-sm mt-1">Gerencie os sistemas de regras e seus atributos.</p> */}
          </div>
        </div>

        {/* BARRA DE BUSCA E BOTÕES DE AÇÃO */}
        <div className="flex items-center justify-between mb-2">
          <FilterContent search={search} setSearch={setSearch} />

          {/* Wrapper para deixar os botões lado a lado */}
          <div className="flex items-center gap-3">

            {/* Botão de Importar Sistema (Golden) */}
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center p-2.5 rounded-xl
                         bg-vtt-dark border border-vtt-dark-gray text-vtt-light-gray 
                         hover:bg-vtt-dark-gray/50 hover:text-vtt-golden hover:border-vtt-golden/50 
                         transition-all duration-200 cursor-pointer shadow-md"
              title="Importar Sistema"
            >
              <IconFileImport />
            </button>

            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-sm font-semibold 
                         hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer
                         hover:shadow-[0_0_24px_rgba(67,161,93,0.4)]">
              <IconPlus /> Novo Sistema
            </button>

          </div>
        </div>

        <div className="w-full h-px bg-vtt-red mb-8" />

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
            {/* 4. USE 'filteredSystems' NO LUGAR DE 'systems' NO MAP() */}
            {filteredSystems.map(s => (
              <SystemCard
                key={s.id}
                system={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleting(s)}
                onView={() => navigate(`/systems/${s.id}/content`)}
              />
            ))}

            {/* 5. FEEDBACK OPCIONAL SE N�O ACHAR NADA */}
            {filteredSystems.length === 0 && search !== '' && (
              <div className="col-span-full mt-8 flex justify-center w-full">
                <p className="text-neutral-400">Nenhum sistema encontrado com "{search}".</p>
              </div>
            )}

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

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
