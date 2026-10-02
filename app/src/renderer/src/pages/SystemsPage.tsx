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

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

const GENRE_OPTIONS = ['Fantasy', 'Sci-Fi', 'Horror', 'Western', 'Modern', 'Post-Apocalyptic', 'Cyberpunk', 'Steampunk', 'Medieval', 'Outro']



/* ─── System Banner (Ícones Matemáticos Modernos) ────────────────────────────── */
function SystemBanner({ genre }: { genre?: string }): React.JSX.Element {
  const lower = genre?.toLowerCase() || ''

  // A classe w-full h-full e o stroke="currentColor" garantem que todos 
  // os ícones se comportem de forma idêntica (tamanho, cor e transição).

  let BigIcon = (
    // D20 (Padrão) - Icosaedro perfeito
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
      <polyline points="2 15.5 12 8.5 22 15.5" />
      <line x1="12" y1="2" x2="12" y2="8.5" />
    </svg>
  )

  if (lower.includes('fantasy') || lower.includes('medieval')) {
    BigIcon = (
      // Espadas Cruzadas (Simetria matemática)
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
        <line x1="5" y1="14" x2="9" y2="18" />
        <line x1="7" y1="17" x2="4" y2="20" />
        <line x1="3" y1="19" x2="5" y2="21" />
      </svg>
    )
  } else if (lower.includes('cyberpunk') || lower.includes('sci-fi')) {
    BigIcon = (
      // CPU / Microchip (Bordas e pinos perfeitamente alinhados)
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
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
      </svg>
    )
  } else if (lower.includes('horror')) {
    BigIcon = (
      // Caveira Minimalista (Curvas suaves e precisas)
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <path d="M8 20v2h8v-2" />
        <path d="M12.5 17l-.5-1-.5 1h1z" />
        <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
      </svg>
    )
  } else if (lower.includes('western')) {
    BigIcon = (
      // Mira de Revólver / Crosshair (Alvo perfeito do faroeste)
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    )
  } else if (lower.includes('post-apocalyptic')) {
    BigIcon = (
      // Radiação Oficial (Feita com circunferências cortadas)
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M12 12h.01" />
        <path d="M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2 9.2 2 13c0 .5.4 1 1 1h5c.5 0 1-.4 1-1 0-1.8.8-3.4 2-4.5" />
        <path d="M21 13c0-3.8-1.9-7.5-4.2-9.2-.4-.3-1-.1-1.3.4l-2.4 4.1c1.2 1.1 2 2.7 2 4.5 0 .5.4 1 1 1h5c.5 0 1-.4 1-1Z" />
        <path d="M8.2 15.5c-.4.4-.5 1-.2 1.4 1.8 3.1 5.3 4.9 8.5 3.9.5-.1.8-.7.6-1.1l-2.7-4c-.9.9-2.2 1.4-3.6 1.4-1.2 0-2.3-.4-3.2-1-.4-.3-1-.2-1.4.2Z" />
      </svg>
    )
  }

  return (
    <div className="w-full h-24 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] relative shrink-0 border-b border-vtt-dark-gray overflow-hidden">
      {/*
        Ícone gigante / marca d'água
        Normal: quase invisível (#292929)
        Hover: muda APENAS de cor para dourado, limpo, sem pular ou girar.
      */}
      <div
        className="
          absolute
          -right-6
          -bottom-6
          w-36
          h-36
          text-[#292929]
          transition-colors
          duration-500
          ease-out
          group-hover:text-vtt-golden
          pointer-events-none
          drop-shadow-md
        "
      >
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
const IconEdit = (): React.JSX.Element => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
)

const IconDice = (): React.JSX.Element => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-4 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8-8a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" /></svg>
)

const IconGears = (): React.JSX.Element => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconArrowLeft = (): React.JSX.Element => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
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
  const [activeBuilderTab, setActiveBuilderTab] = useState<'content' | 'character'>('content')
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('class')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeBuilderTab === 'content'
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeBuilderTab === 'character'
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${isSelected
                          ? 'bg-vtt-green text-white border-vtt-green shadow-xs'
                          : 'bg-vtt-dark-gray/40 border-vtt-dark-gray text-neutral-400 hover:text-vtt-light hover:bg-vtt-dark-gray'
                          }`}
                      >
                        <span>{ct.emoji}</span>
                        <span>{ct.label}</span>
                        {count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-black/30 text-white' : 'bg-vtt-dark text-neutral-400'
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

/* ─── System Card (Hover Vermelho + Dourado Claro) ───────────────────────────────── */
function SystemCard({ system, onEdit, onDelete, onView }: {
  system: RpgSystemFull
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}): React.JSX.Element {

  return (
    <article className="group relative bg-vtt-dark rounded-xl flex flex-col select-none
                        border border-vtt-dark-gray hover:border-vtt-red/60 
                        transition-all duration-300 shadow-md hover:shadow-[0_4px_24px_rgba(211,47,47,0.15)]
                        overflow-hidden">

      {/* Linha de destaque VERMELHA superposta ao banner no hover */}
      <div className="absolute top-0 left-0 w-full h-[2px] z-10 bg-gradient-to-r from-transparent via-vtt-red to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Renderiza o Banner Dinâmico Limpo */}
      <SystemBanner genre={system.genre} />

      {/* Corpo de Informações */}
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Topo: Nome, Versão e Engrenagem */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 w-full">

              {/* Título: Começa Dourado e acende para Dourado Claro (#FBE8A6) no hover */}
              <h3 className="text-vtt-golden group-hover:text-[#FBE8A6] font-bold text-lg leading-tight truncate drop-shadow-sm transition-colors duration-300">
                {system.name}
              </h3>

              {system.version && (
                <span className="shrink-0 text-[10px] text-vtt-light/70 font-mono bg-vtt-dark-gray/40 px-1.5 py-0.5 rounded border border-vtt-light/5 mt-0.5">
                  v{system.version}
                </span>
              )}
            </div>
          </div>

          {/* Ícone de engrenagem */}
          <div className="text-vtt-light-gray group-hover:text-vtt-red transition-all duration-300 transform group-hover:rotate-45 shrink-0 mt-0.5">
            <IconGears />
          </div>
        </div>

        {/* Botões de Ação (Com mt-auto para grudar no fundo) */}
        <div className="flex gap-2 pt-1 border-t border-vtt-dark-gray/50 mt-auto">
          <button type="button" onClick={onView}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
                       bg-vtt-dark-green/30 border border-vtt-green/40 text-vtt-light-green text-xs font-semibold 
                       hover:bg-vtt-green hover:text-vtt-light transition-all duration-200 cursor-pointer">
            <IconScroll /> Conteúdo
          </button>
          <button type="button" onClick={onEdit}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-transparent hover:bg-vtt-dark-gray/50 border border-transparent hover:border-vtt-light-gray
                       text-vtt-light-gray hover:text-vtt-light text-xs transition-all duration-200 cursor-pointer"
            title="Editar">
            <IconEdit />
          </button>
          <button type="button" onClick={onDelete}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg
                       bg-transparent hover:bg-vtt-dark-red/20 border border-transparent hover:border-vtt-red/30
                       text-vtt-light-gray hover:text-vtt-light-red text-xs transition-all duration-200 cursor-pointer"
            title="Excluir">
            <IconTrash />
          </button>
        </div>
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
            <h1 className="text-3xl font-bold text-vtt-golden">Sistemas RPG</h1>
            {/* <p className="text-neutral-400 text-sm mt-1">Gerencie os sistemas de regras e seus atributos.</p> */}
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vtt-green text-white
                       font-semibold text-sm hover:bg-vtt-light-green transition-colors cursor-pointer
                       shadow-[0_0_16px_rgba(46,111,64,0.3)] hover:shadow-[0_0_24px_rgba(67,161,93,0.4)]">
            <IconPlus /> Novo Sistema
          </button>
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
