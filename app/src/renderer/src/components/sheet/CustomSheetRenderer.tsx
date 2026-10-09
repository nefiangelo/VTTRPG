import React, { useState, useEffect } from 'react'
import type {
  SheetCustomSection,
  SheetCustomField,
  RpgSystemFull,
  SystemContentEntry,
  ContentType
} from '../../../../preload/index.d'
import { getFieldStyle, getSectionStyle } from '../../utils/sheetLayoutUtils'
import { getSheetTheme } from '../../utils/sheetThemes'
import { Dice5 } from 'lucide-react'
import VampireDotTrack from './VampireDotTrack'
import DndAbilityBox from './DndAbilityBox'
import {
  DndScallopedCorner,
  VampireSpearheadDivider,
  VampireTopOrnament
} from './ThemedSectionDecorations'

interface CustomSheetRendererProps {
  sections: SheetCustomSection[]
  system: RpgSystemFull | null
  values: Record<string, string | number | boolean>
  canEdit: boolean
  onChangeValue: (key: string, value: string | number | boolean) => void
  onRollField?: (label: string, value: string | number | boolean, formula?: string) => void
  theme?: string
}

const DEFAULT_REFERENCE_SUGGESTIONS: Record<string, string[]> = {
  class: [
    'Bárbaro',
    'Bardo',
    'Bruxo',
    'Clérigo',
    'Druida',
    'Feiticeiro',
    'Guerreiro',
    'Ladino',
    'Mago',
    'Monge',
    'Paladino',
    'Patrulheiro'
  ],
  race: [
    'Humano',
    'Elfo',
    'Anão',
    'Halfling',
    'Draconato',
    'Gnomo',
    'Meio-Elfo',
    'Meio-Orc',
    'Tiefling',
    'Golias',
    'Aasimar'
  ],
  subclass: [
    'Campeão',
    'Mestre de Batalha',
    'Evocador',
    'Assassino',
    'Ladrão',
    'Devoção',
    'Vingança',
    'Vida',
    'Guerra'
  ],
  background: [
    'Acólito',
    'Artesão de Guilda',
    'Charlatão',
    'Criminoso',
    'Eremita',
    'Forasteiro',
    'Herói do Povo',
    'Marinheiro',
    'Nobre',
    'Órfão',
    'Sábio',
    'Soldado'
  ]
}

export default function CustomSheetRenderer({
  sections,
  system,
  values,
  canEdit,
  onChangeValue,
  onRollField,
  theme
}: CustomSheetRendererProps): React.JSX.Element {
  // Determina o tema ativo (prioridade: prop direta > configuração salva do sistema > gênero do sistema > dnd padrão)
  const resolvedThemeId =
    theme ||
    system?.structure?.sheetLayout?.theme ||
    (system?.genre?.toLowerCase().includes('cyber') || system?.genre?.toLowerCase().includes('sci-fi')
      ? 'cyberpunk'
      : system?.genre?.toLowerCase().includes('horror')
        ? 'horror'
        : 'dnd')

  const activeTheme = getSheetTheme(resolvedThemeId)

  // Cache de opções carregadas do banco para tipos de conteúdo referenciados (classes, raças, etc.)
  const [referenceOptions, setReferenceOptions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    let isMounted = true

    const loadContentOptions = async (): Promise<void> => {
      const refTypes = new Set<ContentType>()
      sections.forEach((sec) => {
        sec.fields.forEach((f) => {
          if (f.type === 'reference' && f.referenceType && f.referenceType !== 'custom') {
            refTypes.add(f.referenceType as ContentType)
          }
        })
      })

      const loaded: Record<string, string[]> = {}

      for (const ct of refTypes) {
        let entries: SystemContentEntry[] = []
        if (system?.id && window.api?.content?.getBySystem) {
          try {
            entries = await window.api.content.getBySystem(system.id, ct)
          } catch (err) {
            console.error(`Erro ao buscar conteúdo para ${ct}:`, err)
          }
        }

        const namesFromDb = entries.map((e) => e.name).filter(Boolean)
        const defaults = DEFAULT_REFERENCE_SUGGESTIONS[ct] || []
        const combined = Array.from(new Set([...namesFromDb, ...defaults]))
        loaded[ct] = combined
      }

      if (isMounted) {
        setReferenceOptions(loaded)
      }
    }

    loadContentOptions()

    return () => {
      isMounted = false
    }
  }, [sections, system?.id])

  const handleRoll = (field: SheetCustomField, val: string | number | boolean): void => {
    if (!onRollField) return
    onRollField(field.label || field.key, val, field.formula)
  }

  const isDndTheme = activeTheme.variant === 'dnd'
  const isVampireTheme = activeTheme.variant === 'vampire'

  return (
    <div className={`flex flex-wrap gap-4 max-w-6xl mx-auto w-full pb-10 transition-colors duration-300 p-2 sm:p-4 rounded-3xl items-start ${activeTheme.styles.wrapper}`}>
      {/* Ornamento do topo para Vampiro: A Máscara (Imagem 1) */}
      {isVampireTheme && (
        <div className="w-full">
          <VampireTopOrnament />
        </div>
      )}

      {sections.map((section) => (
        <div
          key={section.id}
          style={getSectionStyle(section.width, section.customWidth, section.customHeight)}
          className={`${activeTheme.styles.sectionCard} relative`}
        >
          {/* Canto entalhado com rebite circular para a ficha de D&D 2024 (Imagem 2) */}
          {isDndTheme && <DndScallopedCorner />}
          {isDndTheme && (
            <div className="absolute inset-1.5 pointer-events-none border border-stone-300/80 rounded" />
          )}

          {/* Cabeçalho da Seção */}
          {isVampireTheme ? (
            <VampireSpearheadDivider
              title={section.title}
              description={section.description}
            />
          ) : (
            <div className={activeTheme.styles.sectionHeader}>
              <div>
                <h3 className={activeTheme.styles.sectionTitle}>
                  <span className={activeTheme.styles.sectionBullet} />
                  <span>{section.title}</span>
                </h3>
                {section.description && (
                  <p className={activeTheme.styles.sectionDesc}>{section.description}</p>
                )}
              </div>

              {activeTheme.styles.techTag && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded opacity-80 ${activeTheme.styles.badge}`}>
                  {activeTheme.styles.techTag}
                </span>
              )}
            </div>
          )}

          {/* Grid Flexível de Campos com larguras personalizadas livres */}
          <div className="flex flex-wrap gap-3 mt-2 items-start w-full">
            {section.fields.map((field) => {
              const fieldStyle = getFieldStyle(field.width, field.customWidth, field.customHeight)
              const rawValue = values[field.key]
              const val =
                rawValue !== undefined
                  ? rawValue
                  : field.defaultValue !== undefined
                    ? field.defaultValue
                    : ''

              const datalistId = `ref-list-${field.id}`
              const options =
                field.type === 'reference'
                  ? referenceOptions[field.referenceType || 'class'] ||
                    DEFAULT_REFERENCE_SUGGESTIONS[field.referenceType || ''] ||
                    []
                  : field.options || []

              // ── 1. RENDERIZAÇÃO ESPECIALIZADA: VAMPIRO (VTM - Imagem 1) ──
              if (isVampireTheme) {
                // Características com trilha de círculos (● e ○) para Atributos e Habilidades
                const isDotField =
                  field.type === 'number' ||
                  Boolean(field.isModifier) ||
                  (typeof field.defaultValue === 'number' && field.defaultValue <= 8)

                if (isDotField) {
                  const numVal = typeof val === 'number' ? val : Number(val) || 0
                  // Atributos base em VTM possuem mínimo de 1 ponto
                  const isBaseAttr = [
                    'strength', 'forca', 'dexterity', 'destreza', 'stamina', 'vigor',
                    'charisma', 'carisma', 'manipulation', 'manipulacao', 'appearance', 'aparencia',
                    'perception', 'percepcao', 'intelligence', 'inteligencia', 'wits', 'raciocinio'
                  ].includes(field.key.toLowerCase())

                  return (
                    <div key={field.id} style={fieldStyle} className="flex items-center">
                      <VampireDotTrack
                        label={field.label}
                        value={numVal}
                        maxDots={8}
                        minDots={isBaseAttr ? 1 : 0}
                        canEdit={canEdit}
                        onChangeValue={(newVal) => onChangeValue(field.key, newVal)}
                        onRoll={(lbl, pool) => {
                          onRollField?.(lbl, pool, `${pool}d10`)
                        }}
                      />
                    </div>
                  )
                }

                // Campos de Perfil / Informações Gerais em formato INLINE (NOME: _________) conforme Imagem 1
                if (field.type === 'text' || field.type === 'reference') {
                  return (
                    <div key={field.id} style={fieldStyle} className="flex items-baseline gap-2 py-1">
                      <label
                        className="font-serif font-black text-xs text-black uppercase tracking-wider shrink-0 select-none"
                        title={field.label}
                      >
                        {field.label}:
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={String(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="flex-1 bg-[#eef2ff]/75 border-b border-black text-black font-serif text-xs font-bold outline-none px-2 py-0.5 focus:bg-[#e0e7ff] transition-colors disabled:opacity-60"
                      />
                    </div>
                  )
                }

                // Textarea para VTM (Disciplinas, Antecedentes, etc.)
                if (field.type === 'textarea') {
                  return (
                    <div key={field.id} style={fieldStyle} className="flex flex-col gap-1 py-1">
                      <label className="font-serif font-black text-xs text-black uppercase tracking-wider select-none">
                        {field.label}:
                      </label>
                      <textarea
                        disabled={!canEdit}
                        rows={3}
                        value={String(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.value)}
                        placeholder={field.placeholder || `Anotações de ${field.label}...`}
                        className="w-full bg-[#f8fafc] border border-black p-2 text-xs font-serif text-black placeholder:text-neutral-500 outline-none focus:bg-white resize-none leading-relaxed transition-all disabled:opacity-60"
                        style={{
                          height: field.customHeight ? `${Math.max(48, field.customHeight - 44)}px` : undefined
                        }}
                      />
                    </div>
                  )
                }
              }

              // ── 2. RENDERIZAÇÃO ESPECIALIZADA: D&D 5E (Imagem 2) ──
              if (isDndTheme) {
                // Atributos de habilidade com modificador e caixa oficial D&D
                if (field.type === 'number' && field.isModifier) {
                  return (
                    <div key={field.id} style={fieldStyle}>
                      <DndAbilityBox
                        label={field.label}
                        score={typeof val === 'number' ? val : Number(val) || 10}
                        canEdit={canEdit}
                        onChangeScore={(s) => onChangeValue(field.key, s)}
                        onRoll={(lbl, mod) => {
                          const sign = mod >= 0 ? `+${mod}` : `${mod}`
                          onRollField?.(lbl, mod, `1d20${sign}`)
                        }}
                      />
                    </div>
                  )
                }

                // Campos de Texto, Referência e Select com LINHA DE BASE PURA (Imagem 2)
                return (
                  <div
                    key={field.id}
                    style={fieldStyle}
                    className="flex flex-col justify-end py-1 group/dndfield"
                  >
                    {/* Rótulo superior com caixa alta espaçada clássica da Imagem 2 */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <label
                        className="text-[10px] font-bold text-stone-700 font-sans tracking-[0.2em] uppercase select-none truncate"
                        title={field.label}
                      >
                        {field.label}
                      </label>
                    </div>

                    {/* Input sem caixa, com linha de base nítida e tipografia de ficha */}
                    {field.type === 'textarea' ? (
                      <textarea
                        disabled={!canEdit}
                        rows={3}
                        value={String(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.value)}
                        placeholder={field.placeholder || `Anotações de ${field.label}...`}
                        className={`w-full bg-[#fdfcf9] border border-stone-400 rounded-sm p-2 text-xs font-serif text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-800 resize-none leading-6 [background-image:repeating-linear-gradient(transparent,transparent_23px,#e7e5e4_24px)] transition-all disabled:opacity-60 ${
                          field.customHeight ? 'flex-1' : ''
                        }`}
                        style={{
                          height: field.customHeight ? `${Math.max(48, field.customHeight - 44)}px` : undefined
                        }}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        disabled={!canEdit}
                        value={String(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.value)}
                        className="w-full bg-transparent border-0 border-b-[1.5px] border-stone-400 text-stone-900 font-serif text-xs font-semibold outline-none py-1 focus:border-stone-800 cursor-pointer transition-colors disabled:opacity-60"
                      >
                        <option value="">Selecione...</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'reference' ? (
                      <div className="relative w-full">
                        <input
                          list={datalistId}
                          disabled={!canEdit}
                          value={String(val)}
                          onChange={(e) => onChangeValue(field.key, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="w-full bg-transparent border-0 border-b-[1.5px] border-stone-400 text-stone-900 font-serif text-sm font-semibold outline-none py-1 focus:border-stone-800 transition-colors disabled:opacity-60"
                        />
                        <datalist id={datalistId}>
                          {options.map((opt) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                      </div>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={Boolean(val)}
                          onChange={(e) => onChangeValue(field.key, e.target.checked)}
                          className="w-4 h-4 rounded cursor-pointer accent-stone-700 disabled:opacity-60"
                        />
                        <span className="text-xs text-stone-800 font-sans font-semibold tracking-wide">
                          {val ? 'Sim' : 'Não'}
                        </span>
                      </label>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        disabled={!canEdit}
                        value={typeof val === 'boolean' ? '' : val}
                        onChange={(e) => {
                          const v = field.type === 'number'
                            ? (e.target.value === '' ? '' : Number(e.target.value))
                            : e.target.value
                          onChangeValue(field.key, v)
                        }}
                        placeholder={field.placeholder || ''}
                        className="w-full bg-transparent border-0 border-b-[1.5px] border-stone-400 text-stone-900 font-serif text-sm font-semibold outline-none py-1 focus:border-stone-800 transition-colors disabled:opacity-60"
                      />
                    )}
                  </div>
                )
              }

              // ── 3. RENDERIZAÇÃO PADRÃO / CYBERPUNK / DEMAIS TEMAS ──
              return (
                <div
                  key={field.id}
                  style={fieldStyle}
                  className={`flex flex-col gap-1.5 ${activeTheme.styles.fieldCard}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <label
                      className={activeTheme.styles.fieldLabel}
                      title={field.label}
                    >
                      {field.label}
                    </label>

                    {field.isModifier && (
                      <button
                        type="button"
                        onClick={() => handleRoll(field, val)}
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
                      disabled={!canEdit}
                      rows={3}
                      value={String(val)}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      placeholder={field.placeholder || `Digite ${field.label}...`}
                      className={`w-full ${activeTheme.styles.textarea} disabled:opacity-60 ${field.customHeight ? 'flex-1' : ''}`}
                      style={{
                        height: field.customHeight ? `${Math.max(48, field.customHeight - 44)}px` : undefined
                      }}
                    />
                  ) : field.type === 'number' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        disabled={!canEdit}
                        value={val === '' ? '' : Number(val)}
                        onChange={(e) => {
                          const n = e.target.value === '' ? '' : Number(e.target.value)
                          onChangeValue(field.key, n)
                        }}
                        placeholder={field.placeholder || '0'}
                        className={`${activeTheme.styles.input} disabled:opacity-60`}
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
                        disabled={!canEdit}
                        checked={Boolean(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.checked)}
                        className={`w-4 h-4 rounded cursor-pointer disabled:opacity-60 ${activeTheme.styles.checkboxAccent}`}
                      />
                      <span className={activeTheme.styles.checkboxText}>
                        {val ? 'Sim / Ativado' : 'Não / Desativado'}
                      </span>
                    </label>
                  ) : field.type === 'reference' ? (
                    <div className="relative">
                      <input
                        list={datalistId}
                        disabled={!canEdit}
                        value={String(val)}
                        onChange={(e) => onChangeValue(field.key, e.target.value)}
                        placeholder={field.placeholder || `Selecione ou digite ${field.label}...`}
                        className={`${activeTheme.styles.input} disabled:opacity-60`}
                      />
                      <datalist id={datalistId}>
                        {options.map((opt) => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </div>
                  ) : field.type === 'select' ? (
                    <select
                      disabled={!canEdit}
                      value={String(val)}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      className={`${activeTheme.styles.select} disabled:opacity-60`}
                    >
                      <option value="">Selecione...</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={String(val)}
                      onChange={(e) => onChangeValue(field.key, e.target.value)}
                      placeholder={field.placeholder || `Digite ${field.label}...`}
                      className={`${activeTheme.styles.input} disabled:opacity-60`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
