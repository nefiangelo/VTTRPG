import React, { useState } from 'react'
import type {
  SheetLayoutConfig,
  SheetCustomSection,
  SheetCustomField,
  SheetFieldWidth,
  ContentType
} from '../../../../preload/index.d'
import {
  CONTENT_TYPE_LIST,
  DEFAULT_CUSTOM_SHEET_SECTIONS,
  DEFAULT_MODULAR_SECTIONS
} from '../../utils/contentPresets'
import { WIDTH_OPTIONS, getWidthColClass } from '../../utils/sheetLayoutUtils'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  Edit3,
  LayoutGrid,
  Dice5,
  Sparkles
} from 'lucide-react'

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

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>(() =>
    sections.map((s) => s.id)
  )
  const [expandedFieldIds, setExpandedFieldIds] = useState<string[]>([])

  const updateSections = (newSections: SheetCustomSection[]): void => {
    onChangeLayout({
      ...sheetLayout,
      type: 'custom',
      sections: newSections,
      modularSections: sheetLayout.modularSections || DEFAULT_MODULAR_SECTIONS
    })
  }

  const toggleSectionExpand = (secId: string): void => {
    setExpandedSectionIds((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
    )
  }

  const toggleFieldExpand = (fId: string): void => {
    setExpandedFieldIds((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    )
  }

  // ── Ações de Seção ──
  const handleAddSection = (): void => {
    const newSec: SheetCustomSection = {
      id: `sec-${uid()}`,
      title: 'Nova Seção',
      description: 'Descrição ou orientações da seção',
      fields: []
    }
    const updated = [...sections, newSec]
    updateSections(updated)
    setExpandedSectionIds((prev) => [...prev, newSec.id])
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
      placeholder: ''
    }
    const updated = [...sections]
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      fields: [...updated[sectionIndex].fields, newField]
    }
    updateSections(updated)
    setExpandedFieldIds((prev) => [...prev, newField.id])
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
    setExpandedFieldIds((prev) => [...prev, duplicated.id])
  }

  const handleMoveField = (
    sectionIndex: number,
    fieldIndex: number,
    direction: 'up' | 'down'
  ): void => {
    const sec = sections[sectionIndex]
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1
    if (targetIndex < 0 || targetIndex >= sec.fields.length) return
    const updatedFields = [...sec.fields]
    const [moved] = updatedFields.splice(fieldIndex, 1)
    updatedFields.splice(targetIndex, 0, moved)
    const updated = [...sections]
    updated[sectionIndex] = { ...sec, fields: updatedFields }
    updateSections(updated)
  }

  const handleMoveFieldToSection = (
    fromSecIndex: number,
    fieldIndex: number,
    toSecIndex: number
  ): void => {
    if (fromSecIndex === toSecIndex) return
    const updated = [...sections]
    const [moved] = updated[fromSecIndex].fields.splice(fieldIndex, 1)
    updated[toSecIndex].fields.push(moved)
    updateSections(updated)
  }

  const handleApplyDefaultPreset = (): void => {
    if (
      confirm(
        'Deseja carregar o modelo padrão com organização completa de campos (Nome, Jogador, Classe, Raça, Atributos, CA, etc.)? As alterações atuais serão substituídas.'
      )
    ) {
      updateSections(DEFAULT_CUSTOM_SHEET_SECTIONS)
    }
  }

  const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* ── BARRA DE CONTROLE PRINCIPAL ── */}
      <div className="bg-vtt-dark border border-vtt-dark-gray rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Botão de Abas: Editor vs Pré-visualização */}
          <div className="flex items-center bg-vtt-dark-gray/60 p-1 rounded-lg border border-vtt-dark-gray">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-vtt-golden text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor de Estrutura</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-vtt-golden text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pré-visualização da Ficha</span>
            </button>
          </div>

          <span className="text-xs text-neutral-400 pl-2">
            <strong className="text-vtt-golden">{sections.length}</strong> seções •{' '}
            <strong className="text-vtt-golden">{totalFields}</strong> campos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyDefaultPreset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-vtt-dark-gray hover:bg-neutral-700 text-vtt-golden transition-colors cursor-pointer border border-vtt-light-gray/20"
            title="Preencher com estrutura padrão para RPGs d20 (D&D / Tormenta)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Modelo Padrão</span>
          </button>

          {activeTab === 'editor' && (
            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-vtt-golden text-neutral-950 hover:bg-[#FBE8A6] transition-colors cursor-pointer shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Seção</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MODO 1: EDITOR DE ESTRUTURA E CAMPOS ── */}
      {activeTab === 'editor' && (
        <div className="flex flex-col gap-4">
          {sections.map((section, secIdx) => {
            const isSecExpanded = expandedSectionIds.includes(section.id)

            return (
              <div
                key={section.id}
                className="bg-vtt-dark border border-vtt-dark-gray rounded-xl overflow-hidden shadow-sm"
              >
                {/* Cabeçalho da Seção */}
                <div className="bg-gradient-to-r from-neutral-900 to-vtt-dark-gray/50 px-4 py-3 border-b border-vtt-dark-gray flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSectionExpand(section.id)}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title={isSecExpanded ? 'Recolher seção' : 'Expandir seção'}
                    >
                      {isSecExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        handleUpdateSection(secIdx, { ...section, title: e.target.value })
                      }
                      placeholder="Nome da Seção (ex: Informações Gerais)"
                      className="bg-transparent text-white font-cinzel font-bold text-sm outline-none border-b border-transparent hover:border-neutral-600 focus:border-vtt-golden transition-colors px-1 flex-1 max-w-sm"
                    />

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-neutral-400 font-mono">
                      {section.fields.length} campos
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Mover Seção para Cima/Baixo */}
                    <button
                      type="button"
                      disabled={secIdx === 0}
                      onClick={() => handleMoveSection(secIdx, 'up')}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                      title="Mover seção para cima"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={secIdx === sections.length - 1}
                      onClick={() => handleMoveSection(secIdx, 'down')}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                      title="Mover seção para baixo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Adicionar Campo */}
                    <button
                      type="button"
                      onClick={() => handleAddField(secIdx)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-vtt-golden/10 hover:bg-vtt-golden/20 text-vtt-golden text-xs font-semibold border border-vtt-golden/30 ml-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Campo</span>
                    </button>

                    {/* Remover Seção */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(secIdx)}
                      className="p-1.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors ml-1 cursor-pointer"
                      title="Remover seção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Conteúdo da Seção (Lista de Campos) */}
                {isSecExpanded && (
                  <div className="p-4 flex flex-col gap-3">
                    {/* Descrição opcional da seção */}
                    <input
                      type="text"
                      value={section.description || ''}
                      onChange={(e) =>
                        handleUpdateSection(secIdx, { ...section, description: e.target.value })
                      }
                      placeholder="Descrição breve ou subtítulo da seção (opcional)..."
                      className="bg-neutral-900/40 text-neutral-300 text-xs px-3 py-1.5 rounded-lg border border-vtt-dark-gray/60 focus:border-vtt-golden outline-none mb-1"
                    />

                    {section.fields.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center gap-2 text-neutral-500 text-xs">
                        <LayoutGrid className="w-6 h-6 text-neutral-600" />
                        <p>Esta seção ainda não possui campos configurados.</p>
                        <button
                          type="button"
                          onClick={() => handleAddField(secIdx)}
                          className="text-xs text-vtt-golden hover:underline font-semibold cursor-pointer"
                        >
                          + Adicionar primeiro campo
                        </button>
                      </div>
                    ) : (
                      section.fields.map((field, fieldIdx) => {
                        const isFieldExpanded = expandedFieldIds.includes(field.id)

                        return (
                          <div
                            key={field.id}
                            className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors"
                          >
                            {/* Linha Resumida do Campo */}
                            <div className="p-3 flex items-center justify-between gap-3 flex-wrap bg-neutral-900/90">
                              <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                                <button
                                  type="button"
                                  onClick={() => toggleFieldExpand(field.id)}
                                  className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                                  title={
                                    isFieldExpanded ? 'Recolher detalhes' : 'Expandir detalhes'
                                  }
                                >
                                  {isFieldExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Nome do Campo (Rótulo) */}
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => {
                                    const newLabel = e.target.value
                                    const updated: SheetCustomField = {
                                      ...field,
                                      label: newLabel,
                                      // Se a chave for genérica ou vazia, atualiza automaticamente
                                      key:
                                        !field.key || field.key.startsWith('campo_')
                                          ? slugify(newLabel)
                                          : field.key
                                    }
                                    handleUpdateField(secIdx, fieldIdx, updated)
                                  }}
                                  placeholder="Rótulo (ex: Classe, Força...)"
                                  className="bg-transparent text-white font-semibold text-xs border-b border-transparent hover:border-neutral-700 focus:border-vtt-golden outline-none px-1 flex-1 max-w-[220px]"
                                />

                                {/* Badge do Tipo */}
                                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-800 text-vtt-golden border border-neutral-700">
                                  {field.type === 'reference'
                                    ? `Ref: ${field.referenceType || 'item'}`
                                    : field.type}
                                </span>

                                {/* Badge da Largura */}
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-neutral-300">
                                  {field.width}
                                </span>

                                {field.isModifier && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                    Rolável (d20)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Botões de Reordenação */}
                                <button
                                  type="button"
                                  disabled={fieldIdx === 0}
                                  onClick={() => handleMoveField(secIdx, fieldIdx, 'up')}
                                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-20 cursor-pointer"
                                  title="Mover campo para cima"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={fieldIdx === section.fields.length - 1}
                                  onClick={() => handleMoveField(secIdx, fieldIdx, 'down')}
                                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-20 cursor-pointer"
                                  title="Mover campo para baixo"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Mover para outra Seção */}
                                {sections.length > 1 && (
                                  <select
                                    value={secIdx}
                                    onChange={(e) =>
                                      handleMoveFieldToSection(
                                        secIdx,
                                        fieldIdx,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="bg-neutral-800 text-[11px] text-neutral-300 rounded px-1.5 py-1 border border-neutral-700 outline-none cursor-pointer"
                                    title="Mover para outra seção"
                                  >
                                    {sections.map((s, si) => (
                                      <option key={s.id} value={si}>
                                        Mover p/ {s.title}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {/* Duplicar Campo */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateField(secIdx, fieldIdx)}
                                  className="p-1 rounded text-neutral-400 hover:text-vtt-golden hover:bg-neutral-800 transition-colors cursor-pointer"
                                  title="Duplicar campo"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {/* Excluir Campo */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveField(secIdx, fieldIdx)}
                                  className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                                  title="Excluir campo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Painel de Configurações Detalhadas do Campo */}
                            {isFieldExpanded && (
                              <div className="p-3.5 border-t border-neutral-800/80 bg-neutral-950/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                {/* Chave Interna (Key) */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-semibold uppercase text-neutral-400">
                                    Identificador / Chave *
                                  </label>
                                  <input
                                    type="text"
                                    value={field.key}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        key: slugify(e.target.value)
                                      })
                                    }
                                    placeholder="ex: character_name"
                                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-vtt-golden outline-none"
                                  />
                                </div>

                                {/* Tipo do Campo */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-semibold uppercase text-neutral-400">
                                    Tipo de Campo
                                  </label>
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as SheetCustomField['type']
                                      const updated: SheetCustomField = {
                                        ...field,
                                        type: newType,
                                        referenceType:
                                          newType === 'reference'
                                            ? field.referenceType || 'class'
                                            : undefined
                                      }
                                      handleUpdateField(secIdx, fieldIdx, updated)
                                    }}
                                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-vtt-golden outline-none cursor-pointer"
                                  >
                                    <option value="text">Texto Simples</option>
                                    <option value="number">Número</option>
                                    <option value="reference">Lista do Sistema (Referência)</option>
                                    <option value="select">Lista de Opções (Fixo)</option>
                                    <option value="textarea">Área de Texto Longo</option>
                                    <option value="checkbox">Caixa de Seleção (Booleano)</option>
                                  </select>
                                </div>

                                {/* Largura / Tamanho do Campo */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-semibold uppercase text-neutral-400">
                                    Tamanho na Linha
                                  </label>
                                  <select
                                    value={field.width}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        width: e.target.value as SheetFieldWidth
                                      })
                                    }
                                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-vtt-golden outline-none cursor-pointer"
                                  >
                                    {WIDTH_OPTIONS.map((w) => (
                                      <option key={w.value} value={w.value}>
                                        {w.label} - {w.desc}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Campo Específico se for REFERÊNCIA */}
                                {field.type === 'reference' && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold uppercase text-vtt-golden">
                                      Referenciar Conteúdo
                                    </label>
                                    <select
                                      value={field.referenceType || 'class'}
                                      onChange={(e) =>
                                        handleUpdateField(secIdx, fieldIdx, {
                                          ...field,
                                          referenceType: e.target.value as ContentType
                                        })
                                      }
                                      className="bg-neutral-900 border border-vtt-golden/40 rounded-lg px-2.5 py-1.5 text-vtt-golden font-semibold text-xs focus:border-vtt-golden outline-none cursor-pointer"
                                    >
                                      {CONTENT_TYPE_LIST.map((ct) => (
                                        <option key={ct.value} value={ct.value}>
                                          {ct.emoji} {ct.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Campo Específico se for SELECT FIXO */}
                                {field.type === 'select' && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold uppercase text-neutral-400">
                                      Opções (separadas por vírgula)
                                    </label>
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
                                      placeholder="Ex: Opção A, Opção B, Opção C"
                                      className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-vtt-golden outline-none"
                                    />
                                  </div>
                                )}

                                {/* Placeholder / Dica */}
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                  <label className="text-[10px] font-semibold uppercase text-neutral-400">
                                    Texto de Exemplo (Placeholder)
                                  </label>
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) =>
                                      handleUpdateField(secIdx, fieldIdx, {
                                        ...field,
                                        placeholder: e.target.value
                                      })
                                    }
                                    placeholder="Ex: 9m (30ft), Neutro Bom, etc."
                                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-vtt-golden outline-none"
                                  />
                                </div>

                                {/* Opções Extras: Rolável com d20 */}
                                <div className="flex items-center gap-3 sm:col-span-2 pt-2">
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
                                      className="accent-vtt-golden w-4 h-4 rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-neutral-300">
                                      Permitir rolagem de teste com <strong>d20</strong> ao clicar
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODO 2: PRÉ-VISUALIZAÇÃO INTERATIVA DA FICHA ── */}
      {activeTab === 'preview' && (
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5 sm:p-7 flex flex-col gap-6">
          <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-vtt-golden font-cinzel">
                Pré-visualização da Ficha de Personagem
              </h3>
              <p className="text-xs text-neutral-400">
                Esta é a visualização exata de como a ficha personalizada aparecerá para jogadores e
                mestres durante as sessões.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-800/40">
              Modo Demonstração
            </span>
          </div>

          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm"
            >
              {/* Cabeçalho da Seção */}
              <div className="border-b border-neutral-800/80 pb-2">
                <h4 className="text-sm font-bold text-white font-cinzel tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-vtt-golden" />
                  <span>{section.title}</span>
                </h4>
                {section.description && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">{section.description}</p>
                )}
              </div>

              {/* Grid de Campos Responsivo */}
              <div className="grid grid-cols-12 gap-3.5">
                {section.fields.map((field) => {
                  const colClass = getWidthColClass(field.width)

                  return (
                    <div
                      key={field.id}
                      className={`${colClass} flex flex-col gap-1 bg-neutral-950/60 border border-neutral-800/90 rounded-xl p-3 focus-within:border-vtt-golden/60 transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-300 font-cinzel truncate">
                          {field.label}
                        </label>
                        {field.isModifier && (
                          <span
                            className="flex items-center gap-1 text-[10px] text-vtt-golden bg-vtt-golden/10 px-1.5 py-0.5 rounded border border-vtt-golden/30 cursor-pointer hover:bg-vtt-golden/20"
                            title="Clique para rolar 1d20 com este modificador"
                          >
                            <Dice5 className="w-3 h-3" />
                            <span>d20</span>
                          </span>
                        )}
                      </div>

                      {/* Renderização baseada no Tipo de Campo */}
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || `Digite ${field.label}...`}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-vtt-golden resize-none leading-relaxed"
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          defaultValue={Number(field.defaultValue) || 0}
                          placeholder={field.placeholder || '0'}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-vtt-golden"
                        />
                      ) : field.type === 'checkbox' ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            defaultChecked={Boolean(field.defaultValue)}
                            className="w-4 h-4 accent-vtt-golden rounded cursor-pointer"
                          />
                          <span className="text-xs text-neutral-400">Ativado</span>
                        </div>
                      ) : field.type === 'reference' ? (
                        <div className="flex flex-col gap-1">
                          <input
                            list={`demo-ref-${field.id}`}
                            placeholder={
                              field.placeholder || `Selecione ou digite ${field.label}...`
                            }
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden"
                          />
                          <datalist id={`demo-ref-${field.id}`}>
                            {field.referenceType === 'class' && (
                              <>
                                <option value="Guerreiro" />
                                <option value="Mago" />
                                <option value="Ladino" />
                                <option value="Clérigo" />
                                <option value="Bárbaro" />
                                <option value="Paladino" />
                              </>
                            )}
                            {field.referenceType === 'race' && (
                              <>
                                <option value="Humano" />
                                <option value="Elfo" />
                                <option value="Anão" />
                                <option value="Halfling" />
                                <option value="Draconato" />
                              </>
                            )}
                            {field.referenceType === 'background' && (
                              <>
                                <option value="Acólito" />
                                <option value="Criminoso" />
                                <option value="Herói do Povo" />
                                <option value="Nobre" />
                                <option value="Soldado" />
                              </>
                            )}
                          </datalist>
                          <span className="text-[10px] text-neutral-500">
                            Preenchido a partir de {field.referenceType || 'conteúdo'} do sistema
                          </span>
                        </div>
                      ) : field.type === 'select' ? (
                        <select className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden cursor-pointer">
                          <option value="">Selecione uma opção...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          defaultValue={String(field.defaultValue || '')}
                          placeholder={field.placeholder || `Digite ${field.label}...`}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-vtt-golden"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
