import React, { useState, useEffect, useRef } from 'react'
import type {
  SheetLayoutConfig,
  SheetCustomSection,
  SheetCustomField,
  ContentType
} from '../../../../preload/index.d'
import {
  CONTENT_TYPE_LIST,
  DEFAULT_CUSTOM_SHEET_SECTIONS,
  VAMPIRE_SHEET_SECTIONS,
  CYBERPUNK_SHEET_SECTIONS,
  DEFAULT_MODULAR_SECTIONS
} from '../../utils/contentPresets'
import {
  getFieldStyle,
  getSectionStyle,
  parseWidthPercent
} from '../../utils/sheetLayoutUtils'
import { SHEET_THEME_LIST, getSheetTheme } from '../../utils/sheetThemes'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  LayoutGrid,
  Dice5,
  GripVertical,
  Palette,
  Settings2,
  Play,
  RotateCcw,
  Move
} from 'lucide-react'
import VampireDotTrack from './VampireDotTrack'
import DndAbilityBox from './DndAbilityBox'
import {
  DndScallopedCorner,
  VampireTopOrnament
} from './ThemedSectionDecorations'

interface SheetLayoutBuilderProps {
  sheetLayout: SheetLayoutConfig
  onChangeLayout: (layout: SheetLayoutConfig) => void
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function SheetLayoutBuilder({
  sheetLayout,
  onChangeLayout
}: SheetLayoutBuilderProps): React.JSX.Element {
  // Inicializa seções a partir da configuração ou do preset padrão
  const sections: SheetCustomSection[] = React.useMemo(() => {
    if (sheetLayout.sections && sheetLayout.sections.length > 0) {
      return sheetLayout.sections
    }
    return DEFAULT_CUSTOM_SHEET_SECTIONS
  }, [sheetLayout.sections])

  // Modo unificado: 'edit' (com controles do construtor na ficha) ou 'test' (interativo puro para testar)
  const [builderMode, setBuilderMode] = useState<'edit' | 'test'>('edit')

  // Campo com gaveta de configurações avançadas expandida
  const [expandedFieldSettingsId, setExpandedFieldSettingsId] = useState<string | null>(null)

  // ── Drag & Drop Handlers para Campos (Reordenar) ──
  const [draggedField, setDraggedField] = useState<{
    sectionIndex: number
    fieldIndex: number
    fieldId: string
  } | null>(null)

  const [dropFieldTarget, setDropFieldTarget] = useState<{
    sectionIndex: number
    fieldIndex: number
    position: 'before' | 'after'
  } | null>(null)

  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null)

  // ── Drag & Drop para Seções (Reordenar) ──
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null)
  const [dropSectionIndex, setDropSectionIndex] = useState<number | null>(null)

  // ── Redimensionamento Interativo em Tempo Real via Mouse Drag (Largura, Altura ou Ambas) ──
  const [resizingTarget, setResizingTarget] = useState<{
    type: 'field' | 'section'
    direction: 'horizontal' | 'vertical' | 'both'
    sectionIndex: number
    fieldIndex?: number
    startX: number
    startY: number
    startPercent: number
    startHeight: number
    containerWidth: number
    currentPercent: number
    currentHeight: number
    clientX: number
    clientY: number
  } | null>(null)

  const resizingTargetRef = useRef(resizingTarget)
  resizingTargetRef.current = resizingTarget

  const sectionsRef = useRef(sections)
  sectionsRef.current = sections

  // ── Valores da Ficha para Pré-visualização Interativa em Tempo Real ──
  const [previewValues, setPreviewValues] = useState<Record<string, string | number | boolean>>({
    character_name: 'Valerius Ardent',
    player_name: 'Jogador Aventureiro',
    class: 'Guerreiro',
    race: 'Humano',
    species: 'Humano',
    background: 'Soldado',
    subclass: 'Campeão',
    level: 5,
    strength: 18,
    dexterity: 14,
    constitution: 16,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
    armor_class: 18,
    hit_points: 44,
    speed: '9m (30ft)',
    concept: 'Ex-soldado da guarda real',
    clan: 'Ventrue',
    generation: '10ª',
    nature: 'Líder',
    demeanor: 'Nobre',
    humanity: 7,
    willpower: 6,
    role: 'Solo Mercenário'
  })

  // Toast temporário de rolagem de dado durante teste
  const [rollToast, setRollToast] = useState<{ title: string; result: string } | null>(null)

  const currentThemeId = sheetLayout.theme || 'dnd'
  const activeTheme = getSheetTheme(currentThemeId)
  const isDndTheme = activeTheme.variant === 'dnd'
  const isVampireTheme = activeTheme.variant === 'vampire'

  const updateSections = (newSections: SheetCustomSection[]): void => {
    onChangeLayout({
      ...sheetLayout,
      type: 'custom',
      theme: sheetLayout.theme || 'dnd',
      sections: newSections,
      modularSections: sheetLayout.modularSections || DEFAULT_MODULAR_SECTIONS
    })
  }

  const handleThemeChange = (newTheme: string): void => {
    onChangeLayout({
      ...sheetLayout,
      theme: newTheme
    })
  }

  // ── Ações de Redimensionamento Interativo Multidirecional via Mouse Drag ──
  const handleStartResize = (
    e: React.MouseEvent,
    type: 'section' | 'field',
    direction: 'horizontal' | 'vertical' | 'both',
    sectionIndex: number,
    fieldIndex?: number
  ): void => {
    e.preventDefault()
    e.stopPropagation()

    let containerWidth = 1000
    if (type === 'section') {
      const wrapper = (e.currentTarget.closest('.sections-wrapper') as HTMLElement) || document.body
      containerWidth = wrapper.getBoundingClientRect().width || 1000
    } else {
      const parentRow = (e.currentTarget.closest('.fields-wrapper') as HTMLElement) || document.body
      containerWidth = parentRow.getBoundingClientRect().width || 800
    }

    const currentSec = sections[sectionIndex]
    const currentField = fieldIndex !== undefined ? currentSec?.fields[fieldIndex] : undefined

    const startPercent =
      type === 'section'
        ? parseWidthPercent(currentSec?.width, currentSec?.customWidth)
        : parseWidthPercent(currentField?.width, currentField?.customWidth)

    // Mede a altura atual em tela
    const cardEl = e.currentTarget.closest(
      type === 'section' ? '.section-card-container' : '.field-card-container'
    ) as HTMLElement | null
    const elementHeight = cardEl
      ? cardEl.getBoundingClientRect().height
      : type === 'section'
        ? currentSec?.customHeight || 160
        : currentField?.customHeight || 60
    const startHeight = Math.round(elementHeight)

    setResizingTarget({
      type,
      direction,
      sectionIndex,
      fieldIndex,
      startX: e.clientX,
      startY: e.clientY,
      startPercent,
      startHeight,
      containerWidth,
      currentPercent: startPercent,
      currentHeight: startHeight,
      clientX: e.clientX,
      clientY: e.clientY
    })
  }

  const handleResetHeight = (
    type: 'section' | 'field',
    sectionIndex: number,
    fieldIndex?: number
  ): void => {
    const currentSecs = [...sections]
    if (type === 'section') {
      const updatedSec = { ...currentSecs[sectionIndex] }
      delete updatedSec.customHeight
      currentSecs[sectionIndex] = updatedSec
      updateSections(currentSecs)
    } else if (type === 'field' && fieldIndex !== undefined) {
      const secFields = [...currentSecs[sectionIndex].fields]
      const updatedField = { ...secFields[fieldIndex] }
      delete updatedField.customHeight
      secFields[fieldIndex] = updatedField
      currentSecs[sectionIndex] = {
        ...currentSecs[sectionIndex],
        fields: secFields
      }
      updateSections(currentSecs)
    }
  }

  // Listener global de mouse para arrastar e redimensionar suavemente em qualquer direção
  useEffect(() => {
    if (!resizingTarget) return

    const handleMouseMove = (e: MouseEvent): void => {
      e.preventDefault()
      const target = resizingTargetRef.current
      if (!target) return

      let newPercent = target.currentPercent
      let newHeight = target.currentHeight

      if (target.direction === 'horizontal' || target.direction === 'both') {
        const deltaX = e.clientX - target.startX
        const deltaPercent = (deltaX / target.containerWidth) * 100
        newPercent = Math.round(target.startPercent + deltaPercent)

        const minVal = target.type === 'section' ? 20 : 10
        newPercent = Math.min(100, Math.max(minVal, newPercent))

        // Snapping inteligente aos pontos notáveis (25%, 33%, 50%, 67%, 75%, 100%)
        if (Math.abs(newPercent - 25) <= 2) newPercent = 25
        else if (Math.abs(newPercent - 33.3) <= 2) newPercent = 33
        else if (Math.abs(newPercent - 50) <= 2) newPercent = 50
        else if (Math.abs(newPercent - 66.7) <= 2) newPercent = 67
        else if (Math.abs(newPercent - 75) <= 2) newPercent = 75
        else if (newPercent >= 97) newPercent = 100
      }

      if (target.direction === 'vertical' || target.direction === 'both') {
        const deltaY = e.clientY - target.startY
        newHeight = Math.round(target.startHeight + deltaY)
        const minHeight = target.type === 'section' ? 60 : 32
        const maxHeight = target.type === 'section' ? 1400 : 800
        newHeight = Math.min(maxHeight, Math.max(minHeight, newHeight))

        // Snapping suave para múltiplos de 10px
        const remainder = newHeight % 10
        if (remainder <= 2) newHeight -= remainder
        else if (remainder >= 8) newHeight += 10 - remainder
      }

      setResizingTarget((prev) =>
        prev
          ? {
              ...prev,
              currentPercent: newPercent,
              currentHeight: newHeight,
              clientX: e.clientX,
              clientY: e.clientY
            }
          : null
      )

      // Atualiza o estado da ficha em tempo real
      const currentSecs = sectionsRef.current
      if (target.type === 'section') {
        const updated = [...currentSecs]
        updated[target.sectionIndex] = {
          ...updated[target.sectionIndex],
          ...(target.direction !== 'vertical'
            ? { customWidth: newPercent, width: `${newPercent}%` }
            : {}),
          ...(target.direction !== 'horizontal'
            ? { customHeight: newHeight }
            : {})
        }
        updateSections(updated)
      } else if (target.type === 'field' && target.fieldIndex !== undefined) {
        const updated = [...currentSecs]
        const secFields = [...updated[target.sectionIndex].fields]
        secFields[target.fieldIndex] = {
          ...secFields[target.fieldIndex],
          ...(target.direction !== 'vertical'
            ? { customWidth: newPercent, width: `${newPercent}%` }
            : {}),
          ...(target.direction !== 'horizontal'
            ? { customHeight: newHeight }
            : {})
        }
        updated[target.sectionIndex] = {
          ...updated[target.sectionIndex],
          fields: secFields
        }
        updateSections(updated)
      }
    }

    const handleMouseUp = (): void => {
      setResizingTarget(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingTarget !== null])

  // ── Ações de Seção ──
  const handleAddSection = (): void => {
    const newSec: SheetCustomSection = {
      id: `sec-${uid()}`,
      title: 'Nova Seção',
      description: '',
      width: 'full',
      customWidth: 100,
      fields: []
    }
    const updated = [...sections, newSec]
    updateSections(updated)
  }

  const handleUpdateSection = (index: number, updatedSec: SheetCustomSection): void => {
    const updated = [...sections]
    updated[index] = updatedSec
    updateSections(updated)
  }

  const handleRemoveSection = (index: number): void => {
    if (sections.length <= 1) {
      alert('A ficha deve possuir pelo menos uma seção.')
      return
    }
    if (!confirm(`Remover a seção "${sections[index].title}" e todos os seus campos?`)) return
    const updated = sections.filter((_, i) => i !== index)
    updateSections(updated)
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down'): void => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sections.length) return
    const updated = [...sections]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)
    updateSections(updated)
  }

  // ── Ações de Campo ──
  const handleAddField = (sectionIndex: number): void => {
    const newField: SheetCustomField = {
      id: `f-${uid()}`,
      key: `campo_${uid().slice(0, 4)}`,
      label: 'Novo Campo',
      type: 'text',
      width: '1/2',
      customWidth: 50,
      placeholder: ''
    }
    const updated = [...sections]
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      fields: [...updated[sectionIndex].fields, newField]
    }
    updateSections(updated)
    setExpandedFieldSettingsId(newField.id)
  }

  const handleUpdateField = (
    sectionIndex: number,
    fieldIndex: number,
    updatedField: SheetCustomField
  ): void => {
    const updated = [...sections]
    const secFields = [...updated[sectionIndex].fields]
    secFields[fieldIndex] = updatedField
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      fields: secFields
    }
    updateSections(updated)
  }

  const handleRemoveField = (sectionIndex: number, fieldIndex: number): void => {
    const updated = [...sections]
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      fields: updated[sectionIndex].fields.filter((_, i) => i !== fieldIndex)
    }
    updateSections(updated)
  }

  const handleDuplicateField = (sectionIndex: number, fieldIndex: number): void => {
    const original = sections[sectionIndex].fields[fieldIndex]
    const duplicated: SheetCustomField = {
      ...original,
      id: `f-${uid()}`,
      key: `${original.key}_copy`,
      label: `${original.label} (Cópia)`
    }
    const updated = [...sections]
    const secFields = [...updated[sectionIndex].fields]
    secFields.splice(fieldIndex + 1, 0, duplicated)
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      fields: secFields
    }
    updateSections(updated)
  }

  const handleApplyPreset = (
    presetSections: SheetCustomSection[],
    newTheme: string,
    presetName: string
  ): void => {
    if (
      confirm(
        `Carregar o modelo oficial de ${presetName}? As seções e campos atuais serão substituídos pelo modelo oficial.`
      )
    ) {
      onChangeLayout({
        ...sheetLayout,
        type: 'custom',
        theme: newTheme,
        sections: presetSections,
        modularSections: sheetLayout.modularSections || DEFAULT_MODULAR_SECTIONS
      })
    }
  }

  // ── Drag & Drop Handlers para Campos na Grade Visual ──
  const handleFieldDragStart = (
    e: React.DragEvent,
    sectionIndex: number,
    fieldIndex: number,
    field: SheetCustomField
  ): void => {
    e.stopPropagation()
    setDraggedField({ sectionIndex, fieldIndex, fieldId: field.id })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ fromSec: sectionIndex, fromField: fieldIndex, fieldId: field.id })
    )
  }

  const handleFieldDragOver = (
    e: React.DragEvent,
    sectionIndex: number,
    fieldIndex: number
  ): void => {
    if (!draggedField) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    if (draggedField.sectionIndex === sectionIndex && draggedField.fieldIndex === fieldIndex) {
      return
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const position: 'before' | 'after' =
      e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'

    if (
      !dropFieldTarget ||
      dropFieldTarget.sectionIndex !== sectionIndex ||
      dropFieldTarget.fieldIndex !== fieldIndex ||
      dropFieldTarget.position !== position
    ) {
      setDropFieldTarget({ sectionIndex, fieldIndex, position })
    }
  }

  const handleFieldDrop = (
    e: React.DragEvent,
    targetSecIndex: number,
    targetFieldIndex: number
  ): void => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedField) return
    const fromSec = draggedField.sectionIndex
    const fromField = draggedField.fieldIndex

    if (fromSec === targetSecIndex && fromField === targetFieldIndex) {
      setDraggedField(null)
      setDropFieldTarget(null)
      return
    }

    const updatedSections = sections.map((s) => ({
      ...s,
      fields: [...s.fields]
    }))

    const [movedField] = updatedSections[fromSec].fields.splice(fromField, 1)

    let insertAt = targetFieldIndex
    if (dropFieldTarget?.position === 'after') {
      insertAt += 1
    }
    if (fromSec === targetSecIndex && fromField < insertAt) {
      insertAt -= 1
    }

    insertAt = Math.max(0, Math.min(insertAt, updatedSections[targetSecIndex].fields.length))
    updatedSections[targetSecIndex].fields.splice(insertAt, 0, movedField)

    updateSections(updatedSections)
    setDraggedField(null)
    setDropFieldTarget(null)
    setDragOverSectionIndex(null)
  }

  const handleSectionDrop = (e: React.DragEvent, targetSecIndex: number): void => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedField) {
      const fromSec = draggedField.sectionIndex
      const fromField = draggedField.fieldIndex
      if (fromSec !== targetSecIndex) {
        const updatedSections = sections.map((s) => ({ ...s, fields: [...s.fields] }))
        const [moved] = updatedSections[fromSec].fields.splice(fromField, 1)
        updatedSections[targetSecIndex].fields.push(moved)
        updateSections(updatedSections)
      }
      setDraggedField(null)
      setDropFieldTarget(null)
      setDragOverSectionIndex(null)
      return
    }

    if (draggedSectionIndex !== null && draggedSectionIndex !== targetSecIndex) {
      const updated = [...sections]
      const [movedSec] = updated.splice(draggedSectionIndex, 1)
      updated.splice(targetSecIndex, 0, movedSec)
      updateSections(updated)
      setDraggedSectionIndex(null)
      setDropSectionIndex(null)
    }
  }

  const handleDragEnd = (): void => {
    setDraggedField(null)
    setDropFieldTarget(null)
    setDragOverSectionIndex(null)
    setDraggedSectionIndex(null)
    setDropSectionIndex(null)
  }

  const triggerMockRoll = (label: string, val: string | number | boolean, formula?: string): void => {
    let result = ''
    if (activeTheme.variant === 'vampire') {
      const dice = Math.max(1, Number(val) || 1)
      const rolls = Array.from({ length: dice }, () => Math.floor(Math.random() * 10) + 1)
      const successes = rolls.filter((r) => r >= 6).length
      result = `${dice}d10 (dif 6) ➔ [${rolls.join(', ')}] : ${successes} Sucesso(s)!`
    } else {
      const num = Number(val) || 0
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + num
      result = `d20 (${d20}) ${num >= 0 ? `+${num}` : num} = ${total} (fórmula: ${formula || '1d20+mod'})`
    }
    setRollToast({
      title: `Teste: ${label}`,
      result
    })
    setTimeout(() => setRollToast(null), 3500)
  }

  const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* ── BARRA SUPERIOR UNIFICADA DE PERSONALIZAÇÃO & MODELOS ── */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor de Tema Visual em Tempo Real */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl shadow-inner">
            <Palette className="w-4 h-4 text-vtt-golden shrink-0" />
            <span className="text-xs font-bold text-neutral-300 whitespace-nowrap">
              Tema Visual:
            </span>
            <select
              value={currentThemeId}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 hover:border-vtt-golden rounded-lg text-xs font-bold text-vtt-golden py-1.5 px-2.5 outline-none focus:border-vtt-golden transition-colors cursor-pointer"
              title="Escolha o tema visual inspirado nas fichas oficiais"
            >
              {SHEET_THEME_LIST.map((th) => (
                <option
                  key={th.id}
                  value={th.id}
                  className="bg-neutral-900 text-neutral-100 font-normal"
                >
                  {th.icon} {th.name}
                </option>
              ))}
            </select>
          </div>

          {/* Alternador de Modo: Edição Direta vs Teste / Simulação */}
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setBuilderMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                builderMode === 'edit'
                  ? 'bg-vtt-golden text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Edite e organize os campos diretamente no layout da ficha"
            >
              <span>✏️ Modo Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setBuilderMode('test')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                builderMode === 'test'
                  ? 'bg-vtt-golden text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Simule o uso da ficha como jogador ou mestre em tempo real"
            >
              <Play className="w-3.5 h-3.5" />
              <span>🎲 Testar / Simular</span>
            </button>
          </div>

          <span className="text-xs text-neutral-400 pl-1 hidden lg:inline">
            <strong className="text-vtt-golden">{sections.length}</strong> seções •{' '}
            <strong className="text-vtt-golden">{totalFields}</strong> campos
          </span>
        </div>

        {/* Botões de Modelos Rápidos Oficiais */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyPreset(DEFAULT_CUSTOM_SHEET_SECTIONS, 'dnd', 'D&D 5e (2024)')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-stone-200 hover:text-white transition-colors cursor-pointer border border-neutral-700"
            title="Preencher com ficha oficial de D&D 2024 (Imagem 2)"
          >
            <span>⚔️</span>
            <span>D&D 5e</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(VAMPIRE_SHEET_SECTIONS, 'gothic', 'Vampiro: A Máscara')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors cursor-pointer border border-neutral-700"
            title="Preencher com ficha oficial de Vampiro: A Máscara (Imagem 1)"
          >
            <span>🦇</span>
            <span>Vampiro (VTM)</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(CYBERPUNK_SHEET_SECTIONS, 'cyberpunk', 'Cyberpunk RED')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-neutral-700"
            title="Preencher com ficha oficial de Cyberpunk RED"
          >
            <span>⚡</span>
            <span>Cyberpunk RED</span>
          </button>

          <button
            type="button"
            onClick={handleAddSection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-vtt-golden text-neutral-950 hover:bg-[#FBE8A6] transition-colors cursor-pointer shadow-md ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Seção</span>
          </button>
        </div>
      </div>

      {/* Pílulas de Seleção Rápida de Tema */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {SHEET_THEME_LIST.map((th) => (
          <button
            key={th.id}
            type="button"
            onClick={() => handleThemeChange(th.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
              currentThemeId === th.id
                ? 'bg-vtt-golden/20 text-vtt-golden border-vtt-golden shadow-sm'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <span>{th.icon}</span>
            <span>{th.name.split('/')[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* Toast flutuante de rolagem de teste */}
      {rollToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border-2 border-vtt-golden text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Dice5 className="w-6 h-6 text-vtt-golden animate-spin" />
          <div>
            <p className="text-xs font-bold text-vtt-golden uppercase">{rollToast.title}</p>
            <p className="text-sm font-mono font-bold text-white">{rollToast.result}</p>
          </div>
        </div>
      )}

      {/* Feedback Flutuante enquanto Redimensiona via Mouse Drag */}
      {resizingTarget && (
        <div
          className="fixed pointer-events-none z-50 bg-neutral-900/95 border-2 border-vtt-golden text-white px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md"
          style={{
            left: Math.min(window.innerWidth - 220, resizingTarget.clientX + 16),
            top: Math.max(16, resizingTarget.clientY - 36)
          }}
        >
          <Move className="w-3.5 h-3.5 text-vtt-golden shrink-0" />
          <span className="text-neutral-300">
            {resizingTarget.type === 'field' ? 'Campo:' : 'Seção:'}
          </span>
          <span className="text-vtt-golden font-black">
            {resizingTarget.direction !== 'vertical' && `L: ${resizingTarget.currentPercent}%`}
            {resizingTarget.direction === 'both' && ' × '}
            {resizingTarget.direction !== 'horizontal' && `A: ${resizingTarget.currentHeight}px`}
          </span>
        </div>
      )}

      {/* ── TELA PRINCIPAL: A FICHA VISUAL REAL EM TEMPO REAL ── */}
      <div
        className={`flex flex-col gap-6 max-w-6xl mx-auto w-full p-4 sm:p-6 rounded-3xl transition-all duration-300 shadow-2xl border ${
          builderMode === 'edit'
            ? 'ring-1 ring-vtt-golden/30'
            : ''
        } ${activeTheme.styles.wrapper}`}
      >
        {/* Banner do Tema Ativo */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeTheme.icon}</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-cinzel">
                {activeTheme.name}
              </span>
              <span className="text-[10px] font-mono ml-2 px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                {activeTheme.tag}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-neutral-400 font-sans italic hidden sm:inline">
            {builderMode === 'edit'
              ? '💡 Arraste o grip para mover ou puxe a borda direita para redimensionar livremente'
              : '🎮 Modo simulação ativado: interaja livremente com os campos'}
          </span>
        </div>

        {/* Ornamento do topo para Vampiro: A Máscara (Imagem 1) */}
        {isVampireTheme && (
          <div className="w-full">
            <VampireTopOrnament />
          </div>
        )}

        {/* ── CONTAINER FLEXÍVEL DE SEÇÕES (Permite seções lado a lado livremente) ── */}
        <div className="sections-wrapper flex flex-wrap gap-4 w-full items-start">
          {sections.map((section, secIdx) => {
            const isDragOverSec = dragOverSectionIndex === secIdx || dropSectionIndex === secIdx
            const isSecDragging = draggedSectionIndex === secIdx
            const secPercent = parseWidthPercent(section.width, section.customWidth)
            const sectionStyle = getSectionStyle(section.width, section.customWidth, section.customHeight)

            return (
              <div
                key={section.id}
                style={sectionStyle}
                onDragOver={(e) => {
                  if (draggedField || draggedSectionIndex !== null) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (draggedSectionIndex !== null && dropSectionIndex !== secIdx) {
                      setDropSectionIndex(secIdx)
                    } else if (draggedField && dragOverSectionIndex !== secIdx) {
                      setDragOverSectionIndex(secIdx)
                    }
                  }
                }}
                onDragLeave={() => {
                  if (dragOverSectionIndex === secIdx) setDragOverSectionIndex(null)
                  if (dropSectionIndex === secIdx) setDropSectionIndex(null)
                }}
                onDrop={(e) => handleSectionDrop(e, secIdx)}
                className={`transition-all duration-150 relative section-card-container flex flex-col justify-between ${
                  isSecDragging
                    ? 'opacity-40 border-dashed border-vtt-golden'
                    : isDragOverSec
                      ? 'ring-2 ring-vtt-golden/80 shadow-2xl'
                      : ''
                } ${activeTheme.styles.sectionCard}`}
              >
                {/* ── ALÇAS DE REDIMENSIONAMENTO MULTIDIRECIONAL DA SEÇÃO (LARGURA, ALTURA E CANTO) ── */}
                {builderMode === 'edit' && (
                  <>
                    {/* Alça Direita: Largura */}
                    <div
                      onMouseDown={(e) => handleStartResize(e, 'section', 'horizontal', secIdx)}
                      className="absolute top-0 right-0 bottom-4 w-3 cursor-col-resize hover:bg-vtt-golden/35 transition-colors z-30 flex items-center justify-center group/sec-resize-x select-none"
                      title="Arraste horizontalmente para redimensionar a largura desta seção"
                    >
                      <div className="w-1 h-12 rounded-full bg-neutral-500/40 group-hover/sec-resize-x:bg-vtt-golden group-hover/sec-resize-x:h-16 transition-all shadow" />
                    </div>

                    {/* Alça Inferior: Altura */}
                    <div
                      onMouseDown={(e) => handleStartResize(e, 'section', 'vertical', secIdx)}
                      onDoubleClick={() => handleResetHeight('section', secIdx)}
                      className="absolute bottom-0 left-0 right-4 h-3 cursor-row-resize hover:bg-vtt-golden/35 transition-colors z-30 flex items-center justify-center group/sec-resize-y select-none"
                      title="Arraste verticalmente para redimensionar a altura desta seção (duplo clique para restaurar automático)"
                    >
                      <div className="h-1 w-14 rounded-full bg-neutral-500/40 group-hover/sec-resize-y:bg-vtt-golden group-hover/sec-resize-y:w-20 transition-all shadow" />
                    </div>

                    {/* Alça Canto: Largura + Altura Simultâneas */}
                    <div
                      onMouseDown={(e) => handleStartResize(e, 'section', 'both', secIdx)}
                      onDoubleClick={() => handleResetHeight('section', secIdx)}
                      className="absolute bottom-0 right-0 w-4.5 h-4.5 cursor-se-resize hover:bg-vtt-golden/45 transition-colors z-30 flex items-end justify-end p-0.5 group/sec-resize-xy select-none rounded-br"
                      title="Arraste para redimensionar largura e altura desta seção simultaneamente (duplo clique para restaurar altura)"
                    >
                      <svg className="w-3 h-3 text-neutral-400 group-hover/sec-resize-xy:text-vtt-golden transition-colors" viewBox="0 0 10 10" fill="currentColor">
                        <circle cx="8" cy="8" r="1.3" />
                        <circle cx="4" cy="8" r="1.3" />
                        <circle cx="8" cy="4" r="1.3" />
                      </svg>
                    </div>
                  </>
                )}

                {/* Canto entalhado com rebite de D&D 2024 (Imagem 2) */}
                {isDndTheme && <DndScallopedCorner />}
                {isDndTheme && (
                  <div className="absolute inset-1.5 pointer-events-none border border-stone-300/80 rounded" />
                )}

                {/* ── CABEÇALHO DA SEÇÃO COM ESTILO TEMÁTICO & CONTROLES DE LARGURA ── */}
                {isVampireTheme ? (
                  <div className="w-full my-2">
                    <div className="flex items-center gap-2 sm:gap-3 w-full">
                      {/* Lança esquerda */}
                      <div className="flex-1 flex items-center">
                        <span className="w-2.5 h-2.5 rotate-45 bg-black shrink-0 shadow-sm" />
                        <div className="h-[2px] bg-black w-full" />
                      </div>

                      {/* Título Central com Controles de Edição */}
                      <div className="flex items-center gap-1.5 shrink-0 px-2">
                        {builderMode === 'edit' && (
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              setDraggedSectionIndex(secIdx)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={handleDragEnd}
                            className="cursor-grab active:cursor-grabbing p-1 rounded text-neutral-500 hover:text-black transition-colors"
                            title="Mover seção inteira"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}

                        {builderMode === 'edit' ? (
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) =>
                              handleUpdateSection(secIdx, { ...section, title: e.target.value })
                            }
                            placeholder="Nome da Seção..."
                            className="font-serif font-black text-xs sm:text-sm uppercase tracking-[0.25em] text-black outline-none border-b border-transparent hover:border-black/30 focus:border-black px-1 text-center"
                          />
                        ) : (
                          <h3 className="font-serif font-black text-xs sm:text-sm uppercase tracking-[0.25em] text-black text-center">
                            {section.title}
                          </h3>
                        )}
                      </div>

                      {/* Lança direita */}
                      <div className="flex-1 flex items-center">
                        <div className="h-[2px] bg-black w-full" />
                        <span className="w-2.5 h-2.5 rotate-45 bg-black shrink-0 shadow-sm" />
                      </div>

                      {/* Botões do Modo Editor */}
                      {builderMode === 'edit' && (
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {/* Indicador de dimensões da seção */}
                          <div className="flex items-center gap-1 bg-black/10 rounded px-1.5 py-0.5 text-[9px] font-mono">
                            <span className="text-black font-bold select-none" title="Dimensões da seção (redimensione pelas bordas ou cantos)">
                              {secPercent}%{section.customHeight ? ` × ${section.customHeight}px` : ''}
                            </span>
                            {section.customHeight && (
                              <button
                                type="button"
                                onClick={() => handleResetHeight('section', secIdx)}
                                className="text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                                title="Restaurar altura automática"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddField(secIdx)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[11px] font-serif font-black uppercase hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Adicionar campo"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Campo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(secIdx)}
                            className="p-1 text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
                            title="Remover seção"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={activeTheme.styles.sectionHeader}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Handle para arrastar a seção inteira no modo editor */}
                      {builderMode === 'edit' && (
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            setDraggedSectionIndex(secIdx)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing p-1 rounded text-neutral-400 hover:text-white transition-colors select-none"
                          title="Arraste para mover esta seção inteira para cima ou para baixo"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}

                      <span className={activeTheme.styles.sectionBullet} />

                      {/* Nome da Seção Editável em Tempo Real */}
                      {builderMode === 'edit' ? (
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) =>
                            handleUpdateSection(secIdx, { ...section, title: e.target.value })
                          }
                          placeholder="Nome da Seção..."
                          className="bg-transparent text-inherit font-inherit text-sm sm:text-base font-bold outline-none border-b border-transparent hover:border-white/30 focus:border-white transition-colors px-1 flex-1 max-w-sm"
                        />
                      ) : (
                        <h3 className={activeTheme.styles.sectionTitle}>{section.title}</h3>
                      )}

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-neutral-300">
                        {section.fields.length} campos
                      </span>
                    </div>

                    {/* Controles da Seção no Modo Edição */}
                    {builderMode === 'edit' ? (
                      <div className="flex items-center gap-1">
                        {/* Indicador de Dimensões da Seção */}
                        <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-0.5 border border-white/10 text-[9px] font-mono">
                          <span className="text-vtt-golden font-bold select-none" title="Dimensões da seção (redimensione pelas bordas ou cantos)">
                            {secPercent}%{section.customHeight ? ` × ${section.customHeight}px` : ''}
                          </span>
                          {section.customHeight && (
                            <button
                              type="button"
                              onClick={() => handleResetHeight('section', secIdx)}
                              className="text-neutral-400 hover:text-vtt-golden p-0.5 cursor-pointer transition-colors"
                              title="Restaurar altura automática"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={secIdx === 0}
                          onClick={() => handleMoveSection(secIdx, 'up')}
                          className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Mover seção para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={secIdx === sections.length - 1}
                          onClick={() => handleMoveSection(secIdx, 'down')}
                          className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Mover seção para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddField(secIdx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 text-white text-xs font-semibold border border-white/20 ml-1 cursor-pointer transition-colors"
                          title="Adicionar campo a esta seção"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Campo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveSection(secIdx)}
                          className="p-1.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1 cursor-pointer"
                          title="Excluir seção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      activeTheme.styles.techTag && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded opacity-80 ${activeTheme.styles.badge}`}>
                          {activeTheme.styles.techTag}
                        </span>
                      )
                    )}
                  </div>
                )}

                {/* Descrição Opcional da Seção */}
                {builderMode === 'edit' ? (
                  <input
                    type="text"
                    value={section.description || ''}
                    onChange={(e) =>
                      handleUpdateSection(secIdx, { ...section, description: e.target.value })
                    }
                    placeholder="Subtítulo ou instruções da seção (opcional)..."
                    className="w-full bg-transparent text-xs text-neutral-400 outline-none border-b border-transparent hover:border-white/20 focus:border-white/40 px-1 py-0.5 mb-2 italic"
                  />
                ) : (
                  section.description && !isVampireTheme && (
                    <p className={activeTheme.styles.sectionDesc}>{section.description}</p>
                  )
                )}

                {/* ── GRADE FLEXÍVEL DE CAMPOS (Com Redimensionamento Livre) ── */}
                {section.fields.length === 0 ? (
                  <div
                    onDragOver={(e) => {
                      if (draggedField) {
                        e.preventDefault()
                        e.stopPropagation()
                        setDragOverSectionIndex(secIdx)
                      }
                    }}
                    onDrop={(e) => handleSectionDrop(e, secIdx)}
                    className="text-center py-8 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center gap-2 text-xs text-neutral-400 my-2 w-full"
                  >
                    <LayoutGrid className="w-6 h-6 text-neutral-500" />
                    <p>Esta seção está vazia.</p>
                    <p className="text-[11px] text-neutral-500">
                      Arraste campos de outra seção para cá ou adicione um novo campo abaixo.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddField(secIdx)}
                      className="text-xs text-vtt-golden hover:underline font-bold cursor-pointer mt-1"
                    >
                      + Adicionar primeiro campo
                    </button>
                  </div>
                ) : (
                  <div className="fields-wrapper flex flex-wrap gap-3 mt-2 items-start w-full">
                    {section.fields.map((field, fieldIdx) => {
                      const fieldPercent = parseWidthPercent(field.width, field.customWidth)
                      const fieldStyle = getFieldStyle(field.width, field.customWidth, field.customHeight)
                      const isSettingsOpen = expandedFieldSettingsId === field.id
                      const isThisDragging =
                        draggedField?.sectionIndex === secIdx &&
                        draggedField?.fieldIndex === fieldIdx
                      const isDropTargetBefore =
                        dropFieldTarget?.sectionIndex === secIdx &&
                        dropFieldTarget?.fieldIndex === fieldIdx &&
                        dropFieldTarget?.position === 'before'
                      const isDropTargetAfter =
                        dropFieldTarget?.sectionIndex === secIdx &&
                        dropFieldTarget?.fieldIndex === fieldIdx &&
                        dropFieldTarget?.position === 'after'

                      const rawVal = previewValues[field.key]
                      const val =
                        rawVal !== undefined
                          ? rawVal
                          : field.defaultValue !== undefined
                            ? field.defaultValue
                            : ''

                      // Características com trilha de pontos de Vampiro: A Máscara
                      const isVtmDotField =
                        isVampireTheme &&
                        (field.type === 'number' ||
                          Boolean(field.isModifier) ||
                          (typeof field.defaultValue === 'number' && field.defaultValue <= 8))

                      // Atributos de D&D com Modificador e Caixa Oficial
                      const isDndScoreBox = isDndTheme && field.type === 'number' && Boolean(field.isModifier)

                      return (
                        <React.Fragment key={field.id}>
                          {/* Linha Indicadora de Drop (Antes) */}
                          {isDropTargetBefore && (
                            <div className="w-full h-1 bg-vtt-golden rounded-full shadow-[0_0_10px_rgba(233,209,128,0.9)] animate-pulse my-0.5" />
                          )}

                          <div
                            style={fieldStyle}
                            onDragOver={(e) => handleFieldDragOver(e, secIdx, fieldIdx)}
                            onDrop={(e) => handleFieldDrop(e, secIdx, fieldIdx)}
                            className={`flex flex-col gap-1 transition-all duration-150 relative field-card-container ${
                              isThisDragging
                                ? 'opacity-35 border-dashed border-vtt-golden scale-[0.98]'
                                : ''
                            } ${activeTheme.styles.fieldCard}`}
                          >
                            {/* ── ALÇAS DE REDIMENSIONAMENTO MULTIDIRECIONAL DO CAMPO (LARGURA, ALTURA E CANTO) ── */}
                            {builderMode === 'edit' && (
                              <>
                                {/* Alça Direita: Largura */}
                                <div
                                  onMouseDown={(e) => handleStartResize(e, 'field', 'horizontal', secIdx, fieldIdx)}
                                  className="absolute top-0 right-0 bottom-3 w-2.5 cursor-col-resize hover:bg-vtt-golden/40 transition-colors z-30 flex items-center justify-center group/field-resize-x select-none"
                                  title="Arraste horizontalmente para redimensionar a largura deste campo"
                                >
                                  <div className="w-1 h-7 rounded-full bg-neutral-500/30 group-hover/field-resize-x:bg-vtt-golden group-hover/field-resize-x:h-10 transition-all shadow-sm" />
                                </div>

                                {/* Alça Inferior: Altura */}
                                <div
                                  onMouseDown={(e) => handleStartResize(e, 'field', 'vertical', secIdx, fieldIdx)}
                                  onDoubleClick={() => handleResetHeight('field', secIdx, fieldIdx)}
                                  className="absolute bottom-0 left-0 right-3 h-2.5 cursor-row-resize hover:bg-vtt-golden/40 transition-colors z-30 flex items-center justify-center group/field-resize-y select-none"
                                  title="Arraste verticalmente para redimensionar a altura deste campo (duplo clique para restaurar automático)"
                                >
                                  <div className="h-1 w-8 rounded-full bg-neutral-500/30 group-hover/field-resize-y:bg-vtt-golden group-hover/field-resize-y:w-12 transition-all shadow-sm" />
                                </div>

                                {/* Alça Canto: Largura + Altura Simultâneas */}
                                <div
                                  onMouseDown={(e) => handleStartResize(e, 'field', 'both', secIdx, fieldIdx)}
                                  onDoubleClick={() => handleResetHeight('field', secIdx, fieldIdx)}
                                  className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize hover:bg-vtt-golden/50 transition-colors z-30 flex items-end justify-end p-0.5 group/field-resize-xy select-none rounded-br"
                                  title="Arraste para redimensionar largura e altura livremente (duplo clique para restaurar altura)"
                                >
                                  <svg className="w-2.5 h-2.5 text-neutral-400 group-hover/field-resize-xy:text-vtt-golden transition-colors" viewBox="0 0 10 10" fill="currentColor">
                                    <circle cx="8" cy="8" r="1.2" />
                                    <circle cx="4" cy="8" r="1.2" />
                                    <circle cx="8" cy="4" r="1.2" />
                                  </svg>
                                </div>
                              </>
                            )}

                            {/* ── BARRA DE CONTROLES DO CAMPO NO MODO EDITOR ── */}
                            {builderMode === 'edit' && (
                              <div className="flex items-center justify-between gap-1 pb-1 border-b border-black/10 dark:border-white/10 mb-0.5">
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  {/* Grip de arraste do campo */}
                                  <div
                                    draggable
                                    onDragStart={(e) =>
                                      handleFieldDragStart(e, secIdx, fieldIdx, field)
                                    }
                                    onDragEnd={handleDragEnd}
                                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-400 hover:text-vtt-golden rounded hover:bg-black/10 transition-colors select-none"
                                    title="Arraste para reposicionar este campo na grade"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  {/* Indicador de Dimensões do Campo */}
                                  <div className="flex items-center gap-1 bg-black/20 dark:bg-black/40 rounded px-1.5 py-0.5 border border-white/10 text-[9px] font-mono select-none">
                                    <span className="text-vtt-golden font-bold" title="Dimensões do campo (redimensione pelas bordas ou cantos)">
                                      {fieldPercent}%{field.customHeight ? ` × ${field.customHeight}px` : ''}
                                    </span>
                                    {field.customHeight && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetHeight('field', secIdx, fieldIdx)}
                                        className="text-neutral-400 hover:text-vtt-golden p-0.5 cursor-pointer transition-colors"
                                        title="Restaurar altura automática"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Tipo do Campo Dropdown Rápido */}
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as SheetCustomField['type']
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        type: newType,
                                        referenceType:
                                          newType === 'reference' ? field.referenceType || 'class' : undefined
                                      })
                                    }}
                                    className="bg-black/20 dark:bg-black/40 text-[10px] text-neutral-700 dark:text-neutral-300 rounded px-1.5 py-0.5 border border-black/10 dark:border-white/10 outline-none cursor-pointer"
                                    title="Tipo de campo"
                                  >
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="reference">Referência</option>
                                    <option value="select">Select</option>
                                    <option value="textarea">Área Texto</option>
                                    <option value="checkbox">Checkbox</option>
                                  </select>

                                  {/* Engrenagem de Configurações Avançadas */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedFieldSettingsId(
                                        isSettingsOpen ? null : field.id
                                      )
                                    }
                                    className={`p-1 rounded cursor-pointer transition-colors ${
                                      isSettingsOpen
                                        ? 'bg-vtt-golden text-neutral-950 font-bold'
                                        : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/10'
                                    }`}
                                    title="Configurações avançadas do campo"
                                  >
                                    <Settings2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Duplicar Campo */}
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateField(secIdx, fieldIdx)}
                                    className="p-1 rounded text-neutral-400 hover:text-vtt-golden hover:bg-black/10 transition-colors cursor-pointer"
                                    title="Duplicar campo"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Excluir Campo */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveField(secIdx, fieldIdx)}
                                    className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-black/10 transition-colors cursor-pointer"
                                    title="Excluir campo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── GAVETA DE CONFIGURAÇÕES AVANÇADAS DO CAMPO (QUANDO ABERTA) ── */}
                            {builderMode === 'edit' && isSettingsOpen && (
                              <div className="bg-black/85 text-white border border-white/20 rounded-lg p-2.5 my-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] animate-fadeIn z-20">
                                {/* Slider de Largura Livre */}
                                <div className="bg-neutral-900/90 p-2 rounded-lg border border-white/10">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] uppercase font-bold text-neutral-300">
                                      Largura Livre
                                    </span>
                                    <span className="text-xs font-mono font-bold text-vtt-golden">
                                      {fieldPercent}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="1"
                                    value={fieldPercent}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        customWidth: Number(e.target.value),
                                        width: `${e.target.value}%`
                                      })
                                    }
                                    className="w-full accent-vtt-golden cursor-pointer"
                                  />
                                </div>

                                {/* Controle de Altura Livre */}
                                <div className="bg-neutral-900/90 p-2 rounded-lg border border-white/10 flex flex-col justify-between">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] uppercase font-bold text-neutral-300">
                                      Altura em Pixels
                                    </span>
                                    {field.customHeight && (
                                      <button
                                        type="button"
                                        onClick={() => handleResetHeight('field', secIdx, fieldIdx)}
                                        className="text-[10px] text-vtt-golden hover:underline font-bold cursor-pointer"
                                      >
                                        Auto
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="number"
                                    min="30"
                                    max="800"
                                    placeholder="Automática"
                                    value={field.customHeight || ''}
                                    onChange={(e) => {
                                      const hVal = e.target.value === '' ? undefined : Number(e.target.value)
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        customHeight: hVal
                                      })
                                    }}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono outline-none"
                                  />
                                </div>

                                <div>
                                  <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">
                                    Identificador (Key)
                                  </span>
                                  <input
                                    type="text"
                                    value={field.key}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        key: slugify(e.target.value)
                                      })
                                    }
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono text-xs outline-none"
                                  />
                                </div>

                                <div>
                                  <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">
                                    Dica / Placeholder
                                  </span>
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        placeholder: e.target.value
                                      })
                                    }
                                    placeholder="Ex: 9m, Neutro Bom..."
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs outline-none"
                                  />
                                </div>

                                {field.type === 'reference' && (
                                  <div className="sm:col-span-2">
                                    <span className="text-[9px] uppercase font-bold text-vtt-golden block mb-0.5">
                                      Conteúdo do Sistema Referenciado
                                    </span>
                                    <select
                                      value={field.referenceType || 'class'}
                                      onChange={(e) =>
                                        handleUpdateField(secIdx, fieldIdx, {
                                          ...field,
                                          referenceType: e.target.value as ContentType
                                        })
                                      }
                                      className="w-full bg-neutral-900 border border-vtt-golden/40 rounded px-2 py-1 text-vtt-golden font-bold text-xs outline-none cursor-pointer"
                                    >
                                      {CONTENT_TYPE_LIST.map((ct) => (
                                        <option key={ct.value} value={ct.value}>
                                          {ct.emoji} {ct.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {field.type === 'select' && (
                                  <div className="sm:col-span-2">
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">
                                      Opções Fixas (separadas por vírgula)
                                    </span>
                                    <input
                                      type="text"
                                      value={(field.options || []).join(', ')}
                                      onChange={(e) =>
                                        handleUpdateField(secIdx, fieldIdx, {
                                          ...field,
                                          options: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter(Boolean)
                                        })
                                      }
                                      placeholder="Opção 1, Opção 2, Opção 3..."
                                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs outline-none"
                                    />
                                  </div>
                                )}

                                <div className="sm:col-span-2 flex items-center justify-between pt-1 border-t border-white/10">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(field.isModifier)}
                                      onChange={(e) =>
                                        handleUpdateField(secIdx, fieldIdx, {
                                          ...field,
                                          isModifier: e.target.checked
                                        })
                                      }
                                      className="accent-vtt-golden w-3.5 h-3.5 rounded"
                                    />
                                    <span className="text-neutral-300">
                                      Permitir rolagem de teste com <strong>d20</strong>
                                    </span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedFieldSettingsId(null)}
                                    className="text-xs text-vtt-golden hover:underline font-bold"
                                  >
                                    Fechar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── 1. RENDERIZAÇÃO VAMPIRO (VTM - Imagem 1) ── */}
                            {isVtmDotField ? (
                              <div className="flex items-center w-full">
                                <VampireDotTrack
                                  label={field.label}
                                  value={typeof val === 'number' ? val : Number(val) || 0}
                                  maxDots={8}
                                  minDots={0}
                                  canEdit={true}
                                  isBuilderMode={true}
                                  onChangeValue={(newVal) =>
                                    setPreviewValues((prev) => ({ ...prev, [field.key]: newVal }))
                                  }
                                  onRoll={(lbl, pool) => triggerMockRoll(lbl, pool, `${pool}d10`)}
                                />
                              </div>
                            ) : isVampireTheme && (field.type === 'text' || field.type === 'reference') ? (
                              <div className="flex items-baseline gap-2 w-full py-0.5">
                                {builderMode === 'edit' ? (
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        label: e.target.value
                                      })
                                    }
                                    className="font-serif font-black text-xs text-black uppercase tracking-wider outline-none border-b border-transparent hover:border-black/30 focus:border-black max-w-[120px]"
                                  />
                                ) : (
                                  <span className="font-serif font-black text-xs text-black uppercase tracking-wider shrink-0">
                                    {field.label}:
                                  </span>
                                )}
                                <input
                                  type="text"
                                  value={String(val)}
                                  onChange={(e) =>
                                    setPreviewValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                  }
                                  placeholder={field.placeholder || ''}
                                  className="flex-1 bg-[#eef2ff]/75 border-b border-black text-black font-serif text-xs font-bold outline-none px-2 py-0.5 focus:bg-[#e0e7ff] transition-colors"
                                />
                              </div>
                            ) : isDndScoreBox ? (
                              /* ── 2. RENDERIZAÇÃO D&D ABILITY BOX (Imagem 2) ── */
                              <DndAbilityBox
                                label={field.label}
                                score={typeof val === 'number' ? val : Number(val) || 10}
                                canEdit={true}
                                isBuilderMode={true}
                                onChangeScore={(newScore) =>
                                  setPreviewValues((prev) => ({ ...prev, [field.key]: newScore }))
                                }
                                onRoll={(lbl, mod) => {
                                  const sign = mod >= 0 ? `+${mod}` : `${mod}`
                                  triggerMockRoll(lbl, mod, `1d20${sign}`)
                                }}
                              />
                            ) : isDndTheme ? (
                              /* ── 3. RENDERIZAÇÃO D&D COM LINHA DE BASE PURA (Imagem 2) ── */
                              <div className="flex flex-col justify-end w-full py-0.5">
                                {/* Rótulo superior com caixa alta espaçada clássica da Imagem 2 */}
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  {builderMode === 'edit' ? (
                                    <input
                                      type="text"
                                      value={field.label}
                                      onChange={(e) =>
                                        handleUpdateField(secIdx, fieldIdx, {
                                          ...field,
                                          label: e.target.value
                                        })
                                      }
                                      className="text-[10px] font-bold text-stone-700 font-sans tracking-[0.2em] uppercase outline-none border-b border-transparent hover:border-stone-400 focus:border-stone-800 transition-colors"
                                    />
                                  ) : (
                                    <label className="text-[10px] font-bold text-stone-700 font-sans tracking-[0.2em] uppercase select-none truncate">
                                      {field.label}
                                    </label>
                                  )}
                                </div>

                                {/* Input sem caixa, com linha de base nítida e tipografia de ficha */}
                                {field.type === 'textarea' ? (
                                  <textarea
                                    rows={2}
                                    value={String(val)}
                                    onChange={(e) =>
                                      setPreviewValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    placeholder={field.placeholder || `Anotações de ${field.label}...`}
                                    className={`w-full bg-[#fdfcf9] border border-stone-400 rounded-sm p-2 text-xs font-serif text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-800 resize-none leading-6 [background-image:repeating-linear-gradient(transparent,transparent_23px,#e7e5e4_24px)] transition-all ${
                                      field.customHeight ? 'flex-1' : ''
                                    }`}
                                    style={{
                                      height: field.customHeight ? `${Math.max(48, field.customHeight - 44)}px` : undefined
                                    }}
                                  />
                                ) : field.type === 'select' ? (
                                  <select
                                    value={String(val)}
                                    onChange={(e) =>
                                      setPreviewValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    className="w-full bg-transparent border-0 border-b-[1.5px] border-stone-400 text-stone-900 font-serif text-xs font-semibold outline-none py-1 focus:border-stone-800 cursor-pointer transition-colors"
                                  >
                                    <option value="">Selecione...</option>
                                    {(field.options || ['Opção 1', 'Opção 2']).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.type === 'checkbox' ? (
                                  <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(val)}
                                      onChange={(e) =>
                                        setPreviewValues((prev) => ({
                                          ...prev,
                                          [field.key]: e.target.checked
                                        }))
                                      }
                                      className="w-4 h-4 rounded cursor-pointer accent-stone-700"
                                    />
                                    <span className="text-xs text-stone-800 font-sans font-semibold tracking-wide">
                                      {val ? 'Sim' : 'Não'}
                                    </span>
                                  </label>
                                ) : (
                                  <input
                                    type={field.type === 'number' ? 'number' : 'text'}
                                    value={typeof val === 'boolean' ? '' : val}
                                    onChange={(e) => {
                                      const v = field.type === 'number'
                                        ? (e.target.value === '' ? '' : Number(e.target.value))
                                        : e.target.value
                                      setPreviewValues((prev) => ({ ...prev, [field.key]: v }))
                                    }}
                                    placeholder={field.placeholder || ''}
                                    className="w-full bg-transparent border-0 border-b-[1.5px] border-stone-400 text-stone-900 font-serif text-sm font-semibold outline-none py-1 focus:border-stone-800 transition-colors"
                                  />
                                )}
                              </div>
                            ) : (
                              /* ── 4. RENDERIZAÇÃO PADRÃO / CYBERPUNK ── */
                              <>
                                <div className="flex items-center justify-between gap-1">
                                  {builderMode === 'edit' ? (
                                    <input
                                      type="text"
                                      value={field.label}
                                      onChange={(e) => {
                                        const newLabel = e.target.value
                                        handleUpdateField(secIdx, fieldIdx, {
                                          ...field,
                                          label: newLabel,
                                          key:
                                            !field.key || field.key.startsWith('campo_')
                                              ? slugify(newLabel)
                                              : field.key
                                        })
                                      }}
                                      placeholder="Rótulo do Campo..."
                                      className={`bg-transparent outline-none border-b border-transparent hover:border-white/30 focus:border-white transition-colors px-0.5 flex-1 ${activeTheme.styles.fieldLabel}`}
                                    />
                                  ) : (
                                    <label className={activeTheme.styles.fieldLabel} title={field.label}>
                                      {field.label}
                                    </label>
                                  )}

                                  {field.isModifier && (
                                    <button
                                      type="button"
                                      onClick={() => triggerMockRoll(field.label, val, field.formula)}
                                      className={activeTheme.styles.rollButton}
                                      title={`Rolar teste com d20 para ${field.label}`}
                                    >
                                      <Dice5 className="w-3 h-3" />
                                      <span>d20</span>
                                    </button>
                                  )}
                                </div>

                                {field.type === 'textarea' ? (
                                  <textarea
                                    rows={2}
                                    value={String(val)}
                                    onChange={(e) =>
                                      setPreviewValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    placeholder={field.placeholder || `Digite ${field.label}...`}
                                    className={`w-full ${activeTheme.styles.textarea} ${field.customHeight ? 'flex-1' : ''}`}
                                    style={{
                                      height: field.customHeight ? `${Math.max(48, field.customHeight - 44)}px` : undefined
                                    }}
                                  />
                                ) : field.type === 'number' ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={val === '' ? '' : Number(val)}
                                      onChange={(e) => {
                                        const n = e.target.value === '' ? '' : Number(e.target.value)
                                        setPreviewValues((prev) => ({ ...prev, [field.key]: n }))
                                      }}
                                      placeholder={field.placeholder || '0'}
                                      className={activeTheme.styles.input}
                                    />
                                    {field.isModifier && typeof val === 'number' && (
                                      <span className={activeTheme.styles.modifierChip}>
                                        {val >= 0 ? `+${val}` : `${val}`}
                                      </span>
                                    )}
                                  </div>
                                ) : field.type === 'checkbox' ? (
                                  <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(val)}
                                      onChange={(e) =>
                                        setPreviewValues((prev) => ({
                                          ...prev,
                                          [field.key]: e.target.checked
                                        }))
                                      }
                                      className={`w-4 h-4 rounded cursor-pointer ${activeTheme.styles.checkboxAccent}`}
                                    />
                                    <span className={activeTheme.styles.checkboxText}>
                                      {val ? 'Sim / Ativado' : 'Não / Desativado'}
                                    </span>
                                  </label>
                                ) : field.type === 'select' ? (
                                  <select
                                    value={String(val)}
                                    onChange={(e) =>
                                      setPreviewValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    className={activeTheme.styles.select}
                                  >
                                    <option value="">Selecione...</option>
                                    {(field.options || ['Opção 1', 'Opção 2']).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={String(val)}
                                    onChange={(e) =>
                                      setPreviewValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    placeholder={field.placeholder || `Digite ${field.label}...`}
                                    className={activeTheme.styles.input}
                                  />
                                )}
                              </>
                            )}
                          </div>

                          {/* Linha Indicadora de Drop (Depois) */}
                          {isDropTargetAfter && (
                            <div className="w-full h-1 bg-vtt-golden rounded-full shadow-[0_0_10px_rgba(233,209,128,0.9)] animate-pulse my-0.5" />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
